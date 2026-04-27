
const mongoose = require('mongoose');

async function checkAtlasTest() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    // Find CDE088
    const emp = await db.collection('employees').findOne({ employeeId: 'CDE088' });
    if (emp) {
        console.log(`Found CDE088 (LOGAPRASAATH R) in Atlas 'test' database.`);
        const app = await db.collection('selfappraisals').findOne({ employeeId: emp._id });
        if (app) {
            console.log(`PRODUCTION APPRAISAL DATA (Atlas):`);
            console.log(`  Status: ${app.status}`);
            console.log(`  Increment: ${app.incrementPercentage}%`);
            console.log(`  Correction: ${app.incrementCorrectionPercentage}%`);
            console.log(`  Revised Salary (in app): ${app.revisedSalary}`);
        } else {
            console.log('No appraisal record found for CDE088 in Atlas.');
        }
    } else {
        console.log('CDE088 not found in Atlas employees collection.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAtlasTest();
