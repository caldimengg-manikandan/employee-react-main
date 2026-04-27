
const mongoose = require('mongoose');

async function listProdEmps() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/employees?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const emps = await db.collection('employees').find({}).limit(5).toArray();
    console.log('Sample Employees in Production:');
    emps.forEach(e => console.log(`  ${e.name} (${e.employeeId})`));
    
    const count = await db.collection('employees').countDocuments({});
    console.log(`Total Employees in Production: ${count}`);
    
    // Search for LOGAPRASAATH by name
    const loga = await db.collection('employees').findOne({ name: { $regex: /LOGAPRASAATH/i } });
    if (loga) {
        console.log(`Found LOGAPRASAATH by name! ID: ${loga.employeeId}`);
    } else {
        console.log('Could not find LOGAPRASAATH by name.');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listProdEmps();
