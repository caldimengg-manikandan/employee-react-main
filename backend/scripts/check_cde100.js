
const mongoose = require('mongoose');

async function checkCDE100() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const emp = await db.collection('employees').findOne({ employeeId: 'CDE100' });
    if (!emp) {
        console.log('CDE100 not found');
        process.exit(0);
    }
    
    console.log(`Employee: ${emp.name} (${emp.employeeId})`);
    
    const app = await db.collection('selfappraisals').findOne({ employeeId: emp._id });
    if (app) {
        console.log(`Appraisal: Status ${app.status}, Incr ${app.incrementPercentage}%, Corr ${app.incrementCorrectionPercentage}%`);
    }
    
    const snap = await db.collection('payroll_FY24-25').findOne({ employeeId: 'CDE100' });
    if (snap) {
        console.log(`Snapshot Gross: ${snap.totalEarnings}`);
    }
    
    const payroll = await db.collection('payrolls').findOne({ employeeId: 'CDE100' });
    if (payroll) {
        console.log(`Current Payroll Gross: ${payroll.totalEarnings}, Net: ${payroll.netSalary}, ESI: ${payroll.esi}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkCDE100();
