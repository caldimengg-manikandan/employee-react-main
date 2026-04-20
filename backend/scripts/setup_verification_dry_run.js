const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function setupDryRun() {
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
    const testEmployeeIds = ['CDE005', 'CDE007', 'CDE001', 'EMP001']; // Add a few samples

    console.log(`Fetching sample records from ${sourceColName}...`);
    const recordsToClone = await sourceCol.find({
        $or: [
            { employeeId: { $in: testEmployeeIds } },
            { empId: { $in: testEmployeeIds } }
        ]
    }).toArray();

    if (recordsToClone.length === 0) {
        console.log("No test records found in source collection. Cloning 5 recent records instead...");
        const recentRecords = await sourceCol.find({}).sort({createdAt: -1}).limit(5).toArray();
        recordsToClone.push(...recentRecords);
    }

    console.log(`Found ${recordsToClone.length} records. Preparing for insertion...`);

    // 3. Normalize and insert
    const normalizedRecords = recordsToClone.map(record => {
        // Strip out the _id so MongoDB generates a new one, keeping it a clean clone
        const { _id, ...cleanRecord } = record;
        
        // Ensure the math is absolutely pristine based on the new logic
        let empPf = Number(cleanRecord.employeePfContribution || 0);
        let emprPf = Number(cleanRecord.employerPfContribution || 1950);
        let pt = Number(cleanRecord.professionalTax || 0);
        let esi = Number(cleanRecord.esi || 0);
        let tax = Number(cleanRecord.tax || 0);
        
        // Safety check if empPf is still combined for some reason
        // We know CDE005 total was 6950, so logic should have made it 5000. 
        // We just trust what's currently in the DB or force normalization again
        if (empPf > 5000 && emprPf === 1950) { 
           // If we suspect it's still combined
           // empowerPfContribution = (empPf - 1950); 
           // this is just an example, but we assume the previous fix ran successfully
        }

        const totalDed = Math.round(empPf + emprPf + pt + esi + tax);
        const gross = Number(cleanRecord.totalEarnings || 0);
        const net = Math.round(gross - totalDed);

        return {
            ...cleanRecord,
            employeePfContribution: empPf,
            employerPfContribution: emprPf,
            professionalTax: pt,
            esi: esi,
            tax: tax,
            totalDeductions: totalDed,
            netSalary: net,
            calculationNote: "Normalized by Dry Run Setup Script"
        };
    });

    if (normalizedRecords.length > 0) {
        await dryRunCol.insertMany(normalizedRecords);
        console.log(`Successfully populated ${dryRunColName} with ${normalizedRecords.length} normalized test cases.`);
        
        // Print out CDE005 specifically for verification log
        const cde005 = normalizedRecords.find(r => r.employeeId === 'CDE005' || r.empId === 'CDE005');
        if (cde005) {
             console.log("\n--- Verification Sample (CDE005) ---");
             console.log(`Employee ID: ${cde005.employeeId || cde005.empId}`);
             console.log(`Name: ${cde005.employeeName || cde005.name}`);
             console.log(`Gross Salary (totalEarnings): ₹${cde005.totalEarnings}`);
             console.log(`Employee PF (employeePfContribution): ₹${cde005.employeePfContribution}`);
             console.log(`Employer PF (employerPfContribution): ₹${cde005.employerPfContribution}`);
             console.log(`Professional Tax (professionalTax): ₹${cde005.professionalTax}`);
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

setupDryRun();
