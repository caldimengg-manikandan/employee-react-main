const express = require("express");
const Timesheet = require("../models/Timesheet");
const AdminTimesheet = require("../models/AdminTimesheet");
const Employee = require("../models/Employee");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * CREATE / UPDATE Timesheet
 */
router.post("/", auth, async (req, res) => {
  try {
    const { weekStartDate, weekEndDate, entries, totalHours, status, shiftType, dailyShiftTypes, onPremisesTime } = req.body;
    const userId = req.user._id;

    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekEndDate);

    let sheet = await Timesheet.findOne({
      userId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
    });

    if (sheet) {
      // Update existing draft
      sheet.entries = entries;
      sheet.totalHours = totalHours;
      sheet.status = status || "Draft";
      if (typeof shiftType !== "undefined") sheet.shiftType = shiftType || "";
      if (Array.isArray(dailyShiftTypes)) sheet.dailyShiftTypes = dailyShiftTypes;
      if (onPremisesTime && Array.isArray(onPremisesTime.daily)) {
        sheet.onPremisesTime = {
          daily: onPremisesTime.daily.map((n) => Number(n) || 0),
          weekly: Number(onPremisesTime.weekly) || 0
        };
      }

      if (status === "Submitted") {
        sheet.submittedAt = new Date();
      }

      await sheet.save();

      if (status === "Submitted") {
        await upsertAdminTimesheetRecord(req.user, sheet);
      }

      return res.json({
        success: true,
        message: "Timesheet updated successfully",
        sheet,
      });
    }

    // Create brand new
    sheet = await Timesheet.create({
      userId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      entries,
      totalHours,
      status: status || "Draft",
      submittedAt: status === "Submitted" ? new Date() : null,
      shiftType: shiftType || "",
      dailyShiftTypes: Array.isArray(dailyShiftTypes) ? dailyShiftTypes : [],
      onPremisesTime: onPremisesTime && Array.isArray(onPremisesTime.daily)
        ? {
            daily: onPremisesTime.daily.map((n) => Number(n) || 0),
            weekly: Number(onPremisesTime.weekly) || 0
          }
        : { daily: [], weekly: 0 },
    });

    if (status === "Submitted") {
      await upsertAdminTimesheetRecord(req.user, sheet);
    }

    res.json({
      success: true,
      message: "Timesheet created successfully",
      sheet,
    });
  } catch (error) {
    console.error("❌ Timesheet error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * Get logged-in user's all timesheets
 */
router.get("/my-timesheets", auth, async (req, res) => {
  try {
    const sheets = await Timesheet.find({ userId: req.user._id })
      .sort({ weekStartDate: -1 })
      .select("-__v");

    res.json(sheets);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Get specific week's timesheet
 */
router.get("/", auth, async (req, res) => {
  try {
    const { weekStart, weekEnd } = req.query;

    const sheet = await Timesheet.findOne({
      userId: req.user._id,
      weekStartDate: new Date(weekStart),
      weekEndDate: new Date(weekEnd),
    });

    if (!sheet) {
      return res.json({
        userId: req.user._id,
        weekStartDate: new Date(weekStart),
        weekEndDate: new Date(weekEnd),
        entries: [],
        totalHours: 0,
        status: "Draft",
        submittedAt: null,
        shiftType: "",
        dailyShiftTypes: [],
        onPremisesTime: { daily: [], weekly: 0 }
      });
    }

    res.json(sheet);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ADMIN - Get all timesheets
 */
router.get("/all", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const all = await Timesheet.find()
      .populate("userId", "name email role")
      .sort({ createdAt: -1 });

    res.json(all);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE Timesheet by ID
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Find the timesheet and ensure it belongs to the user
    const timesheet = await Timesheet.findOne({ _id: id, userId });
    
    if (!timesheet) {
      return res.status(404).json({ 
        success: false, 
        message: "Timesheet not found or access denied" 
      });
    }

    // Only allow deletion of draft timesheets
    if (timesheet.status !== "Draft") {
      return res.status(400).json({ 
        success: false, 
        message: "Only draft timesheets can be deleted" 
      });
    }

    await Timesheet.findByIdAndDelete(id);
    
    res.json({ 
      success: true, 
      message: "Timesheet deleted successfully" 
    });
  } catch (error) {
    console.error("❌ Delete timesheet error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while deleting timesheet" 
    });
  }
});

module.exports = router;

function toWeekString(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  const weekStr = String(weekNo).padStart(2, "0");
  return `${date.getUTCFullYear()}-W${weekStr}`;
}

async function upsertAdminTimesheetRecord(user, sheet) {
  const weekStr = toWeekString(new Date(sheet.weekStartDate));
  let employeeProfile = null;
  if (user.employeeId) {
    employeeProfile = await Employee.findOne({ employeeId: user.employeeId }).lean();
  }
  if (!employeeProfile && user.email) {
    employeeProfile = await Employee.findOne({ email: user.email }).lean();
  }

  const timeEntries = (sheet.entries || []).map((e) => {
    const hours = e.hours || [0, 0, 0, 0, 0, 0, 0];
    const total = hours.reduce((a, b) => a + (Number(b) || 0), 0);
    return {
      project: e.project,
      task: e.task,
      monday: Number(hours[0] || 0),
      tuesday: Number(hours[1] || 0),
      wednesday: Number(hours[2] || 0),
      thursday: Number(hours[3] || 0),
      friday: Number(hours[4] || 0),
      saturday: Number(hours[5] || 0),
      sunday: Number(hours[6] || 0),
      total: Number(total || 0),
    };
  });

  const weeklyTotal = timeEntries.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const submittedDate = new Date().toISOString().split("T")[0];

  const payload = {
    employeeId: employeeProfile?.employeeId || user.employeeId || "",
    employeeName: employeeProfile?.name || user.name || "",
    division: employeeProfile?.division || "",
    location: employeeProfile?.location || "",
    week: weekStr,
    status: "Pending",
    submittedDate,
    timeEntries,
    weeklyTotal: Number(weeklyTotal || 0),
  };

  const query = {
    employeeId: payload.employeeId,
    week: payload.week,
  };

  const existing = await AdminTimesheet.findOne(query);
  if (existing) {
    existing.employeeName = payload.employeeName;
    existing.division = payload.division;
    existing.location = payload.location;
    existing.submittedDate = payload.submittedDate;
    existing.timeEntries = payload.timeEntries;
    existing.weeklyTotal = payload.weeklyTotal;
    existing.status = "Pending";
    await existing.save();
  } else {
    await AdminTimesheet.create(payload);
  }
}
