
const mongoose = require('mongoose');

async function syncNonAppraisalPayrolls() {
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

    // 1. Get IDs of employees who ALREADY had appraisals processed
    const appraisals = await db.collection('selfappraisals').find({
        $or: [
            { incrementPercentage: { $gt: 0 } },
            { incrementCorrectionPercentage: { $gt: 0 } }
        ]
    }).toArray();
    const appraisedEmpObjectIds = appraisals.map(a => a.employeeId.toString());

    // 2. Get all active payroll records
    const payrolls = await db.collection('payrolls').find({}).toArray();
    
    console.log(`Total Payrolls: ${payrolls.length}`);
    console.log(`Appraised Employees: ${appraisedEmpObjectIds.length}`);

    let normalizedCount = 0;

    for (const payroll of payrolls) {
        const empId = payroll.employeeId;
        const emp = await db.collection('employees').findOne({ employeeId: { $regex: new RegExp(`^${empId}$`, 'i') } });
        
        if (!emp) {
            console.warn(`  Employee record not found for ${empId}. Skipping.`);
            continue;
        }

        // Check if this employee was already processed via appraisal
        if (appraisedEmpObjectIds.includes(emp._id.toString())) {
            // Already handled by the other script
            continue;
        }

        console.log(`Normalizing Non-Appraisal Employee: ${emp.name} (${empId})...`);

        const gross = Number(payroll.totalEarnings || 0);
        if (gross <= 0) continue;

        // Structure: 50/25/25
        const basic = Math.round(gross * 0.50);
        const hra = Math.round(gross * 0.25);
        const empPF = 1800;
        const emprPF = 1950;
        const special = Math.max(0, gross - basic - hra - empPF - emprPF);
        
        // ESI Check: Based on GROSS Salary
        let esi = 0;
        if (gross < 21000) {
            esi = Math.round(gross * 0.0075);
        } else {
            esi = 0;
        }

        const pt = Number(payroll.professionalTax || 0);
        const tax = Number(payroll.tax || 0);
        const loan = Number(payroll.loanDeduction || 0);
        const lop = Number(payroll.lop || 0);

        const totalDeductions = empPF + emprPF + esi + pt + tax + loan + lop;
        const finalNet = gross - totalDeductions;
        const gratuity = Math.round(basic * 0.0486);
        const ctc = gross + gratuity;

        await db.collection('payrolls').updateOne(
            { _id: payroll._id },
            {
                $set: {
                    basicDA: basic,
                    hra: hra,
                    specialAllowance: special,
                    employeePfContribution: empPF,
                    employerPfContribution: emprPF,
                    esi: esi,
                    totalDeductions: totalDeductions,
                    netSalary: finalNet,
                    gratuity: gratuity,
                    ctc: ctc,
                    status: 'Pending'
                }
            }
        );

        normalizedCount++;
    }

    console.log(`\nNon-Appraisal Normalization Completed!`);
    console.log(`Total Payrolls Normalized: ${normalizedCount}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

syncNonAppraisalPayrolls();
