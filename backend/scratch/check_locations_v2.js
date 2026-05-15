const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Employee = require('../models/Employee');

async function checkEmployees() {
  try {
    // Use the URI from .env
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employees';
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const ids = ['CDE092', 'CDE100'];
    const emps = await Employee.find({ employeeId: { $in: ids } });

    console.log('--- Employee Records ---');
    if (emps.length === 0) {
      console.log('No employees found with IDs:', ids);
    }
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
