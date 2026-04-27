
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function searchAmount() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    for (const colInfo of collections) {
      const col = db.collection(colInfo.name);
      const match = await col.findOne({ $or: [ { incrementAmount: 5225 }, { revisedSalary: 26125 }, { gross: 26125 } ] });
      if (match) {
        console.log(`Found match in ${colInfo.name}:`, match.employeeId || match.empId);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

searchAmount();
