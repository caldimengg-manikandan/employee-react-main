/**
 * leaveService.js
 *
 * Core leave management service.
 * Handles:
 *  - Monthly automatic allocation via EmployeeLeaveLedger (new source of truth)
 *  - Per-employee policy via EmployeeLeavePolicy
 *  - Leave split calculation (CL → SL → PL → LOP)
 *  - Balance deduction on leave approval
 *  - Legacy LeaveBalance sync for real-time display
 */

const LeaveLedger = require('../models/LeaveLedger');          // legacy, kept for old transactions
const LeaveBalance = require('../models/LeaveBalance');
const Employee = require('../models/Employee');
const LeaveApplication = require('../models/LeaveApplication');
const EmployeeLeavePolicy = require('../models/EmployeeLeavePolicy');
const EmployeeLeaveLedger = require('../models/EmployeeLeaveLedger');
const { getFinancialYear } = require('../utils/payrollSync');

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const monthsBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months -= start.getMonth();
  months += end.getMonth();
  return Math.max(0, months);
};

const monthsBetweenRange = (startDate, endDate) => monthsBetween(startDate, endDate);

const toLower = (s) => String(s || '').toLowerCase();

// Default policy values when no record exists for an employee
const DEFAULT_POLICY = {
  monthly_cl_allocation: 0.5,
  cl_carry_forward: true,
  monthly_sl_allocation: 0.5,
  sl_carry_forward: true,
  monthly_pl_allocation: 1.25,
  pl_carry_forward: true
};

// ---------------------------------------------------------------------------
// Policy helpers
// ---------------------------------------------------------------------------

/**
 * Fetch employee leave policy, or return defaults if none configured.
 */
const getEmployeePolicyOrDefault = async (employeeId) => {
  try {
    const policy = await EmployeeLeavePolicy.findOne({ employeeId }).lean();
    if (policy) return policy;
    return { employeeId, ...DEFAULT_POLICY };
  } catch (err) {
    console.error(`Error fetching policy for ${employeeId}:`, err);
    return { employeeId, ...DEFAULT_POLICY };
  }
};

// ---------------------------------------------------------------------------
// Ledger-based balance calculation
// ---------------------------------------------------------------------------

/**
 * Get the current live balance for an employee from the monthly ledger.
 * Current balance = closing_balance of the latest month's ledger entry
 *                   minus any approved-but-not-yet-reflected leaves this month.
 */
const getLedgerCurrentBalance = async (employeeId) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const result = { CL: 0, SL: 0, PL: 0 };

  for (const leaveType of ['CL', 'SL', 'PL']) {
    // Get this month's ledger entry
    const entry = await EmployeeLeaveLedger.findOne({
      employee_id: employeeId,
      year: currentYear,
      month: currentMonth,
      leave_type: leaveType
    }).lean();

    if (entry) {
      result[leaveType] = entry.closing_balance;
    } else {
      // No entry this month yet — use closing from previous month
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const prev = await EmployeeLeaveLedger.findOne({
        employee_id: employeeId,
        year: prevYear,
        month: prevMonth,
        leave_type: leaveType
      }).lean();
      result[leaveType] = prev ? prev.closing_balance : 0;
    }
  }
  return result;
};

/**
 * Get closing balance of a specific month from ledger.
 * Returns { CL: number, SL: number, PL: number }
 */
const getPreviousMonthClosing = async (employeeId, year, month) => {
  const result = { CL: 0, SL: 0, PL: 0 };
  for (const leaveType of ['CL', 'SL', 'PL']) {
    const entry = await EmployeeLeaveLedger.findOne({
      employee_id: employeeId,
      year,
      month,
      leave_type: leaveType
    }).lean();
    if (entry) result[leaveType] = entry.closing_balance;
  }
  return result;
};

// ---------------------------------------------------------------------------
// Monthly Automatic Allocation (runs on 1st of each month)
// ---------------------------------------------------------------------------

/**
 * Run the monthly leave allocation process.
 * Steps:
 *  1. Check if already run for this month (duplicate prevention)
 *  2. Fetch employee leave policy
 *  3. Fetch previous month closing balance
 *  4. Apply carry-forward rule
 *  5. Add current month allocation
 *  6. Insert ledger records
 *  7. Sync LeaveBalance document for real-time display
 */
const runMonthlyAllocation = async (targetDate = new Date()) => {
  const month = targetDate.getMonth() + 1; // 1–12
  const year = targetDate.getFullYear();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  console.log(`[LeaveAllocation] Starting allocation for ${month}/${year}...`);

  const employees = await Employee.find({ status: 'Active' }).lean();
  let processedCount = 0;
  let skippedCount = 0;
  const details = [];

  for (const emp of employees) {
    if (!emp.employeeId) continue;
    const empId = emp.employeeId;

    try {
      // ── Step 1: Duplicate check ───────────────────────────────────────────
      const existingEntries = await EmployeeLeaveLedger.countDocuments({
        employee_id: empId,
        year,
        month
      });
      if (existingEntries > 0) {
        console.log(`[LeaveAllocation] Skipping ${empId} — already allocated for ${month}/${year}`);
        skippedCount++;
        details.push({ employeeId: empId, employeeName: emp.name, status: 'Skipped' });
        continue;
      }

      // ── Step 2: Fetch policy ──────────────────────────────────────────────
      const policy = await getEmployeePolicyOrDefault(empId);

      // ── Step 3: Fetch previous month closing balances ─────────────────────
      const prevClosing = await getPreviousMonthClosing(empId, prevYear, prevMonth);

      // If no previous ledger exists at all, try to seed from legacy LeaveBalance
      const prevLedgerCount = await EmployeeLeaveLedger.countDocuments({
        employee_id: empId,
        year: prevYear,
        month: prevMonth
      });
      const hasPrevLedger = prevLedgerCount > 0;
      if (!hasPrevLedger) {
        // Attempt to seed opening from existing LeaveBalance document
        const legacyBal = await LeaveBalance.findOne({ employeeId: empId }).lean();
        if (legacyBal && legacyBal.balances) {
          prevClosing.CL = Math.max(0, legacyBal.balances.casual?.balance || 0);
          prevClosing.SL = Math.max(0, legacyBal.balances.sick?.balance || 0);
          prevClosing.PL = Math.max(0, legacyBal.balances.privilege?.balance || 0);
          prevClosing.BEREAVEMENT = Math.max(0, legacyBal.balances.bereavement?.balance || 0);
        }
      }

      // ── Step 4 & 5: Apply carry-forward + add allocation ──────────────────
      const leaveTypes = [
        {
          type: 'CL',
          allocation: policy.monthly_cl_allocation ?? DEFAULT_POLICY.monthly_cl_allocation,
          carryForward: policy.cl_carry_forward ?? DEFAULT_POLICY.cl_carry_forward,
          prevClose: prevClosing.CL
        },
        {
          type: 'SL',
          allocation: policy.monthly_sl_allocation ?? DEFAULT_POLICY.monthly_sl_allocation,
          carryForward: policy.sl_carry_forward ?? DEFAULT_POLICY.sl_carry_forward,
          prevClose: prevClosing.SL
        },
        {
          type: 'PL',
          allocation: policy.monthly_pl_allocation ?? DEFAULT_POLICY.monthly_pl_allocation,
          carryForward: policy.pl_carry_forward ?? DEFAULT_POLICY.pl_carry_forward,
          prevClose: prevClosing.PL
        },
        {
          type: 'BEREAVEMENT',
          allocation: ((month === 4 || !hasPrevLedger) && policy.bereavement_leave_enabled) ? (policy.monthly_bereavement_allocation ?? 0) : 0,
          carryForward: month !== 4, // carry forward within FY, reset in April
          prevClose: prevClosing.BEREAVEMENT || 0
        }
      ];

      const ledgerRecords = [];
      const newBalances = {};

      for (const lt of leaveTypes) {
        // Rule 1: Only positive balances carry forward
        const rawOpening = lt.carryForward ? Math.max(0, lt.prevClose) : 0;
        const opening = rawOpening;
        const allocated = lt.allocation;
        const closing = opening + allocated;  // used_leave starts at 0 for the month

        ledgerRecords.push({
          employee_id: empId,
          employee_name: emp.name,
          year,
          month,
          leave_type: lt.type,
          opening_balance: opening,
          allocated_leave: allocated,
          used_leave: 0,
          closing_balance: closing,
          carry_forward: lt.carryForward,
          lop_days: 0,
          is_locked: false
        });

        newBalances[lt.type] = closing;
      }

      // ── Step 6: Insert ledger records ─────────────────────────────────────
      await EmployeeLeaveLedger.insertMany(ledgerRecords, { ordered: false });

      // ── Step 7: Sync LeaveBalance document for real-time display ──────────
      await LeaveBalance.findOneAndUpdate(
        { employeeId: empId },
        {
          $set: {
            employeeId: empId,
            employeeName: emp.name,
            year,
            'balances.casual.balance': newBalances.CL,
            'balances.casual.allocated': newBalances.CL,
            'balances.casual.used': 0,
            'balances.sick.balance': newBalances.SL,
            'balances.sick.allocated': newBalances.SL,
            'balances.sick.used': 0,
            'balances.privilege.balance': newBalances.PL,
            'balances.privilege.allocated': newBalances.PL,
            'balances.privilege.used': 0,
            'balances.bereavement.balance': newBalances.BEREAVEMENT || 0,
            'balances.bereavement.allocated': newBalances.BEREAVEMENT || 0,
            'balances.bereavement.used': 0,
            'balances.totalBalance': newBalances.CL + newBalances.SL + newBalances.PL + (newBalances.BEREAVEMENT || 0),
            lastUpdated: new Date(),
            lastAllocationMonth: month,
            lastAllocationYear: year,
            lastAllocationDate: new Date()
          }
        },
        { upsert: true, new: true }
      );

      processedCount++;
      details.push({
        employeeId: empId,
        employeeName: emp.name,
        cl: ledgerRecords.find(r => r.leave_type === 'CL')?.closing_balance,
        sl: ledgerRecords.find(r => r.leave_type === 'SL')?.closing_balance,
        pl: ledgerRecords.find(r => r.leave_type === 'PL')?.closing_balance,
        bl: ledgerRecords.find(r => r.leave_type === 'BEREAVEMENT')?.closing_balance,
        status: 'Success'
      });

      console.log(`[LeaveAllocation] ✅ ${empId} — CL:${newBalances.CL} SL:${newBalances.SL} PL:${newBalances.PL} BL:${newBalances.BEREAVEMENT}`);

    } catch (empErr) {
      console.error(`[LeaveAllocation] ❌ Failed for ${empId}:`, empErr.message);
      details.push({ employeeId: empId, employeeName: emp.name, status: 'Failed', error: empErr.message });
    }
  }

  console.log(`[LeaveAllocation] Done. Processed: ${processedCount}, Skipped: ${skippedCount}`);
  return { success: true, processedCount, skippedCount, details };
};

// ---------------------------------------------------------------------------
// Leave Application Deduction (called on leave approval)
// ---------------------------------------------------------------------------

/**
 * Apply a leave deduction to the monthly ledger when a leave is approved.
 * Also updates the real-time LeaveBalance document.
 */
const applyLeaveToLedger = async (leaveApp) => {
  const empId = leaveApp.employeeId;
  if (!empId) return;

  const clUsed = Number(leaveApp.clUsed || 0);
  const slUsed = Number(leaveApp.slUsed || 0);
  const plUsed = Number(leaveApp.plUsed || 0);
  const negativePL = Number(leaveApp.negativePL || 0);
  const lopDays = Number(leaveApp.lopDays || 0);

  // Determine the month/year from the leave start date
  const leaveStart = new Date(leaveApp.startDate);
  const leaveYear = leaveStart.getFullYear();
  const leaveMonth = leaveStart.getMonth() + 1;

  const deductions = [
    { type: 'CL', used: clUsed },
    { type: 'SL', used: slUsed },
    { type: 'PL', used: plUsed + negativePL }
  ];

  if (leaveApp.leaveType === 'BEREAVEMENT') {
    deductions.push({ type: 'BEREAVEMENT', used: Number(leaveApp.totalDays || 0) });
  }

  for (const d of deductions) {
    if (d.used <= 0) continue;

    // Check if month is locked
    const entry = await EmployeeLeaveLedger.findOne({
      employee_id: empId,
      year: leaveYear,
      month: leaveMonth,
      leave_type: d.type
    });

    if (entry) {
      if (entry.is_locked) {
        console.warn(`[LeaveDeduction] Month ${leaveMonth}/${leaveYear} is LOCKED for ${empId}. Skipping ${d.type} update.`);
        continue;
      }
      entry.used_leave = (entry.used_leave || 0) + d.used;
      entry.closing_balance = (entry.opening_balance || 0) + (entry.allocated_leave || 0) - entry.used_leave;
      if (d.type === 'PL' && lopDays > 0) {
        entry.lop_days = (entry.lop_days || 0) + lopDays;
      }
      await entry.save();
    }
    // If no ledger entry for this month, the update is skipped (happens for historical leaves)
  }

  // Also update the real-time LeaveBalance document
  await applyLeaveDeduction(leaveApp);
};

/**
 * Reverse a leave deduction (called when a leave is rejected after approval).
 */
const reverseLeaveFromLedger = async (leaveApp) => {
  const empId = leaveApp.employeeId;
  if (!empId) return;

  const clUsed = Number(leaveApp.clUsed || 0);
  const slUsed = Number(leaveApp.slUsed || 0);
  const plUsed = Number(leaveApp.plUsed || 0);
  const negativePL = Number(leaveApp.negativePL || 0);
  const lopDays = Number(leaveApp.lopDays || 0);

  const leaveStart = new Date(leaveApp.startDate);
  const leaveYear = leaveStart.getFullYear();
  const leaveMonth = leaveStart.getMonth() + 1;

  const reversals = [
    { type: 'CL', used: clUsed },
    { type: 'SL', used: slUsed },
    { type: 'PL', used: plUsed + negativePL }
  ];

  if (leaveApp.leaveType === 'BEREAVEMENT') {
    reversals.push({ type: 'BEREAVEMENT', used: Number(leaveApp.totalDays || 0) });
  }

  for (const d of reversals) {
    if (d.used <= 0) continue;

    const entry = await EmployeeLeaveLedger.findOne({
      employee_id: empId,
      year: leaveYear,
      month: leaveMonth,
      leave_type: d.type
    });

    if (entry && !entry.is_locked) {
      entry.used_leave = Math.max(0, (entry.used_leave || 0) - d.used);
      entry.closing_balance = (entry.opening_balance || 0) + (entry.allocated_leave || 0) - entry.used_leave;
      if (d.type === 'PL' && lopDays > 0) {
        entry.lop_days = Math.max(0, (entry.lop_days || 0) - lopDays);
      }
      await entry.save();
    }
  }

  // Also restore real-time LeaveBalance
  await reverseLeaveDeduction(leaveApp);
};

// ---------------------------------------------------------------------------
// Leave deduction on real-time LeaveBalance (legacy, kept for real-time display)
// ---------------------------------------------------------------------------

const applyLeaveDeduction = async (leaveApp) => {
  const targetEmployeeId = leaveApp.employeeId;
  if (!targetEmployeeId) return;

  const clUsed = Number(leaveApp.clUsed || 0);
  const slUsed = Number(leaveApp.slUsed || 0);
  const plUsed = Number(leaveApp.plUsed || 0);
  const negativePL = Number(leaveApp.negativePL || 0);
  const totalPlDebit = plUsed + negativePL;

  const updateObj = { $inc: {} };
  let totalUsed = 0;

  if (clUsed > 0) {
    updateObj.$inc['balances.casual.used'] = clUsed;
    updateObj.$inc['balances.casual.balance'] = -clUsed;
    totalUsed += clUsed;
  }
  if (slUsed > 0) {
    updateObj.$inc['balances.sick.used'] = slUsed;
    updateObj.$inc['balances.sick.balance'] = -slUsed;
    totalUsed += slUsed;
  }
  if (totalPlDebit > 0) {
    updateObj.$inc['balances.privilege.used'] = totalPlDebit;
    updateObj.$inc['balances.privilege.balance'] = -totalPlDebit;
    totalUsed += totalPlDebit;
  }

  if (leaveApp.leaveType === 'BEREAVEMENT') {
    const blUsed = Number(leaveApp.totalDays || 0);
    if (blUsed > 0) {
      updateObj.$inc['balances.bereavement.used'] = blUsed;
      updateObj.$inc['balances.bereavement.balance'] = -blUsed;
      totalUsed += blUsed;
    }
  }

  if (totalUsed > 0) {
    updateObj.$inc['balances.totalBalance'] = -totalUsed;
    await LeaveBalance.findOneAndUpdate({ employeeId: targetEmployeeId }, updateObj);
  }
};

const reverseLeaveDeduction = async (leaveApp) => {
  const targetEmployeeId = leaveApp.employeeId;
  if (!targetEmployeeId) return;

  const clUsed = Number(leaveApp.clUsed || 0);
  const slUsed = Number(leaveApp.slUsed || 0);
  const plUsed = Number(leaveApp.plUsed || 0);
  const negativePL = Number(leaveApp.negativePL || 0);
  const totalPlCredit = plUsed + negativePL;

  const updateObj = { $inc: {} };
  let totalRestored = 0;

  if (clUsed > 0) {
    updateObj.$inc['balances.casual.used'] = -clUsed;
    updateObj.$inc['balances.casual.balance'] = clUsed;
    totalRestored += clUsed;
  }
  if (slUsed > 0) {
    updateObj.$inc['balances.sick.used'] = -slUsed;
    updateObj.$inc['balances.sick.balance'] = slUsed;
    totalRestored += slUsed;
  }
  if (totalPlCredit > 0) {
    updateObj.$inc['balances.privilege.used'] = -totalPlCredit;
    updateObj.$inc['balances.privilege.balance'] = totalPlCredit;
    totalRestored += totalPlCredit;
  }

  if (leaveApp.leaveType === 'BEREAVEMENT') {
    const blUsed = Number(leaveApp.totalDays || 0);
    if (blUsed > 0) {
      updateObj.$inc['balances.bereavement.used'] = -blUsed;
      updateObj.$inc['balances.bereavement.balance'] = blUsed;
      totalRestored += blUsed;
    }
  }

  if (totalRestored > 0) {
    updateObj.$inc['balances.totalBalance'] = totalRestored;
    await LeaveBalance.findOneAndUpdate({ employeeId: targetEmployeeId }, updateObj);
  }
};

// ---------------------------------------------------------------------------
// Legacy: balance calculation from employee record (fallback for UI)
// ---------------------------------------------------------------------------

const calcBalanceForEmployee = (emp, approvedLeaves = [], calculationDate = new Date()) => {
  const currentDate = new Date(calculationDate);
  const currentYear = currentDate.getFullYear();
  const currentFY = getFinancialYear(currentDate);
  const position = emp.position || emp.role || '';
  const doj = emp.dateOfJoining || emp.hireDate || emp.createdAt;

  const isHistorical = currentDate < new Date().setHours(0, 0, 0, 0);
  const filteredLeaves = approvedLeaves.filter(l => {
    if (isHistorical) return new Date(l.startDate) <= currentDate;
    return true;
  });

  const mos = monthsBetween(doj, currentDate);
  const isTrainee = toLower(position) === 'trainee' || toLower(position).includes('trainee');

  let traineeMonths = 0;
  if (Array.isArray(emp.previousOrganizations) && emp.previousOrganizations.length > 0) {
    const traineeOrg = emp.previousOrganizations.find((o) => toLower(o.position).includes('trainee'));
    if (traineeOrg && (traineeOrg.startDate || doj)) {
      const start = traineeOrg.startDate || doj;
      const end = traineeOrg.endDate || new Date();
      const totalMonths = monthsBetweenRange(start, end);
      traineeMonths = Math.min(12, totalMonths);
    }
  }
  if (isTrainee) traineeMonths = Math.min(12, mos);
  const postTraineeMonths = Math.max(0, mos - traineeMonths);

  let casual = 0, sick = 0, bereavementAllocated = 0;
  let usedCL = 0, usedSL = 0, usedBL = 0;
  const afterSix = Math.max(postTraineeMonths - 6, 0);

  if (currentYear >= 2026) {
    const yearStart = new Date(currentYear, 0, 1);
    const dojDate = new Date(doj);
    if (dojDate < yearStart) {
      if (afterSix > 0) {
        const monthsInYear = currentDate.getMonth() + 1;
        casual = monthsInYear * 0.5;
        sick = monthsInYear * 0.5;
      }
    } else {
      casual = afterSix * 0.5;
      sick = afterSix * 0.5;
    }
    usedCL = filteredLeaves.reduce((sum, l) => {
      if (new Date(l.startDate).getFullYear() !== currentYear) return sum;
      if (l.clUsed !== undefined) return sum + (Number(l.clUsed) || 0);
      return sum + (l.leaveType === 'CL' ? (Number(l.totalDays) || 0) : 0);
    }, 0);
    usedSL = filteredLeaves.reduce((sum, l) => {
      if (new Date(l.startDate).getFullYear() !== currentYear) return sum;
      if (l.slUsed !== undefined) return sum + (Number(l.slUsed) || 0);
      return sum + (l.leaveType === 'SL' ? (Number(l.totalDays) || 0) : 0);
    }, 0);
    
    usedBL = filteredLeaves.reduce((sum, l) => {
      const lDate = new Date(l.startDate);
      if (lDate < currentFY.start || lDate > currentFY.end) return sum;
      return sum + (l.leaveType === 'BEREAVEMENT' ? (Number(l.totalDays) || 0) : 0);
    }, 0);
  } else {
    casual += afterSix * 0.5;
    sick += afterSix * 0.5;
    filteredLeaves.forEach(l => {
      if (l.clUsed !== undefined || l.slUsed !== undefined || l.plUsed !== undefined) {
        usedCL += (Number(l.clUsed) || 0);
        usedSL += (Number(l.slUsed) || 0);
      } else {
        if (l.leaveType === 'CL') usedCL += (Number(l.totalDays) || 0);
        else if (l.leaveType === 'SL') usedSL += (Number(l.totalDays) || 0);
        else if (l.leaveType === 'BEREAVEMENT') {
          const lDate = new Date(l.startDate);
          if (lDate >= currentFY.start && lDate <= currentFY.end) {
            usedBL += (Number(l.totalDays) || 0);
          }
        }
      }
    });
  }

  const allocated = { casual, sick, privilege: 0 };

  let plAllocated = 0, plUsed = 0, plBalance = 0;
  const dojDate = new Date(doj);
  const sixMonthThreshold = new Date(dojDate);
  sixMonthThreshold.setMonth(sixMonthThreshold.getMonth() + 6);

  if (isTrainee) {
    plAllocated = 1;
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    plUsed = filteredLeaves
      .filter(l => { const d = new Date(l.startDate); return d >= currentMonthStart && d <= currentMonthEnd; })
      .reduce((sum, l) => {
        if (l.plUsed !== undefined) return sum + (Number(l.plUsed) || 0) + (Number(l.negativePL) || 0);
        return sum + (l.leaveType === 'PL' ? (Number(l.totalDays) || 0) : 0);
      }, 0);
    plBalance = plAllocated - plUsed;
  } else {
    if (currentDate < sixMonthThreshold) {
      plAllocated = 1;
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      plUsed = filteredLeaves
        .filter(l => { const d = new Date(l.startDate); return d >= currentMonthStart && d <= currentMonthEnd; })
        .reduce((sum, l) => {
          if (l.plUsed !== undefined) return sum + (Number(l.plUsed) || 0) + (Number(l.negativePL) || 0);
          return sum + (l.leaveType === 'PL' ? (Number(l.totalDays) || 0) : 0);
        }, 0);
      plBalance = plAllocated - plUsed;
    } else {
      const monthsAfterThreshold = monthsBetweenRange(sixMonthThreshold, currentDate) + 1;
      plAllocated = monthsAfterThreshold * 1.25;
      plUsed = filteredLeaves
        .filter(l => new Date(l.startDate) >= sixMonthThreshold)
        .reduce((sum, l) => {
          if (l.plUsed !== undefined) return sum + (Number(l.plUsed) || 0) + (Number(l.negativePL) || 0);
          return sum + (l.leaveType === 'PL' ? (Number(l.totalDays) || 0) : 0);
        }, 0);
      plBalance = plAllocated - plUsed;
    }
  }

  allocated.privilege = plAllocated;
  const balance = { casual: allocated.casual - usedCL, sick: allocated.sick - usedSL, privilege: plBalance, bereavement: bereavementAllocated - usedBL };
  const totalBalance = balance.casual + balance.sick + balance.privilege + balance.bereavement;

  return {
    employeeId: emp.employeeId || '',
    name: emp.name || emp.employeename || '',
    position: emp.position || emp.role || '',
    division: emp.division || '',
    location: emp.location || emp.branch || '',
    monthsOfService: mos,
    traineeMonths,
    regularMonths: postTraineeMonths,
    balances: {
      casual: { allocated: allocated.casual, used: usedCL, balance: balance.casual },
      sick: { allocated: allocated.sick, used: usedSL, balance: balance.sick },
      privilege: { allocated: allocated.privilege, used: plUsed, balance: balance.privilege, nonCarryAllocated: 0, carryAllocated: allocated.privilege, carryForwardEligibleBalance: balance.privilege },
      bereavement: { allocated: bereavementAllocated, used: usedBL, balance: balance.bereavement }
    },
    isMonthlyExpiry: (postTraineeMonths || 0) < 6,
    totalBalance
  };
};

const mergeBalances = (storedBalances, systemCalc, pastSystemCalc) => {
  const mergedBalances = JSON.parse(JSON.stringify(storedBalances));
  ['casual', 'sick', 'privilege', 'bereavement'].forEach(type => {
    if (mergedBalances[type]) {
      let allocated = Number(mergedBalances[type].allocated) || 0;
      const currentAlloc = Number(systemCalc.balances[type]?.allocated) || 0;
      const pastAlloc = Number(pastSystemCalc.balances[type]?.allocated) || 0;
      const delta = currentAlloc - pastAlloc;
      if (Math.abs(delta) > 0.001) allocated += delta;
      const used = Number(systemCalc.balances[type]?.used) || 0;
      mergedBalances[type].allocated = allocated;
      mergedBalances[type].used = used;
      mergedBalances[type].balance = allocated - used;
    }
  });
  const clBal = Number(mergedBalances.casual?.balance) || 0;
  const slBal = Number(mergedBalances.sick?.balance) || 0;
  const plBal = Number(mergedBalances.privilege?.balance) || 0;
  const blBal = Number(mergedBalances.bereavement?.balance) || 0;
  mergedBalances.totalBalance = clBal + slBal + plBal + blBal;
  if (systemCalc.balances && systemCalc.balances.isMonthlyExpiry !== undefined) {
    mergedBalances.isMonthlyExpiry = systemCalc.balances.isMonthlyExpiry;
  }
  return mergedBalances;
};

// ---------------------------------------------------------------------------
// Legacy transaction recorder
// ---------------------------------------------------------------------------

const recordTransaction = async (data) => {
  try {
    const { employeeId, leaveType, transactionType, days, month, year, remarks } = data;
    if (transactionType === 'Credit') {
      const existing = await LeaveLedger.findOne({ employeeId, leaveType, month, year, transactionType: 'Credit' });
      if (existing) {
        console.log(`Skipping duplicate credit for ${employeeId} - ${leaveType} (${month}/${year})`);
        return null;
      }
    }
    const ledgerEntry = new LeaveLedger({ employeeId, leaveType, transactionType, days, month, year, remarks, transactionDate: new Date() });
    return await ledgerEntry.save();
  } catch (err) {
    console.error('Error recording transaction:', err);
    throw err;
  }
};

// ---------------------------------------------------------------------------
// Leave Split Calculator (CL → SL → PL → LOP)
// ---------------------------------------------------------------------------

const calculateLeaveSplit = (requestedDays, balances) => {
  let rem = requestedDays;
  const split = { clUsed: 0, slUsed: 0, plUsed: 0, negativePL: 0, lopDays: 0, remainingBalance: 0 };

  const cl = Math.max(0, balances.casual?.balance || 0);
  const sl = Math.max(0, balances.sick?.balance || 0);
  const pl = Math.max(0, balances.privilege?.balance || 0);

  // 1. Use CL
  if (cl > 0) { split.clUsed = Math.min(rem, cl); rem -= split.clUsed; }
  // 2. Use SL
  if (rem > 0 && sl > 0) { split.slUsed = Math.min(rem, sl); rem -= split.slUsed; }
  // 3. Use PL
  if (rem > 0 && pl > 0) { split.plUsed = Math.min(rem, pl); rem -= split.plUsed; }
  // 4. LOP for the remainder
  if (rem > 0) { split.lopDays = rem; split.negativePL = rem; }

  split.remainingBalance = (cl - split.clUsed) + (sl - split.slUsed) + (pl - split.plUsed - split.negativePL);
  return split;
};

const getPendingDeductions = async (employeeId, excludeLeaveId = null) => {
  const query = { employeeId, status: 'Pending' };
  if (excludeLeaveId) query._id = { $ne: excludeLeaveId };
  const pending = await LeaveApplication.find(query).lean();
  const agg = { CL: 0, SL: 0, PL: 0, BEREAVEMENT: 0 };
  pending.forEach(l => {
    if (l.clUsed !== undefined || l.slUsed !== undefined || l.plUsed !== undefined) {
      agg.CL += Number(l.clUsed || 0);
      agg.SL += Number(l.slUsed || 0);
      agg.PL += Number(l.plUsed || 0) + Number(l.negativePL || 0);
    } else {
      if (l.leaveType === 'CL') agg.CL += Number(l.totalDays || 0);
      else if (l.leaveType === 'SL') agg.SL += Number(l.totalDays || 0);
      else if (l.leaveType === 'PL') agg.PL += Number(l.totalDays || 0);
    }
    if (l.leaveType === 'BEREAVEMENT') agg.BEREAVEMENT += Number(l.totalDays || 0);
  });
  return agg;
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  monthsBetween,
  monthsBetweenRange,
  toLower,
  // Policy
  getEmployeePolicyOrDefault,
  // Ledger
  getLedgerCurrentBalance,
  getPreviousMonthClosing,
  // Allocation
  runMonthlyAllocation,
  // Deduction
  applyLeaveToLedger,
  reverseLeaveFromLedger,
  applyLeaveDeduction,
  reverseLeaveDeduction,
  // Legacy helpers
  calcBalanceForEmployee,
  mergeBalances,
  recordTransaction,
  monthsBetween,
  // Leave split
  calculateLeaveSplit,
  getPendingDeductions
};
