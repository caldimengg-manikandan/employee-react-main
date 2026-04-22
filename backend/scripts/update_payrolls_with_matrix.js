const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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

async function calculateMatrixIncrement(db, financialYear, designation, rating) {
  if (!financialYear || !designation || !rating) return 0;
  
  const matrixCol = db.collection('incrementmatrixes');
  
  // Normalize year
  let lookupYear = financialYear;
  if (lookupYear.length === 7 && lookupYear.indexOf('-') === 4) {
    const parts = lookupYear.split('-');
    if (parts[1].length === 2) {
      lookupYear = `${parts[0]}-20${parts[1]}`;
    }
  }

  const matrices = await matrixCol.find({ financialYear: lookupYear }).toArray();
  if (!matrices || matrices.length === 0) return 0;

  const d = String(designation).toLowerCase();
  let matchedMatrix = null;

  for (const m of matrices) {
    const cats = String(m.category || '').toLowerCase().split(',').map(s => s.trim());
    if (cats.some(c => d.includes(c) || c.includes(d))) {
      matchedMatrix = m;
      break;
    }
  }

  if (!matchedMatrix) {
    const isTrainee = d.includes('trainee');
    if (isTrainee) {
      switch(rating) {
        case 'ES': return 15;
        case 'ME': return 10;
        case 'BE': return 0;
      }
    } else {
      switch(rating) {
        case 'ES': return 12;
        case 'ME': return 8;
        case 'BE': return 0;
      }
    }
    return 0;
  }

  const rObj = (matchedMatrix.ratings || []).find(x => String(x.rating).trim().toUpperCase() === String(rating).trim().toUpperCase());
  return rObj ? Number(rObj.percentage || 0) : 0;
}

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb+srv://caldimenggcloud_db_user:Caldim12345678@cluster0.wwy0lqb.mongodb.net/test?appName=Cluster0');
    const db = mongoose.connection.db;

    const fySnapshotCollection = db.collection('payroll_FY24-25');
    const payrollCollection = db.collection('payrolls');
    const employees = await db.collection('employees').find({}).toArray();
    
    // Get ALL appraisals to ensure we catch everything
    const appraisals = await db.collection('selfappraisals').find({}).toArray();
    const currentPayrolls = await payrollCollection.find({}).toArray();
    const snapshots = await fySnapshotCollection.find({}).toArray();

    let updatedCount = 0;

    for (const currentPayroll of currentPayrolls) {
      const empIdString = currentPayroll.employeeId;
      if (!empIdString) continue;

      const empObj = employees.find(e => String(e.employeeId).toLowerCase() === String(empIdString).toLowerCase());
      
      let app = null;
      if (empObj) {
        app = appraisals.find(a => String(a.employeeId) === String(empObj._id) || String(a.empId || '').toLowerCase() === String(empIdString).toLowerCase());
      }
      if (!app) {
        app = appraisals.find(a => (String(a.employeeIdValue || '')).toLowerCase() === String(empIdString).toLowerCase() || (String(a.empId || '')).toLowerCase() === String(empIdString).toLowerCase());
      }

      // Fetch snapshot from FY24-25 as the base
      const snapshot = snapshots.find(s => String(s.employeeId).toLowerCase() === String(empIdString).toLowerCase());
      const baselineGross = snapshot ? Number(snapshot.totalEarnings || 0) : Number(currentPayroll.totalEarnings || 0);

      let totalPct = 0;

      if (app) {
        // If appraisal is fully approved/released, use its stored values
        const isReleased = ['released', 'released letter', 'accepted_pending_effect', 'accepted', 'effective', 'completed'].includes(String(app.status).toLowerCase());
        
        const basePct = Number(app.incrementPercentage || 0);
        const corrPct = Number(app.incrementCorrectionPercentage || 0);
        
        if (basePct > 0 || corrPct > 0) {
          totalPct = basePct + corrPct;
        } else {
          // If 0, it means it's pending. We must calculate from matrix.
          const rating = (app.managerReview?.performanceRating || app.appraiserRating || '').split(' ')[0];
          const designation = empObj?.designation || currentPayroll.designation;
          const finYear = app.year || app.financialYr || app.financialYear || '2025-2026';
          
          if (rating && designation) {
            totalPct = await calculateMatrixIncrement(db, finYear, designation, rating);
          }
        }
      }
      
      // Compute revised Gross
      const revisedGross = Math.round(baselineGross * (1 + totalPct / 100));

      // Calculate new 50/25/25 breakdown
      const newBreakdown = calculateSalaryAnnexure(revisedGross);

      const esi = currentPayroll.esi || 0;
      const tax = currentPayroll.tax || 0;
      const professionalTax = currentPayroll.professionalTax || 0;
      const loanDeduction = currentPayroll.loanDeduction || 0;
      const lop = currentPayroll.lop || 0;

      const totalPf = newBreakdown.employeePfContribution + newBreakdown.employerPfContribution;

      const totalDeductions = Math.round(
          totalPf + esi + tax + professionalTax + loanDeduction + lop
      );
      
      const trueNetSalary = newBreakdown.gross - totalDeductions;

      await payrollCollection.updateOne(
        { _id: currentPayroll._id },
        {
          $set: {
            basicDA: newBreakdown.basicDA,
            hra: newBreakdown.hra,
            specialAllowance: newBreakdown.specialAllowance,
            employeePfContribution: newBreakdown.employeePfContribution,
            employerPfContribution: newBreakdown.employerPfContribution,
            pf: totalPf,
            totalEarnings: newBreakdown.gross,
            totalDeductions: totalDeductions,
            netSalary: trueNetSalary,
            gratuity: newBreakdown.gratuity,
            ctc: newBreakdown.ctc,
            // Also update designation if promoted
            ...(app?.promotion?.newDesignation ? { designation: app.promotion.newDesignation } : {})
          }
        }
      );

      updatedCount++;
    }

    console.log(`Updated ${updatedCount} payrolls to the new revised salaries using Matrix.`);
    mongoose.connection.close();
  } catch (err) {
    console.error('Execution Error:', err);
    process.exit(1);
  }
}

run();
