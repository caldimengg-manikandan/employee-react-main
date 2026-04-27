
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkCompAll() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const comps = await db.collection('compensations').find({}).toArray();
    console.log('Compensations count:', comps.length);
    comps.forEach(c => console.log(c.employeeId || c.name));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkCompAll();
