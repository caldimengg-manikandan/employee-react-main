const mongoose = require("mongoose");

const AssetAllocationSchema = new mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Asset",
    required: true
  },
  assetId: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  brandName: {
    type: String,
    required: true
  },
  version: {
    type: String
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  employeeCode: {
    type: String,
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  allocatedDate: {
    type: String,
    required: true
  },
  returnDate: {
    type: String
  },
  conditionOnAllocation: {
    type: String,
    required: true
  },
  conditionOnReturn: {
    type: String
  },
  status: {
    type: String,
    enum: ["Assigned", "Returned"],
    default: "Assigned"
  }
}, { timestamps: true });

module.exports = mongoose.model("AssetAllocation", AssetAllocationSchema);
