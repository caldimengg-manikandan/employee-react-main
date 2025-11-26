const express = require("express");
const Attendance = require("../models/Attendance");
const { auth } = require("../middleware/auth");

const router = express.Router();

/**
 * -----------------------------------------
 *  PUNCH IN / OUT
 * -----------------------------------------
 */
router.post("/punch", auth, async (req, res) => {
  try {
    const { employeeId, employeeName, direction, deviceId } = req.body;

    if (!employeeId || !employeeName || !direction) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let correspondingIn = null;

    if (direction === "out") {
      const lastIn = await Attendance.findOne({
        employeeId,
        direction: "in",
      }).sort({ punchTime: -1 });

      if (lastIn) correspondingIn = lastIn.punchTime;
    }

    const newLog = new Attendance({
      employeeId,
      employeeName,
      punchTime: new Date(),
      direction,
      deviceId: deviceId || null,
      correspondingInTime: correspondingIn,
    });

    await newLog.save();
    res.json({ success: true, message: "Punch saved", data: newLog });

  } catch (err) {
    console.error("Punch Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * -----------------------------------------
 *  GET LOGS (FILTERS)
 * -----------------------------------------
 */
router.get("/logs", auth, async (req, res) => {
  try {
    const { startDate, endDate, employeeId, employeeName } = req.query;

    const filter = {};

    if (employeeId) filter.employeeId = employeeId;
    if (employeeName) filter.employeeName = employeeName;

    if (startDate || endDate) {
      filter.punchTime = {};
      if (startDate) filter.punchTime.$gte = new Date(startDate);
      if (endDate) filter.punchTime.$lte = new Date(endDate);
    }

    const logs = await Attendance.find(filter).sort({ punchTime: -1 });
    res.json(logs);

  } catch (err) {
    console.error("Logs fetch error:", err);
    res.status(500).json({ message: "Error fetching logs" });
  }
});

/**
 * -----------------------------------------
 *  GET UNIQUE EMPLOYEES
 * -----------------------------------------
 */
router.get("/employees", auth, async (req, res) => {
  try {
    const employees = await Attendance.aggregate([
      {
        $group: {
          _id: "$employeeId",
          name: { $first: "$employeeName" },
        },
      },
    ]);

    res.json(
      employees.map((e) => ({
        id: e._id,
        name: e.name,
      }))
    );

  } catch (err) {
    console.error("Employee fetch error:", err);
    res.status(500).json({ message: "Error fetching employees" });
  }
});

module.exports = router;
