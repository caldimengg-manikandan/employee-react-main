
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SelfAppraisal = require('../models/SelfAppraisal');

async function countStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const stats = await SelfAppraisal.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    console.log('Status Counts:', stats);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

countStatus();
