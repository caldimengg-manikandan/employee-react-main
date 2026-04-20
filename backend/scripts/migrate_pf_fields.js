const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const collections = ['payrolls', 'employees', 'payroll_FY24-25', 'payroll_FY25-26', 'payroll_DRY_RUN'];

    for (const colName of collections) {
      const col = db.collection(colName);
      console.log(`Migrating collection: ${colName}`);

      // 1. Rename 'pf' to 'employeePfContribution'
      const renameResult = await col.updateMany(
        { pf: { $exists: true } },
        { 
          $rename: { "pf": "employeePfContribution" }
        }
      );
      console.log(`  - Renamed 'pf' to 'employeePfContribution' in ${renameResult.modifiedCount} documents.`);

      // 2. Initialize 'employerPfContribution' to 1950 for any document that has employeePfContribution
      const initResult = await col.updateMany(
        { employeePfContribution: { $exists: true }, employerPfContribution: { $exists: false } },
        { 
          $set: { employerPfContribution: 1950 }
        }
      );
      console.log(`  - Initialized 'employerPfContribution' in ${initResult.modifiedCount} documents.`);
    }

    console.log('Migration completed successfully.');
    mongoose.connection.close();
  } catch (err) {
    console.error('Migration Error:', err);
    process.exit(1);
  }
}

run();
