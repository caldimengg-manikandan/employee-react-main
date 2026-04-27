
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const shards = [
  "ac-mp6zo7n-shard-00-00.wwy0lqb.mongodb.net:27017",
  "ac-mp6zo7n-shard-00-01.wwy0lqb.mongodb.net:27017",
  "ac-mp6zo7n-shard-00-02.wwy0lqb.mongodb.net:27017"
];
const ATLAS_URI = `mongodb://caldimenggcloud_db_user:Caldim12345678@${shards.join(',')}/test?ssl=true&authSource=admin&retryWrites=true&w=majority`;

// Replicating the logic from frontend/src/utils/performanceUtils.js
function calculateSalaryAnnexure(gross) {
    const targetGross = Math.round(gross || 0);
    const basic = Math.round(targetGross * 0.50);
    const hra = Math.round(targetGross * 0.25);
    
    const employeePfContribution = 1800;
    const employerPfContribution = 1950;

    const special = Math.max(0, targetGross - basic - hra - employeePfContribution - employerPfContribution);
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

async function syncProductionPayrolls() {
  try {
    console.log('Connecting to Production Atlas (test db)...');
    await mongoose.connect(ATLAS_URI);
    console.log('Connected to Production successfully.');

    const db = mongoose.connection.db;

    // 1. Fetch all appraisals with increment data in Atlas
    const appraisals = await db.collection('selfappraisals').find({
        $or: [
            { incrementPercentage: { $gt: 0 } },
            { incrementCorrectionPercentage: { $gt: 0 } },
            { revisedSalary: { $gt: 0 } }
        ]
    }).toArray();

    console.log(`Found ${appraisals.length} appraisals with increment data in Atlas.`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const app of appraisals) {
        // Find employee
        const emp = await db.collection('employees').findOne({ _id: app.employeeId });
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
            // Fetch current gross from snapshot if possible
            const snapshot = await db.collection('payroll_FY24-25').findOne({ 
                employeeId: { $regex: new RegExp(`^${empId}$`, 'i') } 
            });
            const currentGross = snapshot ? (snapshot.totalEarnings || 0) : (emp.ctc || 0);
            const totalPct = (app.incrementPercentage || 0) + (app.incrementCorrectionPercentage || 0);
            revisedGross = Math.round(currentGross * (1 + totalPct / 100));
        }

        if (revisedGross <= 0) {
            console.warn(`  Skipping: Calculated Revised Gross is ${revisedGross}`);
            skippedCount++;
            continue;
        }

        const structure = calculateSalaryAnnexure(revisedGross);

        // ESI Logic: Based on Net Salary
        let esi = 0;
        if (structure.net < 21000) {
            esi = Math.round(revisedGross * 0.0075);
            console.log(`  ESI Eligible (Net ${structure.net} < 21000). ESI: ${esi}`);
        } else {
            console.log(`  ESI Ineligible (Net ${structure.net} >= 21000). ESI: 0`);
            esi = 0;
        }

        // Update Payroll in Atlas
        const payroll = await db.collection('payrolls').findOne({ employeeId: { $regex: new RegExp(`^${empId}$`, 'i') } });
        if (!payroll) {
            console.warn(`  No Payroll record found for ${empId}. Skipping.`);
            skippedCount++;
            continue;
        }

        const pt = Number(payroll.professionalTax || 0);
        const tax = Number(payroll.tax || 0);
        const loan = Number(payroll.loanDeduction || 0);
        const lop = Number(payroll.lop || 0);

        const totalDeductions = structure.employeePfContribution + structure.employerPfContribution + esi + pt + tax + loan + lop;
        const finalNet = revisedGross - totalDeductions;

        await db.collection('payrolls').updateOne(
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

        console.log(`  Updated ${emp.name}: Gross ${revisedGross}, Net ${finalNet}, ESI ${esi}`);
        updatedCount++;
    }

    console.log(`\nProduction Sync Completed!`);
    console.log(`Total Payrolls Updated: ${updatedCount}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

syncProductionPayrolls();
