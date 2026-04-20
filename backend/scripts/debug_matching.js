const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const apps = await db.collection('selfappraisals').find({
      status: { $in: ['effective', 'accepted', 'released'] }
    }).toArray();

    console.log('Appraisals found:', apps.length);
    for (const app of apps) {
      console.log(`Appraisal _id: ${app._id}`);
      console.log(`  - employeeId: ${app.employeeId} (type: ${typeof app.employeeId})`);
      console.log(`  - empId: ${app.empId}`);
      console.log(`  - employeeIdValue: ${app.employeeIdValue}`);
      
      if (app.employeeId && mongoose.Types.ObjectId.isValid(app.employeeId)) {
          const emp = await db.collection('employees').findOne({ _id: app.employeeId });
          if (emp) {
              console.log(`  - Found Employee Record: ID=${emp.employeeId}, Name=${emp.name}`);
          } else {
              console.log(`  - Employee record NOT found for ObjectId ${app.employeeId}`);
          }
      }
    }

    const firstSnapshots = await db.collection('payroll_FY24-25').find({}).limit(5).toArray();
    console.log('Sample Snapshot employeeIds:', firstSnapshots.map(s => s.employeeId));

    mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}
run();
