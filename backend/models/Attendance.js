const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  direction: { type: String, enum: ["in", "out"], required: true },
  punchTime: { type: Date, required: true },
  deviceId: { type: String },
});

module.exports = mongoose.model("Attendance", attendanceSchema);
