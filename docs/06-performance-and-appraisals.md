# 06 - Performance & Appraisal System

## Overview

The Performance Appraisal module facilitates multi-tier annual/bi-annual evaluations. It evaluates employee achievements against configured competency attributes and computes merit-based salary increments.

---

## 🔄 3-Stage Appraisal Workflow

```
┌─────────────────────────────────────────────────────────┐
│              STAGE 1: SELF APPRAISAL                    │
│ • Employee fills self-ratings for core attributes       │
│ • Documents key achievements, challenges, & goals       │
│ • Status: "Self Submitted"                              │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│             STAGE 2: REVIEWER / MANAGER                 │
│ • Manager reviews self-assessment & work outputs        │
│ • Enters manager rating scores & feedback comments      │
│ • Status: "Reviewer Approved"                           │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│               STAGE 3: DIRECTOR APPROVAL                │
│ • Executive review & calibration                        │
│ • Final score calculation & grade assignment            │
│ • Approved Increment % locked into Payroll              │
│ • Status: "Completed"                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Competency Attributes & Rating Master

Evaluation criteria are dynamically configured by HR via `AppraisalAttributeMaster.js`.

### Sample Evaluation Attributes
- **Technical Competency & Code Quality**
- **Project Execution & Deadline Compliance**
- **Leadership & Mentorship**
- **Communication & Team Collaboration**
- **Problem Solving & Innovation**

Each attribute carries a weighted score out of 5 or 10 points.

---

## 📊 Increment Matrix & Calibration

The system uses an **Increment Matrix** (`IncrementMatrix.js` and `IncrementConfig.js`) to recommend salary increases based on final calibrated performance scores.

| Performance Grade | Final Score Range | Recommended Increment % |
| :--- | :--- | :--- |
| **Outstanding (O)** | 9.0 – 10.0 | 15% – 25% |
| **Exceeds Expectations (E)** | 7.5 – 8.9 | 10% – 14% |
| **Meets Expectations (M)** | 6.0 – 7.4 | 5% – 9% |
| **Needs Improvement (N)** | $< 6.0$ | 0% – 4% |

Once approved by the Director, the increment percentage automatically updates the employee's compensation history record (`Compensation.js`) for the next financial year.
