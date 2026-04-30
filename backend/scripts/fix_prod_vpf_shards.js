const mongoose = require('mongoose');

const shards = [
  "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
  "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
  "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
];
const ATLAS_URI = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;

async function fixProdVPF() {
  try {
    console.log('Connecting to Production Atlas Shards...');
    await mongoose.connect(ATLAS_URI);
    console.log('Connected!');

    const db = mongoose.connection.db;
    const payrolls = await db.collection('payrolls').find({}).toArray();
    console.log(`Found ${payrolls.length} records in 'test.payrolls'`);

    let updateCount = 0;
    for (const p of payrolls) {
      const empId = p.employeeId;
      const empPF = Number(p.employeePfContribution || 0);
      const emprPF = Number(p.employerPfContribution || 0);
      const stdPF = empPF + emprPF;
      
      let volunteerPF = Number(p.volunteerPF || 0);
      if (volunteerPF === 0 && p.pf > stdPF && stdPF > 0) {
        volunteerPF = p.pf - stdPF;
      }
      
      if (volunteerPF === 0) {
        const comp = await db.collection('compensations').findOne({ employeeId: empId });
        if (comp && comp.volunteerPF > 0) volunteerPF = comp.volunteerPF;
      }

      const totalDeductions = stdPF + Number(p.esi || 0) + Number(p.tax || 0) + Number(p.professionalTax || 0) + Number(p.loanDeduction || 0) + Number(p.lop || 0) + volunteerPF;

      if (Math.round(p.totalDeductions) !== Math.round(totalDeductions) || p.volunteerPF !== volunteerPF) {
        await db.collection('payrolls').updateOne(
          { _id: p._id },
          { $set: { 
              volunteerPF: volunteerPF, 
              totalDeductions: totalDeductions, 
              netSalary: Number(p.totalEarnings || 0) - totalDeductions,
              updatedAt: new Date()
            } 
          }
        );
        updateCount++;
        console.log(`Updated ${empId}: VPF=${volunteerPF}, TotalDed=${totalDeductions}`);
      }
    }
    
    console.log(`\nUpdated ${updateCount} records in Production.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

fixProdVPF();
