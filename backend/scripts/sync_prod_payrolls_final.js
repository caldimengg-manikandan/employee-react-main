
const mongoose = require('mongoose');

async function syncProductionPayrollsCorrected() {
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

    const appraisals = await db.collection('selfappraisals').find({
        $or: [
            { incrementPercentage: { $gt: 0 } },
            { incrementCorrectionPercentage: { $gt: 0 } }
        ]
    }).toArray();

    console.log(`Found ${appraisals.length} appraisals to process.`);

    let updatedCount = 0;

    for (const app of appraisals) {
        const emp = await db.collection('employees').findOne({ _id: app.employeeId });
        if (!emp) continue;

        const empId = emp.employeeId;
        
        // ALWAYS calculate Gross from Snapshot to match Release Letter logic
        const snapshot = await db.collection('payroll_FY24-25').findOne({ 
            employeeId: { $regex: new RegExp(`^${empId}$`, 'i') } 
        });
        
        const currentGross = snapshot ? (snapshot.totalEarnings || 0) : (emp.ctc || 0);
        const totalPct = (app.incrementPercentage || 0) + (app.incrementCorrectionPercentage || 0);
        
        // Exact formula from Release Letter
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

        // ESI Check: Based on Net Take Home
        let esi = 0;
        if (netTakeHome < 21000) {
            esi = Math.round(revisedGross * 0.0075);
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

        if (empId === 'CDE088') {
            console.log(`Updated CDE088: Gross ${revisedGross}, Basic ${basic}, HRA ${hra}, Special ${special}, Net ${finalNet}, CTC ${ctc}`);
        }
        updatedCount++;
    }

    console.log(`\nProduction Sync Completed! Total Updated: ${updatedCount}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

syncProductionPayrollsCorrected();
