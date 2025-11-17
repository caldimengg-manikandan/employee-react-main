const express = require("express");
const Timesheet = require("../models/Timesheet");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * CREATE / UPDATE Timesheet
 */
router.post("/", auth, async (req, res) => {
  try {
    const { weekStartDate, weekEndDate, entries, totalHours, status } = req.body;
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

      if (status === "Submitted") {
        sheet.submittedAt = new Date();
      }

      await sheet.save();

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
    });

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
      return res.status(404).json({ message: "Timesheet not found" });
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

module.exports = router;
