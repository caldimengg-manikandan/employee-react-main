# 07 - API Reference & Routes

## Overview

All backend endpoints are prefixed with `/api`. Requests require JWT authentication via the `Authorization: Bearer <token>` header unless explicitly marked public.

---

## 🔑 1. Authentication (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | User login, returns JWT token & user profile |
| `GET` | `/api/auth/me` | Private | Get current authenticated user details |
| `POST` | `/api/auth/change-password` | Private | Change user password |

---

## 👥 2. Employees (`/api/employees`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/employees` | Private (HR/Admin) | List all active employees |
| `POST` | `/api/employees` | Private (HR/Admin) | Create a new employee record |
| `GET` | `/api/employees/:id` | Private | Get detailed profile of specific employee |
| `PUT` | `/api/employees/:id` | Private (HR/Admin) | Update employee profile details |

---

## 🗓 3. Timesheets & Admin Timesheets

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/timesheets` | Private | Get weekly timesheet for specified week date |
| `POST` | `/api/timesheets` | Private | Save/submit weekly timesheet |
| `GET` | `/api/admin-timesheet/pending` | Manager/Admin | Get all submitted timesheets awaiting approval |
| `POST` | `/api/admin-timesheet/approve` | Manager/Admin | Approve employee timesheet |
| `POST` | `/api/admin-timesheet/reject` | Manager/Admin | Reject timesheet with comments |

---

## ⏰ 4. Attendance (`/api/attendance`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/attendance/my-week` | Private | Fetch weekly attendance records with matched In/Out pairs and calculated Work Duration |
| `POST` | `/api/attendance/regularize` | Private | Submit missing punch regularization request |
| `GET` | `/api/attendance-approval/pending` | HR/Manager | List pending regularization requests |
| `POST` | `/api/attendance-approval/action` | HR/Manager | Approve or reject regularization request |

---

## 💵 5. Payroll & Loans

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/payroll/my-slips` | Private | List employee's monthly payslips |
| `POST` | `/api/monthly-payroll/generate` | Admin/HR | Process monthly payroll batch for month/year |
| `GET` | `/api/loans` | Private | Get employee loan & advance repayment status |
| `POST` | `/api/loans/apply` | Private | Apply for employee loan/advance |

---

## 📈 6. Performance Appraisals (`/api/performance`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/performance/self` | Private | Get current year self-appraisal form |
| `POST` | `/api/performance/self` | Private | Submit self-appraisal ratings & comments |
| `GET` | `/api/performance/reviewer` | Reviewer | Get team members' appraisal forms |
| `POST` | `/api/performance/reviewer/submit` | Reviewer | Submit reviewer scores |
| `GET` | `/api/performance/director` | Director | Get director approval queue |
| `POST` | `/api/performance/director/approve` | Director | Finalize score & approve increment % |

---

## 📦 7. Assets & Support Center

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/assets` | HR/Admin | Get all assets & allocation status |
| `POST` | `/api/assets/allocate` | HR/Admin | Assign asset to employee |
| `GET` | `/api/support/tickets` | Private | Get support tickets |
| `POST` | `/api/support/tickets` | Private | Create new support ticket with attachments |
