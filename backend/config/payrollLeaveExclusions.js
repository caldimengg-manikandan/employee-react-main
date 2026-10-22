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

const EXCLUDED_PAYROLL_LEAVE_EMPLOYEE_IDS = [
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
const isExcludedFromPayrollAndLeave = (employeeId) => {
  if (!employeeId) return false;
  return EXCLUDED_SET.has(String(employeeId).trim().toUpperCase());
};

/**
 * Returns a MongoDB query object to filter out excluded employee IDs.
 * @param {string} fieldName - The MongoDB field name (default: 'employeeId')
 * @returns {object}
 */
const getPayrollLeaveExclusionMongoFilter = (fieldName = 'employeeId') => {
  const allVariants = [];
  for (const id of EXCLUDED_PAYROLL_LEAVE_EMPLOYEE_IDS) {
    allVariants.push(id);
    allVariants.push(id.toLowerCase());
    allVariants.push(id.toUpperCase());
  }
  return {
    [fieldName]: {
      $nin: Array.from(new Set(allVariants))
    }
  };
};

module.exports = {
  EXCLUDED_PAYROLL_LEAVE_EMPLOYEE_IDS,
  isExcludedFromPayrollAndLeave,
  getPayrollLeaveExclusionMongoFilter
};
