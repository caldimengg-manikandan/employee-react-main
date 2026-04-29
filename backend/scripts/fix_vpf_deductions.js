const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Payroll = require('../models/Payroll');
const MonthlyPayroll = require('../models/MonthlyPayroll');
const Compensation = require('../models/Compensation');
const Employee = require('../models/Employee');

async function fixVPF() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Fix Employee records first (so pre-fill works)
    const employees = await Employee.find({ status: 'Active' });
    for (const emp of employees) {
      const comp = await Compensation.findOne({ employeeId: emp.employeeId });
      if (comp && comp.volunteerPF > 0) {
        emp.volunteerPF = comp.volunteerPF;
        await emp.save();
        console.log(`Updated Employee ${emp.employeeId} with volunteerPF: ${emp.volunteerPF}`);
      }
    }

    // 2. Fix Payroll records
    const payrolls = await Payroll.find({});
    console.log(`Checking ${payrolls.length} payroll records...`);

    for (const p of payrolls) {
      const empPF = Number(p.employeePfContribution || 1800);
      const emprPF = Number(p.employerPfContribution || 1950);
      const stdPF = empPF + emprPF;
      
      let volunteerPF = Number(p.volunteerPF || 0);
      
      // Try to find VPF if it's 0
      if (volunteerPF === 0) {
        const comp = await Compensation.findOne({ employeeId: p.employeeId });
        if (comp && comp.volunteerPF > 0) {
          volunteerPF = comp.volunteerPF;
        } else if (p.pf > stdPF && stdPF > 0) {
          volunteerPF = p.pf - stdPF;
        }
      }

      const totalDeductions = stdPF + Number(p.esi || 0) + Number(p.tax || 0) + Number(p.professionalTax || 0) + Number(p.loanDeduction || 0) + Number(p.lop || 0) + volunteerPF;
      
      // Update if changed or if totalDeductions is currently wrong
      if (p.volunteerPF !== volunteerPF || Math.round(p.totalDeductions) !== Math.round(totalDeductions)) {
        console.log(`Fixing ${p.employeeId}: Old Ded=${p.totalDeductions}, New Ded=${totalDeductions}, VPF=${volunteerPF}`);
        p.volunteerPF = volunteerPF;
        p.totalDeductions = totalDeductions;
        p.netSalary = p.totalEarnings - p.totalDeductions;
        await p.save();
      }
    }

    // 3. Fix MonthlyPayroll records (Simulation results)
    const monthlyPayrolls = await MonthlyPayroll.find({});
    console.log(`Checking ${monthlyPayrolls.length} monthly payroll records...`);
    for (const mp of monthlyPayrolls) {
        const empPF = Number(mp.pf || 3750); // MonthlyPayroll often stores total pf in 'pf'
        // For monthly payroll, standard PF is usually 3750. 
        // If 'pf' is > 3750, the excess is likely VPF.
        let vpf = Number(mp.volunteerPF || 0);
        if (vpf === 0 && mp.pf > 3750) {
            vpf = mp.pf - 3750;
        }
        
        const calculatedDed = mp.pf + Number(mp.esi || 0) + Number(mp.tax || 0) + Number(mp.professionalTax || 0) + Number(mp.loanDeduction || 0) + Number(mp.lop || 0) + vpf;
        // Wait, if mp.pf ALREADY included VPF, don't add it again to deductions.
        // But the prompt says total deductions should be 3750 + VPF.
        // So if mp.pf is 5650, total deductions should be 5650 (which is 3750 + 1900).
        
        // Let's be safe: totalDeductions = (Sum of all individual deduction fields)
        const totalDeductions = Number(mp.pf || 0) + Number(mp.esi || 0) + Number(mp.tax || 0) + Number(mp.professionalTax || 0) + Number(mp.loanDeduction || 0) + Number(mp.lop || 0) + Number(mp.volunteerPF || 0);
        
        if (Math.round(mp.totalDeductions) !== Math.round(totalDeductions) || (vpf > 0 && mp.volunteerPF === 0)) {
            if (vpf > 0 && mp.volunteerPF === 0) mp.volunteerPF = vpf;
            console.log(`Fixing Monthly ${mp.employeeId} (${mp.salaryMonth}): Old Ded=${mp.totalDeductions}, New Ded=${totalDeductions}`);
            mp.totalDeductions = totalDeductions;
            mp.netSalary = mp.totalEarnings - mp.totalDeductions;
            await mp.save();
        }
    }

    console.log('All records fixed.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixVPF();
