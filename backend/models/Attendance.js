const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  punchTime: { type: Date, required: true },
  direction: { type: String, enum: ["in", "out"], required: true },
  deviceId: { type: String },
  correspondingInTime: { type: Date },
});

module.exports = mongoose.model("Attendance", attendanceSchema);
