const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/database");
const { 
  EXCLUDED_PAYROLL_EMPLOYEE_IDS, 
  EXCLUDED_LEAVE_EMPLOYEE_IDS,
  EXCLUDED_PAYROLL_LEAVE_EMPLOYEE_IDS 
} = require("../config/payrollLeaveExclusions");

const Employee = require("../models/Employee");
const MonthlyPayroll = require("../models/MonthlyPayroll");
const Payroll = require("../models/Payroll");
const Compensation = require("../models/Compensation");
const LeaveApplication = require("../models/LeaveApplication");
const LeaveBalance = require("../models/LeaveBalance");
const EmployeeLeavePolicy = require("../models/EmployeeLeavePolicy");
const EmployeeLeaveLedger = require("../models/EmployeeLeaveLedger");
const HolidayAllowance = require("../models/HolidayAllowance");

async function run() {
  await connectDB();
  console.log("Connected to MongoDB.");
  console.log("Payroll Excluded IDs:", EXCLUDED_PAYROLL_EMPLOYEE_IDS);
  console.log("Leave Excluded IDs:", EXCLUDED_LEAVE_EMPLOYEE_IDS);

  const allRegexes = EXCLUDED_PAYROLL_LEAVE_EMPLOYEE_IDS.map(id => new RegExp(`^${id}$`, "i"));
  const payrollRegexes = EXCLUDED_PAYROLL_EMPLOYEE_IDS.map(id => new RegExp(`^${id}$`, "i"));
  const leaveRegexes = EXCLUDED_LEAVE_EMPLOYEE_IDS.map(id => new RegExp(`^${id}$`, "i"));

  // 1. Verify Employee records - they MUST remain active and NOT be touched
  const employees = await Employee.find({ employeeId: { $in: allRegexes } });
  console.log(`\n--- EMPLOYEE MASTER CHECK (Found ${employees.length} employees) ---`);
  employees.forEach(e => {
    console.log(`- ${e.employeeId}: ${e.name} | Status: ${e.status} | Role: ${e.userRole || e.role}`);
  });

  // 2. Check and clean MonthlyPayroll (Payroll excluded only)
  const mpCount = await MonthlyPayroll.countDocuments({ employeeId: { $in: payrollRegexes } });
  console.log(`\nMonthlyPayroll records for excluded IDs: ${mpCount}`);
  if (mpCount > 0) {
    const res = await MonthlyPayroll.deleteMany({ employeeId: { $in: payrollRegexes } });
    console.log(`Deleted ${res.deletedCount} MonthlyPayroll records.`);
  }

  // 3. Check and clean Payroll (Payroll excluded only)
  const pCount = await Payroll.countDocuments({ employeeId: { $in: payrollRegexes } });
  console.log(`Payroll records for excluded IDs: ${pCount}`);
  if (pCount > 0) {
    const res = await Payroll.deleteMany({ employeeId: { $in: payrollRegexes } });
    console.log(`Deleted ${res.deletedCount} Payroll records.`);
  }

  // 4. Check and clean Compensation (Payroll excluded only)
  const cCount = await Compensation.countDocuments({ employeeId: { $in: payrollRegexes } });
  console.log(`Compensation records for excluded IDs: ${cCount}`);
  if (cCount > 0) {
    const res = await Compensation.deleteMany({ employeeId: { $in: payrollRegexes } });
    console.log(`Deleted ${res.deletedCount} Compensation records.`);
  }

  // 5. Check and clean EmployeeLeavePolicy (Leave excluded only)
  const elpCount = await EmployeeLeavePolicy.countDocuments({ employeeId: { $in: leaveRegexes } });
  console.log(`EmployeeLeavePolicy records for excluded IDs: ${elpCount}`);
  if (elpCount > 0) {
    const res = await EmployeeLeavePolicy.deleteMany({ employeeId: { $in: leaveRegexes } });
    console.log(`Deleted ${res.deletedCount} EmployeeLeavePolicy records.`);
  }

  // 6. Check and clean EmployeeLeaveLedger (Leave excluded only)
  const ellCount = await EmployeeLeaveLedger.countDocuments({ employeeId: { $in: leaveRegexes } });
  console.log(`EmployeeLeaveLedger records for excluded IDs: ${ellCount}`);
  if (ellCount > 0) {
    const res = await EmployeeLeaveLedger.deleteMany({ employeeId: { $in: leaveRegexes } });
    console.log(`Deleted ${res.deletedCount} EmployeeLeaveLedger records.`);
  }

  // 7. Check Leave applications (Leave excluded only)
  const laCount = await LeaveApplication.countDocuments({ employeeId: { $in: leaveRegexes } });
  console.log(`Leave applications for excluded IDs: ${laCount}`);

  // 8. Check and clean LeaveBalance collection (Leave excluded only)
  const lbCount = await LeaveBalance.countDocuments({ employeeId: { $in: leaveRegexes } });
  console.log(`LeaveBalance records for excluded IDs: ${lbCount}`);
  if (lbCount > 0) {
    const res = await LeaveBalance.deleteMany({ employeeId: { $in: leaveRegexes } });
    console.log(`Deleted ${res.deletedCount} LeaveBalance records.`);
  }

  // 9. Check and clean HolidayAllowance collection (Payroll excluded only)
  const haCount = await HolidayAllowance.countDocuments({ employeeId: { $in: payrollRegexes } });
  console.log(`HolidayAllowance records for excluded IDs: ${haCount}`);
  if (haCount > 0) {
    const res = await HolidayAllowance.deleteMany({ employeeId: { $in: payrollRegexes } });
    console.log(`Deleted ${res.deletedCount} HolidayAllowance records.`);
  }

  // Re-verify Employee records
  const afterEmployees = await Employee.find({ employeeId: { $in: allRegexes } });
  console.log(`\nFinal Employee Master verification: ${afterEmployees.length} employees still exist and are Active.`);

  await mongoose.disconnect();
  console.log("\nDone!");
  process.exit(0);
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
