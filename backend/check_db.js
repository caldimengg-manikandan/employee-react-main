const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee-management';

async function check() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    const sample = await db.collection('payroll_FY24-25').findOne({});
    console.log('Sample from payroll_FY24-25:', JSON.stringify(sample, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
