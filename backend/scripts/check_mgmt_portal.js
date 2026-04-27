
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkMgmtPortal() {
  try {
    const uri = process.env.MONGODB_URI.replace('/employees', '/management_portal');
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const payroll = await db.collection('payrolls').findOne({ employeeId: 'CDE088' });
    if (payroll) {
      console.log('MgmtPortal Payroll:', JSON.stringify(payroll, null, 2));
    } else {
      console.log('No CDE088 payroll in management_portal');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkMgmtPortal();
