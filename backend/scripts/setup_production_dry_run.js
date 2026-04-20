const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function setupProductionDryRun() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const sourceColName = 'payrolls'; // Using the main payrolls collection
    const dryRunColName = 'payroll_DRY_RUN';

    const sourceCol = db.collection(sourceColName);
    const dryRunCol = db.collection(dryRunColName);

    // 1. Clear existing dry run data
    console.log(`Clearing existing records in ${dryRunColName}...`);
    await dryRunCol.deleteMany({});
    
    console.log(`Fetching ALL records from ${sourceColName}...`);
    const recordsToClone = await sourceCol.find({}).toArray();

    // 2. Normalize and ensure consistent mathematical structures
    const normalizedRecords = recordsToClone.map(record => {
        const { _id, ...cleanRecord } = record;
        
        // Take whatever the CURRENT Gross Salary is for this employee in the DB
        // If they had an 'effective' appraisal, this is their Revised Gross.
        // If not, this is their Old Gross.
        let targetGross = Number(cleanRecord.totalEarnings || 0);

        // 50/25/25 Business Rules
        const basic = Math.round(targetGross * 0.50);
        const hra = Math.round(targetGross * 0.25);
        
        // Standardizing PF
        const employeePfContribution = 1800; 
        const employerPfContribution = 1950;
        
        // Ensure accurate special allowance math
        const special = Math.max(0, targetGross - basic - hra - employeePfContribution - employerPfContribution);
        
        // Monthly Deductions (Only Employee PF + Employer PF for the general structure)
        const totalDed = Math.round(employeePfContribution + employerPfContribution);
        
        // Net Salary
        const net = Math.round(basic + hra + special);
        
        const gratuity = Math.round(basic * 0.0486);
        const ctc = Math.round(targetGross + gratuity);

        return {
            ...cleanRecord,
            basicDA: basic,
            hra: hra,
            specialAllowance: special,
            employeePfContribution: employeePfContribution,
            employerPfContribution: employerPfContribution,
            professionalTax: Number(cleanRecord.professionalTax || 0), // Kept strictly as a record, not monthly
            esi: targetGross > 21000 ? 0 : Number(cleanRecord.esi || 0),
            tax: Number(cleanRecord.tax || 0),
            totalDeductions: totalDed,
            totalEarnings: targetGross, 
            netSalary: net,
            gratuity: gratuity,
            ctc: ctc,
            calculationNote: "Normalized Production Clone"
        };
    });

    if (normalizedRecords.length > 0) {
        await dryRunCol.insertMany(normalizedRecords);
        console.log(`Successfully populated ${dryRunColName} with ${normalizedRecords.length} records representing the entire company.`);
    } else {
        console.log("No records to insert.");
    }

    mongoose.connection.close();
  } catch (err) {
    console.error('Setup Error:', err);
    process.exit(1);
  }
}

setupProductionDryRun();
