
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkEmpMgmt() {
  try {
    const uri = process.env.MONGODB_URI.replace('/employees', '/employee-management');
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const appraisals = await db.collection('selfappraisals').find({}).toArray();
    console.log('Appraisals in employee-management:', appraisals.length);
    appraisals.forEach(a => {
      if (a.incrementPercentage > 0) {
        console.log(`Match: ${a._id}, Increment: ${a.incrementPercentage}`);
      }
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkEmpMgmt();
