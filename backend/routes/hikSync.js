const express = require("express");
const Attendance = require("../models/Attendance");
const auth = require("../middleware/auth");
const { hikPost } = require("../utils/hikvision");

const router = express.Router();

/**
 * 🔥 SYNC HIKCENTRAL ATTENDANCE
 */
router.get("/sync", auth, async (req, res) => {
  try {
    const apiPath = "/artemis/api/attendance/v2/report";

    const requestBody = {
      pageNo: 1,
      pageSize: 500
    };

    const response = await hikPost(apiPath, requestBody);

    const list = response?.data?.list || [];

    let insertCount = 0;

    for (const item of list) {
      // Avoid duplicates
      const exists = await Attendance.findOne({
        employeeId: item.personId,
        punchTime: item.checkTime
      });

      if (exists) continue;

      await Attendance.create({
        employeeId: item.personId,
        employeeName: item.personName,
        punchTime: item.checkTime,
        direction: item.checkType === 1 ? "in" : "out",
        deviceId: item.deviceId,
        correspondingInTime: null,
      });

      insertCount++;
    }

    res.json({
      success: true,
      message: "HikCentral Sync Completed",
      inserted: insertCount,
      total: list.length
    });

  } catch (err) {
    console.error("Hik Sync Error:", err);
    res.status(500).json({ message: "Failed to sync HikCentral data" });
  }
});

module.exports = router;
