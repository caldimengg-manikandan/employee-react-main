
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const SelfAppraisal = require('../models/SelfAppraisal');
const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');

async function reconcilePayroll() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employees';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB for reconciliation...');

    const empIds = ['CDE015', 'CDE075', 'CDE004', 'CDE082', 'CDE013'];

    for (const empId of empIds) {
      console.log(`\nReconciling ${empId}...`);
      
      const employee = await Employee.findOne({ employeeId: empId });
      if (!employee) {
        console.log(`- Employee ${empId} not found.`);
        continue;
      }

      const appraisal = await SelfAppraisal.findOne({ 
        $or: [
          { employeeId: employee._id },
          { empId: empId }
        ],
        status: { $in: ['released', 'effective', 'accepted', 'accepted_pending_effect', 'DIRECTOR_APPROVED', 'directorApproved'] }
      }).sort({ createdAt: -1 });


      if (!appraisal || !appraisal.releaseRevisedSnapshot) {
        console.log(`- No valid appraisal snapshot found for ${empId}. Skipping.`);
        continue;
      }

      const revised = appraisal.releaseRevisedSnapshot instanceof Map 
        ? Object.fromEntries(appraisal.releaseRevisedSnapshot) 
        : (appraisal.releaseRevisedSnapshot || {});


      const updateData = {
        basicDA: Math.round(revised.basic || revised.basicDA || 0),
        hra: Math.round(revised.hra || 0),
        specialAllowance: Math.round(revised.special || revised.specialAllowance || 0),
        employeePfContribution: Math.round(revised.employeePfContribution || 0),
        employerPfContribution: Math.round(revised.employerPfContribution || 0),
        esi: Math.round(revised.esi || 0),
        volunteerPF: Math.round(revised.volunteerPF || 0),
        gratuity: Math.round(revised.gratuity || 0),
        totalEarnings: Math.round(revised.gross || revised.totalEarnings || 0),
        netSalary: Math.round(revised.net || revised.netSalary || 0),
        ctc: Math.round(revised.ctc || 0),
        updatedAt: new Date()
      };

      // Ensure totalEarnings is Gross and netSalary is Net
      // Based on our audit, we want to make sure we don't swap them.
      console.log(`- Setting Gross (totalEarnings) to: ${updateData.totalEarnings}`);
      console.log(`- Setting Net (netSalary) to: ${updateData.netSalary}`);

      // Update Payroll
      const updatedPayroll = await Payroll.findOneAndUpdate(
        { employeeId: { $regex: new RegExp(`^${empId}$`, 'i') } },
        { $set: updateData },
        { new: true }
      );

      if (updatedPayroll) {
        console.log(`- Payroll updated successfully.`);
      } else {
        console.log(`- Payroll record not found for ${empId}.`);
      }

      // Update Employee
      await Employee.findOneAndUpdate(
        { employeeId: empId },
        { $set: {
            basicDA: updateData.basicDA,
            hra: updateData.hra,
            specialAllowance: updateData.specialAllowance,
            ctc: updateData.ctc
          }
        }
      );
    }

    await mongoose.disconnect();
    console.log('\nReconciliation complete.');
  } catch (error) {
    console.error('Reconciliation Error:', error);
  }
}

reconcilePayroll();
