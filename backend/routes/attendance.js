const express = require("express");
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * 📋 GET ALL ATTENDANCE RECORDS
 * Fetches all attendance records with optional filtering
 */
router.get("/", async (req, res) => {
  try {
    const { employeeId, startDate, endDate, source } = req.query;
    
    const query = {};
    if (employeeId) query.employeeId = employeeId;
    if (source) query.source = source;
    
    if (startDate || endDate) {
      query.punchTime = {};
      if (startDate) query.punchTime.$gte = new Date(startDate);
      if (endDate) query.punchTime.$lte = new Date(endDate + "T23:59:59.999Z");
    }
    
    const attendance = await Attendance.find(query)
      .sort({ punchTime: -1 })
      .limit(1000);
    
    // Get employee names for better display
    const employeeIds = [...new Set(attendance.map(record => record.employeeId))];
    const employees = await Employee.find({ 
      employeeId: { $in: employeeIds } 
    }).select('employeeId name');
    
    const employeeMap = employees.reduce((map, emp) => {
      map[emp.employeeId] = emp.name;
      return map;
    }, {});
    
    const enrichedAttendance = attendance.map(record => ({
      ...record.toObject(),
      employeeName: record.employeeName || employeeMap[record.employeeId] || "Unknown Employee"
    }));
    
    res.json({
      success: true,
      attendance: enrichedAttendance,
      count: enrichedAttendance.length
    });
    
  } catch (error) {
    console.error("Get Attendance Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch attendance records",
      error: error.message 
    });
  }
});

/**
 * ➕ MANUAL ATTENDANCE ENTRY
 * Allows manual creation of attendance records
 */
router.post("/", async (req, res) => {
  try {
    const { employeeId, direction, punchTime, deviceId, source } = req.body;
    
    // Validate required fields
    if (!employeeId || !direction) {
      return res.status(400).json({
        success: false,
        message: "Employee ID and direction are required"
      });
    }
    
    // Check if employee exists
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }
    
    // Create attendance record
    const attendanceRecord = await Attendance.create({
      employeeId,
      name: employee.name,
      direction: direction.toLowerCase(),
      punchTime: punchTime ? new Date(punchTime) : new Date(),
      deviceId: deviceId || "manual",
      source: source || "manual"
    });
    
    res.json({
      success: true,
      message: "Attendance record created successfully",
      attendance: attendanceRecord
    });
    
  } catch (error) {
    console.error("Manual Attendance Entry Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create attendance record",
      error: error.message 
    });
  }
});

/**
 * 📥 SAVE HIKVISION ATTENDANCE (Bulk import)
 * Accepts transformed array or raw Hikvision response and saves to Attendance
 */
router.post("/save-hikvision-attendance", async (req, res) => {
  try {
    const { attendanceData } = req.body || {};
    let items = [];

    if (Array.isArray(attendanceData)) {
      items = attendanceData;
    } else if (req.body?.data?.data?.record) {
      const records = req.body.data.data.record || [];
      for (const r of records) {
        const empId = r.personInfo?.personCode || r.personInfo?.personID;
        const empName = r.personInfo?.givenName || r.personInfo?.fullName || "";
        const begin = r.attendanceBaseInfo?.beginTime;
        const end = r.attendanceBaseInfo?.endTime;
        const durationSec =
          Number(r.normalInfo?.durationTime) ||
          Number(r.allDurationTime) ||
          (begin && end ? Math.max(0, (new Date(end) - new Date(begin)) / 1000) : 0);
        if (begin) items.push({ employeeId: empId, employeeName: empName, punchTime: begin, direction: "in" });
        if (end) items.push({ employeeId: empId, employeeName: empName, punchTime: end, direction: "out", workDurationSeconds: durationSec });
      }
    } else {
      return res.status(400).json({ success: false, message: "No attendance data provided" });
    }

    let savedCount = 0;
    const savedRecords = [];

    for (const item of items) {
      if (!item?.employeeId || !item?.punchTime || !item?.direction) continue;
      const punchDate = new Date(item.punchTime);
      const exists = await Attendance.findOne({ employeeId: item.employeeId, punchTime: punchDate, direction: item.direction });
      if (exists) continue;
      const record = await Attendance.create({
        employeeId: item.employeeId,
        name: item.employeeName || "",
        punchTime: punchDate,
        direction: item.direction,
        deviceId: item.deviceId || "hik",
        source: "hikvision",
        workDurationSeconds: item.workDurationSeconds
      });
      savedCount++;
      savedRecords.push(record);
    }

    res.json({ success: true, savedCount, savedRecords });
  } catch (error) {
    console.error("Save Hikvision Attendance Error:", error);
    res.status(500).json({ success: false, message: "Failed to save Hikvision attendance", error: error.message });
  }
});

/**
 * 📊 ATTENDANCE SUMMARY
 * Provides summary statistics for attendance
 */
router.get("/summary", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchStage = {};
    if (startDate || endDate) {
      matchStage.punchTime = {};
      if (startDate) matchStage.punchTime.$gte = new Date(startDate);
      if (endDate) matchStage.punchTime.$lte = new Date(endDate + "T23:59:59.999Z");
    }
    
    const summary = await Attendance.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            employeeId: "$employeeId",
            direction: "$direction"
          },
          count: { $sum: 1 },
          lastPunch: { $max: "$punchTime" }
        }
      },
      {
        $group: {
          _id: "$_id.employeeId",
          totalPunches: { $sum: "$count" },
          inCount: {
            $sum: { $cond: [{ $eq: ["$_id.direction", "in"] }, "$count", 0] }
          },
          outCount: {
            $sum: { $cond: [{ $eq: ["$_id.direction", "out"] }, "$count", 0] }
          },
          lastPunch: { $max: "$lastPunch" }
        }
      },
      { $sort: { lastPunch: -1 } }
    ]);
    
    // Get employee names
    const employeeIds = summary.map(item => item._id);
    const employees = await Employee.find({ 
      employeeId: { $in: employeeIds } 
    }).select('employeeId name');
    
    const employeeMap = employees.reduce((map, emp) => {
      map[emp.employeeId] = emp.name;
      return map;
    }, {});
    
    const enrichedSummary = summary.map(item => ({
      employeeId: item._id,
      employeeName: employeeMap[item._id] || "Unknown Employee",
      totalPunches: item.totalPunches,
      inCount: item.inCount,
      outCount: item.outCount,
      lastPunch: item.lastPunch
    }));
    
    res.json({
      success: true,
      summary: enrichedSummary,
      totalEmployees: enrichedSummary.length
    });
    
  } catch (error) {
    console.error("Attendance Summary Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to generate attendance summary",
      error: error.message 
    });
  }
});

/**
 * 👤 MY WEEKLY ATTENDANCE (Authenticated)
 * Returns daily punch-in/out and computed hours for the logged-in user
 */
router.get("/my-week", auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "startDate and endDate are required" });
    }

    let employeeIdToUse = null;
    if (req.user.employeeId) {
      employeeIdToUse = req.user.employeeId;
    } else {
      const employee = await Employee.findOne({ email: req.user.email }).select("employeeId");
      if (employee && employee.employeeId) {
        employeeIdToUse = employee.employeeId;
      } else {
        employeeIdToUse = String(req.user._id);
      }
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const startOfDay = new Date(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const endOfDay = new Date(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999);

    const records = await Attendance.find({
      employeeId: employeeIdToUse,
      punchTime: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ punchTime: 1 });

    // Group by date (YYYY-MM-DD)
    const byDate = {};
    for (const r of records) {
      const d = new Date(r.punchTime);
      const key = d.toISOString().split("T")[0];
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(r);
    }

    const result = [];
    let weeklyTotal = 0;

    Object.keys(byDate).forEach((dateKey) => {
      const dayRecords = byDate[dateKey].sort((a, b) => new Date(a.punchTime) - new Date(b.punchTime));
      let currentIn = null;
      let sumHours = 0;
      let firstIn = null;
      let lastOut = null;

      // Prefer Hikvision-provided work duration when available
      const savedDurationHours = dayRecords
        .map((r) => (r.workDurationSeconds ? r.workDurationSeconds / 3600 : 0))
        .reduce((a, b) => a + b, 0);

      if (savedDurationHours > 0) {
        sumHours = savedDurationHours;
        // still set firstIn/lastOut for UI
        for (const r of dayRecords) {
          if (r.direction === "in" && !firstIn) firstIn = new Date(r.punchTime);
          if (r.direction === "out") lastOut = new Date(r.punchTime);
        }
      } else {
        for (const r of dayRecords) {
          if (r.direction === "in") {
            const t = new Date(r.punchTime);
            if (!firstIn) firstIn = t;
            currentIn = currentIn || t;
          } else if (r.direction === "out") {
            const t = new Date(r.punchTime);
            lastOut = t;
            if (currentIn && t > currentIn) {
              sumHours += (t - currentIn) / (1000 * 60 * 60);
              currentIn = null;
            }
          }
        }
      }

      weeklyTotal += sumHours;

      result.push({
        date: dateKey,
        punchIn: firstIn || null,
        punchOut: lastOut || null,
        punchTime: firstIn || null,
        hours: Number(sumHours.toFixed(2))
      });
    });

    res.json({ success: true, employeeId: employeeIdToUse, records: result, weeklyHours: Number(weeklyTotal.toFixed(2)) });
  } catch (error) {
    console.error("My Weekly Attendance Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch weekly attendance", error: error.message });
  }
});

module.exports = router;
