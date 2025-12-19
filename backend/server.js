// server.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const dotenv = require("dotenv");
const connectDB = require("./config/database");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const https = require("https");
const http = require("http");
const axios = require("axios");
const payrollRoutes = require("./routes/payroll");
const monthlyPayrollRoutes = require("./routes/monthlyPayroll");
const loanRoutes = require("./routes/loan.routes");

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// --------------------- MIDDLEWARE --------------------- //
app.use(cors());
app.use(express.json({ limit: "2mb" }));
const upload = multer(); // optional for file uploads

// --------------------- API ROUTES --------------------- //
app.use("/api/auth", require("./routes/auth"));
app.use("/api/employees", require("./routes/employees"));
app.use("/api/mail", require("./routes/mail.routes"));
app.use("/api/timesheets", require("./routes/timesheets"));
app.use("/api/projects", require("./routes/projectRoutes"));
app.use("/api/allocations", require("./routes/allocationRoutes"));
app.use("/api/teams", require("./routes/teamRoutes"));
app.use("/api/leaves", require("./routes/leaves"));
// Policies Routes
app.use("/api/policies", require("./routes/policies"));

// Hikvision Access Routes
app.use("/api/access", require("./routes/accessRoutes"));

// Timesheet History Route
app.use("/api/timesheet-history", require("./routes/timesheetHistory"));

// Attendance Routes
app.use("/api/attendance", require("./routes/attendance"));

// Attendance Approval Routes
app.use("/api/attendance-approval", require("./routes/attendanceApproval"));

// ⭐ NEW: Admin Timesheet Routes
app.use("/api/admin-timesheet", require("./routes/admintimesheetRoutes"));

app.use("/api/leave", require("./routes/leaveRoutes"));

app.use("/api/mail", require("./routes/mail.routes"));

//payroll

app.use("/api/payroll", payrollRoutes);
app.use("/api/monthly-payroll", monthlyPayrollRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/expenditure", require("./routes/expenditureRoutes"));



// Base Route
app.get("/", (req, res) => {
  res.json({ message: "Caldim Employees API is running successfully 🚀" });
});

// --------------------- HIKVISION SECURITY HELPERS --------------------- //
function md5Base64(data) {
  return crypto.createHash("md5").update(data, "utf8").digest("base64");
}

function hmacSha256Base64(secret, data) {
  return crypto.createHmac("sha256", secret).update(data, "utf8").digest("base64");
}

/**
 * Hikvision Proxy Handler
 * Handles encryption, signing, and API communication
 */
async function hikProxy(bodyObj = {}, uri = "/artemis/api/attendance/v1/report") {
  const bodyString = JSON.stringify(bodyObj);

  const timestamp = `${Date.now()}`;
  const nonce = uuidv4();
  const method = "POST";
  const accept = "application/json";
  const contentType = "application/json";
  const contentMD5 = md5Base64(bodyString);

  const canonicalHeaders =
    `x-ca-key:${process.env.HIK_KEY}\n` +
    `x-ca-nonce:${nonce}\n` +
    `x-ca-timestamp:${timestamp}`;

  const stringToSign =
    `${method}\n${accept}\n${contentMD5}\n${contentType}\n${canonicalHeaders}\n${uri}`;

  const signature = hmacSha256Base64(process.env.HIK_SECRET, stringToSign);

  const headers = {
    Accept: accept,
    "Content-Type": contentType,
    "Content-MD5": contentMD5,
    "x-ca-key": process.env.HIK_KEY,
    "x-ca-timestamp": timestamp,
    "x-ca-nonce": nonce,
    "x-ca-signature-headers": "x-ca-key,x-ca-nonce,x-ca-timestamp",
    "x-ca-signature": signature
  };

  const url = `${process.env.HIK_HOST}${uri}`;

  const agent = url.startsWith("https://")
    ? new https.Agent({ rejectUnauthorized: false }) // ignore cert issues
    : new http.Agent({ keepAlive: true });

  const response = await axios.post(url, bodyString, {
    headers,
    timeout: 30000,
    httpAgent: agent,
    httpsAgent: agent
  });

  return response.data;
}

// --------------------- HIKVISION ATTENDANCE ROUTE --------------------- //
app.post("/api/hikvision/attendance", async (req, res) => {
  try {
    const body = req.body; // React UI sends formatted body

    console.log("HIK REQUEST BODY:", JSON.stringify(body, null, 2));

    const data = await hikProxy(body);
    res.json({ ok: true, data });

  } catch (err) {
    console.error("Hikvision Proxy Error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --------------------- ERROR HANDLER --------------------- //
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

// --------------------- START SERVER --------------------- //
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

//--------zoho email-----//
app.get("/zoho/callback", (req, res) => {
  res.send("Zoho OAuth successful. You can close this tab.");
});
