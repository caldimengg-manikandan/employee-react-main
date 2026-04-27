
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkDryRun() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const rec = await db.collection('payroll_DRY_RUN').findOne({ employeeId: 'CDE088' });
    if (rec) {
      console.log('Dry Run found:', JSON.stringify(rec, null, 2));
    } else {
      console.log('No dry run record for CDE088');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDryRun();
