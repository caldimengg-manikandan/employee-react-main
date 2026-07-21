const mongoose = require("mongoose");

const ExitClearanceSchema = new mongoose.Schema({
  clearanceId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  exitRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ExitFormality"
  },
  exitRequestNumber: {
    type: String,
    required: true,
    trim: true
  },
  employeeId: {
    type: String,
    required: true,
    trim: true
  },
  employeeCode: {
    type: String,
    required: true,
    trim: true
  },
  employeeName: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  designation: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  proposedLastWorkingDay: {
    type: String,
    trim: true
  },
  applicationDate: {
    type: String,
    trim: true
  },
  assignedAssets: [{
    assetId: { type: String, required: true },
    category: { type: String },
    brandName: { type: String },
    version: { type: String },
    serialNumber: { type: String },
    allocationDate: { type: String },
    currentStatus: { type: String, default: "Assigned" },
    returned: { type: Boolean, default: false },
    condition: { type: String, default: "Good", enum: ["Excellent", "Good", "Minor Damage", "Damaged", "Lost"] },
    remarks: { type: String, default: "" },
    returnDate: { type: String }
  }],
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Completed"],
    default: "Pending"
  },
  verifiedBy: {
    type: String
  },
  verificationDate: {
    type: String
  },
  overallRemarks: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model("ExitClearance", ExitClearanceSchema);
