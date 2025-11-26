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

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
const upload = multer(); // optional

// ----------- ROUTES ----------- //
app.use("/api/auth", require("./routes/auth"));
app.use("/api/employees", require("./routes/employees"));
app.use("/api/timesheets", require("./routes/timesheets"));
app.use("/api/projects", require("./routes/projectRoutes"));
app.use("/api/allocations", require("./routes/allocationRoutes"));

// // 🔹 NEW: Hikvision Access Routes
// app.use("/api/access", require("./routes/accessRoutes"));
// app.use("/api/access", require("./routes/hikAttendance"));

// app.use("/api/hik", hikEventsRoutes);
// // 🔹 NEW: HikCentral Employee Management Routes
// app.use("/api/hik-employees", require("./routes/hikEmployees"));


// Timesheet History Route
app.use("/api/timesheet-history", require("./routes/timesheetHistory"));

// Attendance Routes
app.use("/api/attendance", require("./routes/attendance"));

// Base Route
app.get("/", (req, res) => {
  res.json({ message: "Caldim Employees API is running successfully 🚀" });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Crypto helpers
function md5Base64(data) {
  return crypto.createHash("md5").update(data, "utf8").digest("base64");
}

function hmacSha256Base64(secret, data) {
  return crypto.createHmac("sha256", secret).update(data, "utf8").digest("base64");
}

// Hikvision Proxy
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
    ? new https.Agent({ rejectUnauthorized: false })
    : new http.Agent({ keepAlive: true });

  const response = await axios.post(url, bodyString, {
    headers,
    timeout: 30000,
    httpAgent: agent,
    httpsAgent: agent
  });

  return response.data;
}

// Final attendance route
app.post("/api/hikvision/attendance", async (req, res) => {
  try {
    const body = req.body; // Already formatted correctly by the React UI

    console.log("PROXY REQUEST:", JSON.stringify(body, null, 2));

    const data = await hikProxy(body);
    res.json({ ok: true, data });

  } catch (err) {
    console.error("Proxy Error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});


// Server Listen
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
