
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkCompensation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employees');
    const db = mongoose.connection.db;
    const rec = await db.collection('payrolls').findOne({ employeeId: 'CDE007' });
    if (rec) {
      console.log('Payroll record found for CDE007 (SAKTHIVEL G):', JSON.stringify(rec, null, 2));
    } else {
      console.log('No payroll record for CDE007');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkCompensation();
