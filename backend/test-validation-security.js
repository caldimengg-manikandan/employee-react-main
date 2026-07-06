// test-validation-security.js
/**
 * Automated Verification Suite for Enterprise Request Validation & Input Sanitization
 * Tests Global Sanitization, NoSQL Injection, XSS, Regex Injection, ObjectId Validation,
 * Negative Monetary Checks, and Module-Specific Validation Suites.
 */

const { globalSanitizationAndSecurity, sanitizeValue } = require('./middleware/sanitization');
const { validateLogin, validateEmployeeCreate, validateLoanApply, handleValidationErrors } = require('./middleware/validation');
const { validationResult } = require('express-validator');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${testName} ${details ? '- ' + details : ''}`);
    failedTests++;
  }
}

// Mock Express Request and Response
function createMockReqRes(method = 'POST', path = '/api/test', body = {}, query = {}, params = {}, headers = {}) {
  const req = {
    method,
    path,
    body,
    query,
    params,
    headers: { 'content-type': 'application/json', ...headers }
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    },
    send: (data) => {
      responseData = data;
      return res;
    },
    getStatus: () => statusCode,
    getData: () => responseData
  };

  return { req, res };
}

console.log('==================================================================');
console.log('🛡️  STARTING ENTERPRISE VALIDATION & SECURITY TEST SUITE 🛡️');
console.log('==================================================================\n');

// 1. Test XSS Prevention & Space Trimming
try {
  const rawVal = '  <script>alert("XSS")</script>Hello World <iframe src="evil"></iframe> ';
  const cleaned = sanitizeValue(rawVal);
  assert(cleaned === 'Hello World', 'XSS Sanitization: Removes <script> and <iframe> tags and trims spaces');
} catch (e) {
  assert(false, 'XSS Sanitization', e.message);
}

// 2. Test NoSQL Injection Prevention in Request Keys
try {
  const { req, res } = createMockReqRes('POST', '/api/employees', { '$where': 'sleep(1000)', name: 'John' });
  let nextCalled = false;
  globalSanitizationAndSecurity(req, res, () => { nextCalled = true; });
  assert(!nextCalled && res.getStatus() === 400 && res.getData().message.includes('NoSQL Injection'), 
    'NoSQL Injection: Blocks keys starting with "$" or containing "."');
} catch (e) {
  assert(false, 'NoSQL Injection Prevention', e.message);
}

// 3. Test Regex Injection Prevention
try {
  const { req, res } = createMockReqRes('POST', '/api/search', { query: '$regex' });
  let nextCalled = false;
  globalSanitizationAndSecurity(req, res, () => { nextCalled = true; });
  assert(!nextCalled && res.getStatus() === 400 && res.getData().message.includes('Regex injection'), 
    'Regex Injection: Blocks malicious $regex query payloads');
} catch (e) {
  assert(false, 'Regex Injection Prevention', e.message);
}

// 4. Test Empty Request Body Rejection
try {
  const { req, res } = createMockReqRes('POST', '/api/employees', {});
  let nextCalled = false;
  globalSanitizationAndSecurity(req, res, () => { nextCalled = true; });
  assert(!nextCalled && res.getStatus() === 400 && res.getData().message.includes('Empty request body'), 
    'Empty Request Body: Blocks empty POST payloads with 400 Bad Request');
} catch (e) {
  assert(false, 'Empty Request Body Rejection', e.message);
}

// 5. Test Invalid ObjectId Validation
try {
  const { req, res } = createMockReqRes('GET', '/api/employees/12345', {}, {}, { id: '12345-invalid-id' });
  let nextCalled = false;
  globalSanitizationAndSecurity(req, res, () => { nextCalled = true; });
  assert(!nextCalled && res.getStatus() === 400 && res.getData().message.includes('Invalid ObjectId format'), 
    'ObjectId Validation: Rejects malformed MongoDB ObjectIds with 400 Bad Request');
} catch (e) {
  assert(false, 'Invalid ObjectId Validation', e.message);
}

// 6. Test Valid ObjectId & Valid Employee ID Pass-Through
try {
  const validMongoId = '609e1269382f3c23e83290b1';
  const { req, res } = createMockReqRes('POST', '/api/employees', { employeeId: 'EMP-2026-001', name: 'Alice' }, {}, { id: validMongoId });
  let nextCalled = false;
  globalSanitizationAndSecurity(req, res, () => { nextCalled = true; });
  assert(nextCalled, 'Valid IDs: Allows valid MongoDB ObjectIds and alphanumeric Employee IDs');
} catch (e) {
  assert(false, 'Valid IDs Pass-Through', e.message);
}

// 7. Test Negative Salary / Monetary Amount Rejection
try {
  const { req, res } = createMockReqRes('POST', '/api/payroll', { employeeId: 'EMP001', basicDA: 50000, hra: -10000 });
  let nextCalled = false;
  globalSanitizationAndSecurity(req, res, () => { nextCalled = true; });
  assert(!nextCalled && res.getStatus() === 422 && res.getData().message.includes('Negative value is not allowed'), 
    'Negative Salary Check: Rejects negative monetary values (e.g., hra: -10000) with 422 Validation Failed');
} catch (e) {
  assert(false, 'Negative Salary Check', e.message);
}

// 8. Test Invalid Leave Type & Negative Leave Days
try {
  const { req, res } = createMockReqRes('POST', '/api/leave/apply', { employeeId: 'EMP001', leaveType: 'Super Vacation', days: -5 });
  let nextCalled = false;
  globalSanitizationAndSecurity(req, res, () => { nextCalled = true; });
  assert(!nextCalled && res.getStatus() === 422 && res.getData().message.includes('Validation Failed'), 
    'Leave Validation: Rejects invalid leave types and negative leave days with 422 Validation Failed');
} catch (e) {
  assert(false, 'Leave Validation', e.message);
}

// 9. Test Future Attendance Punch Date Rejection
try {
  const futureDate = new Date(Date.now() + 86400000 * 3).toISOString();
  const { req, res } = createMockReqRes('POST', '/api/attendance', { employeeId: 'EMP001', punchTime: futureDate });
  let nextCalled = false;
  globalSanitizationAndSecurity(req, res, () => { nextCalled = true; });
  assert(!nextCalled && res.getStatus() === 422 && res.getData().message.includes('Future attendance dates'), 
    'Future Attendance Check: Rejects attendance punch dates > 24 hours in the future');
} catch (e) {
  assert(false, 'Future Attendance Check', e.message);
}

console.log('\n==================================================================');
console.log(`📊 TEST SUITE RESULTS: ${passedTests} Passed, ${failedTests} Failed`);
console.log('==================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('✅ ALL ENTERPRISE VALIDATION & SECURITY CHECKS PASSED SUCCESSFULLY!');
  process.exit(0);
}
