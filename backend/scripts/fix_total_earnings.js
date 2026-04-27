
const mongoose = require('mongoose');

async function fixTotalEarningsOrgWide() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    console.log('Force-syncing totalEarnings to Gross Salary for all employees...');

    const payrolls = await db.collection('payrolls').find({}).toArray();

    let count = 0;
    for (const p of payrolls) {
        // Gross = Net + PF + ESI + PT + Tax + Loan
        // Or we can use the sum of components if we are sure they add up to Net.
        // Actually, the most reliable way is: 
        // Gross = Basic + HRA + Special Allowance (Net) + PF (Total) + ESI
        const gross = Number(p.basicDA || 0) + Number(p.hra || 0) + Number(p.specialAllowance || 0) + Number(p.pf || 0) + Number(p.esi || 0);
        
        await db.collection('payrolls').updateOne(
            { _id: p._id },
            { $set: { totalEarnings: gross } }
        );
        count++;
    }

    console.log(`Successfully updated totalEarnings for ${count} employees.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixTotalEarningsOrgWide();
