
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SelfAppraisal = require('../models/SelfAppraisal');
const Employee = require('../models/Employee');

async function findCDE088() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const emp = await Employee.findOne({ employeeId: 'CDE088' });
    if (!emp) {
      console.log('Employee CDE088 not found');
      process.exit(0);
    }
    console.log('Employee found:', emp.name);
    const appraisals = await SelfAppraisal.find({ employeeId: emp._id });
    console.log(`Found ${appraisals.length} appraisals for CDE088`);
    appraisals.forEach(a => {
      console.log(`ID: ${a._id}, Year: ${a.year}, Status: ${a.status}, Revised: ${a.revisedSalary}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findCDE088();
