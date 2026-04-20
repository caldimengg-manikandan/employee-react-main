const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function searchAllForCDE007() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const collections = await db.listCollections().toArray();
    for (const collInfo of collections) {
      if(collInfo.type === 'view') continue;
      
      const coll = db.collection(collInfo.name);
      const docs = await coll.find({
        $or: [
          { employeeId: 'CDE007' },
          { empId: 'CDE007' }
        ]
      }).toArray();
      
      if(docs.length > 0) {
        console.log(`\n=== Found CDE007 in ${collInfo.name} ===`);
        docs.forEach(d => {
           console.log(`Current Salary: ${d.currentSalary}`);
           console.log(`Total Earnings: ${d.totalEarnings}`);
           console.log(`Increment % / Total Increment: ${d.incrementPercentage} / ${d.totalIncrementPercentage}`);
           console.log(`Gross from Snapshot: ${d.snapshot ? d.snapshot.totalEarnings : 'none'}`);
        });
      }
    }

    mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

searchAllForCDE007();
