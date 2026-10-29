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
const EXCLUDED_PAYROLL_EMPLOYEE_IDS = [
  'CDE001',
  'CDE002',
  'CDE003',
  'CDE089',
  'CDE093',
  'CDE162',
  'CDE163'
];

// Employees excluded from Leave Management (CDE161 remains restricted from leave)
const EXCLUDED_LEAVE_EMPLOYEE_IDS = [
  'CDE001',
  'CDE002',
  'CDE003',
  'CDE089',
  'CDE093',
  'CDE161',
  'CDE162',
  'CDE163'
];

// Backward-compatibility: list of all excluded IDs across modules
const EXCLUDED_PAYROLL_LEAVE_EMPLOYEE_IDS = Array.from(
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
const isExcludedFromPayroll = (employeeId) => {
  if (!employeeId) return false;
  return PAYROLL_EXCLUDED_SET.has(String(employeeId).trim().toUpperCase());
};

/**
 * Checks if a given employee ID is excluded from Leave systems.
 * @param {string|number} employeeId
 * @returns {boolean}
 */
const isExcludedFromLeave = (employeeId) => {
  if (!employeeId) return false;
  return LEAVE_EXCLUDED_SET.has(String(employeeId).trim().toUpperCase());
};

/**
 * Backward-compatible helper. Checks if employee is excluded from Payroll.
 * @param {string|number} employeeId
 * @returns {boolean}
 */
const isExcludedFromPayrollAndLeave = (employeeId) => {
  if (!employeeId) return false;
  return isExcludedFromPayroll(employeeId);
};

const buildMongoExclusionFilter = (ids, fieldName = 'employeeId') => {
  const allVariants = [];
  for (const id of ids) {
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

/**
 * Returns a MongoDB query object to filter out employees excluded from Payroll.
 * @param {string} fieldName - The MongoDB field name (default: 'employeeId')
 * @returns {object}
 */
const getPayrollExclusionMongoFilter = (fieldName = 'employeeId') => {
  return buildMongoExclusionFilter(EXCLUDED_PAYROLL_EMPLOYEE_IDS, fieldName);
};

/**
 * Returns a MongoDB query object to filter out employees excluded from Leave.
 * @param {string} fieldName - The MongoDB field name (default: 'employeeId')
 * @returns {object}
 */
const getLeaveExclusionMongoFilter = (fieldName = 'employeeId') => {
  return buildMongoExclusionFilter(EXCLUDED_LEAVE_EMPLOYEE_IDS, fieldName);
};

/**
 * Backward-compatible filter helper (defaults to Payroll filter).
 */
const getPayrollLeaveExclusionMongoFilter = (fieldName = 'employeeId') => {
  return getPayrollExclusionMongoFilter(fieldName);
};

module.exports = {
  EXCLUDED_PAYROLL_EMPLOYEE_IDS,
  EXCLUDED_LEAVE_EMPLOYEE_IDS,
  EXCLUDED_PAYROLL_LEAVE_EMPLOYEE_IDS,
  isExcludedFromPayroll,
  isExcludedFromLeave,
  isExcludedFromPayrollAndLeave,
  getPayrollExclusionMongoFilter,
  getLeaveExclusionMongoFilter,
  getPayrollLeaveExclusionMongoFilter
};
