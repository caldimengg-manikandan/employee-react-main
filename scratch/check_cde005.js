const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const collections = ['payroll_FY24-25', 'payrolls'];
    
    for (const colName of collections) {
      console.log(`\n--- Collection: ${colName} ---`);
      const record = await db.collection(colName).findOne({ 
        $or: [
          { employeeId: 'CDE005' },
          { empId: 'CDE005' }
        ]
      });
      console.log(JSON.stringify(record, null, 2));
    }
    
    mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}
check();
