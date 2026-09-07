# 02 - Database Schemas & Data Models

## Overview

The application uses **MongoDB** as its primary datastore, modeled via **Mongoose**. This document details the key schemas and relationships across all system domains.

---

## 👤 User & Core HR Schemas

### 1. `User.js`
Stores authentication credentials and high-level role mapping.
```javascript
{
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["Admin", "HR", "Employee", "Director", "Reviewer"], default: "Employee" },
  employeeId: { type: String, ref: "Employee" }
}
```

### 2. `Employee.js`
Primary employee profile repository containing personal, official, and statutory information.
- **Fields**: `employeeId`, `firstName`, `lastName`, `email`, `workEmail`, `phone`, `designation`, `department`, `doj`, `dob`, `panNumber`, `aadhaarNumber`, `bankDetails` (accountNo, ifsc, bankName), `employmentType`, `status` ("Active", "Inactive", "On Notice").

---

## ⏰ Attendance & Biometrics Schemas

### 3. `Attendance.js`
Raw biometric punch logs ingested from Hikvision Artemis / HikCentral controllers.
```javascript
{
  employeeId: { type: String, required: true, index: true },
  punchTime: { type: Date, required: true, index: true },
  direction: { type: String, enum: ["in", "out"], required: true },
  deviceId: { type: String },
  source: { type: String, enum: ["hikvision", "manual", "regularization"], default: "hikvision" }
}
```

### 4. `AttendanceRegularizationRequest.js`
Employee requests for missing punch adjustments.
- **Fields**: `employeeId`, `date`, `requestedInTime`, `requestedOutTime`, `reason`, `status` ("Pending", "Approved", "Rejected"), `reviewedBy`, `comments`.

---

## 📅 Timesheet Schemas

### 5. `Timesheet.js`
Weekly timesheet entries submitted by employees.
```javascript
{
  employeeId: { type: String, required: true, index: true },
  employeeName: { type: String },
  weekStartDate: { type: Date, required: true },
  weekEndDate: { type: Date, required: true },
  status: { type: String, enum: ["Draft", "Submitted", "Approved", "Rejected"], default: "Draft" },
  shiftType: { type: String },
  dailyShiftTypes: [{ type: String }],
  entries: [{
    project: String,
    projectCode: String,
    task: String,
    hours: [Number], // Array of 7 values for Mon-Sun
    type: { type: String, default: "project" },
    lockedDays: [Boolean]
  }],
  totalHours: Number,
  onPremisesTime: {
    daily: [Number],
    weekly: Number
  },
  rejectionReason: String,
  submittedAt: Date
}
```

### 6. `AdminTimesheet.js`
Snapshot records maintained for administrator monitoring and payroll integration.

---

## 💰 Payroll & Financial Schemas

### 7. `MonthlyPayroll.js` & `Payroll.js`
Processed monthly payroll summaries per employee.
- **Fields**: `employeeId`, `month`, `year`, `baseSalary`, `hra`, `conveyance`, `specialAllowance`, `grossEarnings`, `pfEmployee`, `esiEmployee`, `tds`, `totalDeductions`, `netPay`, `status` ("Draft", "Approved", "Disbursed").

### 8. `Loan.js`
Employee salary advances and loan repayment schedules.
- **Fields**: `employeeId`, `loanAmount`, `monthlyEmi`, `remainingBalance`, `disbursementDate`, `status`.

---

## 📈 Performance Appraisal Schemas

### 9. `SelfAppraisal.js`
Appraisal forms evaluated annually/bi-annually.
- **Fields**: `employeeId`, `appraisalYear`, `selfRatings`, `achievements`, `reviewerRatings`, `reviewerComments`, `directorRatings`, `finalScore`, `incrementPercentage`, `status` ("Self Submitted", "Reviewer Approved", "Completed").

### 10. `AppraisalAttributeMaster.js` & `AppraisalAttribute.js`
Dynamic evaluation criteria and competency attributes configured by HR.

---

## 📦 Asset Management Schemas

### 11. `Asset.js` & `AssetAllocation.js`
Physical hardware assets (laptops, monitors, access cards) and their assignment history.
- **Fields**: `assetTag`, `category`, `serialNumber`, `assignedTo` (EmployeeId), `allocationDate`, `condition`, `status` ("Allocated", "Available", "Under Repair").

---

## 🚪 Leave & Permission Schemas

### 12. `LeaveApplication.js` & `SpecialPermission.js`
- **LeaveApplication**: `employeeId`, `leaveType` ("Casual", "Sick", "Earned"), `fromDate`, `toDate`, `days`, `reason`, `status`.
- **SpecialPermission**: `employeeId`, `date`, `hours`, `reason`, `status` ("Pending", "Approved", "Rejected").
