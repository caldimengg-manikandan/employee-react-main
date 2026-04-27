
const mongoose = require('mongoose');

async function checkHistoricalPFForCDE111() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    console.log('Checking Historical Data for CDE111 (ROHINI V)...');
    
    // Check FY24-25 Snapshot
    const snapshot = await db.collection('payroll_FY24-25').findOne({ employeeId: 'CDE111' });
    if (snapshot) {
        console.log('HISTORICAL PAYROLL (FY24-25):');
        console.log(`  PF (Total): ${snapshot.pf}`);
        console.log(`  Emp PF: ${snapshot.employeePfContribution}`);
        console.log(`  Empr PF: ${snapshot.employerPfContribution}`);
    } else {
        console.log('No FY24-25 snapshot found for CDE111.');
    }

    // Check Appraisals
    const appraisal = await db.collection('selfappraisals').findOne({ 
        employeeId: { $in: [new mongoose.Types.ObjectId('65f80b8529263158f712797e'), 'CDE111'] } // Just in case
    });
    // Let's search by name or ID properly
    const emp = await db.collection('employees').findOne({ employeeId: 'CDE111' });
    if (emp) {
        const app = await db.collection('selfappraisals').findOne({ employeeId: emp._id });
        if (app) {
            console.log('\nAPPRAISAL DATA:');
            console.log(`  Status: ${app.status}`);
            console.log(`  Increment: ${app.incrementPercentage}%`);
            console.log(`  Current Salary (in app): ${app.currentSalary}`);
            console.log(`  Revised Salary (in app): ${app.revisedSalary}`);
        }
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkHistoricalPFForCDE111();
