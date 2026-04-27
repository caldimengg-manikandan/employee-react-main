
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Payroll = require('../models/Payroll');

async function checkDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const payrolls = await Payroll.find({ employeeId: 'CDE088' });
    console.log(`Found ${payrolls.length} payroll records for CDE088`);
    payrolls.forEach(p => console.log(`ID: ${p._id}, Gross: ${p.totalEarnings}, Basic: ${p.basicDA}`));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDuplicates();
