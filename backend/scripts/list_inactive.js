
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Employee = require('../models/Employee');

async function listInactive() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employees';
    await mongoose.connect(uri);
    
    const emps = await Employee.find({ status: { $ne: 'Active' } });
    console.log(JSON.stringify(emps.map(e => ({ name: e.name, status: e.status, id: e.employeeId })), null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

listInactive();
