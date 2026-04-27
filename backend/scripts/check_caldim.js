
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkCaldim() {
  try {
    const uri = process.env.MONGODB_URI.replace('/employees', '/caldim');
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const payroll = await db.collection('payrolls').findOne({ employeeId: 'CDE088' });
    if (payroll) {
      console.log('Caldim Payroll:', JSON.stringify(payroll, null, 2));
    } else {
      console.log('No CDE088 payroll in caldim');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkCaldim();
