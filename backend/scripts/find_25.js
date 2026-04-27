
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SelfAppraisal = require('../models/SelfAppraisal');

async function find25() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const appraisals = await SelfAppraisal.find({ incrementPercentage: 25 });
    console.log(`Found ${appraisals.length} appraisals with 25% increment.`);
    appraisals.forEach(a => console.log(`Employee ObjectId: ${a.employeeId}`));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

find25();
