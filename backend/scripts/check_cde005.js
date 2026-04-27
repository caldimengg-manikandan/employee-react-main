
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Payroll = require('../models/Payroll');

async function checkCDE005() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const rec = await Payroll.findOne({ employeeId: 'CDE005' });
    console.log('Payroll CDE005:', JSON.stringify(rec, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkCDE005();
