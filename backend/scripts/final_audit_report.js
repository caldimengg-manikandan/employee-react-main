
const mongoose = require('mongoose');

async function generateFinalAudit() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const payrolls = await db.collection('payrolls').find({}).toArray();
    const snapshots = await db.collection('payroll_FY24-25').find({}).toArray();

    console.log('FINAL PAYROLL AUDIT REPORT (Production Atlas)');
    console.log('-------------------------------------------------------------------------------------------------------');
    console.log('Emp ID | Name                | Gross  | PF     | ESI    | Total Ded | Net Salary | Hist Ded | Diff');
    console.log('-------------------------------------------------------------------------------------------------------');

    let totalDiff = 0;

    for (const p of payrolls) {
        const snap = snapshots.find(s => s.employeeId.toLowerCase() === p.employeeId.toLowerCase());
        const histDed = snap ? Number(snap.pf || 0) + Number(snap.esi || 0) + Number(snap.professionalTax || 0) : 0;
        const currentDed = Number(p.totalDeductions || 0);
        const diff = currentDed - histDed;
        totalDiff += Math.abs(diff);

        const name = (p.employeeName || p.name || 'Unknown').padEnd(20).substring(0, 20);
        console.log(`${p.employeeId.padEnd(6)} | ${name} | ${String(p.totalEarnings).padEnd(6)} | ${String(p.pf).padEnd(6)} | ${String(p.esi).padEnd(6)} | ${String(currentDed).padEnd(9)} | ${String(p.netSalary).padEnd(10)} | ${String(histDed).padEnd(8)} | ${diff > 0 ? '+' : ''}${diff}`);
    }

    console.log('-------------------------------------------------------------------------------------------------------');
    console.log(`Audit finished. Total absolute discrepancy across organization: ₹${totalDiff}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

generateFinalAudit();
