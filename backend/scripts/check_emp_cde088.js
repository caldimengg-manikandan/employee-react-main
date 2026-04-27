
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Employee = require('../models/Employee');

async function checkEmpCDE088() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const emp = await Employee.findOne({ employeeId: 'CDE088' });
    console.log('Employee CDE088:', JSON.stringify(emp, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkEmpCDE088();
