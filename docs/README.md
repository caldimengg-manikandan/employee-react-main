# Caldim Employee Management System - Documentation

Welcome to the official technical documentation for the **Caldim Employee Management System** (Employee React). This documentation provides a comprehensive guide to the system architecture, database models, Hikvision biometric integration, timesheet & attendance rules, payroll processing, appraisal workflows, API specifications, and setup instructions.

---

## 📚 Documentation Index

| File | Title | Description |
| :--- | :--- | :--- |
| [01-architecture-overview.md](./01-architecture-overview.md) | **System Architecture & Tech Stack** | Overview of the full-stack architecture, technology stack, directory structure, security, and core modules. |
| [02-database-schema.md](./02-database-schema.md) | **Database Schemas & Data Models** | Detailed documentation of all MongoDB schemas (User, Employee, Attendance, Timesheet, Payroll, SelfAppraisal, etc.). |
| [03-attendance-and-hikvision.md](./03-attendance-and-hikvision.md) | **Attendance & Hikvision Biometrics** | Integration details with Hikvision Artemis API, HMAC signing, In/Out pair calculations, Work Duration rules, and Regularizations. |
| [04-timesheet-and-permissions.md](./04-timesheet-and-permissions.md) | **Timesheet & Special Permissions** | Weekly timesheet entry rules, shift types, 12h rest validation, Special Permissions approval workflow, and Admin Timesheets. |
| [05-payroll-and-compensation.md](./05-payroll-and-compensation.md) | **Payroll & Compensation Engine** | Monthly payroll processing, statutory deductions (PF, ESI, TDS), salary slip generation, loans, and allowances. |
| [06-performance-and-appraisals.md](./06-performance-and-appraisals.md) | **Performance & Appraisal System** | 3-stage performance appraisal workflow (Self -> Reviewer -> Director), rating matrices, and increment calculations. |
| [07-api-and-routes.md](./07-api-and-routes.md) | **API Reference & Routes** | Comprehensive list of REST API endpoints categorized by domain module with authentication and payload specs. |
| [08-setup-and-deployment.md](./08-setup-and-deployment.md) | **Setup & Deployment Guide** | Environment variables, local setup instructions, MongoDB setup, Hikvision configuration, and production build guide. |

---

## 🚀 Quick Overview of the System

- **Frontend**: React 18, React Router v6, Ant Design, TailwindCSS, Lucide React, Recharts, React PDF.
- **Backend**: Node.js, Express.js, Mongoose (MongoDB), JWT Authentication, Resend / Zoho Mail.
- **Integrations**: Hikvision Artemis API / HikCentral (Biometric Punch Sync via HMAC-SHA256).

---

## 🛠️ Maintained By
Caldim Engineering & HR Tech Team.
