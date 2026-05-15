const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const HolidayAllowance = require('../models/HolidayAllowance');

async function checkAllowances() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employees';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const ids = ['CDE092', 'CDE100'];
    const records = await HolidayAllowance.find({ employeeId: { $in: ids }, month: 1, year: 2026 });

    console.log('--- HolidayAllowance Records (Jan 2026) ---');
    records.forEach(r => {
      console.log(`ID: ${r.employeeId}, Location: ${r.location}, Division: ${r.division}`);
    });

    await mongoose.disconnect();
    console.log('Disconnected');
  } catch (err) {
    console.error(err);
  }
}

checkAllowances();
