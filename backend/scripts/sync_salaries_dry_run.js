const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SelfAppraisalSchema = new mongoose.Schema({}, { strict: false });
const SelfAppraisal = mongoose.model('SelfAppraisal', SelfAppraisalSchema, 'selfappraisals');

const calculateSalaryAnnexure = (targetGross) => {
  const grossVal = Math.round(targetGross || 0);
  const basic = Math.round(grossVal * 0.50);
  const hra = Math.round(grossVal * 0.25);
  
  const employeePfContribution = 1800;
  const employerPfContribution = 1950;
  
  // Revised 50/25/25 logic where SAK (Special) is the balance after PFs
  const special = Math.max(0, grossVal - basic - hra - employeePfContribution - employerPfContribution);
  const net = basic + hra + special;
  const gratuity = Math.round(basic * 0.0486);
  const ctc = grossVal + gratuity;

  return {
    basicDA: basic,
    hra,
    specialAllowance: special,
    netSalary: net, // Net Salary (Take Home)
    employeePfContribution, 
    gross: grossVal,
    employerPfContribution,
    gratuity,
    ctc: Math.round(ctc)
  };
};

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const dryRunCollection = db.collection('payroll_DRY_RUN');
    const fySnapshotCollection = db.collection('payroll_FY24-25');
    const payrollCollection = db.collection('payrolls');

    // Clean up previous dry run
    await dryRunCollection.deleteMany({});
    console.log('Cleaned up payroll_DRY_RUN collection.');

    const statusList = ['effective', 'accepted', 'released'];
    const appraisals = await SelfAppraisal.find({ status: { $in: statusList } });
    console.log(`Found ${appraisals.length} appraisals to process.`);

    let processedCount = 0;
    let missingSnapshotCount = 0;

    for (const app of appraisals) {
      let empIdString = app.employeeIdValue || app.empId;
      
      // If no direct string ID, resolve it from the linked Employee document
      if (!empIdString && app.employeeId) {
        const linkedEmp = await db.collection('employees').findOne({ _id: app.employeeId });
        if (linkedEmp) {
          empIdString = linkedEmp.employeeId;
        }
      }

      if (!empIdString) {
        console.warn(`Could not resolve string employeeId for appraisal ${app._id}`);
        continue;
      }

      // Fetch snapshot from FY24-25 as the base
      const snapshot = await fySnapshotCollection.findOne({ 
        employeeId: { $regex: new RegExp(`^${empIdString}$`, 'i') } 
      });

      if (!snapshot) {
        missingSnapshotCount++;
        continue;
      }

      // Fetch current payroll record for metadata (bank, location, etc.)
      const currentPayroll = await payrollCollection.findOne({
        employeeId: { $regex: new RegExp(`^${empIdString}$`, 'i') }
      }) || {};

      const baselineGross = Number(snapshot.totalEarnings || 0);
      const totalPct = Number(app.incrementPercentage || 0) + Number(app.incrementCorrectionPercentage || 0);
      const revisedGross = Math.round(baselineGross * (1 + totalPct / 100));

      const newBreakdown = calculateSalaryAnnexure(revisedGross);

      // Construct a full payroll record same as 'payrolls' table
      const fullRecord = {
        ...currentPayroll,
        _id: new mongoose.Types.ObjectId(), // New ID for dummy table
        employeeId: empIdString,
        employeeName: snapshot.employeeName || currentPayroll.employeeName || app.employeeName,
        designation: app.promotion?.newDesignation || currentPayroll.designation || snapshot.designation,
        department: currentPayroll.department || snapshot.department,
        location: currentPayroll.location || snapshot.location || 'Chennai',
        dateOfJoining: currentPayroll.dateOfJoining || snapshot.dateOfJoining,
        employmentType: currentPayroll.employmentType || snapshot.employmentType || 'Permanent',
        
        // Revised Earnings
        basicDA: newBreakdown.basicDA,
        hra: newBreakdown.hra,
        specialAllowance: newBreakdown.specialAllowance,
        
        // Deductions & Statutory (Renamed)
        employeePfContribution: newBreakdown.employeePfContribution,
        employerPfContribution: newBreakdown.employerPfContribution,
        esi: currentPayroll.esi || 0,
        tax: currentPayroll.tax || 0,
        professionalTax: currentPayroll.professionalTax || 0,
        loanDeduction: currentPayroll.loanDeduction || 0,
        lop: currentPayroll.lop || 0,
        gratuity: newBreakdown.gratuity,
        
        // Totals
        totalEarnings: newBreakdown.gross,
        totalDeductions: Math.round(
          newBreakdown.employeePfContribution + 
          (currentPayroll.esi || 0) + 
          (currentPayroll.tax || 0) + 
          (currentPayroll.professionalTax || 0) + 
          (currentPayroll.loanDeduction || 0) + 
          (currentPayroll.lop || 0)
        ),
        
        status: currentPayroll.status || 'Pending',
        bankName: currentPayroll.bankName || '-',
        accountNumber: currentPayroll.accountNumber || '-',
        ifscCode: currentPayroll.ifscCode || '-',
        
        // Metadata for dry run observation
        dryRunIncrementPct: totalPct,
        dryRunBaselineGross: baselineGross,
        dryRunAppraisalId: app._id,
        processedAt: new Date()
      };

      // Recalculate netSalary (Take Home) and ctc based on final components
      fullRecord.netSalary = newBreakdown.netSalary;
      fullRecord.ctc = newBreakdown.ctc;

      await dryRunCollection.insertOne(fullRecord);
      processedCount++;
    }

    console.log('--- Dry Run Summary ---');
    console.log(`Total Appraisals: ${appraisals.length}`);
    console.log(`Matched & Processed: ${processedCount}`);
    console.log(`Missing Snapshot Baseline: ${missingSnapshotCount}`);
    console.log('Results saved to collection: payroll_DRY_RUN');

    mongoose.connection.close();
  } catch (err) {
    console.error('Execution Error:', err);
    process.exit(1);
  }
}

run();
