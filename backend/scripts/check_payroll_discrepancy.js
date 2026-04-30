
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const SelfAppraisal = require('../backend/models/SelfAppraisal');
const Payroll = require('../backend/models/Payroll');
const Employee = require('../backend/models/Employee');

async function checkEmployees() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employee-management');
    console.log('Connected to MongoDB');

    const empIds = ['CDE015', 'CDE075', 'CDE004', 'CDE082', 'CDE013'];

    for (const empId of empIds) {
      console.log(`\n--- Checking Employee: ${empId} ---`);
      
      const employee = await Employee.findOne({ employeeId: empId });
      if (!employee) {
        console.log(`Employee ${empId} not found`);
        continue;
      }

      const payroll = await Payroll.findOne({ employeeId: { $regex: new RegExp(`^${empId}$`, 'i') } });
      const appraisal = await SelfAppraisal.findOne({ 
        $or: [
          { employeeId: employee._id },
          { empId: empId }
        ]
      }).sort({ createdAt: -1 });

      console.log('Employee Name:', employee.name);
      
      if (appraisal) {
        console.log('Appraisal found:');
        console.log('  Status:', appraisal.status);
        console.log('  Increment %:', appraisal.incrementPercentage);
        console.log('  Correction %:', appraisal.incrementCorrectionPercentage);
        console.log('  Revised Salary (Gross):', appraisal.revisedSalary);
        console.log('  Current Salary Snapshot:', appraisal.currentSalarySnapshot);
        if (appraisal.releaseRevisedSnapshot) {
           console.log('  Release Revised Snapshot CTC:', appraisal.releaseRevisedSnapshot.ctc);
        } else {
           console.log('  Release Revised Snapshot: MISSING');
        }
      } else {
        console.log('No appraisal found');
      }

      if (payroll) {
        console.log('Payroll found:');
        console.log('  Total Earnings (Gross):', payroll.totalEarnings);
        console.log('  CTC:', payroll.ctc);
        console.log('  Basic:', payroll.basicDA);
      } else {
        console.log('No payroll found');
      }
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

checkEmployees();
