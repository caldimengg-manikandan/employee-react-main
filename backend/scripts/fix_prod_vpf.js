const mongoose = require('mongoose');
const path = require('path');
// Production Cloud URI from .env (commented part)
const uri = "mongodb+srv://caldimenggcloud_db_user:Caldim12345678@cluster0.wwy0lqb.mongodb.net/Master_DB?retryWrites=true&w=majority";

const payrollSchema = new mongoose.Schema({}, { strict: false });
const Payroll = mongoose.model('Payroll', payrollSchema, 'payrolls');

const compSchema = new mongoose.Schema({}, { strict: false });
const Compensation = mongoose.model('Compensation', compSchema, 'compensations');

async function fixProdVPF() {
  try {
    console.log('Connecting to Production Cloud DB...');
    await mongoose.connect(uri);
    console.log('Connected to Master_DB');

    const payrolls = await Payroll.find({});
    console.log(`Auditing ${payrolls.length} payroll records...`);

    let updateCount = 0;

    for (const p of payrolls) {
      const empId = p.employeeId;
      const empPF = Number(p.employeePfContribution || 0);
      const emprPF = Number(p.employerPfContribution || 0);
      const stdPF = empPF + emprPF;
      
      const esi = Number(p.esi || 0);
      const tax = Number(p.tax || 0);
      const pt = Number(p.professionalTax || 0);
      const loan = Number(p.loanDeduction || 0);
      const lop = Number(p.lop || 0);
      
      let volunteerPF = Number(p.volunteerPF || 0);

      // Rule: If pf field is greater than stdPF, the difference is Volunteer PF
      if (volunteerPF === 0 && p.pf > stdPF && stdPF > 0) {
        volunteerPF = p.pf - stdPF;
        console.log(`[${empId}] Inferred VPF ${volunteerPF} from pf field (${p.pf} - ${stdPF})`);
      }

      // Final check against Compensation if still 0
      if (volunteerPF === 0) {
        const comp = await Compensation.findOne({ employeeId: empId });
        if (comp && comp.volunteerPF > 0) {
          volunteerPF = comp.volunteerPF;
          console.log(`[${empId}] Found VPF ${volunteerPF} in Compensation`);
        }
      }

      const totalEarnings = Number(p.totalEarnings || 0);
      const correctTotalDeductions = stdPF + esi + tax + pt + loan + lop + volunteerPF;

      if (Math.round(p.totalDeductions) !== Math.round(correctTotalDeductions) || p.volunteerPF !== volunteerPF) {
        const update = {
          volunteerPF: volunteerPF,
          totalDeductions: correctTotalDeductions,
          netSalary: totalEarnings - correctTotalDeductions,
          updatedAt: new Date()
        };
        
        await Payroll.updateOne({ _id: p._id }, { $set: update });
        console.log(`✅ [${empId}] Updated: VPF=${volunteerPF}, TotalDed=${correctTotalDeductions}, Net=${update.netSalary}`);
        updateCount++;
      }
    }

    console.log(`\nDONE. Updated ${updateCount} records in Production.`);
    process.exit(0);
  } catch (err) {
    console.error('FATAL ERROR:', err);
    process.exit(1);
  }
}

fixProdVPF();
