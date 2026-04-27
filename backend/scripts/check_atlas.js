
const mongoose = require('mongoose');

async function checkAtlas() {
  const uri = "mongodb+srv://caldimenggcloud_db_user:Caldim12345678@cluster0.wwy0lqb.mongodb.net/?appName=Cluster0";
  try {
    console.log('Connecting to Atlas...');
    await mongoose.connect(uri);
    const admin = mongoose.connection.db.admin();
    const dbs = await admin.listDatabases();
    console.log('Atlas Databases:', dbs.databases.map(d => d.name));
    process.exit(0);
  } catch (err) {
    console.error('Atlas connection failed:', err.message);
    process.exit(1);
  }
}

checkAtlas();
