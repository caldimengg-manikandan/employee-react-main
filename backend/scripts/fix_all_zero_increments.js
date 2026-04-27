
const mongoose = require('mongoose');

async function fixAllZeroIncrements() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    console.log('Scanning for employees with ₹0 increment to restore Historical PF...');

    const appraisals = await db.collection('selfappraisals').find({
        status: { $in: ['effective', 'released', 'accepted', 'completed', 'directorApproved', 'DIRECTOR_APPROVED'] }
    }).toArray();
    
    const snapshots = await db.collection('payroll_FY24-25').find({}).toArray();
    const employees = await db.collection('employees').find({}).toArray();

    let fixedCount = 0;

    for (const app of appraisals) {
        // Find increment amount
        const incAmount = Number(app.incrementAmount || 0);
        
        // If increment is 0, we should treat them like non-appraised (keep historical PF)
        if (incAmount === 0) {
            const emp = employees.find(e => e._id.toString() === app.employeeId.toString());
            if (!emp) continue;
            
            const empId = emp.employeeId;
            if (empId === 'CDE111') continue; // Already fixed manually

            const snapshot = snapshots.find(s => s.employeeId.toLowerCase() === empId.toLowerCase());
            if (snapshot) {
                const histPF = Number(snapshot.pf || 3750);
                
                // If historical PF is different from standard 3750, we must restore it
                if (histPF !== 3750) {
                    console.log(`  [${empId}] ${emp.name}: ₹0 Increment. Restoring Historical PF: ₹${histPF}`);
                    
                    const payroll = await db.collection('payrolls').findOne({ employeeId: empId });
                    if (payroll) {
                        const gross = Number(payroll.totalEarnings || 0);
                        const basic = Math.round(gross * 0.50);
                        const hra = Math.round(gross * 0.25);
                        
                        const esi = Number(payroll.esi || 0);
                        const totalPF = histPF;
                        const empPF = 1800;
                        const emprPF = totalPF - empPF;

                        const totalDeductions = totalPF + esi + Number(payroll.professionalTax || 0) + Number(payroll.tax || 0) + Number(payroll.loanDeduction || 0) + Number(payroll.lop || 0);
                        const netSalary = gross - totalDeductions;
                        
                        const special = Math.max(0, gross - basic - hra - totalPF - esi);
                        const gratuity = Math.round(basic * 0.0486);
                        const ctc = gross + gratuity;

                        await db.collection('payrolls').updateOne(
                            { _id: payroll._id },
                            {
                                $set: {
                                    basicDA: basic,
                                    hra: hra,
                                    specialAllowance: special,
                                    pf: totalPF,
                                    employeePfContribution: empPF,
                                    employerPfContribution: emprPF,
                                    totalDeductions: totalDeductions,
                                    netSalary: netSalary,
                                    gratuity: gratuity,
                                    ctc: ctc
                                }
                            }
                        );
                        fixedCount++;
                    }
                }
            }
        }
    }

    console.log(`\nScan Completed! Total Zero-Increment PF Restored: ${fixedCount}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixAllZeroIncrements();
