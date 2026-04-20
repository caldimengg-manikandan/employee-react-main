const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function findCDE007Appraisal() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const appraisals = await db.collection('selfappraisals').find({ 
      $or: [{ employeeId: 'CDE007' }, { empId: 'CDE007' }] 
    }).toArray();
    
    if(appraisals.length > 0) {
       console.log("Found CDE007 Appraisal:");
       const app = appraisals[0];
       console.log("Current Salary:", app.currentSalary);
       console.log("Increment %:", app.incrementPercentage);
       console.log("Increment Correction %:", app.incrementCorrectionPercentage);
    } else {
       console.log("No appraisal found for CDE007");
    }

    mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

findCDE007Appraisal();
