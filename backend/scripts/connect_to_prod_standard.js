
const mongoose = require('mongoose');

async function connectToProdStandard() {
  // Constructing standard URI using shards
  const user = "caldimenggcloud_db_user";
  const pass = "Caldim12345678";
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const dbName = "employees";
  const uri = `mongodb://${user}:${pass}@${shards.join(',')}/${dbName}?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    console.log('Connecting to Production using Standard Connection String...');
    await mongoose.connect(uri, { 
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000 
    });
    console.log('Connected to Production successfully!');
    
    const db = mongoose.connection.db;
    
    // Find CDE088
    const emp = await db.collection('employees').findOne({ employeeId: 'CDE088' });
    if (emp) {
        console.log(`Found CDE088 (LOGAPRASAATH R) in Production.`);
        const app = await db.collection('selfappraisals').findOne({ employeeId: emp._id });
        if (app) {
            console.log(`PRODUCTION APPRAISAL DATA:`);
            console.log(`  Status: ${app.status}`);
            console.log(`  Increment: ${app.incrementPercentage}%`);
            console.log(`  Correction: ${app.incrementCorrectionPercentage}%`);
            console.log(`  Revised Salary (in app): ${app.revisedSalary}`);
        } else {
            console.log('No appraisal record found for CDE088 in Production.');
        }
    } else {
        console.log('CDE088 not found in Production employees collection.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
}

connectToProdStandard();
