
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SelfAppraisal = require('../models/SelfAppraisal');

async function checkAllAppraisals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const appraisals = await SelfAppraisal.find({});
    console.log(`Total appraisals: ${appraisals.length}`);
    const years = [...new Set(appraisals.map(a => a.year))];
    console.log('Years:', years);
    
    appraisals.forEach(a => {
      if (a.incrementPercentage > 0 || a.revisedSalary > 0) {
        console.log(`Match: ${a._id}, Year: ${a.year}, Status: ${a.status}, Increment: ${a.incrementPercentage}, Revised: ${a.revisedSalary}`);
      }
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAllAppraisals();
