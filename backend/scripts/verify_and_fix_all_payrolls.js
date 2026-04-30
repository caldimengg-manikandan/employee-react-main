
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const SelfAppraisal = require('../models/SelfAppraisal');
const MonthlyPayroll = require('../models/MonthlyPayroll');


async function verifyAndFixAllPayrolls() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employees';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB...');

    const payrolls = await Payroll.find({});
    console.log(`Found ${payrolls.length} payroll records to verify.\n`);

    let fixedCount = 0;
    let correctCount = 0;

    for (const pr of payrolls) {
      const gross = Number(pr.totalEarnings || 0);
      if (gross === 0) continue;

      // 1. Calculate Expected Values
      const expBasic = Math.round(gross * 0.50);
      const expHRA = Math.round(gross * 0.25);
      
      const empPF = Number(pr.employeePfContribution || 0);
      const emrPF = Number(pr.employerPfContribution || 0);
      const esi = Number(pr.esi || 0);
      const vPF = Number(pr.volunteerPF || 0);
      
      const pool25 = gross * 0.25;
      // Volunteer PF should NOT be deducted from Special Allowance
      const expSpecial = Math.round(Math.max(0, pool25 - (empPF + emrPF + esi)));
      
      const tax = Number(pr.tax || 0);
      const pt = Number(pr.professionalTax || 0);
      const loan = Number(pr.loanDeduction || 0);
      const lop = Number(pr.lop || 0);

      const expGratuity = Math.round(expBasic * 0.0486);
      
      // Net Salary (Take Home) = (Basic + HRA + Special) - (Tax + PT + Loan + LOP + Volunteer PF)
      // Statutory PF/ESI are already excluded from the (B+H+S) sum
      const expNet = (expBasic + expHRA + expSpecial) - (tax + pt + loan + lop + vPF);
      const expCTC = Math.round(gross + expGratuity);

      const expSnapshot = {
        basic: expBasic,
        hra: expHRA,
        special: expSpecial,
        gross: gross,
        net: expNet,
        employeePfContribution: empPF,
        employerPfContribution: emrPF,
        esi: esi,
        volunteerPF: vPF,
        gratuity: expGratuity,
        ctc: expCTC
      };

      // 2. Check Discrepancies
      const isBasicWrong = Math.abs(pr.basicDA - expBasic) > 2;
      const isHRAWrong = Math.abs(pr.hra - expHRA) > 2;
      const isSpecialWrong = Math.abs(pr.specialAllowance - expSpecial) > 2;
      const isGratuityWrong = Math.abs(pr.gratuity - expGratuity) > 2;
      const isNetWrong = Math.abs(pr.netSalary - expNet) > 2;

      let needsFix = isBasicWrong || isHRAWrong || isSpecialWrong || isGratuityWrong || isNetWrong;

      // Check Snapshot separately
      const empMaster = await Employee.findOne({ employeeId: pr.employeeId });
      if (!empMaster) continue;

      const appraisal = await SelfAppraisal.findOne({ 
        $or: [{ employeeId: empMaster._id }, { empId: pr.employeeId }],
        status: { $in: ['released', 'effective', 'accepted'] }
      }).sort({ createdAt: -1 });


      let snapshotWrong = false;
      if (appraisal && appraisal.releaseRevisedSnapshot) {
        const snap = appraisal.releaseRevisedSnapshot instanceof Map 
          ? Object.fromEntries(appraisal.releaseRevisedSnapshot) 
          : appraisal.releaseRevisedSnapshot;
        
        if (Math.abs((snap.basic || snap.basicDA || 0) - expBasic) > 2 || 
            Math.abs((snap.hra || 0) - expHRA) > 2) {
          snapshotWrong = true;
        }
      }

      if (needsFix || snapshotWrong) {
        console.log(`Fixing record for ${pr.employeeName} (${pr.employeeId}):`);
        
        if (needsFix) {
          await Payroll.updateOne({ _id: pr._id }, { $set: {
            basicDA: expBasic, hra: expHRA, specialAllowance: expSpecial,
            gratuity: expGratuity, netSalary: expNet, ctc: expCTC, updatedAt: new Date()
          }});
          await Employee.updateOne({ employeeId: pr.employeeId }, { $set: {
            basicDA: expBasic, hra: expHRA, specialAllowance: expSpecial, ctc: expCTC
          }});
          await MonthlyPayroll.updateOne(
            { employeeId: pr.employeeId }, 
            { $set: { basicDA: expBasic, hra: expHRA, specialAllowance: expSpecial, netSalary: expNet } },
            { sort: { salaryMonth: -1 } }
          );
        }

        if (snapshotWrong && appraisal) {
          appraisal.set('releaseRevisedSnapshot', expSnapshot);
          appraisal.markModified('releaseRevisedSnapshot');
          await appraisal.save();
          console.log(`  -> Snapshot Sync COMPLETE.`);
        }

        console.log(`  -> DONE.\n`);
        fixedCount++;
      } else {
        correctCount++;
      }

    }


    console.log('==========================================');
    console.log(`Verification Complete.`);
    console.log(`Total Records: ${payrolls.length}`);
    console.log(`Correct Records: ${correctCount}`);
    console.log(`Fixed Records: ${fixedCount}`);
    console.log('==========================================');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

verifyAndFixAllPayrolls();
