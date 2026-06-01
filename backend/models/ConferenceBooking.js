const mongoose = require("mongoose");

const ConferenceBookingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  bookedBy: { type: String, required: true }, // employeeId
  bookedByName: { type: String, required: true },
  bookedByEmail: { type: String, required: true },
  division: { type: String, required: true },
  location: { type: String, default: "Hosur" },
  date: { type: String, required: true }, // YYYY-MM-DD
  startTime: { type: String, required: true }, // HH:MM
  endTime: { type: String, required: true }, // HH:MM
  status: { type: String, enum: ["Pending", "Approved", "Reserved", "Rejected", "Cancelled", "Blocked"], default: "Pending" },
  reason: { type: String },
  adminComments: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("ConferenceBooking", ConferenceBookingSchema);
