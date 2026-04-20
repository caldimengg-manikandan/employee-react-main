const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function setupRevisedDryRun() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const sourceColName = 'payroll_FY24-25';
    const dryRunColName = 'payroll_DRY_RUN';

    const sourceCol = db.collection(sourceColName);
    const dryRunCol = db.collection(dryRunColName);

    // 1. Clear existing dry run data
    console.log(`Clearing existing records in ${dryRunColName}...`);
    await dryRunCol.deleteMany({});
    
    // 2. Define test cases to clone
    const testEmployeeIds = ['CDE005', 'CDE007', 'CDE001', 'EMP001'];

    console.log(`Fetching sample records from ${sourceColName}...`);
    const recordsToClone = await sourceCol.find({
        $or: [
            { employeeId: { $in: testEmployeeIds } },
            { empId: { $in: testEmployeeIds } }
        ]
    }).toArray();

    // 3. Normalize into REVISED salary structures (50/25/25 model)
    const revisedRecords = recordsToClone.map(record => {
        const { _id, ...cleanRecord } = record;
        
        let currentGross = Number(cleanRecord.totalEarnings || 0);

        // Calculate Revised Gross (Standardizing a 12% increment for the dry run test)
        let targetGross = Math.round(currentGross * 1.12);

        // 50/25/25 Business Rules
        const basic = Math.round(targetGross * 0.50);
        const hra = Math.round(targetGross * 0.25);
        
        // Fixed PF for newly revised salaries is typically 1800 for Employee and 1950 for Employer
        const employeePfContribution = 1800; 
        const employerPfContribution = 1950;
        
        // Revised Special Allowance
        const special = Math.max(0, targetGross - basic - hra - employeePfContribution - employerPfContribution);
        
        // Monthly Revised Deductions (Emp PF + Employer PF)
        // Note: PT is deducted semi-annually so it's not subtracted from the *monthly* net here, as per the release letter math
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
            professionalTax: 1250, // Storing for reference, but not in monthly totalDeductions
            esi: 0, // Removing ESI for >= 21k
            tax: 0,
            totalDeductions: totalDed,
            totalEarnings: targetGross, // This is Gross Salary
            netSalary: net,
            gratuity: gratuity,
            ctc: ctc,
            calculationNote: "Revised Structure by Dry Run Script (12% Increment applied)"
        };
    });

    if (revisedRecords.length > 0) {
        await dryRunCol.insertMany(revisedRecords);
        console.log(`Successfully populated ${dryRunColName} with ${revisedRecords.length} REVISED test cases.`);
        
        // Print out CDE005 specifically for verification log
        const cde005 = revisedRecords.find(r => r.employeeId === 'CDE005' || r.empId === 'CDE005');
        if (cde005) {
             console.log("\n--- Verification Sample (CDE005 - REVISED) ---");
             console.log(`Employee ID: ${cde005.employeeId || cde005.empId}`);
             console.log(`Name: ${cde005.employeeName || cde005.name}`);
             console.log(`Gross Salary (totalEarnings): ₹${cde005.totalEarnings}`);
             console.log(`Basic (50%): ₹${cde005.basicDA}`);
             console.log(`HRA (25%): ₹${cde005.hra}`);
             console.log(`Special Allowance: ₹${cde005.specialAllowance}`);
             console.log(`Employee PF (Fixed): ₹${cde005.employeePfContribution}`);
             console.log(`Employer PF (Fixed): ₹${cde005.employerPfContribution}`);
             console.log(`Total Deductions: ₹${cde005.totalDeductions}`);
             console.log(`Net Salary: ₹${cde005.netSalary}`);
             console.log(`Math Check (Gross - Total Deductions === Net Salary): ${cde005.totalEarnings} - ${cde005.totalDeductions} === ${cde005.netSalary} => ${cde005.totalEarnings - cde005.totalDeductions === cde005.netSalary}`);
        }
    } else {
        console.log("No records to insert.");
    }

    mongoose.connection.close();
  } catch (err) {
    console.error('Setup Error:', err);
    process.exit(1);
  }
}

setupRevisedDryRun();
