
const mongoose = require('mongoose');

async function fixAnniePayroll() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    console.log('Fixing Payroll for ANNIE ROSELINE H (CDE018)...');

    const gross = 15900;
    const basic = 7950;
    const hra = 3975;
    
    // Applying the Rohini logic: Total Deductions = 3420
    const totalDeductions = 3420;
    const esi = 636;
    const totalPF = totalDeductions - esi; // 2784
    const empPF = 1800;
    const emprPF = totalPF - empPF; // 984

    const netSalary = gross - totalDeductions; // 12480
    const special = gross - basic - hra - totalPF - esi; // 555
    const gratuity = Math.round(basic * 0.0486);
    const ctc = gross + gratuity;

    await db.collection('payrolls').updateOne(
        { employeeId: 'CDE018' },
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
                ctc: ctc
            }
        }
    );

    console.log('SUCCESS: CDE018 payroll updated to match historical total deduction.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixAnniePayroll();
