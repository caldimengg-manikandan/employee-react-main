const mongoose = require("mongoose");

const AssetRequestSchema = new mongoose.Schema({
  requestNumber: {
    type: String,
    required: true,
    unique: true
  },
  requestId: {
    type: String
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee"
  },
  employeeCode: {
    type: String,
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  division: {
    type: String,
    default: "N/A"
  },
  department: {
    type: String,
    default: "N/A"
  },
  designation: {
    type: String,
    default: "N/A"
  },
  location: {
    type: String,
    default: "N/A"
  },
  assetCategory: {
    type: String,
    required: true
  },
  category: {
    type: String
  },
  requestType: {
    type: String,
    required: true,
    enum: ["New Asset Request", "Asset Replacement", "Temporary Asset", "New Asset"]
  },
  reason: {
    type: String,
    required: true
  },
  attachment: {
    type: String,
    default: ""
  },
  attachmentName: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Asset Allocated", "Completed", "Rejected", "Cancelled"],
    default: "Pending"
  },
  remarks: {
    type: String,
    default: ""
  },
  approvedBy: {
    type: String,
    default: ""
  },
  approvedDate: {
    type: String,
    default: ""
  },
  allocatedAssetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Asset"
  },
  allocatedAssetCode: {
    type: String,
    default: ""
  },
  completedDate: {
    type: String,
    default: ""
  },
  requestDate: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("AssetRequest", AssetRequestSchema);
