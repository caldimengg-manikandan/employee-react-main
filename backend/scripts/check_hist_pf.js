
const mongoose = require('mongoose');

async function checkHistoricalPF() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const snapshot = await db.collection('payroll_FY24-25').findOne({ employeeId: 'CDE088' });
    if (snapshot) {
        console.log('HISTORICAL PAYROLL FOR CDE088:');
        console.log(`  PF (Total): ${snapshot.pf}`);
        console.log(`  Emp PF: ${snapshot.employeePfContribution}`);
        console.log(`  Empr PF: ${snapshot.employerPfContribution}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkHistoricalPF();
