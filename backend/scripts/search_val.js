
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function searchVal() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    for (const colInfo of collections) {
      const col = db.collection(colInfo.name);
      const match = await col.findOne({ $or: [ { revisedSalary: 26125 }, { gross: 26125 }, { totalEarnings: 26125 } ] });
      if (match) {
        console.log(`Found 26125 in ${colInfo.name}:`, match.employeeId || match.empId);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

searchVal();
