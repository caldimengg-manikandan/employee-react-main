
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SelfAppraisal = require('../models/SelfAppraisal');
const Employee = require('../models/Employee');
const Payroll = require('../models/Payroll');

async function syncPayrolls() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully.');

    // 1. Find all released appraisals
    const releasedAppraisals = await SelfAppraisal.find({ status: 'released' }).populate('employeeId');
    console.log(`Found ${releasedAppraisals.length} released appraisals.`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const appraisal of releasedAppraisals) {
      const empId = appraisal.employeeId?.employeeId || appraisal.empId;
      if (!empId) {
        console.warn(`Skipping appraisal ${appraisal._id}: No employeeId found.`);
        skippedCount++;
        continue;
      }

      // Convert Map to plain object if needed
      const snapshot = appraisal.releaseRevisedSnapshot instanceof Map 
        ? Object.fromEntries(appraisal.releaseRevisedSnapshot) 
        : appraisal.releaseRevisedSnapshot;

      if (!snapshot || Object.keys(snapshot).length === 0) {
        console.warn(`Skipping appraisal for ${empId}: releaseRevisedSnapshot is empty.`);
        skippedCount++;
        continue;
      }

      // 2. Find the corresponding Payroll record
      const payrollRecord = await Payroll.findOne({ employeeId: { $regex: new RegExp(`^${empId}$`, 'i') } });

      if (!payrollRecord) {
        console.warn(`Skipping appraisal for ${empId}: No Payroll record found.`);
        skippedCount++;
        continue;
      }

      // 3. Prepare the update data based on the 50/25/25 Revised Snapshot
      const gross = Number(snapshot.gross || 0);
      const basic = Number(snapshot.basic || 0);
      const hra = Number(snapshot.hra || 0);
      const special = Number(snapshot.special || 0);
      const empPF = Number(snapshot.employeePfContribution || 1800);
      const emprPF = Number(snapshot.employerPfContribution || 1950);
      const volunteerPF = Number(snapshot.volunteerPF || 0);
      const gratuity = Number(snapshot.gratuity || 0);
      const ctc = Number(snapshot.ctc || 0);

      // ESI Logic: CTC >= 21000 => 0. Else use old or calculate.
      // Based on user request, if CTC > 21000, ESI must be 0.
      let esi = 0;
      if (ctc < 21000) {
        // If eligible, standard ESI is 0.75% of Gross (Employee part)
        // However, if the old record had ESI, we might want to keep it or use standard.
        // For now, let's use 0.75% of Gross as a safe fallback for eligible employees.
        esi = Math.round(gross * 0.0075);
      }

      // Keep other deductions from the existing record
      const pt = Number(payrollRecord.professionalTax || 0);
      const tax = Number(payrollRecord.tax || 0);
      const loan = Number(payrollRecord.loanDeduction || 0);
      const lop = Number(payrollRecord.lop || 0);

      // Recalculate total deductions and net salary
      // Updated rule: totalDeductions = EmpPF + EmprPF + ESI + PT + Tax + Loan + LOP + VPF
      const totalDeductions = empPF + emprPF + esi + pt + tax + loan + lop + volunteerPF;
      const netSalary = gross - totalDeductions;

      // Update the Payroll record
      await Payroll.updateOne(
        { _id: payrollRecord._id },
        {
          $set: {
            basicDA: basic,
            hra: hra,
            specialAllowance: special,
            employeePfContribution: empPF,
            employerPfContribution: emprPF,
            esi: esi,
            volunteerPF: volunteerPF,
            totalEarnings: gross,
            totalDeductions: totalDeductions,
            netSalary: netSalary,
            gratuity: gratuity,
            ctc: ctc,
            status: 'Pending' // Reset to pending for the new month
          }
        }
      );

      console.log(`Updated Payroll for ${empId}: Gross ${gross}, Net ${netSalary}, CTC ${ctc}, ESI ${esi}`);
      updatedCount++;
    }

    console.log(`\nSync Completed!`);
    console.log(`Total Appraisals Processed: ${releasedAppraisals.length}`);
    console.log(`Total Payrolls Updated: ${updatedCount}`);
    console.log(`Total Skipped: ${skippedCount}`);

    process.exit(0);
  } catch (err) {
    console.error('Fatal error during payroll sync:', err);
    process.exit(1);
  }
}

syncPayrolls();
