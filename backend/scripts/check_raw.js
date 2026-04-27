
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkRaw() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const appraisals = await db.collection('selfappraisals').find({}).toArray();
    console.log(`Found ${appraisals.length} appraisals`);
    
    // Find the one for CDE088 by matching the employeeId (ObjectId)
    const emp = await db.collection('employees').findOne({ employeeId: 'CDE088' });
    const app = appraisals.find(a => a.employeeId.toString() === emp._id.toString());
    
    if (app) {
      console.log('Raw Appraisal for CDE088:');
      console.log(`  Status: ${app.status}`);
      console.log(`  Increment: ${app.incrementPercentage}`);
      console.log(`  Correction: ${app.incrementCorrectionPercentage}`);
      console.log(`  Revised: ${app.revisedSalary}`);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkRaw();
