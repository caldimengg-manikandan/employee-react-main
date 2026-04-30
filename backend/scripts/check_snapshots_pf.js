
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkSnapshots() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employees';
    await mongoose.connect(uri);
    
    const empIds = ['CDE075', 'CDE082', 'CDE015', 'CDE004'];
    
    const appraisals = await mongoose.connection.db.collection('selfappraisals')
      .find({ empId: { $in: empIds } })
      .toArray();

    console.log(`Found ${appraisals.length} appraisal records.`);
    
    appraisals.forEach(a => {
      console.log(`\nEmployee: ${a.empId}`);
      console.log(`Revised Snapshot:`, a.releaseRevisedSnapshot);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkSnapshots();
