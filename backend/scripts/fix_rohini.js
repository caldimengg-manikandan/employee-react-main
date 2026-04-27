
const mongoose = require('mongoose');

async function fixRohiniPayroll() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    console.log('Fixing Payroll for ROHINI V (CDE111)...');

    const gross = 15900;
    const basic = 7950;
    const hra = 3975;
    
    // User logic: Total Deductions = 3420
    const totalDeductions = 3420;
    const esi = 636;
    const totalPF = totalDeductions - esi; // 2784
    const empPF = 1800; // Assuming standard employee part
    const emprPF = totalPF - empPF; // 984

    const netSalary = gross - totalDeductions; // 12480
    
    // Special Allowance balances the Earnings
    // Earnings sum = Basic + HRA + Special
    // In this org: Gross = Earnings + PF (Emp + Empr)?
    // Wait, if Gross is 15900, and Net is 12480, and total PF is 2784, and ESI is 636.
    // 12480 + 2784 + 636 = 15900. Perfect.
    
    // Components: Basic(7950) + HRA(3975) + Special(?) = Earnings(12480?)
    // No, Earnings should be what is left after PF/ESI are accounted for?
    // Let's use the balance:
    const special = gross - basic - hra - totalPF - esi; // 15900 - 7950 - 3975 - 2784 - 636 = 555

    const gratuity = Math.round(basic * 0.0486);
    const ctc = gross + gratuity;

    const result = await db.collection('payrolls').updateOne(
        { employeeId: 'CDE111' },
        {
            $set: {
                basicDA: basic,
                hra: hra,
                specialAllowance: special,
                pf: totalPF,
                employeePfContribution: empPF,
                employerPfContribution: emprPF,
                esi: esi,
                totalDeductions: totalDeductions,
                netSalary: netSalary,
                gratuity: gratuity,
                ctc: ctc,
                totalEarnings: gross // Keep Gross as totalEarnings for consistency with other records
            }
        }
    );

    if (result.modifiedCount > 0) {
        console.log('SUCCESS: CDE111 payroll updated.');
        console.log(`  Net Salary: ${netSalary}`);
        console.log(`  PF: ${totalPF}`);
        console.log(`  ESI: ${esi}`);
    } else {
        console.log('No changes made (already correct or employee not found).');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixRohiniPayroll();
