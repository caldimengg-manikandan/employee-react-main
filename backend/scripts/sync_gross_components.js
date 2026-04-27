
const mongoose = require('mongoose');

async function syncToGrossComponents() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    console.log('Syncing all payroll records to Gross Components (50/25/25)...');

    const payrolls = await db.collection('payrolls').find({}).toArray();

    for (const p of payrolls) {
        const gross = Number(p.totalEarnings || 0);
        if (gross === 0) continue;

        const basic = Math.round(gross * 0.5);
        const hra = Math.round(gross * 0.25);
        const special = gross - basic - hra;

        // Re-calculate Net to ensure consistency
        const pf = Number(p.pf || 0);
        const esi = Number(p.esi || 0);
        const pt = Number(p.professionalTax || 0);
        const tax = Number(p.tax || 0);
        const loan = Number(p.loanDeduction || 0);
        
        const totalDed = pf + esi + pt + tax + loan;
        const net = gross - totalDed;

        await db.collection('payrolls').updateOne(
            { _id: p._id },
            { 
                $set: { 
                    basicDA: basic,
                    hra: hra,
                    specialAllowance: special,
                    totalDeductions: totalDed,
                    netSalary: net
                } 
            }
        );
    }

    console.log(`Successfully synced ${payrolls.length} records to Gross Components.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

syncToGrossComponents();
