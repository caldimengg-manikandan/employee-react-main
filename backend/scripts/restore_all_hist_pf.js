
const mongoose = require('mongoose');

async function restoreAllHistoricalPF() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    console.log('Restoring Historical PF for ALL employees to preserve voluntary detections...');

    const payrolls = await db.collection('payrolls').find({}).toArray();
    const snapshots = await db.collection('payroll_FY24-25').find({}).toArray();

    let restoredCount = 0;

    for (const payroll of payrolls) {
        const empId = payroll.employeeId;
        const snapshot = snapshots.find(s => s.employeeId.toLowerCase() === empId.toLowerCase());

        if (snapshot) {
            const histPF = Number(snapshot.pf || 3750);
            
            // We restore if it's different from what's currently there
            // OR if it's the first time we're doing this full restoration
            console.log(`  [${empId}] Restoring Historical PF: ₹${histPF}`);
            
            const gross = Number(payroll.totalEarnings || 0);
            const basic = Math.round(gross * 0.50);
            const hra = Math.round(gross * 0.25);
            
            const esi = Number(payroll.esi || 0);
            const totalPF = histPF;
            const empPF = 1800;
            const emprPF = totalPF - empPF;

            const totalDeductions = totalPF + esi + Number(payroll.professionalTax || 0) + Number(payroll.tax || 0) + Number(payroll.loanDeduction || 0) + Number(payroll.lop || 0);
            const netSalary = gross - totalDeductions;
            
            const special = Math.max(0, gross - basic - hra - totalPF - esi);
            const gratuity = Math.round(basic * 0.0486);
            const ctc = gross + gratuity;

            await db.collection('payrolls').updateOne(
                { _id: payroll._id },
                {
                    $set: {
                        basicDA: basic,
                        hra: hra,
                        specialAllowance: special,
                        pf: totalPF,
                        employeePfContribution: empPF,
                        employerPfContribution: emprPF,
                        totalDeductions: totalDeductions,
                        netSalary: netSalary,
                        gratuity: gratuity,
                        ctc: ctc
                    }
                }
            );
            restoredCount++;
        }
    }

    console.log(`\nPF Restoration Completed! Total Profiles Updated: ${restoredCount}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

restoreAllHistoricalPF();
