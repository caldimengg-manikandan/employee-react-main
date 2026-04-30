
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function getEmpDetails() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employees';
    await mongoose.connect(uri);
    
    const empIds = ['CDE075', 'CDE082', 'CDE015', 'CDE004'];
    const emps = await mongoose.connection.db.collection('employees')
      .find({ employeeId: { $in: empIds } })
      .toArray();

    const oids = emps.map(e => e._id);
    
    const appraisals = await mongoose.connection.db.collection('selfappraisals')
      .find({ 
        $or: [
          { employeeId: { $in: oids } },
          { empId: { $in: empIds } }
        ]
      })
      .toArray();

    console.log(`Found ${appraisals.length} appraisal records.`);
    
    appraisals.forEach(a => {
      console.log(`\nEmployee Ref: ${a.empId || a.employeeId}`);
      console.log(`Revised Snapshot:`, JSON.stringify(a.releaseRevisedSnapshot, null, 2));
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

getEmpDetails();
