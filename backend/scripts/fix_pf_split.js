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
      console.log(`Fixing PF split in collection: ${colName}`);

      // We need to subtract 1950 from employeePfContribution because it currently holds the Total PF (Combined)
      // We only do this for records that have a valid contribution > 1950 to be safe, 
      // or simply all records since we just renamed them. 
      // NaveenKumar M had 6950. 6950 - 1950 = 5000.
      
      const result = await col.updateMany(
        { employeePfContribution: { $exists: true, $gt: 0 } },
        [
          {
            $set: {
              employeePfContribution: {
                $max: [0, { $subtract: ["$employeePfContribution", 1950] }]
              }
            }
          }
        ]
      );
      
      console.log(`  - Updated ${result.modifiedCount} documents in ${colName}.`);
    }

    console.log('Fix completed successfully.');
    mongoose.connection.close();
  } catch (err) {
    console.error('Adjustment Error:', err);
    process.exit(1);
  }
}

run();
