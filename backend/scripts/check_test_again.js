
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkTest() {
  try {
    const uri = process.env.MONGODB_URI.replace('/employees', '/test');
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections in test:', collections.map(c => c.name));
    
    const payroll = await db.collection('payrolls').findOne({ employeeId: 'CDE088' });
    if (payroll) {
      console.log('Payroll in test found!');
      console.log('basicDA:', payroll.basicDA);
    }
    
    const appraisal = await db.collection('selfappraisals').findOne({ employeeId: 'CDE088' });
    if (appraisal) {
       console.log('Appraisal in test found!');
    }
    process.exit(0);
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
}

checkTest();
