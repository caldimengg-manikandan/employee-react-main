
const mongoose = require('mongoose');

async function connectToProd() {
  const uri = "mongodb+srv://caldimenggcloud_db_user:Caldim12345678@cluster0.wwy0lqb.mongodb.net/employees?retryWrites=true&w=majority";
  try {
    console.log('Connecting to Production Atlas...');
    await mongoose.connect(uri, { 
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000 
    });
    console.log('Connected to Production!');
    const db = mongoose.connection.db;
    const stats = await db.collection('selfappraisals').countDocuments({});
    console.log(`Total appraisals in Production: ${stats}`);
    
    // Check for CDE088
    const emp = await db.collection('employees').findOne({ employeeId: 'CDE088' });
    if (emp) {
        const app = await db.collection('selfappraisals').findOne({ employeeId: emp._id });
        if (app) {
            console.log(`CDE088 Appraisal found in Prod. Status: ${app.status}, Incr: ${app.incrementPercentage}`);
        }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Connection failed:', err.message);
    if (err.message.includes('ECONNREFUSED')) {
        console.log('TIP: It seems the IP address of this environment is not whitelisted in MongoDB Atlas.');
    }
    process.exit(1);
  }
}

connectToProd();
