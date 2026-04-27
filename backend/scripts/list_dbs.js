
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function listDBs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const admin = mongoose.connection.db.admin();
    const dbs = await admin.listDatabases();
    console.log('Databases:', dbs.databases.map(d => d.name));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listDBs();
