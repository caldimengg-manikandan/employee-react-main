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
      console.log(`Syncing totalDeductions in collection: ${colName}`);

      // We update totalDeductions to be the sum of Employee and Employer PF contributions.
      // We also ensure it's rounded correctly.
      
      const result = await col.updateMany(
        { 
          $or: [
            { employeePfContribution: { $exists: true } },
            { employerPfContribution: { $exists: true } }
          ]
        },
        [
          {
            $set: {
              totalDeductions: {
                $add: [
                  { $ifNull: ["$employeePfContribution", 0] },
                  { $ifNull: ["$employerPfContribution", 0] }
                ]
              }
            }
          }
        ]
      );
      
      console.log(`  - Updated ${result.modifiedCount} documents in ${colName}.`);
    }

    console.log('Sync completed successfully.');
    mongoose.connection.close();
  } catch (err) {
    console.error('Sync Error:', err);
    process.exit(1);
  }
}

run();
