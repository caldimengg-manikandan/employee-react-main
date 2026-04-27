
const mongoose = require('mongoose');

async function alignAppraisedToStandardPF() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    console.log('Aligning Appraised Employees to Revised Letter PF (₹3750)...');

    const appraisals = await db.collection('selfappraisals').find({
        status: { $in: ['effective', 'released', 'accepted', 'completed', 'directorApproved', 'DIRECTOR_APPROVED'] }
    }).toArray();
    
    const employees = await db.collection('employees').find({}).toArray();

    let updatedCount = 0;

    for (const app of appraisals) {
        const emp = employees.find(e => e._id.toString() === app.employeeId.toString());
        if (!emp) continue;
        
        const empId = emp.employeeId;
        
        // Skip Rohini and Annie who have special caps
        if (['CDE111', 'CDE018'].includes(empId)) continue;

        const payroll = await db.collection('payrolls').findOne({ employeeId: empId });
        if (payroll) {
            // Standard Revised PF
            const totalPF = 3750;
            const empPF = 1800;
            const emprPF = 1950;

            const gross = Number(payroll.totalEarnings || 0);
            const basic = Math.round(gross * 0.50);
            const hra = Math.round(gross * 0.25);
            
            // Appraised employees (Gross > 21k) usually have ESI 0
            // But we keep the current ESI value if it was already set
            const esi = Number(payroll.esi || 0);
            
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
            updatedCount++;
        }
    }

    console.log(`\nAlignment Completed! Total Appraised Updated to Standard PF: ${updatedCount}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

alignAppraisedToStandardPF();
