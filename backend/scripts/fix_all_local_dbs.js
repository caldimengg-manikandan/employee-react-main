const mongoose = require('mongoose');

async function fixAllLocalDbs() {
  const dbsToCheck = ['employees', 'caldim', 'employee-management', 'management_portal'];
  
  for (const dbName of dbsToCheck) {
    try {
      const uri = `mongodb://127.0.0.1:27017/${dbName}`;
      console.log(`\n--- Checking Database: ${dbName} ---`);
      const conn = await mongoose.createConnection(uri).asPromise();
      
      const collections = await conn.db.listCollections().toArray();
      const hasPayrolls = collections.some(c => c.name === 'payrolls');
      
      if (!hasPayrolls) {
        console.log(`No 'payrolls' collection in ${dbName}. Skipping.`);
        await conn.close();
        continue;
      }
      
      const Payroll = conn.model('Payroll', new mongoose.Schema({}, { strict: false }), 'payrolls');
      const Compensation = conn.model('Compensation', new mongoose.Schema({}, { strict: false }), 'compensations');
      
      const payrolls = await Payroll.find({});
      console.log(`Found ${payrolls.length} payroll records in ${dbName}.`);
      
      let updateCount = 0;
      for (const p of payrolls) {
        const empPF = Number(p.employeePfContribution || 0);
        const emprPF = Number(p.employerPfContribution || 0);
        const stdPF = empPF + emprPF;
        const totalEarnings = Number(p.totalEarnings || 0);
        
        let vpf = Number(p.volunteerPF || 0);
        if (vpf === 0 && p.pf > stdPF && stdPF > 0) {
           vpf = p.pf - stdPF;
        }
        
        if (vpf === 0) {
           const comp = await Compensation.findOne({ employeeId: p.employeeId });
           if (comp && comp.volunteerPF > 0) vpf = comp.volunteerPF;
        }
        
        const correctDed = stdPF + Number(p.esi || 0) + Number(p.tax || 0) + Number(p.professionalTax || 0) + Number(p.loanDeduction || 0) + Number(p.lop || 0) + vpf;
        
        if (Math.round(p.totalDeductions) !== Math.round(correctDed) || p.volunteerPF !== vpf) {
          await Payroll.updateOne({ _id: p._id }, { 
            $set: { 
              volunteerPF: vpf, 
              totalDeductions: correctDed, 
              netSalary: totalEarnings - correctDed,
              updatedAt: new Date()
            } 
          });
          updateCount++;
        }
      }
      console.log(`Updated ${updateCount} records in ${dbName}.`);
      await conn.close();
    } catch (err) {
      console.error(`Error checking ${dbName}:`, err.message);
    }
  }
  process.exit(0);
}

fixAllLocalDbs();
