# 01 - System Architecture & Tech Stack

## Overview

The **Caldim Employee Management System** is an enterprise-grade Web Application built for managing human resources, attendance tracking, biometric punch integration, weekly timesheets, monthly payroll generation, performance appraisals, asset lifecycle management, and employee support operations.

---

## 🏗 Architecture & Tech Stack

```
                     ┌──────────────────────────────────────────────┐
                     │             React 18 Frontend SPA             │
                     │  (AntD, TailwindCSS, Lucide Icons, Recharts)  │
                     └──────────────────────┬───────────────────────┘
                                            │ REST API / JSON
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │            Express.js REST Server            │
                     │ (JWT Auth, Global Sanitization, File Storage)│
                     └──────┬───────────────────────┬───────────────┘
                            │                       │
              MongoDB Query │                       │ Hikvision Artemis API
                            ▼                       ▼
                     ┌───────────────┐     ┌────────────────────────┐
                     │ MongoDB Atlas │     │ HikCentral Biometric   │
                     │  / Mongoose   │     │ Device Controller      │
                     └───────────────┘     └────────────────────────┘
```

### Technology Stack

| Layer | Technology | Key Libraries / Frameworks |
| :--- | :--- | :--- |
| **Frontend** | React 18 (SPA) | `react-router-dom` v6, `antd`, `tailwindcss`, `lucide-react`, `@react-pdf/renderer`, `recharts`, `xlsx` |
| **Backend** | Node.js + Express.js | `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `multer`, `axios`, `crypto`, `uuid` |
| **Database** | MongoDB | Document Store managed via Mongoose Schemas & Models |
| **Biometric Sync** | Hikvision / HikCentral | Direct ISAPI & Artemis REST API using HMAC-SHA256 Signatures |
| **Mailer** | Email Services | `resend`, `nodemailer` (Zoho Mail Transport) |

---

## 📁 Repository Directory Structure

```
employee-react-main/
├── backend/
│   ├── config/              # Database connection & system configuration
│   ├── cron/                # Scheduled jobs (Referral bonus, attendance sync)
│   ├── middleware/          # JWT auth, active check, security & sanitization
│   ├── models/              # 70+ Mongoose Data Schemas & Models
│   ├── routes/              # Express API route handlers
│   ├── services/            # Mail, Resend, and external service helpers
│   ├── uploads/             # Media storage (Documents, Proofs, Tickets)
│   ├── server.js            # Main Express application entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components & Layout wrappers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Feature pages (Timesheet, Payroll, Appraisal, etc.)
│   │   ├── services/        # Centralized API service methods (`api.js`)
│   │   ├── utils/           # Helper functions & date formatters
│   │   ├── App.js           # Application Router & Route Protection
│   │   └── index.js
│   └── package.json
└── docs/                    # Project Documentation Folder
```

---

## 🔐 Authentication & Authorization (RBAC)

The application utilizes JSON Web Tokens (JWT) for stateless user session management.

### Role Hierarchy
1. **Admin**: Unrestricted system access across all modules (Timesheet approvals, HR management, Payroll, Master configuration).
2. **HR**: Employee onboarding/offboarding, leave ledger adjustments, asset allocations, holiday management.
3. **Director**: Top-level executive appraiser for performance appraisals, increment approvals, and strategic overrides.
4. **Reviewer / Manager**: Team leads reviewing weekly timesheets, project allocations, and team member appraisals.
5. **Employee**: Standard portal user accessing personal dashboard, timesheet logger, attendance regularization, leave applications, and appraisal forms.

### Security & Middleware Pipeline
- `auth`: Decodes JWT token from `Authorization: Bearer <token>` header and injects `req.user`.
- `checkActiveEmployee`: Validates that the authenticated user account status is active before allowing request processing.
- `globalSanitizationAndSecurity`: Express middleware filtering malicious inputs and cross-site scripting risks.
