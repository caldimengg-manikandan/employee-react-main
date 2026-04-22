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

    const statusList = [
      'submitted', 'managerInProgress', 'managerApproved',
      'reviewerPending', 'reviewerInProgress', 'reviewerApproved',
      'directorInProgress', 'directorPushedBack', 'directorApproved', 'DIRECTOR_APPROVED',
      'released', 'Released', 'RELEASED',
      'released letter', 'Released Letter',
      'accepted_pending_effect',
      'accepted', 'Accepted',
      'effective', 'completed', 'COMPLETED'
    ];

    const appraisals = await SelfAppraisal.find({ status: { $in: statusList } });
    const employees = await db.collection('employees').find({}).toArray();
    const currentPayrolls = await payrollCollection.find({}).toArray();
    const snapshots = await fySnapshotCollection.find({}).toArray();

    let processedCount = 0;
    let missingSnapshotCount = 0;

    for (const currentPayroll of currentPayrolls) {
      const empIdString = currentPayroll.employeeId;
      if (!empIdString) continue;

      // Find the employee ObjectId
      const empObj = employees.find(e => String(e.employeeId).toLowerCase() === String(empIdString).toLowerCase());
      
      // Find appraisal
      let app = null;
      if (empObj) {
        app = appraisals.find(a => String(a.employeeId) === String(empObj._id) || String(a.empId).toLowerCase() === String(empIdString).toLowerCase());
      }
      if (!app) {
        app = appraisals.find(a => (String(a.employeeIdValue || '')).toLowerCase() === String(empIdString).toLowerCase() || (String(a.empId || '')).toLowerCase() === String(empIdString).toLowerCase());
      }

      // Fetch snapshot from FY24-25 as the base
      const snapshot = snapshots.find(s => String(s.employeeId).toLowerCase() === String(empIdString).toLowerCase());

      const baselineGross = snapshot ? Number(snapshot.totalEarnings || 0) : Number(currentPayroll.totalEarnings || 0);
      if (!snapshot) {
        missingSnapshotCount++;
      }

      const totalPct = app ? (Number(app.incrementPercentage || 0) + Number(app.incrementCorrectionPercentage || 0)) : 0;
      const revisedGross = Math.round(baselineGross * (1 + totalPct / 100));

      const newBreakdown = calculateSalaryAnnexure(revisedGross);

      // Construct a full payroll record same as 'payrolls' table
      const fullRecord = {
        ...currentPayroll,
        _id: new mongoose.Types.ObjectId(), // New ID for dummy table
        employeeId: empIdString,
        employeeName: snapshot?.employeeName || currentPayroll.employeeName || app?.employeeName,
        designation: app?.promotion?.newDesignation || currentPayroll.designation || snapshot?.designation,
        department: currentPayroll.department || snapshot?.department,
        location: currentPayroll.location || snapshot?.location || 'Chennai',
        dateOfJoining: currentPayroll.dateOfJoining || snapshot?.dateOfJoining,
        employmentType: currentPayroll.employmentType || snapshot?.employmentType || 'Permanent',
        
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
        dryRunAppraisalId: app ? app._id : null,
        processedAt: new Date()
      };

      // Recalculate netSalary (Take Home) and ctc based on final components
      fullRecord.netSalary = newBreakdown.netSalary;
      fullRecord.ctc = newBreakdown.ctc;

      await dryRunCollection.insertOne(fullRecord);
      processedCount++;
    }

    console.log('--- Dry Run Summary ---');
    console.log(`Total Active Payrolls Processed: ${processedCount}`);
    console.log(`Matched with Appraisals: ${appraisals.length}`);
    console.log(`Missing Snapshot Baseline: ${missingSnapshotCount}`);
    console.log('Results saved to collection: payroll_DRY_RUN');

    mongoose.connection.close();
  } catch (err) {
    console.error('Execution Error:', err);
    process.exit(1);
  }
}

run();
