
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SelfAppraisal = require('../models/SelfAppraisal');
const Employee = require('../models/Employee');

async function checkSnapshots() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const emp = await Employee.findOne({ employeeId: 'CDE088' });
    const app = await SelfAppraisal.findOne({ employeeId: emp._id });
    if (app) {
      console.log('Appraisal ID:', app._id);
      console.log('Status:', app.status);
      console.log('releaseRevisedSnapshot:', JSON.stringify(app.releaseRevisedSnapshot, null, 2));
      console.log('releaseSalarySnapshot:', JSON.stringify(app.releaseSalarySnapshot, null, 2));
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSnapshots();
