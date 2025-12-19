const express = require("express");
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const AttendanceRegularizationRequest = require("../models/AttendanceRegularizationRequest");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/request", auth, async (req, res) => {
  try {
    const { employeeId, inTime, outTime, workDurationSeconds } = req.body;
    if (!employeeId || !inTime || !outTime) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }
    const inDt = new Date(inTime);
    const outDt = new Date(outTime);
    if (!(outDt > inDt)) {
      return res.status(400).json({ success: false, message: "Invalid time range" });
    }
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    const durationSecs = typeof workDurationSeconds === "number" ? workDurationSeconds : Math.round((outDt - inDt) / 1000);
    const created = await AttendanceRegularizationRequest.create({
      employeeId,
      employeeName: employee.name,
      inTime: inDt,
      outTime: outDt,
      workDurationSeconds: durationSecs,
      submittedBy: req.user._id
    });
    res.json({ success: true, request: created });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create request", error: error.message });
  }
});

router.get("/list", auth, async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;
    const items = await AttendanceRegularizationRequest.find(query).sort({ createdAt: -1 }).limit(500);
    res.json({ success: true, requests: items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch requests", error: error.message });
  }
});

router.put("/approve/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    const item = await AttendanceRegularizationRequest.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    const employee = await Employee.findOne({ employeeId: item.employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    const inDt = new Date(item.inTime);
    const outDt = new Date(item.outTime);
    const startWindow = new Date(inDt.getFullYear(), inDt.getMonth(), inDt.getDate(), 0, 0, 0, 0);
    const endWindow = new Date(outDt.getFullYear(), outDt.getMonth(), outDt.getDate(), 23, 59, 59, 999);
    const windowRecords = await Attendance.find({
      employeeId: item.employeeId,
      punchTime: { $gte: startWindow, $lte: endWindow }
    }).sort({ punchTime: 1 });
    const existingIn = windowRecords.find(r => r.direction === "in");
    const existingOut = [...windowRecords].reverse().find(r => r.direction === "out");
    let inRecordId = null;
    let outRecordId = null;
    if (existingIn) {
      existingIn.punchTime = inDt;
      existingIn.deviceId = "manual";
      existingIn.source = "manual";
      await existingIn.save();
      inRecordId = existingIn._id;
    } else {
      const createdIn = await Attendance.create({
        employeeId: item.employeeId,
        name: employee.name,
        direction: "in",
        punchTime: inDt,
        deviceId: "manual",
        source: "manual"
      });
      inRecordId = createdIn._id;
    }
    const durationSecs = typeof item.workDurationSeconds === "number" ? item.workDurationSeconds : Math.round((outDt - inDt) / 1000);
    if (existingOut) {
      existingOut.punchTime = outDt;
      existingOut.deviceId = "manual";
      existingOut.source = "manual";
      existingOut.correspondingInTime = inDt;
      existingOut.workDurationSeconds = durationSecs;
      await existingOut.save();
      outRecordId = existingOut._id;
    } else {
      const createdOut = await Attendance.create({
        employeeId: item.employeeId,
        name: employee.name,
        direction: "out",
        punchTime: outDt,
        deviceId: "manual",
        source: "manual",
        correspondingInTime: inDt,
        workDurationSeconds: durationSecs
      });
      outRecordId = createdOut._id;
    }
    const keepIds = [inRecordId, outRecordId].filter(Boolean);
    if (keepIds.length > 0) {
      await Attendance.deleteMany({
        employeeId: item.employeeId,
        punchTime: { $gte: startWindow, $lte: endWindow },
        source: "manual",
        _id: { $nin: keepIds }
      });
    }
    item.status = "Approved";
    item.reviewedBy = req.user._id;
    item.reviewedAt = new Date();
    item.rejectionReason = "";
    await item.save();
    res.json({ success: true, approved: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to approve request", error: error.message });
  }
});

router.put("/reject/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    const { reason } = req.body;
    const item = await AttendanceRegularizationRequest.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    item.status = "Rejected";
    item.reviewedBy = req.user._id;
    item.reviewedAt = new Date();
    item.rejectionReason = reason || "";
    await item.save();
    res.json({ success: true, rejected: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to reject request", error: error.message });
  }
});

module.exports = router;
