
const mongoose = require('mongoose');

async function alignPFAndDeductions() {
  const shards = [
    "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
    "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
  ];
  const uri = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  
  try {
    console.log('Connecting to Production Atlas for PF Alignment...');
    await mongoose.connect(uri);
    console.log('Connected.');

    const db = mongoose.connection.db;

    const payrolls = await db.collection('payrolls').find({}).toArray();
    const snapshots = await db.collection('payroll_FY24-25').find({}).toArray();
    const appraisals = await db.collection('selfappraisals').find({
        status: { $in: ['effective', 'released', 'accepted', 'completed', 'directorApproved', 'DIRECTOR_APPROVED'] }
    }).toArray();
    const employees = await db.collection('employees').find({}).toArray();

    console.log(`Processing ${payrolls.length} payroll records for PF alignment...`);

    let updatedCount = 0;

    for (const payroll of payrolls) {
        const empId = payroll.employeeId;
        const emp = employees.find(e => e.employeeId.toLowerCase() === empId.toLowerCase());
        const appraisal = appraisals.find(a => a.employeeId.toString() === emp?._id.toString());
        const snapshot = snapshots.find(s => s.employeeId.toLowerCase() === empId.toLowerCase());

        let empPF = 1800;
        let emprPF = 1950;
        let totalPF = 3750;

        if (!appraisal && snapshot) {
            // Non-Appraisal: Use Historical PF
            totalPF = Number(snapshot.pf || 3750);
            empPF = 1800;
            emprPF = totalPF - empPF;
            console.log(`  [${empId}] Non-Appraisal. Using Historical PF: ₹${totalPF}`);
        } else {
            // Appraised: Use New Standard PF (as per release letter logic)
            totalPF = 3750;
            empPF = 1800;
            emprPF = 1950;
            // console.log(`  [${empId}] Appraised. Using Standard PF: ₹3750`);
        }

        const gross = Number(payroll.totalEarnings || 0);
        const basic = Math.round(gross * 0.50);
        const hra = Math.round(gross * 0.25);
        
        // Recalculate Special Allowance to balance the Gross
        // Gross = Basic + HRA + Special + EmpPF + EmprPF
        const special = Math.max(0, gross - basic - hra - empPF - emprPF);

        // Deductions
        const esi = Number(payroll.esi || 0);
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
                    pf: totalPF, // Update legacy pf field for UI consistency
                    totalDeductions: totalDeductions,
                    netSalary: finalNet,
                    gratuity: gratuity,
                    ctc: ctc
                }
            }
        );

        updatedCount++;
    }

    console.log(`\nPF Alignment Completed! Total Updated: ${updatedCount}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

alignPFAndDeductions();
