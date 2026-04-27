
const mongoose = require('mongoose');

async function syncProductionPayrollsStatusFiltered() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    console.log('Connecting to Production Atlas (test db)...');
    await mongoose.connect(uri);
    console.log('Connected to Production successfully.');

    const db = mongoose.connection.db;

    // Filter to ONLY finalized/effective statuses
    const validStatuses = ['effective', 'released', 'accepted', 'completed', 'directorApproved', 'DIRECTOR_APPROVED', 'reviewerApproved'];

    const appraisals = await db.collection('selfappraisals').find({
        status: { $in: validStatuses },
        $or: [
            { incrementPercentage: { $gt: 0 } },
            { incrementCorrectionPercentage: { $gt: 0 } }
        ]
    }).toArray();

    console.log(`Found ${appraisals.length} FINALIZED appraisals to process.`);

    let updatedCount = 0;

    for (const app of appraisals) {
        const emp = await db.collection('employees').findOne({ _id: app.employeeId });
        if (!emp) continue;

        const empId = emp.employeeId;
        
        const snapshot = await db.collection('payroll_FY24-25').findOne({ 
            employeeId: { $regex: new RegExp(`^${empId}$`, 'i') } 
        });
        
        const currentGross = snapshot ? (snapshot.totalEarnings || 0) : (emp.ctc || 0);
        const totalPct = (app.incrementPercentage || 0) + (app.incrementCorrectionPercentage || 0);
        const revisedGross = Math.round(currentGross * (1 + totalPct / 100));

        if (revisedGross <= 0) continue;

        // Structure: 50/25/25
        const basic = Math.round(revisedGross * 0.50);
        const hra = Math.round(revisedGross * 0.25);
        const empPF = 1800;
        const emprPF = 1950;
        const special = Math.max(0, revisedGross - basic - hra - empPF - emprPF);
        const netTakeHome = basic + hra + special;
        const gratuity = Math.round(basic * 0.0486);
        const ctc = revisedGross + gratuity;

        // ESI Check: Based on GROSS Salary (as corrected by user)
        let esi = 0;
        if (revisedGross < 21000) {
            esi = Math.round(revisedGross * 0.04);
        } else {
            esi = 0;
        }

        const payroll = await db.collection('payrolls').findOne({ employeeId: { $regex: new RegExp(`^${empId}$`, 'i') } });
        if (!payroll) continue;

        const pt = Number(payroll.professionalTax || 0);
        const tax = Number(payroll.tax || 0);
        const loan = Number(payroll.loanDeduction || 0);
        const lop = Number(payroll.lop || 0);

        const totalDeductions = empPF + emprPF + esi + pt + tax + loan + lop;
        const finalNet = revisedGross - totalDeductions;

        await db.collection('payrolls').updateOne(
            { _id: payroll._id },
            {
                $set: {
                    basicDA: basic,
                    hra: hra,
                    specialAllowance: special,
                    employeePfContribution: empPF,
                    employerPfContribution: emprPF,
                    esi: esi,
                    totalEarnings: revisedGross,
                    totalDeductions: totalDeductions,
                    netSalary: finalNet,
                    gratuity: gratuity,
                    ctc: ctc,
                    status: 'Pending'
                }
            }
        );

        updatedCount++;
    }

    console.log(`\nProduction Sync Completed! Total Finalized Records Updated: ${updatedCount}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

syncProductionPayrollsStatusFiltered();
