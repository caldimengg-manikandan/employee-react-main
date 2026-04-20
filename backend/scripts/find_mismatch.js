const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function findDeductionMismatch() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const collections = ['payrolls', 'employees', 'payroll_FY24-25', 'payroll_FY25-26', 'payroll_DRY_RUN'];

    for (const colName of collections) {
      console.log(`\n--- Searching collection: ${colName} ---`);
      const records = await db.collection(colName).find({ totalDeductions: 1950 }).toArray();
      if (records.length > 0) {
        console.log(`Found ${records.length} records with totalDeductions: 1950`);
        records.slice(0, 5).forEach(r => {
          console.log(`  ID: ${r._id} | EmpId: ${r.employeeId || r.empId} | Name: ${r.employeeName || r.name}`);
          console.log(`  EmpPF: ${r.employeePfContribution} | EmprPF: ${r.employerPfContribution} | PT: ${r.professionalTax}`);
        });
      } else {
        console.log("No records found.");
      }
    }

    mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

findDeductionMismatch();
