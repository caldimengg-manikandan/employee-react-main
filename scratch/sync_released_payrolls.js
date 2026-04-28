const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const SelfAppraisal = require('../backend/models/SelfAppraisal');
const Payroll = require('../backend/models/Payroll');

async function syncReleasedPayrolls() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully.');

    // Find all appraisals that are 'released', 'accepted', or 'effective'
    const appraisals = await SelfAppraisal.find({
      status: { $in: ['released', 'accepted', 'effective', 'COMPLETED'] }
    });

    console.log(`Found ${appraisals.length} released/accepted appraisals.`);

    let updatedCount = 0;

    for (const appraisal of appraisals) {
      const revised = appraisal.releaseRevisedSnapshot;
      if (!revised || Object.keys(revised).length === 0) {
        // Fallback to revisedSalary if snapshot is missing
        if (appraisal.revisedSalary > 0) {
            console.log(`Snapshot missing for ${appraisal.empId}, but revisedSalary found. Recalculating...`);
            // Recalculate using the same logic as directorRoutes.js
            const grossVal = Math.round(appraisal.revisedSalary || 0);
            const basic = Math.round(grossVal * 0.50);
            const hra = Math.round(grossVal * 0.25);
            const employeePfContribution = 1800;
            const employerPfContribution = 1950;
            const esi = 0;
            const special = Math.max(0, grossVal - basic - hra - employeePfContribution - employerPfContribution - esi);
            const net = basic + hra + special;
            const gratuity = Math.round(basic * 0.0486);
            const ctc = grossVal + gratuity;

            const updateData = {
                basicDA: basic,
                hra: hra,
                specialAllowance: special,
                employeePfContribution,
                employerPfContribution,
                esi,
                totalEarnings: grossVal,
                totalDeductions: employeePfContribution + employerPfContribution + esi,
                netSalary: net,
                gratuity,
                ctc
            };

            await Payroll.findOneAndUpdate(
                { employeeId: { $regex: new RegExp(`^${appraisal.empId}$`, 'i') } },
                { $set: updateData }
            );
            updatedCount++;
        }
        continue;
      }

      // If snapshot exists, use it
      const updateData = {
        basicDA: Math.round(revised.get ? revised.get('basic') : (revised.basic || revised.basicDA || 0)),
        hra: Math.round(revised.get ? revised.get('hra') : (revised.hra || 0)),
        specialAllowance: Math.round(revised.get ? revised.get('special') : (revised.special || revised.specialAllowance || 0)),
        employeePfContribution: Math.round(revised.get ? revised.get('employeePfContribution') : (revised.employeePfContribution || 0)),
        employerPfContribution: Math.round(revised.get ? revised.get('employerPfContribution') : (revised.employerPfContribution || 0)),
        esi: Math.round(revised.get ? revised.get('esi') : (revised.esi || 0)),
        totalEarnings: Math.round(revised.get ? revised.get('gross') : (revised.gross || revised.totalEarnings || 0)),
        netSalary: Math.round(revised.get ? revised.get('net') : (revised.net || revised.netSalary || 0)),
        gratuity: Math.round(revised.get ? revised.get('gratuity') : (revised.gratuity || 0)),
        ctc: Math.round(revised.get ? revised.get('ctc') : (revised.ctc || 0))
      };
      
      updateData.totalDeductions = updateData.employeePfContribution + updateData.employerPfContribution + updateData.esi;

      await Payroll.findOneAndUpdate(
        { employeeId: { $regex: new RegExp(`^${appraisal.empId}$`, 'i') } },
        { $set: updateData }
      );
      updatedCount++;
    }

    console.log(`Updated ${updatedCount} payroll records.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

syncReleasedPayrolls();
