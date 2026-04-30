
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkDeductions() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employees';
    await mongoose.connect(uri);
    
    const empIds = ['CDE075', 'CDE082', 'CDE015', 'CDE004'];
    
    const monthlyPayrolls = await mongoose.connection.db.collection('monthlypayrolls')
      .find({ employeeId: { $in: empIds } })
      .sort({ salaryMonth: -1 })
      .toArray();

    console.log(`Found ${monthlyPayrolls.length} monthly payroll records.`);
    
    monthlyPayrolls.forEach(mp => {
      console.log(`\nEmployee: ${mp.employeeName} (${mp.employeeId})`);
      console.log(`Month: ${mp.salaryMonth}`);
      console.log(`Basic: ${mp.basicDA}`);
      console.log(`Emp PF: ${mp.employeePfContribution}`);
      console.log(`Emr PF: ${mp.employerPfContribution}`);
      console.log(`Total Deductions: ${mp.totalDeductions}`);
      console.log(`Net Salary: ${mp.netSalary}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkDeductions();
