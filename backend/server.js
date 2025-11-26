// server.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const dotenv = require("dotenv");
const connectDB = require("./config/database");

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

// 🔹 NEW: Hikvision Access Routes
app.use("/api/access", require("./routes/accessRoutes"));
app.use("/api/hik", require("./routes/hikEvents"));      // Manual Pull API
// app.use("/api/hik-callback", require("./routes/hikCallback"));  // Webhook Push API
app.use("/api/hik-sync", require("./routes/hikSync"));

// 🔹 NEW: HikCentral Employee Management Routes
app.use("/api/hik-employees", require("./routes/hikEmployees"));


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

// Server Listen
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
