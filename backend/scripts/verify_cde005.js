const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function verify() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    const candidates = ['CDE005'];
    const collections = ['payroll_FY24-25', 'payrolls', 'employees'];

    for (const id of candidates) {
      console.log(`\n\n=== Status for ${id} ===`);
      for (const colName of collections) {
        const record = await db.collection(colName).findOne({ 
          $or: [{ employeeId: id }, { empId: id }] 
        });
        if (record) {
          console.log(`\nCollection: ${colName}`);
          console.log(`  employeePfContribution: ${record.employeePfContribution}`);
          console.log(`  employerPfContribution: ${record.employerPfContribution}`);
          console.log(`  professionalTax: ${record.professionalTax}`);
          console.log(`  totalDeductions: ${record.totalDeductions}`);
          console.log(`  netSalary: ${record.netSalary}`);
          console.log(`  totalEarnings: ${record.totalEarnings}`);
        }
      }
    }
    
    mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}
verify();
