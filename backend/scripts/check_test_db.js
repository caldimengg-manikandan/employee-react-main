
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkOtherDB() {
  try {
    const uri = process.env.MONGODB_URI.replace('/employees', '/test');
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const appraisals = await db.collection('selfappraisals').find({}).toArray();
    console.log('Appraisals in test:', appraisals.length);
    if (appraisals.length > 0) {
      console.log('Statuses:', [...new Set(appraisals.map(a => a.status))]);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkOtherDB();
