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
      console.log(`Syncing totalDeductions (Composite) in collection: ${colName}`);

      // Updated logic: totalDeductions = EmpPF + EmprPF + PT + ESI + Tax
      const result = await col.updateMany(
        { 
          $or: [
            { employeePfContribution: { $exists: true } },
            { employerPfContribution: { $exists: true } },
            { professionalTax: { $exists: true } }
          ]
        },
        [
          {
            $set: {
              totalDeductions: {
                $add: [
                  { $ifNull: ["$employeePfContribution", 0] },
                  { $ifNull: ["$employerPfContribution", 0] },
                  { $ifNull: ["$professionalTax", 0] },
                  { $ifNull: ["$esi", 0] },
                  { $ifNull: ["$tax", 0] }
                ]
              }
            }
          }
        ]
      );
      
      console.log(`  - Updated ${result.modifiedCount} documents in ${colName}.`);
    }

    console.log('Composite sync completed successfully.');
    mongoose.connection.close();
  } catch (err) {
    console.error('Sync Error:', err);
    process.exit(1);
  }
}

run();
