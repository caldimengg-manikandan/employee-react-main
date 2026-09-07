# 05 - Payroll & Compensation Engine

## Overview

The Payroll module handles monthly salary processing, statutory tax calculations (PF, ESI, TDS), allowance claims, employee loans, and salary slip PDF generation.

---

## 💵 Salary Structure & Computation Formula

The system splits total cost to company (CTC) into standardized salary components.

### Earnings Components
- **Basic Salary**: 40% – 50% of Gross Salary.
- **House Rent Allowance (HRA)**: 40% – 50% of Basic Salary.
- **Conveyance Allowance**: Standard fixed transport allowance.
- **Special Allowance**: Residual earnings balancing component.
- **Performance Pay / Incentives**: Variable pay based on appraisals.

$$\text{Gross Earnings} = \text{Basic} + \text{HRA} + \text{Conveyance} + \text{Special Allowance} + \text{Incentives}$$

### Deductions Components
- **Provident Fund (PF)**: 12% of Basic Salary (subject to statutory cap).
- **Employee State Insurance (ESI)**: 0.75% of Gross (applicable if gross $\le \text{₹}21,000$).
- **Tax Deducted at Source (TDS)**: Income tax slab deduction.
- **Loan EMI**: Automated monthly deduction for active employee loans.
- **Loss of Pay (LOP)**: Unpaid absence deduction based on monthly working days.

$$\text{Net Pay} = \text{Gross Earnings} - (\text{PF} + \text{ESI} + \text{TDS} + \text{Loan EMI} + \text{LOP})$$

---

## 📄 Payslip PDF Generation

Payslips are rendered dynamically in the frontend using `@react-pdf/renderer` / `jspdf`.

### Features
- Complete breakdown of earnings and statutory deductions.
- Digital signature embedding (e.g. Authorized Signatory images).
- PDF download and bulk email dispatch to employee registered work emails.

---

## 🎁 Special Allowances & Incentives

### 1. Holiday Working Allowance
- Employees working on designated Office or Regional Holidays are eligible for daily holiday working compensation.
- Managed via `HolidaysAllowance.jsx` & `/api/holiday-allowances`.

### 2. Marriage Allowance
- Policy benefit granting a financial gift to employees upon marriage.
- Upload mandatory wedding certificate proof; managed via `MarriageAllowance.js`.

### 3. Referral Bonus Workflow
- Automated by cron job (`cron/referralBonusCron.js`).
- Tracks candidate onboarding milestones (e.g. 3 months, 6 months) and automatically queues referral bonus payouts into the referee's monthly payroll.

---

## 🏦 Loans & Advances Management

Employees can request financial advances via the Loan Portal (`loan.routes.js`):
- Admin approves loan amount and sets EMI tenure (number of months).
- Monthly payroll processing automatically deducts the EMI and updates the remaining balance in `Loan.js`.
