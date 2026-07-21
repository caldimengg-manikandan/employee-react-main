const mongoose = require("mongoose");

const AssetHandoverSchema = new mongoose.Schema({
  handoverId: {
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
    trim: true
  },
  assetId: {
    type: String,
    required: [true, "Asset ID is required"],
    trim: true
  },
  employeeId: {
    type: String,
    trim: true
  },
  employeeCode: {
    type: String,
    required: [true, "Employee ID/Code is required"],
    trim: true
  },
  employeeName: {
    type: String,
    required: [true, "Employee Name is required"],
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  division: {
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
  applicationDate: {
    type: String,
    trim: true
  },
  proposedLastWorkingDay: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  brandName: {
    type: String,
    trim: true
  },
  version: {
    type: String,
    trim: true
  },
  allocationDate: {
    type: String,
    trim: true
  },
  handoverDate: {
    type: String
  },
  condition: {
    type: String,
    default: "Good",
    enum: ["Excellent", "Good", "Minor Damage", "Damaged", "Lost"]
  },
  remarks: {
    type: String,
    trim: true
  },
  verifiedBy: {
    type: String,
    default: "IT Admin"
  },
  status: {
    type: String,
    enum: ["Pending", "Completed"],
    default: "Pending"
  }
}, { timestamps: true });

module.exports = mongoose.model("AssetHandover", AssetHandoverSchema);
