const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Employee = require('../models/Employee');

async function checkEmployees() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employee-management');
    console.log('Connected to MongoDB');

    const ids = ['CDE092', 'CDE100'];
    const emps = await Employee.find({ employeeId: { $in: ids } });

    console.log('--- Employee Records ---');
    emps.forEach(e => {
      console.log(`ID: ${e.employeeId}, Name: ${e.name}, Location: ${e.location}`);
    });

    await mongoose.disconnect();
    console.log('Disconnected');
  } catch (err) {
    console.error(err);
  }
}

checkEmployees();
