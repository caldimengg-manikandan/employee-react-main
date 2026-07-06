// middleware/validation.js
const { body, param, query, validationResult } = require('express-validator');

/**
 * Global Validation Error Handler Middleware
 * Checks express-validator results and formats them consistently as 422 Validation Failed
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation Failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Reusable Atomic Validators
const validateEmail = (field = 'email') =>
  body(field).optional({ checkFalsy: true }).isEmail().withMessage(`Invalid email format for ${field}`);

const validatePhone = (field = 'phone') =>
  body(field).optional({ checkFalsy: true }).isString().isLength({ min: 7, max: 15 }).withMessage(`Invalid phone number length for ${field}`);

const validateEmployeeId = (field = 'employeeId') =>
  body(field).notEmpty().withMessage(`${field} is required`).isString().withMessage(`${field} must be a string`);

const validateDate = (field = 'date') =>
  body(field).optional({ checkFalsy: true }).isISO8601().withMessage(`Invalid ISO8601 date format for ${field}`);

const validateSalary = (field = 'salary') =>
  body(field).optional({ checkFalsy: true }).isNumeric().custom(val => Number(val) >= 0).withMessage(`${field} must be a non-negative number`);

const validateObjectIdParam = (field = 'id') =>
  param(field).optional().isMongoId().withMessage(`Invalid MongoDB ObjectId for param ${field}`);

const validateEnum = (field, allowedValues) =>
  body(field).optional({ checkFalsy: true }).isIn(allowedValues).withMessage(`Invalid value for ${field}. Allowed: ${allowedValues.join(', ')}`);

const validatePassword = (field = 'password') =>
  body(field).notEmpty().withMessage(`${field} is required`).isLength({ min: 4 }).withMessage(`${field} must be at least 4 characters long`);

const validateRole = (field = 'role') =>
  body(field).optional({ checkFalsy: true }).isString().withMessage(`${field} must be a string`);

const validateStatus = (field = 'status') =>
  body(field).optional({ checkFalsy: true }).isString().withMessage(`${field} must be a string`);

const validateBoolean = (field) =>
  body(field).optional().isBoolean().withMessage(`${field} must be a boolean`);

const validateArray = (field) =>
  body(field).optional().isArray().withMessage(`${field} must be an array`);

// ==========================================
// Module-Specific Validation Suites (17 Modules)
// ==========================================

// 1. Authentication Module
const validateLogin = [
  body('password').notEmpty().withMessage('Password is required'),
  body().custom((val, { req }) => {
    if (!req.body.email && !req.body.employeeId) {
      throw new Error('Either email or employeeId is required for login');
    }
    return true;
  }),
  handleValidationErrors
];

const validateForgotPassword = [
  body().custom((val, { req }) => {
    if (!req.body.email && !req.body.employeeId) {
      throw new Error('Either email or employeeId is required');
    }
    return true;
  }),
  handleValidationErrors
];

// 2. Employee & User Management Module
const validateEmployeeCreate = [
  body('employeeId').notEmpty().withMessage('employeeId is required'),
  body('name').notEmpty().withMessage('name is required'),
  validateEmail('email'),
  validateEmail('officialEmail'),
  validatePhone('mobileNo'),
  validatePhone('contactNumber'),
  validateSalary('basicDA'),
  validateSalary('hra'),
  validateSalary('specialAllowance'),
  validateSalary('gratuity'),
  validateSalary('ctc'),
  validateSalary('netSalary'),
  handleValidationErrors
];

const validateEmployeeUpdate = [
  validateEmail('email'),
  validateEmail('officialEmail'),
  validatePhone('mobileNo'),
  validatePhone('contactNumber'),
  validateSalary('basicDA'),
  validateSalary('hra'),
  validateSalary('specialAllowance'),
  validateSalary('gratuity'),
  validateSalary('ctc'),
  validateSalary('netSalary'),
  handleValidationErrors
];

// 3. Attendance Module
const validateAttendancePunch = [
  body('employeeId').optional().isString().withMessage('employeeId must be a string'),
  validateDate('punchTime'),
  handleValidationErrors
];

// 4. Timesheet Module
const validateTimesheetCreate = [
  body('employeeId').optional().isString().withMessage('employeeId must be a string'),
  validateDate('date'),
  validateSalary('hoursWorked'),
  handleValidationErrors
];

// 5. Leave Module
const validateLeaveApply = [
  body('employeeId').optional().isString().withMessage('employeeId must be a string'),
  body('leaveType').optional().isString().withMessage('leaveType must be a string'),
  validateDate('startDate'),
  validateDate('endDate'),
  validateSalary('days'),
  handleValidationErrors
];

// 6. Payroll Module
const validatePayrollCreate = [
  body('employeeId').optional().isString().withMessage('employeeId must be a string'),
  validateSalary('basicDA'),
  validateSalary('hra'),
  validateSalary('specialAllowance'),
  validateSalary('totalEarnings'),
  validateSalary('totalDeductions'),
  validateSalary('netSalary'),
  handleValidationErrors
];

// 7. Monthly Payroll Module
const validateMonthlyPayroll = [
  body('month').optional().isString().withMessage('month must be a string'),
  body('year').optional().isNumeric().withMessage('year must be numeric'),
  handleValidationErrors
];

// 8. Loan Module
const validateLoanApply = [
  body('employeeId').optional().isString().withMessage('employeeId must be a string'),
  body('loanAmount').optional().isNumeric().custom(val => Number(val) >= 0).withMessage('loanAmount must be non-negative'),
  body('amount').optional().isNumeric().custom(val => Number(val) >= 0).withMessage('amount must be non-negative'),
  validateSalary('emiAmount'),
  handleValidationErrors
];

// 9. Support Center Module
const validateSupportTicket = [
  body('title').optional().isString().withMessage('title must be a string'),
  body('description').optional().isString().withMessage('description must be a string'),
  handleValidationErrors
];

// 10. Assets / Expenditure Module
const validateExpenditure = [
  validateSalary('amount'),
  validateSalary('expenditureAmount'),
  body('expenseType').optional().isString().withMessage('expenseType must be a string'),
  handleValidationErrors
];

// 11. Insurance Module
const validateInsuranceClaim = [
  validateSalary('claimAmount'),
  validateSalary('approvedAmount'),
  body('policyNumber').optional().isString().withMessage('policyNumber must be a string'),
  handleValidationErrors
];

// 12. Policies Module
const validatePolicyCreate = [
  body('title').optional().isString().withMessage('title must be a string'),
  body('content').optional().isString().withMessage('content must be a string'),
  handleValidationErrors
];

// 13. Knowledge Sharing / Announcements Module
const validateAnnouncement = [
  body('title').optional().isString().withMessage('title must be a string'),
  body('message').optional().isString().withMessage('message must be a string'),
  handleValidationErrors
];

// 14. Induction Program Module
const validateInduction = [
  body('employeeId').optional().isString().withMessage('employeeId must be a string'),
  validateStatus('status'),
  handleValidationErrors
];

// 15. Project Allocation Module
const validateProject = [
  body('name').optional().isString().withMessage('name must be a string'),
  body('description').optional().isString().withMessage('description must be a string'),
  handleValidationErrors
];

// 16. Performance Management Module
const validatePerformance = [
  body('employeeId').optional().isString().withMessage('employeeId must be a string'),
  validateSalary('increment'),
  validateSalary('performancePay'),
  handleValidationErrors
];

// 17. User Management Module
const validateUserManagement = [
  validateRole('role'),
  validateStatus('status'),
  validateEmail('email'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateEmail,
  validatePhone,
  validateEmployeeId,
  validateDate,
  validateSalary,
  validateObjectIdParam,
  validateEnum,
  validatePassword,
  validateRole,
  validateStatus,
  validateBoolean,
  validateArray,
  // 17 Module Validation Suites
  validateLogin,
  validateForgotPassword,
  validateEmployeeCreate,
  validateEmployeeUpdate,
  validateAttendancePunch,
  validateTimesheetCreate,
  validateLeaveApply,
  validatePayrollCreate,
  validateMonthlyPayroll,
  validateLoanApply,
  validateSupportTicket,
  validateExpenditure,
  validateInsuranceClaim,
  validatePolicyCreate,
  validateAnnouncement,
  validateInduction,
  validateProject,
  validatePerformance,
  validateUserManagement
};
