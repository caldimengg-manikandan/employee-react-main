
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function searchGlobal() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    for (const colInfo of collections) {
      const col = db.collection(colInfo.name);
      const match = await col.findOne({ $or: [ { employeeId: 'CDE088' }, { empId: 'CDE088' } ] });
      if (match) {
        console.log(`Found CDE088 in ${colInfo.name}`);
        if (colInfo.name === 'selfappraisals') {
          console.log(`  Status: ${match.status}, Incr: ${match.incrementPercentage}, Corr: ${match.incrementCorrectionPercentage}`);
        }
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

searchGlobal();
