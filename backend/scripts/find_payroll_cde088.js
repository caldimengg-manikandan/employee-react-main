
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Payroll = require('../models/Payroll');

async function findPayrollCDE088() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const rec = await Payroll.findOne({ employeeId: 'CDE088' });
    if (rec) {
      console.log('Payroll found:', JSON.stringify(rec, null, 2));
    } else {
      console.log('Payroll for CDE088 not found');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findPayrollCDE088();
