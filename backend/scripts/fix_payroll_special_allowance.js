/**
 * fix_payroll_special_allowance.js
 *
 * Recalculates Special Allowance for ALL payroll records using the correct formula:
 *   special = totalEarnings - basicDA - hra - employeePfContribution - employerPfContribution - esi
 *
 * This fixes the bug where Special Allowance was stored as 25% of gross (same as HRA),
 * instead of being the remainder after PF deductions.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Payroll = require('../models/Payroll');

async function fixPayrolls() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.\n');

    const payrolls = await Payroll.find({});
    console.log(`Found ${payrolls.length} payroll records.\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let noChangeCount = 0;

    for (const p of payrolls) {
      const gross = Number(p.totalEarnings || 0);

      if (gross <= 0) {
        console.log(`  ⚠️  ${p.employeeId}: totalEarnings=0, skipping.`);
        skippedCount++;
        continue;
      }

      const basic = Number(p.basicDA || 0);
      const hra   = Number(p.hra || 0);
      const empPF = Number(p.employeePfContribution || 1800);
      const emrPF = Number(p.employerPfContribution || 1950);
      const esi   = Number(p.esi || 0);
      const pt    = Number(p.professionalTax || 0);
      const tax   = Number(p.tax || 0);
      const loan  = Number(p.loanDeduction || 0);
      const lop   = Number(p.lop || 0);

      // Correct formula
      const correctSpecial = Math.max(0, gross - basic - hra - empPF - emrPF - esi);
      const currentSpecial = Number(p.specialAllowance || 0);

      // Check if correction is needed (tolerance of ₹1 for rounding)
      if (Math.abs(correctSpecial - currentSpecial) <= 1) {
        noChangeCount++;
        continue;
      }

      const netSalary = basic + hra + correctSpecial;
      const gratuity  = Math.round(basic * 0.0486);
      const totalDeductions = empPF + emrPF + esi + pt + tax + loan + lop + gratuity;
      const ctc = gross + gratuity;

      await Payroll.updateOne(
        { _id: p._id },
        {
          $set: {
            specialAllowance: correctSpecial,
            netSalary,
            gratuity,
            totalDeductions,
            ctc,
            updatedAt: new Date()
          }
        }
      );

      console.log(
        `  ✅ ${p.employeeId} (${p.employeeName}): ` +
        `Gross=${gross}, Basic=${basic}, HRA=${hra}, ` +
        `Special: ${currentSpecial} → ${correctSpecial}, ` +
        `Net=${netSalary}, CTC=${ctc}`
      );
      updatedCount++;
    }

    console.log(`\n── Summary ──────────────────────────────`);
    console.log(`Total payrolls checked   : ${payrolls.length}`);
    console.log(`Already correct          : ${noChangeCount}`);
    console.log(`Updated                  : ${updatedCount}`);
    console.log(`Skipped (no gross)       : ${skippedCount}`);

    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

fixPayrolls();
