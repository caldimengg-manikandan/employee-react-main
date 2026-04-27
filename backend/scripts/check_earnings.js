
const mongoose = require('mongoose');

async function checkTotalEarnings() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const p = await db.collection('payrolls').findOne({ employeeId: 'CDE110' });
    if (p) {
        console.log('CDE110 Record:');
        console.log(`  totalEarnings: ${p.totalEarnings}`);
        console.log(`  basicDA: ${p.basicDA}`);
        console.log(`  hra: ${p.hra}`);
        console.log(`  specialAllowance: ${p.specialAllowance}`);
        console.log(`  pf: ${p.pf}`);
        console.log(`  esi: ${p.esi}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkTotalEarnings();
