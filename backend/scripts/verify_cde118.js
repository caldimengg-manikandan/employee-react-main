
const mongoose = require('mongoose');

async function verifyCDE118() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const payroll = await db.collection('payrolls').findOne({ employeeId: 'CDE118' });
    if (payroll) {
        console.log('VERIFIED PAYROLL FOR CDE118 (Non-Appraisal):');
        console.log(`  Gross: ${payroll.totalEarnings}`);
        console.log(`  Basic: ${payroll.basicDA}`);
        console.log(`  HRA: ${payroll.hra}`);
        console.log(`  Special: ${payroll.specialAllowance}`);
        console.log(`  ESI: ${payroll.esi}`);
        console.log(`  Net: ${payroll.netSalary}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verifyCDE118();
