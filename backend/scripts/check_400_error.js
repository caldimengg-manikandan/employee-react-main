
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Compensation = require('../models/Compensation');
const Employee = require('../models/Employee');

async function checkRecord() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employees';
    await mongoose.connect(uri);
    
    const id = '69df0fbcaee8372ec67ed16a';
    const comp = await Compensation.findById(id);
    
    if (!comp) {
      console.log('Compensation record not found.');
      process.exit();
    }

    console.log('Compensation Record:');
    console.log(JSON.stringify(comp, null, 2));

    const employee = await Employee.findOne({ 
      $or: [
        { employeeId: comp.employeeId },
        { name: comp.name }
      ]
    });

    if (employee) {
      console.log('\nLinked Employee:');
      console.log(`Name: ${employee.name}`);
      console.log(`Status: ${employee.status}`);
      console.log(`ID: ${employee.employeeId}`);
    } else {
      console.log('\nNo linked employee found.');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkRecord();
