
const mongoose = require('mongoose');

async function verifyFinalPF() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const payroll = await db.collection('payrolls').findOne({ employeeId: 'CDE088' });
    if (payroll) {
        console.log('FINAL PAYROLL FOR CDE088 (Appraised):');
        console.log(`  PF (Legacy Field): ${payroll.pf}`);
        console.log(`  Total Deductions: ${payroll.totalDeductions}`);
        console.log(`  Emp PF: ${payroll.employeePfContribution}`);
        console.log(`  Empr PF: ${payroll.employerPfContribution}`);
        console.log(`  Special Allowance: ${payroll.specialAllowance}`);
    }

    const payrollNonApp = await db.collection('payrolls').findOne({ employeeId: 'CDE018' });
    if (payrollNonApp) {
        console.log('\nFINAL PAYROLL FOR CDE018 (Non-Appraisal):');
        console.log(`  PF (Legacy Field): ${payrollNonApp.pf}`);
        console.log(`  Total Deductions: ${payrollNonApp.totalDeductions}`);
        console.log(`  Emp PF: ${payrollNonApp.employeePfContribution}`);
        console.log(`  Empr PF: ${payrollNonApp.employerPfContribution}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verifyFinalPF();
