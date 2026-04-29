const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Employee = require('../models/Employee'); // register schema
const SelfAppraisal = require('../models/SelfAppraisal');
const Payroll = require('../models/Payroll');

// Same calculation logic used in directorRoutes.js /release endpoint
function calculateSalaryAnnexure(targetGross, customPFs = null) {
  const grossVal = Math.round(targetGross || 0);
  const basic = Math.round(grossVal * 0.50);
  const hra = Math.round(grossVal * 0.25);

  const employeePfContribution = customPFs?.employeePfContribution !== undefined ? Number(customPFs.employeePfContribution) : 1800;
  const employerPfContribution = customPFs?.employerPfContribution !== undefined ? Number(customPFs.employerPfContribution) : 1950;
  const esi = customPFs?.esi !== undefined ? Number(customPFs.esi) : 0;

  const volunteerPF = customPFs?.volunteerPF !== undefined ? Number(customPFs.volunteerPF) : 0;
  const special = Math.max(0, grossVal - basic - hra - employeePfContribution - employerPfContribution - esi - volunteerPF);
  const net = basic + hra + special;
  const gratuity = Math.round(basic * 0.0486);
  const ctc = grossVal + gratuity;

  return {
    basic,
    hra,
    special,
    net,
    employeePfContribution,
    employerPfContribution,
    esi,
    volunteerPF,
    totalDeductions: employeePfContribution + employerPfContribution + esi + volunteerPF,
    gratuity,
    gross: grossVal,
    ctc: Math.round(ctc)
  };
}

async function syncReleasedPayrolls() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.\n');

    // Fetch all released/accepted appraisals (no populate to avoid schema issues)
    const appraisals = await SelfAppraisal.find({
      status: { $in: ['released', 'accepted', 'effective', 'COMPLETED'] }
    });

    // Build empId lookup from Employee collection
    const employees = await Employee.find({}, 'employeeId _id');
    const empMongoIdToEmpId = {};
    for (const e of employees) {
      empMongoIdToEmpId[e._id.toString()] = e.employeeId;
    }

    console.log(`Found ${appraisals.length} released/accepted appraisals.\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const appraisal of appraisals) {
      // Resolve empId: stored directly OR via employeeId mongo ref
      const empId = appraisal.empId ||
        (appraisal.employeeId ? empMongoIdToEmpId[appraisal.employeeId.toString()] : null);

      if (!empId) {
        console.warn(`  Skipping appraisal ${appraisal._id}: no employeeId resolved.`);
        skippedCount++;
        continue;
      }

      // Prefer the stored releaseRevisedSnapshot
      let revised = appraisal.releaseRevisedSnapshot;
      // Mongoose Map → plain object
      if (revised && typeof revised.toObject === 'function') revised = revised.toObject();
      else if (revised && typeof revised.toJSON === 'function') revised = revised.toJSON();

      let updateData;

      if (revised && (revised.gross || revised.basic)) {
        // Use the stored snapshot directly
        updateData = {
          basicDA: Math.round(revised.basic || revised.basicDA || 0),
          hra: Math.round(revised.hra || 0),
          specialAllowance: Math.round(revised.special || revised.specialAllowance || 0),
          employeePfContribution: Math.round(revised.employeePfContribution || 0),
          employerPfContribution: Math.round(revised.employerPfContribution || 0),
          esi: Math.round(revised.esi || 0),
          totalEarnings: Math.round(revised.gross || revised.totalEarnings || 0),
          netSalary: Math.round(revised.net || revised.netSalary || 0),
          gratuity: Math.round(revised.gratuity || 0),
          volunteerPF: Math.round(revised.volunteerPF || 0),
          ctc: Math.round(revised.ctc || 0)
        };
        updateData.totalDeductions =
          updateData.employeePfContribution +
          updateData.employerPfContribution +
          updateData.esi +
          (updateData.volunteerPF || 0);
      } else if (appraisal.revisedSalary > 0) {
        // Fallback: recalculate from revisedSalary
        console.log(`  ${empId}: No releaseRevisedSnapshot — recalculating from revisedSalary ${appraisal.revisedSalary}`);
        const s = calculateSalaryAnnexure(appraisal.revisedSalary);
        updateData = {
          basicDA: s.basic,
          hra: s.hra,
          specialAllowance: s.special,
          employeePfContribution: s.employeePfContribution,
          employerPfContribution: s.employerPfContribution,
          esi: s.esi,
          totalEarnings: s.gross,
          totalDeductions: s.totalDeductions,
          netSalary: s.net,
          gratuity: s.gratuity,
          volunteerPF: s.volunteerPF,
          ctc: s.ctc
        };
      } else {
        console.warn(`  ${empId}: No snapshot and no revisedSalary. Skipping.`);
        skippedCount++;
        continue;
      }

      const result = await Payroll.findOneAndUpdate(
        { employeeId: { $regex: new RegExp(`^${empId}$`, 'i') } },
        { $set: { ...updateData, updatedAt: new Date() } },
        { new: true }
      );

      if (result) {
        console.log(`  ✅ ${empId}: Basic=${updateData.basicDA}, HRA=${updateData.hra}, Special=${updateData.specialAllowance}, Net=${updateData.netSalary}, CTC=${updateData.ctc}`);
        updatedCount++;
      } else {
        console.warn(`  ⚠️  ${empId}: No Payroll record found — skipped.`);
        skippedCount++;
      }
    }

    console.log(`\n── Summary ──────────────────────────────`);
    console.log(`Total appraisals checked : ${appraisals.length}`);
    console.log(`Payrolls updated         : ${updatedCount}`);
    console.log(`Skipped                  : ${skippedCount}`);

    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

syncReleasedPayrolls();
