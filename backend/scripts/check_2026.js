
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SelfAppraisal = require('../models/SelfAppraisal');

async function check2026() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const appraisals = await SelfAppraisal.find({ year: '2026-27' });
    console.log(`Found ${appraisals.length} appraisals for 2026-27`);
    appraisals.forEach(a => {
      console.log(`Match: ${a._id}, Incr: ${a.incrementPercentage}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check2026();
