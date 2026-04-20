const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const collections = ['payroll_FY24-25', 'payrolls'];
    
    for (const colName of collections) {
      console.log(`\n--- Collection: ${colName} ---`);
      const record = await db.collection(colName).findOne({});
      if (record) {
          console.log("Found keys:", Object.keys(record));
          console.log("Sample values:");
          console.log(`  employeePfContribution: ${record.employeePfContribution}`);
          console.log(`  employerPfContribution: ${record.employerPfContribution}`);
          console.log(`  totalDeductions: ${record.totalDeductions}`);
          console.log(`  deductions: ${record.deductions}`);
      }
    }
    
    mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}
check();
