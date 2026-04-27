
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SelfAppraisal = require('../models/SelfAppraisal');
const Employee = require('../models/Employee');
const Payroll = require('../models/Payroll');

// Replicating the logic from frontend/src/utils/performanceUtils.js
function calculateSalaryAnnexure(gross) {
    const targetGross = Math.round(gross || 0);
    const basic = Math.round(targetGross * 0.50);
    const hra = Math.round(targetGross * 0.25);
    
    const employeePfContribution = 1800;
    const employerPfContribution = 1950;

    // Following the 50/25/25 logic where Special Allowance is the remainder
    const special = Math.max(0, targetGross - basic - hra - employeePfContribution - employerPfContribution);

    // Net Salary (Take Home) = Basic + HRA + Special Allowance
    const net = basic + hra + special;
    
    const gratuity = Math.round(basic * 0.0486);
    const ctc = targetGross + gratuity;

    return {
        basic,
        hra,
        special,
        net,
        employeePfContribution,
        employerPfContribution,
        gratuity,
        ctc: Math.round(ctc),
        gross: targetGross
    };
}

async function syncPayrolls() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully.');

    // 1. Fetch all appraisals that might have increment data
    // We look for those where incrementPercentage or incrementCorrectionPercentage > 0
    // OR where revisedSalary > 0
    const appraisals = await SelfAppraisal.find({
        $or: [
            { incrementPercentage: { $gt: 0 } },
            { incrementCorrectionPercentage: { $gt: 0 } },
            { revisedSalary: { $gt: 0 } }
        ]
    }).populate('employeeId');

    console.log(`Found ${appraisals.length} appraisals with potential increment data.`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const app of appraisals) {
        const emp = app.employeeId;
        if (!emp) {
            console.warn(`Skipping appraisal ${app._id}: No associated employee record.`);
            skippedCount++;
            continue;
        }

        const empId = emp.employeeId;
        console.log(`\nProcessing ${emp.name} (${empId})...`);

        // Calculate Revised Gross
        let revisedGross = 0;
        if (app.revisedSalary > 0) {
            revisedGross = app.revisedSalary;
        } else {
            const currentGross = app.currentSalarySnapshot || emp.totalEarnings || 0;
            const totalPct = (app.incrementPercentage || 0) + (app.incrementCorrectionPercentage || 0);
            revisedGross = Math.round(currentGross * (1 + totalPct / 100));
        }

        if (revisedGross <= 0) {
            console.warn(`  Skipping: Calculated Revised Gross is ${revisedGross}`);
            skippedCount++;
            continue;
        }

        // Calculate Structure
        const structure = calculateSalaryAnnexure(revisedGross);

        // ESI Logic: Based on Net Salary
        // Condition: If Net Salary < 21000, eligible. Else 0.
        let esi = 0;
        if (structure.net < 21000) {
            // Standard ESI is 0.75% of Gross for Employee
            esi = Math.round(revisedGross * 0.0075);
            console.log(`  ESI Eligible (Net ${structure.net} < 21000). Calculated ESI: ${esi}`);
        } else {
            console.log(`  ESI Ineligible (Net ${structure.net} >= 21000). Setting ESI to 0.`);
            esi = 0;
        }

        // Find and Update Payroll
        const payroll = await Payroll.findOne({ employeeId: { $regex: new RegExp(`^${empId}$`, 'i') } });
        if (!payroll) {
            console.warn(`  No Payroll record found for ${empId}. Skipping.`);
            skippedCount++;
            continue;
        }

        // Total Deductions = EmpPF + EmprPF + ESI + PT + Tax + Loan + LOP
        const pt = Number(payroll.professionalTax || 0);
        const tax = Number(payroll.tax || 0);
        const loan = Number(payroll.loanDeduction || 0);
        const lop = Number(payroll.lop || 0);

        const totalDeductions = structure.employeePfContribution + structure.employerPfContribution + esi + pt + tax + loan + lop;
        const finalNet = revisedGross - totalDeductions;

        await Payroll.updateOne(
            { _id: payroll._id },
            {
                $set: {
                    basicDA: structure.basic,
                    hra: structure.hra,
                    specialAllowance: structure.special,
                    employeePfContribution: structure.employeePfContribution,
                    employerPfContribution: structure.employerPfContribution,
                    esi: esi,
                    totalEarnings: revisedGross,
                    totalDeductions: totalDeductions,
                    netSalary: finalNet,
                    gratuity: structure.gratuity,
                    ctc: structure.ctc,
                    status: 'Pending'
                }
            }
        );

        console.log(`  Updated successfully: Gross ${revisedGross}, Net ${finalNet}, ESI ${esi}`);
        updatedCount++;
    }

    console.log(`\nSync Completed!`);
    console.log(`Total Appraisals with data: ${appraisals.length}`);
    console.log(`Total Payrolls Updated: ${updatedCount}`);
    console.log(`Total Skipped: ${skippedCount}`);

    process.exit(0);
  } catch (err) {
    console.error('Fatal error during sync:', err);
    process.exit(1);
  }
}

syncPayrolls();
