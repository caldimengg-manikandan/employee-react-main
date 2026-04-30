
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkMasterPayroll() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employees';
    await mongoose.connect(uri);
    
    const empIds = ['CDE075', 'CDE082', 'CDE015', 'CDE004'];
    
    const payrolls = await mongoose.connection.db.collection('payrolls')
      .find({ employeeId: { $in: empIds } })
      .toArray();

    console.log(`Found ${payrolls.length} master payroll records.`);
    
    payrolls.forEach(p => {
      console.log(`\nEmployee: ${p.employeeName} (${p.employeeId})`);
      console.log(`Basic: ${p.basicDA}`);
      console.log(`Emp PF: ${p.employeePfContribution}`);
      console.log(`Emr PF: ${p.employerPfContribution}`);
      console.log(`Volunteer PF: ${p.volunteerPF}`);
      console.log(`Total Earnings (Gross): ${p.totalEarnings}`);
      console.log(`Net Salary: ${p.netSalary}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkMasterPayroll();
