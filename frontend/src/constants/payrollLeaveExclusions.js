/**
 * Centralized Configuration for Employees Excluded from Payroll & Leave Management.
 * 
 * Requirement:
 * - These employees MUST remain active and untouched in Employee Master, Timesheets,
 *   Attendance, User Access, Employee Directory, Profile, etc.
 * - They MUST NOT be included, generated, or displayed in:
 *     1. Payroll Details, Monthly Payroll, Salary Slips, CTC, Compensation Master, Payroll History.
 *     2. Leave Balance, Leave Allocation, Leave Summary, Leave Ledger, Leave Processing.
 */

export const EXCLUDED_PAYROLL_LEAVE_EMPLOYEE_IDS = [
  'CDE001',
  'CDE002',
  'CDE003',
  'CDE089',
  'CDE093',
  'CDE161',
  'CDE162',
  'CDE163'
];

const EXCLUDED_SET = new Set(
  EXCLUDED_PAYROLL_LEAVE_EMPLOYEE_IDS.map(id => String(id).trim().toUpperCase())
);

/**
 * Checks if a given employee ID is excluded from Payroll and Leave systems.
 * @param {string|number} employeeId
 * @returns {boolean}
 */
export const isExcludedFromPayrollAndLeave = (employeeId) => {
  if (!employeeId) return false;
  return EXCLUDED_SET.has(String(employeeId).trim().toUpperCase());
};

/**
 * Helper to filter out excluded employees from an array.
 * @param {Array} list
 * @param {Function|string} [idGetter]
 * @returns {Array}
 */
export const filterOutExcludedPayrollLeaveEmployees = (
  list,
  idGetter = (e) => e?.employeeId || e?.empId || e?.id
) => {
  if (!Array.isArray(list)) return [];
  return list.filter(item => {
    const id = typeof idGetter === 'function' ? idGetter(item) : item?.[idGetter];
    return !isExcludedFromPayrollAndLeave(id);
  });
};
