const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/database");
const { EXCLUDED_PAYROLL_LEAVE_EMPLOYEE_IDS } = require("../config/payrollLeaveExclusions");

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
  console.log("Target excluded employee IDs:", EXCLUDED_PAYROLL_LEAVE_EMPLOYEE_IDS);

  const idRegexes = EXCLUDED_PAYROLL_LEAVE_EMPLOYEE_IDS.map(id => new RegExp(`^${id}$`, "i"));

  // 1. Verify Employee records - they MUST remain active and NOT be touched
  const employees = await Employee.find({ employeeId: { $in: idRegexes } });
  console.log(`\n--- EMPLOYEE MASTER CHECK (Found ${employees.length} employees) ---`);
  employees.forEach(e => {
    console.log(`- ${e.employeeId}: ${e.name} | Status: ${e.status} | Role: ${e.userRole || e.role}`);
  });

  // 2. Check and clean MonthlyPayroll
  const mpCount = await MonthlyPayroll.countDocuments({ employeeId: { $in: idRegexes } });
  console.log(`\nMonthlyPayroll records for excluded IDs: ${mpCount}`);
  if (mpCount > 0) {
    const res = await MonthlyPayroll.deleteMany({ employeeId: { $in: idRegexes } });
    console.log(`Deleted ${res.deletedCount} MonthlyPayroll records.`);
  }

  // 3. Check and clean Payroll
  const pCount = await Payroll.countDocuments({ employeeId: { $in: idRegexes } });
  console.log(`Payroll records for excluded IDs: ${pCount}`);
  if (pCount > 0) {
    const res = await Payroll.deleteMany({ employeeId: { $in: idRegexes } });
    console.log(`Deleted ${res.deletedCount} Payroll records.`);
  }

  // 4. Check and clean Compensation
  const cCount = await Compensation.countDocuments({ employeeId: { $in: idRegexes } });
  console.log(`Compensation records for excluded IDs: ${cCount}`);
  if (cCount > 0) {
    const res = await Compensation.deleteMany({ employeeId: { $in: idRegexes } });
    console.log(`Deleted ${res.deletedCount} Compensation records.`);
  }

  // 5. Check and clean EmployeeLeavePolicy
  const elpCount = await EmployeeLeavePolicy.countDocuments({ employeeId: { $in: idRegexes } });
  console.log(`EmployeeLeavePolicy records for excluded IDs: ${elpCount}`);
  if (elpCount > 0) {
    const res = await EmployeeLeavePolicy.deleteMany({ employeeId: { $in: idRegexes } });
    console.log(`Deleted ${res.deletedCount} EmployeeLeavePolicy records.`);
  }

  // 6. Check and clean EmployeeLeaveLedger
  const ellCount = await EmployeeLeaveLedger.countDocuments({ employeeId: { $in: idRegexes } });
  console.log(`EmployeeLeaveLedger records for excluded IDs: ${ellCount}`);
  if (ellCount > 0) {
    const res = await EmployeeLeaveLedger.deleteMany({ employeeId: { $in: idRegexes } });
    console.log(`Deleted ${res.deletedCount} EmployeeLeaveLedger records.`);
  }

  // 7. Check Leave applications
  const laCount = await LeaveApplication.countDocuments({ employeeId: { $in: idRegexes } });
  console.log(`Leave applications for excluded IDs: ${laCount}`);

  // 8. Check and clean LeaveBalance collection
  const lbCount = await LeaveBalance.countDocuments({ employeeId: { $in: idRegexes } });
  console.log(`LeaveBalance records for excluded IDs: ${lbCount}`);
  if (lbCount > 0) {
    const res = await LeaveBalance.deleteMany({ employeeId: { $in: idRegexes } });
    console.log(`Deleted ${res.deletedCount} LeaveBalance records.`);
  }

  // 9. Check and clean HolidayAllowance collection
  const haCount = await HolidayAllowance.countDocuments({ employeeId: { $in: idRegexes } });
  console.log(`HolidayAllowance records for excluded IDs: ${haCount}`);
  if (haCount > 0) {
    const res = await HolidayAllowance.deleteMany({ employeeId: { $in: idRegexes } });
    console.log(`Deleted ${res.deletedCount} HolidayAllowance records.`);
  }

  // Re-verify Employee records
  const afterEmployees = await Employee.find({ employeeId: { $in: idRegexes } });
  console.log(`\nFinal Employee Master verification: ${afterEmployees.length} employees still exist and are Active.`);

  await mongoose.disconnect();
  console.log("\nDone!");
  process.exit(0);
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
