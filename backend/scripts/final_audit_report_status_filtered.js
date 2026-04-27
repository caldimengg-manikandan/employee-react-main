
const mongoose = require('mongoose');

async function runFinalAuditStatusFiltered() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    const validStatuses = ['effective', 'released', 'accepted', 'completed', 'directorApproved', 'DIRECTOR_APPROVED', 'reviewerApproved'];

    const appraisals = await db.collection('selfappraisals').find({
        status: { $in: validStatuses },
        $or: [
            { incrementPercentage: { $gt: 0 } },
            { incrementCorrectionPercentage: { $gt: 0 } }
        ]
    }).toArray();

    const payrolls = await db.collection('payrolls').find({}).toArray();
    const snapshots = await db.collection('payroll_FY24-25').find({}).toArray();
    const employees = await db.collection('employees').find({}).toArray();

    console.log(`\n=== FINAL STATUS-FILTERED AUDIT ===`);
    console.log(`Auditing ${appraisals.length} Finalized Appraisals...`);

    let matchCount = 0;
    let mismatchCount = 0;
    const mismatches = [];

    for (const app of appraisals) {
        const emp = employees.find(e => e._id.toString() === app.employeeId.toString());
        if (!emp) continue;

        const empId = emp.employeeId;
        const payroll = payrolls.find(p => p.employeeId.toLowerCase() === empId.toLowerCase());
        
        if (!payroll) {
            mismatches.push({ empId, name: emp.name, issue: 'MISSING PAYROLL' });
            continue;
        }

        const snapshot = snapshots.find(s => s.employeeId.toLowerCase() === empId.toLowerCase());
        const currentGross = snapshot ? (snapshot.totalEarnings || 0) : (emp.ctc || 0);
        const totalPct = (app.incrementPercentage || 0) + (app.incrementCorrectionPercentage || 0);
        const expectedGross = Math.round(currentGross * (1 + totalPct / 100));
        
        const expectedBasic = Math.round(expectedGross * 0.50);
        const expectedHRA = Math.round(expectedGross * 0.25);
        let expectedESI = (expectedGross < 21000) ? Math.round(expectedGross * 0.04) : 0;

        const actualGross = Number(payroll.totalEarnings || 0);
        const actualBasic = Number(payroll.basicDA || 0);
        const actualESI = Number(payroll.esi || 0);

        const isMatch = 
            actualGross === expectedGross &&
            actualBasic === expectedBasic &&
            actualESI === expectedESI;

        if (isMatch) {
            matchCount++;
        } else {
            mismatchCount++;
            mismatches.push({
                empId,
                name: emp.name,
                issue: 'DATA MISMATCH',
                details: `Expected Gross ${expectedGross} (got ${actualGross}), Basic ${expectedBasic} (got ${actualBasic}), ESI ${expectedESI} (got ${actualESI})`
            });
        }
    }

    console.log(`\nMatched: ${matchCount}`);
    console.log(`Mismatched: ${mismatchCount}`);

    if (mismatches.length > 0) {
        console.log(`\n--- DISCREPANCIES FOUND ---`);
        mismatches.forEach(m => {
            console.log(`[${m.empId}] ${m.name}: ${m.issue}`);
            if (m.details) console.log(`   ${m.details}`);
        });
    } else {
        console.log(`\n✅ SUCCESS: ALL FINALIZED APPRAISALS NOW MATCH THE PAYROLLS TABLE PERFECTLY!`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

runFinalAuditStatusFiltered();
