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
  
  const special = Math.max(0, grossVal - basic - hra - employeePfContribution - employerPfContribution);
  const net = basic + hra + special;
  const gratuity = Math.round(basic * 0.0486);
  const ctc = grossVal + gratuity;

  return {
    basicDA: basic,
    hra,
    specialAllowance: special,
    netSalary: net,
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

    const fySnapshotCollection = db.collection('payroll_FY24-25');
    const payrollCollection = db.collection('payrolls');
    const employees = await db.collection('employees').find({}).toArray();

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
    const currentPayrolls = await payrollCollection.find({}).toArray();
    const snapshots = await fySnapshotCollection.find({}).toArray();

    let updatedCount = 0;

    for (const currentPayroll of currentPayrolls) {
      const empIdString = currentPayroll.employeeId;
      if (!empIdString) continue;

      const empObj = employees.find(e => String(e.employeeId).toLowerCase() === String(empIdString).toLowerCase());
      
      let app = null;
      if (empObj) {
        app = appraisals.find(a => String(a.employeeId) === String(empObj._id) || String(a.empId).toLowerCase() === String(empIdString).toLowerCase());
      }
      if (!app) {
        app = appraisals.find(a => (String(a.employeeIdValue || '')).toLowerCase() === String(empIdString).toLowerCase() || (String(a.empId || '')).toLowerCase() === String(empIdString).toLowerCase());
      }

      const snapshot = snapshots.find(s => String(s.employeeId).toLowerCase() === String(empIdString).toLowerCase());
      const baselineGross = snapshot ? Number(snapshot.totalEarnings || 0) : Number(currentPayroll.totalEarnings || 0);

      const totalPct = app ? (Number(app.incrementPercentage || 0) + Number(app.incrementCorrectionPercentage || 0)) : 0;
      const revisedGross = Math.round(baselineGross * (1 + totalPct / 100));

      const newBreakdown = calculateSalaryAnnexure(revisedGross);

      const esi = currentPayroll.esi || 0;
      const tax = currentPayroll.tax || 0;
      const professionalTax = currentPayroll.professionalTax || 0;
      const loanDeduction = currentPayroll.loanDeduction || 0;
      const lop = currentPayroll.lop || 0;

      const totalDeductions = Math.round(
          newBreakdown.employeePfContribution + 
          esi + tax + professionalTax + loanDeduction + lop
      );

      await payrollCollection.updateOne(
        { _id: currentPayroll._id },
        {
          $set: {
            basicDA: newBreakdown.basicDA,
            hra: newBreakdown.hra,
            specialAllowance: newBreakdown.specialAllowance,
            employeePfContribution: newBreakdown.employeePfContribution,
            employerPfContribution: newBreakdown.employerPfContribution,
            totalEarnings: newBreakdown.gross,
            totalDeductions: totalDeductions,
            netSalary: newBreakdown.netSalary,
            gratuity: newBreakdown.gratuity,
            ctc: newBreakdown.ctc,
            ...(app?.promotion?.newDesignation ? {designation: app.promotion.newDesignation} : {})
          }
        }
      );

      updatedCount++;
    }

    console.log(`Updated ${updatedCount} payrolls to the new revised salaries.`);
    mongoose.connection.close();
  } catch (err) {
    console.error('Execution Error:', err);
    process.exit(1);
  }
}

run();
