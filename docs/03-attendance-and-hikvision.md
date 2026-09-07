# 03 - Attendance & Hikvision Biometrics Integration

## Overview

Attendance tracking is powered by biometric punch data captured from Hikvision / HikCentral access control devices. The system synchronizes punch logs via the **Hikvision Artemis API** using HMAC-SHA256 authentication and processes punch sequences to calculate accurate daily working durations.

---

## 🔐 Hikvision Artemis API Authentication

Hikvision OpenAPI endpoints require signed requests using **HMAC-SHA256** to prevent tampering.

### HMAC Signature Generation Flow

```
HTTP Method + \n
Accept Header + \n
Content-MD5 + \n
Content-Type + \n
Canonicalized Headers + \n
Request URI
        │
        ▼
  HMAC-SHA256(Secret, StringToSign) ──► Base64 Signature
```

### Signature Parameters
- **`x-ca-key`**: Artemis AppKey configured in `.env` (`HIK_KEY`).
- **`x-ca-secret`**: Artemis AppSecret configured in `.env` (`HIK_SECRET`).
- **`x-ca-nonce`**: UUID v4 per request.
- **`x-ca-timestamp`**: Unix timestamp in milliseconds.

Backend proxy function (`hikProxy` in `server.js`):
```javascript
const stringToSign = `${method}\n${accept}\n${contentMD5}\n${contentType}\n${canonicalHeaders}\n${uri}`;
const signature = hmacSha256Base64(process.env.HIK_SECRET, stringToSign);
```

---

## ⏱ Attendance In/Out Pair Matching Algorithm

Biometric devices record individual `in` and `out` events. To determine actual time spent working on-premises, the system processes punch events using a pairing algorithm (`/api/attendance/my-week` in `backend/routes/attendance.js`).

### Pairing Logic Steps
1. Fetch all punches for an employee sorted chronologically by `punchTime`.
2. Match each `in` punch with its corresponding valid `out` punch.
3. Compute each interval duration:
   $$\text{Duration}_{\text{pair}} = \text{PunchOut}_{\text{time}} - \text{PunchIn}_{\text{time}}$$
4. Sum all paired durations for the day:
   $$\text{Work Duration} = \sum \text{Duration}_{\text{pair}}$$

```
Example Day Sequence:
Punches: 09:00 (IN) ──► 12:30 (OUT) │ 13:30 (IN) ──► 18:00 (OUT)

Pair 1: 09:00 to 12:30 = 3.5 Hours
Pair 2: 13:30 to 18:00 = 4.5 Hours

Net Work Duration   = 8.0 Hours (On-Premises Working Time)
First-In/Last-Out   = 9.0 Hours (Gross Span - INCLUDES OUT-OF-OFFICE BREAK)
```

> [!IMPORTANT]
> **Work Duration vs Gross Span**:
> The Timesheet and Attendance views explicitly display the **Work Duration** (net 8.0 hours) as the **On-Premises Time**, ignoring out-of-office break intervals.

---

## 📝 Attendance Regularization Workflow

When an employee forgets to punch in/out or experiences biometric device failure, they submit a **Regularization Request**.

```
[Employee submits Regularization Request]
                  │
                  ▼
   [Pending Request in Manager/HR Queue]
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   [Approved]          [Rejected]
        │                   │
        ▼                   ▼
[Insert Manual     [Notify Employee]
 Punch Record into
 Attendance DB]
```

1. **Submission**: Employee fills in the date, missing `inTime`/`outTime`, and justification.
2. **Review**: HR or Manager reviews the request via `AttendanceApproval.jsx`.
3. **Execution**: Upon approval, the backend creates synthetic `Attendance` records with `source: "regularization"`, which updates the week's Work Duration automatically.
