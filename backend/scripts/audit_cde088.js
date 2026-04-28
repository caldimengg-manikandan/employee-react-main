const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function audit() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // Check ALL collections that have CDE088
  const collections = await db.listCollections().toArray();
  console.log(`Total collections: ${collections.length}\n`);

  for (const col of collections) {
    const name = col.name;
    try {
      const docs = await db.collection(name).find({ employeeId: /CDE088/i }).toArray();
      if (docs.length > 0) {
        console.log(`\n📁 Collection: ${name} (${docs.length} doc(s))`);
        for (const d of docs) {
          console.log(`   basicDA:${d.basicDA} hra:${d.hra} specialAllowance:${d.specialAllowance} pf:${d.pf} totalEarnings:${d.totalEarnings} empPF:${d.employeePfContribution} emrPF:${d.employerPfContribution}`);
        }
      }
    } catch (_) {}
  }

  // Also check for multiple payroll docs in the main payrolls collection
  const payrollDocs = await db.collection('payrolls').find({ employeeId: /CDE088/i }).toArray();
  console.log(`\n\n── Main 'payrolls' collection ──`);
  console.log(`Total docs for CDE088: ${payrollDocs.length}`);
  for (const d of payrollDocs) {
    console.log(JSON.stringify({
      _id: d._id,
      basicDA: d.basicDA,
      hra: d.hra,
      specialAllowance: d.specialAllowance,
      pf: d.pf,
      employeePfContribution: d.employeePfContribution,
      employerPfContribution: d.employerPfContribution,
      totalEarnings: d.totalEarnings,
      netSalary: d.netSalary,
      ctc: d.ctc
    }, null, 2));
  }

  process.exit(0);
}

audit().catch(e => { console.error(e); process.exit(1); });
