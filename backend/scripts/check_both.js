
const mongoose = require('mongoose');

async function checkBothCollections() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const empId = 'CDE111';
    
    const p = await db.collection('payrolls').findOne({ employeeId: empId });
    const e = await db.collection('employees').findOne({ employeeId: empId });
    
    console.log(`Checking data for ${empId}:`);
    
    if (p) {
        console.log('PAYROLL TABLE:');
        console.log(`  totalEarnings: ${p.totalEarnings}`);
        console.log(`  basicDA: ${p.basicDA}`);
        console.log(`  hra: ${p.hra}`);
        console.log(`  specialAllowance: ${p.specialAllowance}`);
        console.log(`  pf: ${p.pf}`);
        console.log(`  esi: ${p.esi}`);
    } else {
        console.log('PAYROLL TABLE: NOT FOUND');
    }
    
    if (e) {
        console.log('EMPLOYEE TABLE:');
        console.log(`  grossSalary: ${e.grossSalary}`);
        console.log(`  totalEarnings: ${e.totalEarnings}`);
        console.log(`  gross: ${e.gross}`);
        console.log(`  basic: ${e.basic}`);
        console.log(`  netSalary: ${e.netSalary}`);
    } else {
        console.log('EMPLOYEE TABLE: NOT FOUND');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkBothCollections();
