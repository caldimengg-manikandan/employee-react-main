
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SelfAppraisal = require('../models/SelfAppraisal');

async function checkSpecific() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const app = await SelfAppraisal.findById('69cdfd42b650fdc5803f4f11');
    console.log('Specific Appraisal:', JSON.stringify(app, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSpecific();
