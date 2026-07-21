const mongoose = require("mongoose");

const AssetMaintenanceSchema = new mongoose.Schema({
  maintenanceId: {
    type: String,
    required: true,
    unique: true
  },
  assetId: {
    type: String,
    required: true
  },
  assetName: {
    type: String,
    required: true
  },
  maintenanceType: {
    type: String,
    required: true
  },
  cost: {
    type: Number,
    default: 0
  },
  startDate: {
    type: String,
    required: true
  },
  endDate: {
    type: String,
    required: true
  },
  vendorName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["Scheduled", "In Progress", "Completed"],
    default: "Scheduled"
  },
  description: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("AssetMaintenance", AssetMaintenanceSchema);
