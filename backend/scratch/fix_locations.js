const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Employee = require('../models/Employee');
const HolidayAllowance = require('../models/HolidayAllowance');

async function fixLocations() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employees';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const ids = ['CDE092', 'CDE100'];
    
    // Update Employee Master
    const empResult = await Employee.updateMany(
      { employeeId: { $in: ids } },
      { $set: { location: 'Hosur' } }
    );
    console.log(`Updated ${empResult.modifiedCount} employees in Master to Hosur`);

    // Update existing HolidayAllowance records for these employees
    const allowanceResult = await HolidayAllowance.updateMany(
      { employeeId: { $in: ids } },
      { $set: { location: 'Hosur' } }
    );
    console.log(`Updated ${allowanceResult.modifiedCount} allowance records to Hosur`);

    await mongoose.disconnect();
    console.log('Disconnected');
  } catch (err) {
    console.error(err);
  }
}

fixLocations();
