const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function queryCDE100() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const appraisals = await db.collection('selfappraisals').find({ 
      $or: [{ employeeId: 'CDE100' }, { empId: 'CDE100' }, { 'employeeId.employeeId': 'CDE100' }]
    }).toArray();
    
    // Also try joining the ObjectId
    const users = await db.collection('employees').find({ employeeId: 'CDE100' }).toArray();
    if(users.length > 0) {
      const uId = users[0]._id;
      const apps = await db.collection('selfappraisals').find({ employeeId: uId }).toArray();
      appraisals.push(...apps);
    }

    if(appraisals.length > 0) {
       console.log(`Found ${appraisals.length} appraisals for CDE100.`);
       appraisals.forEach(a => {
           console.log(JSON.stringify(a, null, 2));
       });
    } else {
       console.log("No appraisal found for CDE100");
    }

    mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

queryCDE100();
