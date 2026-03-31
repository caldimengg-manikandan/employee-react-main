const mongoose = require("mongoose");
const PayrollHistory = require("../models/PayrollHistory");
const PayrollAuditLog = require("../models/PayrollAuditLog");
const Employee = require("../models/Employee");

/**
 * Helper to calculate Financial Year (e.g., April-March) and its boundaries.
 */
function getFinancialYear(date) {
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth(); // 0 = Jan, 3 = Apr

    let startYear, endYear;
    if (month >= 3) {
        startYear = year;
        endYear = year + 1;
    } else {
        startYear = year - 1;
        endYear = year;
    }

    return {
        label: `${startYear}-${endYear.toString().slice(-2)}`,
        start: new Date(Date.UTC(startYear, 3, 1)), // April 1st (UTC)
        end: new Date(Date.UTC(endYear, 2, 31, 23, 59, 59, 999)) // March 31st (UTC)
    };
}

/**
 * Applies appraisal changes to the PayrollHistory model within a TRANSACTION.
 */
async function applyAppraisalToPayroll(appraisal) {
  // 💡 Skip transactions for standalone mongo (e.g. localhost dev) if requested
  const useTransactions = process.env.MONGODB_URI && (process.env.MONGODB_URI.includes('replicaSet') || process.env.MONGODB_URI.includes('+srv'));
  
  const session = useTransactions ? await mongoose.startSession() : null;
  if (session) session.startTransaction();

  try {
    const { 
        employeeId, 
        revisedSalary, 
        effectiveDate, 
        currentSalarySnapshot 
    } = appraisal;

    if (!effectiveDate) {
      throw new Error(`Execution failed for ${employeeId}: No effectiveDate provided.`);
    }

    // 🔍 Resolve string employeeId to actual Employee object for denormalization
    const employee = await Employee.findOne({ employeeId: employeeId }).session(session);
    if (!employee) {
        throw new Error(`Employee ${employeeId} not found during sync.`);
    }

    // FY is strictly derived from effectiveFrom
    const fy = getFinancialYear(effectiveDate);

    // 🔒 1. Duplicate check (Transactional)
    const exists = await PayrollHistory.findOne({
      employeeId: employee._id,
      effectiveFrom: effectiveDate,
      source: "appraisal"
    }).session(session).lean();

    if (exists) {
      console.log(`[Sync] Skip employee ${employeeId}: record for ${effectiveDate} already exists.`);
      if (session) {
          await session.abortTransaction();
          session.endSession();
      }
      return;
    }

    // 🛑 2. Close previous record (Day-End Alignment)
    const endDate = new Date(effectiveDate);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
    endDate.setUTCHours(23, 59, 59, 999);

    const previousRecord = await PayrollHistory.findOneAndUpdate(
      { employeeId: employee._id, effectiveTo: null },
      { effectiveTo: endDate },
      { new: false, session, lean: true }
    );

    // ➕ 3. Insert new record (with FY Labels & Boundaries)
    const newRecords = await PayrollHistory.create([{
        employeeId: employee._id,
        employeeIdString: employee.employeeId,
        employeeName: employee.name || employee.employeename,
        financialYear: fy.label,
        fyStart: fy.start,
        fyEnd: fy.end,
        salary: revisedSalary,
        components: {
            basic: Number(appraisal.normalizedSalaryBreakdown?.basic || 0),
            hra: Number(appraisal.normalizedSalaryBreakdown?.hra || 0),
            special: Number(appraisal.normalizedSalaryBreakdown?.specialAllowance || 0),
            gross: Number(revisedSalary || 0),
            net: Number(revisedSalary || 0)
        },
        effectiveFrom: effectiveDate,
        effectiveTo: null,
        source: "appraisal",
        appraisalId: appraisal._id,
        notes: `Auto-synced from accepted appraisal ${appraisal._id}`
    }], { session });

    const record = newRecords[0];

    // 📜 4. Detailed Audit log
    const oldSalary = previousRecord?.salary || currentSalarySnapshot || 0;
    
    await PayrollAuditLog.create([{
        employeeId: employee._id,
        appraisalId: appraisal._id,
        action: "APPLIED",
        oldSalary: oldSalary,
        newSalary: revisedSalary,
        notes: `Appraisal sync (FY ${fy.label}): Salary revised from ${oldSalary} to ${revisedSalary}. Effective: ${effectiveDate.toISOString().split('T')[0]}`
    }], { session });

    // ✅ COMMIT ALL OR NOTHING
    if (session) {
        await session.commitTransaction();
        session.endSession();
    }

    console.log(`[Sync Success] Employee ${employeeId} (FY ${fy.label}) -> New Salary: ${revisedSalary}.`);
    return record;

  } catch (err) {
    // 🛑 ROLLBACK ON ANY ERROR
    if (session) {
        await session.abortTransaction();
        session.endSession();
    }
    console.error(`[Sync FAILED] Transaction aborted for ${appraisal.employeeId}:`, err.message);
    throw err;
  }
}

/**
 * Calculates arrears accurately: (new-old) * days.
 */
function calculateArrears(oldSalary, newSalary, fromDate, toDate) {
  const diffTime = (new Date(toDate) - new Date(fromDate));
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const perDayOld = oldSalary / 30;
  const perDayNew = newSalary / 30;

  return Math.round((perDayNew - perDayOld) * days);
}

/**
 * Gets the current active salary for an employee. (Optimized lean)
 */
async function getCurrentSalary(employeeId) {
  return await PayrollHistory.findOne({
    employeeId,
    effectiveTo: null
  }).lean();
}

/**
 * Gets the salary for an employee as of a specific date. (Optimized lean)
 */
async function getSalaryByDate(employeeId, date) {
  return await PayrollHistory.findOne({
    employeeId,
    effectiveFrom: { $lte: new Date(date) },
    $or: [
      { effectiveTo: null },
      { effectiveTo: { $gte: new Date(date) } }
    ]
  }).lean();
}

/**
 * Gets historical records specifically by FY label.
 */
async function getPayrollByFY(employeeId, fy) {
    return await PayrollHistory.find({
        employeeId,
        financialYear: fy
    }).sort({ effectiveFrom: 1 }).lean();
}

/**
 * High Value FY Summary for UI visualization.
 */
async function getFYSummary(employeeId, fyLabel) {
    const records = await PayrollHistory.find({
        employeeId,
        financialYear: fyLabel
    }).sort({ effectiveFrom: 1 }).lean();

    if (!records.length) return null;

    return {
        financialYear: fyLabel,
        changeCount: records.length,
        startingSalary: records[0].salary,
        latestSalary: records[records.length - 1].salary,
        growthPercentage: records.length > 1 
            ? ((records[records.length - 1].salary - records[0].salary) / records[0].salary * 100).toFixed(1)
            : 0
    };
}

module.exports = {
  getFinancialYear,
  applyAppraisalToPayroll,
  calculateArrears,
  getCurrentSalary,
  getSalaryByDate,
  getPayrollByFY,
  getFYSummary
};
