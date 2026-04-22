const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const payrollsCol = db.collection('payrolls');

    const payrolls = await payrollsCol.find({}).toArray();
    let updated = 0;

    for (const record of payrolls) {
      const gross = Number(record.totalEarnings || 0);
      if (gross <= 0) continue;

      const basic = Math.round(gross * 0.50);
      const hra = Math.round(gross * 0.25);
      const empPF = 1800;
      const emprPF = 1950;
      
      const special = Math.max(0, gross - basic - hra - empPF - emprPF);

      // Recalculate ESI
      let esi = Number(record.esi || 0);
      if (gross > 21000) {
        esi = 0;
      }

      const pt = Number(record.professionalTax || 0);
      const tax = Number(record.tax || 0);
      const loan = Number(record.loanDeduction || 0);
      const lop = Number(record.lop || 0);

      const totalDeductions = empPF + emprPF + esi + pt + tax + loan + lop;
      const netSalary = gross - totalDeductions;
      
      const gratuity = Math.round(basic * 0.0486);
      const ctc = Math.round(gross + gratuity);

      await payrollsCol.updateOne(
        { _id: record._id },
        {
          $set: {
            basicDA: basic,
            hra: hra,
            specialAllowance: special,
            employeePfContribution: empPF,
            employerPfContribution: emprPF,
            esi: esi,
            totalDeductions: totalDeductions,
            netSalary: netSalary,
            gratuity: gratuity,
            ctc: ctc,
            totalEarnings: gross
          }
        }
      );
      updated++;
    }

    console.log(`Successfully updated ${updated} payroll records to the new 50/25/25 rule.`);
    process.exit(0);
  } catch (err) {
    console.error('Error updating payrolls:', err);
    process.exit(1);
  }
}

run();
