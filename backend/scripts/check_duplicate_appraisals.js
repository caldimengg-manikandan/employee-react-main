
const mongoose = require('mongoose');

async function checkDuplicateAppraisals() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const appraisals = await db.collection('selfappraisals').find({}).toArray();
    const counts = {};
    appraisals.forEach(a => {
        const key = a.employeeId.toString();
        counts[key] = (counts[key] || 0) + 1;
    });
    
    console.log('Employees with multiple appraisals:');
    for (const key in counts) {
        if (counts[key] > 1) {
            const emp = await db.collection('employees').findOne({ _id: new mongoose.Types.ObjectId(key) });
            console.log(`  ${emp.name} (${emp.employeeId}): ${counts[key]} appraisals`);
            
            const apps = appraisals.filter(a => a.employeeId.toString() === key);
            apps.forEach(a => {
                console.log(`    Status: ${a.status}, Incr: ${a.incrementPercentage}, Corr: ${a.incrementCorrectionPercentage}, Revised: ${a.revisedSalary}`);
            });
        }
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDuplicateAppraisals();
