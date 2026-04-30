
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkCompensation() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employees';
    await mongoose.connect(uri);
    
    const empIds = ['CDE075', 'CDE082', 'CDE015', 'CDE004'];
    const comps = await mongoose.connection.db.collection('compensations')
      .find({ employeeId: { $in: empIds } })
      .toArray();

    console.log(`Found ${comps.length} compensation records.`);
    
    comps.forEach(c => {
      console.log(`\nEmployee: ${c.employeeId}`);
      console.log(`PF: ${c.pf}`);
      console.log(`Emp PF: ${c.employeePfContribution}`);
      console.log(`Emr PF: ${c.employerPfContribution}`);
      console.log(`Volunteer PF: ${c.volunteerPF}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkCompensation();
