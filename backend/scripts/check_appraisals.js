
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SelfAppraisal = require('../models/SelfAppraisal');

async function checkAppraisals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const appraisals = await SelfAppraisal.find({}).limit(10);
    console.log('Total appraisals found:', await SelfAppraisal.countDocuments());
    console.log('Statuses:', [...new Set(appraisals.map(a => a.status))]);
    console.log('Sample record:', JSON.stringify(appraisals[0], null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAppraisals();
