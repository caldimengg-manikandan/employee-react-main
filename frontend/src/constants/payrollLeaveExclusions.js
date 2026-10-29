/**
 * Centralized Configuration for Employees Excluded from Payroll & Leave Management.
 * 
 * Requirement:
 * - These employees MUST remain active and untouched in Employee Master, Timesheets,
 *   Attendance, User Access, Employee Directory, Profile, etc.
 * - Payroll Excluded:
 *     Employees who MUST NOT be included, generated, or displayed in:
 *     Payroll Details, Monthly Payroll, Salary Slips, CTC, Compensation Master, Payroll History, Holiday Allowance.
 * - Leave Excluded:
 *     Employees who MUST NOT be included, generated, or displayed in:
 *     Leave Balance, Leave Allocation, Leave Summary, Leave Ledger, Leave Processing, Leave Applications.
 *
 * Specific Configuration:
 * - CDE161 (SUMA - Housekeeping Staff) is ALLOWED for Payroll Management ONLY,
 *   and RESTRICTED from Leave Management.
 */

// Employees excluded from Payroll Management (CDE161 is allowed for payroll)
export const EXCLUDED_PAYROLL_EMPLOYEE_IDS = [
  'CDE001',
  'CDE002',
  'CDE003',
  'CDE089',
  'CDE093',
  'CDE162',
  'CDE163'
];

// Employees excluded from Leave Management (CDE161 remains restricted from leave)
export const EXCLUDED_LEAVE_EMPLOYEE_IDS = [
  'CDE001',
  'CDE002',
  'CDE003',
  'CDE089',
  'CDE093',
  'CDE161',
  'CDE162',
  'CDE163'
];

export const EXCLUDED_PAYROLL_LEAVE_EMPLOYEE_IDS = Array.from(
  new Set([...EXCLUDED_PAYROLL_EMPLOYEE_IDS, ...EXCLUDED_LEAVE_EMPLOYEE_IDS])
);

const PAYROLL_EXCLUDED_SET = new Set(
  EXCLUDED_PAYROLL_EMPLOYEE_IDS.map(id => String(id).trim().toUpperCase())
);

const LEAVE_EXCLUDED_SET = new Set(
  EXCLUDED_LEAVE_EMPLOYEE_IDS.map(id => String(id).trim().toUpperCase())
);

/**
 * Checks if a given employee ID is excluded from Payroll.
 * @param {string|number} employeeId
 * @returns {boolean}
 */
export const isExcludedFromPayroll = (employeeId) => {
  if (!employeeId) return false;
  return PAYROLL_EXCLUDED_SET.has(String(employeeId).trim().toUpperCase());
};

/**
 * Checks if a given employee ID is excluded from Leave.
 * @param {string|number} employeeId
 * @returns {boolean}
 */
export const isExcludedFromLeave = (employeeId) => {
  if (!employeeId) return false;
  return LEAVE_EXCLUDED_SET.has(String(employeeId).trim().toUpperCase());
};

/**
 * Backward-compatible helper. Checks if employee is excluded from Payroll.
 * @param {string|number} employeeId
 * @returns {boolean}
 */
export const isExcludedFromPayrollAndLeave = (employeeId) => {
  if (!employeeId) return false;
  return isExcludedFromPayroll(employeeId);
};

/**
 * Helper to filter out employees excluded from Payroll from an array.
 * @param {Array} list
 * @param {Function|string} [idGetter]
 * @returns {Array}
 */
export const filterOutExcludedPayrollEmployees = (
  list,
  idGetter = (e) => e?.employeeId || e?.empId || e?.id
) => {
  if (!Array.isArray(list)) return [];
  return list.filter(item => {
    const id = typeof idGetter === 'function' ? idGetter(item) : item?.[idGetter];
    return !isExcludedFromPayroll(id);
  });
};

/**
 * Helper to filter out employees excluded from Leave from an array.
 * @param {Array} list
 * @param {Function|string} [idGetter]
 * @returns {Array}
 */
export const filterOutExcludedLeaveEmployees = (
  list,
  idGetter = (e) => e?.employeeId || e?.empId || e?.id
) => {
  if (!Array.isArray(list)) return [];
  return list.filter(item => {
    const id = typeof idGetter === 'function' ? idGetter(item) : item?.[idGetter];
    return !isExcludedFromLeave(id);
  });
};

/**
 * Backward-compatible helper (defaults to Payroll filtering).
 */
export const filterOutExcludedPayrollLeaveEmployees = filterOutExcludedPayrollEmployees;
