
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkEmpMgmtPayroll() {
  try {
    const uri = process.env.MONGODB_URI.replace('/employees', '/employee-management');
    console.log('Connecting to:', uri);
    const conn = await mongoose.createConnection(uri).asPromise();
    const payrolls = await conn.collection('payrolls').findOne({ employeeId: 'CDE088' });
    if (payrolls) {
      console.log('Payroll in employee-management:', JSON.stringify(payrolls, null, 2));
    } else {
      console.log('Payroll for CDE088 not found in employee-management');
    }
    await conn.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkEmpMgmtPayroll();
