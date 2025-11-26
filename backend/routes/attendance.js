const express = require("express");
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");

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
      employeeName: employee.name,
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

module.exports = router;