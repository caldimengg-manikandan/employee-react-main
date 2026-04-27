
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SelfAppraisal = require('../models/SelfAppraisal');
const Employee = require('../models/Employee');

async function checkReviewerApproved() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const appraisals = await SelfAppraisal.find({ status: 'reviewerApproved' }).populate('employeeId');
    console.log(`Found ${appraisals.length} reviewerApproved appraisals.`);
    appraisals.forEach(a => {
      console.log(`Employee: ${a.employeeId?.name} (${a.employeeId?.employeeId})`);
      console.log(`  Increment: ${a.incrementPercentage}, Correction: ${a.incrementCorrectionPercentage}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkReviewerApproved();
