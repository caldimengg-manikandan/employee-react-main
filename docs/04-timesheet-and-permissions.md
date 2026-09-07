# 04 - Timesheet & Special Permissions

## Overview

The Timesheet module enables employees to log daily project hours, request shift permissions, and submit weekly work reports for managerial approval. It integrates directly with attendance biometrics, project allocations, and leave management.

---

## 🗓 Weekly Timesheet Structure

Timesheets are managed on a **Weekly Grid** (Monday through Sunday).

### Entry Attributes
- **`project`**: Project title assigned via Project Allocation.
- **`projectCode`**: Unique identifier for tracking billable hours.
- **`task`**: Task classification (e.g., Development, Testing, Documentation, Meeting, Training).
- **`hours`**: Array of 7 numeric values representing hours worked per day (`[Mon, Tue, Wed, Thu, Fri, Sat, Sun]`).
- **`lockedDays`**: Boolean array indicating locked/non-editable days (e.g., approved leave days or public holidays).

---

## ⏰ Shift Types & 12-Hour Rest Rule

Employees select daily shift types:
1. **First Shift**: Standard morning shift.
2. **Second Shift**: Evening / late shift.
3. **General Shift**: Standard office working hours.

### 12-Hour Rest Period Validation
To ensure employee health and safety:
- If an employee works a late shift finishing after 22:00, the system enforces a mandatory **12-hour rest buffer** before the next scheduled shift start time.
- The previous Sunday's last punch out time is checked when validating Monday morning shift entries.

---

## 🎟 Special Permissions Workflow

Special Permissions grant short-duration work exemptions (e.g., 1–2 hours off for medical or emergency reasons).

```
   [Employee Requests Special Permission]
                      │
                      ▼
[Check Monthly Balance (Max 3 Permissions / Month)]
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
[Limit Exceeded: Block]    [Allowed: Submit Request]
                                    │
                                    ▼
                         [Admin/Manager Approval]
                                    │
                                    ▼
                        [Integrate into Timesheet
                         Daily Validation Calculation]
```

### Permission Rules
- **Monthly Limit**: Maximum **3 permissions** allowed per employee per calendar month.
- **Duration**: Usually 1 to 2 hours per instance.
- **Timesheet Integration**: When calculating whether total logged project hours match attendance hours, approved permission time is added to On-Premises time:
  $$\text{Adjusted Time} = \text{On-Premises Working Hours} + \text{Permission Hours} + \text{Approved Leave Hours}$$

---

## 🔒 Timesheet Validation & Submission Rules

Before a timesheet can be submitted:
1. **On-Premises Time Match**: Total daily logged project hours must equal the adjusted On-Premises time within a 2-minute cushion.
2. **Mandatory Tasks**: Holiday/Leave days must be categorized under non-working project tasks ("Leave", "Office Holiday").
3. **No Overlapping Approvals**: Timesheets cannot be re-submitted once marked **Approved**.

---

## 👨‍💼 Admin Timesheet Management

Administrators and Managers access `AdminTimesheet.jsx` to:
- Review team members' submitted weekly timesheets.
- Approve or Reject with mandatory rejection comments.
- Export weekly timesheet data to Excel (`.xlsx`) or PDF reports.
