
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function searchName() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    for (const colInfo of collections) {
      const col = db.collection(colInfo.name);
      const match = await col.findOne({ $or: [ { name: /LOGAPRASAATH/i }, { employeeName: /LOGAPRASAATH/i } ] });
      if (match) {
        console.log(`Found LOGAPRASAATH in ${colInfo.name}`);
        if (match.revisedSalary) console.log(`  Revised: ${match.revisedSalary}`);
        if (match.gross) console.log(`  Gross: ${match.gross}`);
        if (match.totalEarnings) console.log(`  TotalEarnings: ${match.totalEarnings}`);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

searchName();
