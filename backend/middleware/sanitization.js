// middleware/sanitization.js
const mongoose = require('mongoose');

/**
 * List of known MongoDB ObjectId parameter/body keys.
 * Excludes string employee identifiers such as employeeId, empId, personCode, etc.
 */
const OBJECT_ID_KEYS = new Set([
  '_id',
  'id',
  'ticketId',
  'leaveId',
  'loanId',
  'timesheetId',
  'projectId',
  'teamId',
  'appraisalId',
  'policyId',
  'claimId',
  'rewardId',
  'notificationId',
  'bookingId',
  'resId',
  'commentId',
  'postId',
  'incrementId',
  'attributeId',
  'allowanceId',
  'requestId',
  'holidayId',
  'formalityId',
  'expenditureId',
  'typeId',
  'assessmentId'
]);

/**
 * List of Employee String ID keys.
 */
const EMPLOYEE_ID_KEYS = new Set([
  'employeeId',
  'empId',
  'personCode',
  'appraiser',
  'reviewer',
  'director'
]);

/**
 * List of monetary and numeric count fields that cannot be negative.
 */
const NON_NEGATIVE_FIELDS = new Set([
  'salary',
  'basicDA',
  'hra',
  'specialAllowance',
  'gratuity',
  'lop',
  'ctc',
  'netSalary',
  'totalEarnings',
  'totalDeductions',
  'amount',
  'bonus',
  'increment',
  'performancePay',
  'loanAmount',
  'emiAmount',
  'interestRate',
  'approvedAmount',
  'claimAmount',
  'expenditureAmount',
  'cost',
  'allocated',
  'used',
  'balance',
  'days',
  'duration',
  'leaveDays',
  'numberOfDays',
  'totalDays',
  'employeePfContribution',
  'employerPfContribution',
  'esi',
  'tax',
  'professionalTax',
  'volunteerPF'
]);

/**
 * Valid Leave Types for Enum checking
 */
const VALID_LEAVE_TYPES = new Set([
  'casual leave',
  'sick leave',
  'privilege leave',
  'maternity leave',
  'paternity leave',
  'bereavement leave',
  'compensatory off',
  'loss of pay',
  'casual',
  'sick',
  'privilege',
  'earned',
  'lop',
  'comp_off',
  'annual',
  'medical',
  'other',
  'comp-off',
  'earned leave',
  'compensatory leave',
  'half day',
  'full day'
]);

/**
 * Recursively sanitizes an object or array:
 * - Trims strings
 * - Removes <script> tags and XSS event handlers
 * - Checks for NoSQL injection keys ($ or .)
 * - Checks for Regex injection ($regex or ReDoS patterns)
 */
function sanitizeValue(val, keyName = '') {
  if (val === null || val === undefined) {
    return val;
  }

  if (typeof val === 'string') {
    // 1. Check for Regex Injection
    if (val === '$regex' || val.startsWith('(?') || val.includes('(a+)+$')) {
      throw new Error('Regex injection detected in request payload');
    }

    // 2. Trim whitespace
    let cleaned = val.trim();

    // 3. Prevent XSS & Remove script tags
    // Remove <script>...</script> tags case-insensitively
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    // Remove dangerous inline javascript or event handlers
    cleaned = cleaned.replace(/javascript:/gi, '');
    cleaned = cleaned.replace(/\b(onerror|onload|onclick|onmouseover|onfocus|onblur)=/gi, '');
    cleaned = cleaned.replace(/<(iframe|object|embed|link|meta)\b[^>]*>/gi, '');

    return cleaned;
  }

  if (Array.isArray(val)) {
    return val.map(item => sanitizeValue(item, keyName));
  }

  if (typeof val === 'object' && !(val instanceof Date)) {
    const cleanedObj = {};
    for (const [k, v] of Object.entries(val)) {
      // Prevent Prototype Pollution
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
        throw new Error('Malicious key detected in request payload');
      }
      // Prevent NoSQL Injection & Mongo Operators in keys
      if (k.startsWith('$') || k.includes('.')) {
        throw new Error(`NoSQL Injection detected: invalid character in key "${k}"`);
      }
      cleanedObj[k] = sanitizeValue(v, k);
    }
    return cleanedObj;
  }

  return val;
}

/**
 * Global Sanitization & Security Middleware
 */
function globalSanitizationAndSecurity(req, res, next) {
  try {
    const path = req.path || '';
    const method = req.method;
    const contentType = req.headers['content-type'] || '';

    // 1. Reject Empty Requests for POST/PUT/PATCH (unless multipart/file upload or special callbacks)
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const isMultipart = contentType.toLowerCase().includes('multipart/form-data');
      const isUploadRoute = path.includes('/uploads') || path.includes('/upload') || path.includes('/callback');
      if (!isMultipart && !isUploadRoute) {
        if (req.body && typeof req.body === 'object' && Object.keys(req.body).length === 0) {
          // Check if query is also empty
          if (!req.query || Object.keys(req.query).length === 0) {
            return res.status(400).json({
              success: false,
              message: 'Empty request body is not allowed'
            });
          }
        }
      }
    }

    // 2. Sanitize body, query, and params (XSS, NoSQLi, Regexi, Trim)
    if (req.body) req.body = sanitizeValue(req.body);
    if (req.query) req.query = sanitizeValue(req.query);
    if (req.params) req.params = sanitizeValue(req.params);

    // Helper to check fields across body, query, and params
    const allData = { ...(req.body || {}), ...(req.query || {}), ...(req.params || {}) };

    // 3. Validate ObjectIds Globally
    for (const [key, val] of Object.entries(allData)) {
      if (OBJECT_ID_KEYS.has(key) && val !== null && val !== undefined && val !== '') {
        const strVal = String(val).trim();
        // Check if valid 24 character hex Mongo ObjectId
        if (!mongoose.Types.ObjectId.isValid(strVal) || new mongoose.Types.ObjectId(strVal).toString() !== strVal) {
          return res.status(400).json({
            success: false,
            message: `Invalid ObjectId format for field: ${key}`
          });
        }
      }
    }

    // 4. Validate Employee IDs Globally
    for (const [key, val] of Object.entries(allData)) {
      if (EMPLOYEE_ID_KEYS.has(key) && val !== null && val !== undefined && val !== '') {
        const strVal = String(val).trim();
        // Allow alphanumeric, dashes, underscores, dots, and spaces for string employee IDs
        if (!/^[a-zA-Z0-9\-_.\s\/]+$/.test(strVal)) {
          return res.status(400).json({
            success: false,
            message: `Invalid Employee ID format for field: ${key}`
          });
        }
      }
    }

    // 5. Negative Salary / Monetary / Count Amounts Check
    if (req.body && typeof req.body === 'object') {
      for (const [key, val] of Object.entries(req.body)) {
        if (NON_NEGATIVE_FIELDS.has(key) && val !== null && val !== undefined && val !== '') {
          const numVal = Number(val);
          if (!isNaN(numVal) && numVal < 0) {
            return res.status(422).json({
              success: false,
              message: `Validation Failed: Negative value is not allowed for field: ${key}`
            });
          }
        }
      }
    }

    // 6. Invalid Leave Days / Leave Type Check
    if (path.includes('/leave') || path.includes('/leaves') || path.includes('/holiday-working')) {
      const daysVal = req.body?.days || req.body?.leaveDays || req.body?.numberOfDays || req.body?.totalDays;
      if (daysVal !== undefined && daysVal !== null && daysVal !== '') {
        const numDays = Number(daysVal);
        if (isNaN(numDays) || numDays < 0 || numDays > 365) {
          return res.status(422).json({
            success: false,
            message: 'Validation Failed: Invalid leave days'
          });
        }
      }

      const leaveTypeVal = req.body?.leaveType || req.body?.type;
      if (leaveTypeVal && typeof leaveTypeVal === 'string') {
        if (!VALID_LEAVE_TYPES.has(leaveTypeVal.trim().toLowerCase())) {
          return res.status(422).json({
            success: false,
            message: `Validation Failed: Invalid leave type "${leaveTypeVal}"`
          });
        }
      }
    }

    // 7. Future Attendance Dates Check
    if (path.startsWith('/api/attendance') || path.startsWith('/api/timesheets') || path.startsWith('/api/admin-timesheet')) {
      const dateFields = ['date', 'punchTime', 'attendanceDate', 'workDate', 'beginTime', 'endTime', 'inTime', 'outTime'];
      for (const df of dateFields) {
        if (req.body && req.body[df]) {
          const parsedDate = new Date(req.body[df]);
          if (!isNaN(parsedDate.getTime())) {
            // Check if more than 24 hours in the future
            if (parsedDate.getTime() > Date.now() + 86400000) {
              return res.status(422).json({
                success: false,
                message: 'Validation Failed: Future attendance dates are not allowed'
              });
            }
          }
        }
      }
    }

    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Bad Request: Malformed payload'
    });
  }
}

module.exports = {
  globalSanitizationAndSecurity,
  sanitizeValue
};
