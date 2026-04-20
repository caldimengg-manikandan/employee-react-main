const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function verify() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const col = db.collection('payroll_FY24-25');
    
    const record = await col.findOne({ employeeId: 'CDE005' });
    console.log('Record for CDE005:');
    console.log(`  employeePfContribution: ${record.employeePfContribution}`);
    console.log(`  employerPfContribution: ${record.employerPfContribution}`);
    console.log(`  totalDeductions: ${record.totalDeductions}`);
    console.log(`  netSalary: ${record.netSalary}`);
    console.log(`  totalEarnings: ${record.totalEarnings}`);
    console.log(`  Math Check (Gross - Deductions = Net): ${record.totalEarnings} - ${record.totalDeductions} = ${record.totalEarnings - record.totalDeductions}`);
    
    mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}
verify();
