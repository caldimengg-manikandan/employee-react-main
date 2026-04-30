
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkEmployeePF() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employees';
    await mongoose.connect(uri);
    
    const empIds = ['CDE075', 'CDE082', 'CDE015', 'CDE004'];
    const emps = await mongoose.connection.db.collection('employees')
      .find({ employeeId: { $in: empIds } })
      .toArray();

    console.log(`Found ${emps.length} employee records.`);
    
    emps.forEach(e => {
      console.log(`\nEmployee: ${e.name} (${e.employeeId})`);
      console.log(`Basic: ${e.basicDA}`);
      console.log(`Emp PF: ${e.employeePfContribution}`);
      console.log(`Emr PF: ${e.employerPfContribution}`);
      console.log(`PF (legacy): ${e.pf}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkEmployeePF();
