
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkOtherDBs() {
  const dbs = ['caldim', 'management_portal'];
  try {
    for (const dbName of dbs) {
      const uri = `mongodb://127.0.0.1:27017/${dbName}`;
      console.log(`Checking ${dbName}...`);
      const conn = await mongoose.createConnection(uri).asPromise();
      const collections = await conn.db.listCollections().toArray();
      console.log(`  Collections in ${dbName}:`, collections.map(c => c.name));
      
      const appColl = collections.find(c => c.name === 'selfappraisals');
      if (appColl) {
        const count = await conn.db.collection('selfappraisals').countDocuments({});
        console.log(`  Found selfappraisals in ${dbName}! Count: ${count}`);
      }
      await conn.close();
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkOtherDBs();
