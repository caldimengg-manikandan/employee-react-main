
const mongoose = require('mongoose');

async function fixESI4Percent() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    console.log('Connecting to Production Atlas...');
    await mongoose.connect(uri);
    console.log('Connected.');

    const db = mongoose.connection.db;
    const payrolls = await db.collection('payrolls').find({}).toArray();

    console.log(`Processing ESI update for ${payrolls.length} employees...`);

    let updatedCount = 0;

    for (const payroll of payrolls) {
        const gross = Number(payroll.totalEarnings || 0);
        
        // ESI Logic: Exactly 4% of Gross if Gross < 21000
        let esi = 0;
        if (gross < 21000) {
            esi = Math.round(gross * 0.04);
            console.log(`  ${payroll.employeeId}: ESI Eligible (Gross ${gross} < 21000). Setting ESI to 4% (₹${esi})`);
        } else {
            esi = 0;
        }

        // Re-calculate Net
        // Net = Gross - EmpPF - ESI - PT - Tax - Loan - LOP
        const empPF = Number(payroll.employeePfContribution || 1800);
        const pt = Number(payroll.professionalTax || 0);
        const tax = Number(payroll.tax || 0);
        const loan = Number(payroll.loanDeduction || 0);
        const lop = Number(payroll.lop || 0);

        const totalDeductions = empPF + Number(payroll.employerPfContribution || 1950) + esi + pt + tax + loan + lop;
        const finalNet = gross - totalDeductions;

        await db.collection('payrolls').updateOne(
            { _id: payroll._id },
            {
                $set: {
                    esi: esi,
                    totalDeductions: totalDeductions,
                    netSalary: finalNet
                }
            }
        );

        updatedCount++;
    }

    console.log(`\nESI 4% Update Completed! Total Updated: ${updatedCount}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixESI4Percent();
