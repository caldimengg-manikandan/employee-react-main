
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function findGlobal() {
  const dbs = ['admin', 'caldim', 'employee-management', 'employees', 'management_portal', 'test'];
  const targetId = "694287ff48a70f72c9592494";
  
  for (const dbName of dbs) {
    try {
      const uri = process.env.MONGODB_URI.replace('/employees', `/${dbName}`);
      const conn = await mongoose.createConnection(uri).asPromise();
      const payroll = await conn.collection('payrolls').findOne({ _id: new mongoose.Types.ObjectId(targetId) });
      if (payroll) {
        console.log(`Found in ${dbName}:`, payroll.basicDA);
      }
      await conn.close();
    } catch (e) {}
  }
  process.exit(0);
}

findGlobal();
