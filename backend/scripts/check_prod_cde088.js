
const mongoose = require('mongoose');

async function checkProd() {
  // Using the URI from line 5 of .env
  const uri = "mongodb+srv://caldimenggcloud_db_user:Caldim12345678@cluster0.wwy0lqb.mongodb.net/employees";
  try {
    console.log('Connecting to Production Atlas...');
    await mongoose.connect(uri);
    console.log('Connected!');
    const db = mongoose.connection.db;
    
    // Find LOGAPRASAATH (CDE088)
    const emp = await db.collection('employees').findOne({ employeeId: 'CDE088' });
    if (emp) {
        console.log('Found CDE088 in Production!');
        const app = await db.collection('selfappraisals').findOne({ employeeId: emp._id });
        if (app) {
            console.log(`Production Appraisal for CDE088: Status ${app.status}, Incr ${app.incrementPercentage}%`);
        } else {
            console.log('No appraisal record found for CDE088 in Production.');
        }
    } else {
        console.log('CDE088 not found in Production.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Production Connection Error:', err.message);
    process.exit(1);
  }
}

checkProd();
