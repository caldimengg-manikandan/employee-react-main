const mongoose = require("mongoose");

const AssetSchema = new mongoose.Schema({
  assetId: {
    type: String,
    required: [true, "Asset ID is required"],
    unique: true,
    trim: true
  },
  category: {
    type: String,
    required: [true, "Category is required"],
    trim: true
  },
  brandName: {
    type: String,
    required: [true, "Brand Name is required"],
    trim: true
  },
  division: {
    type: String,
    required: [true, "Division is required"],
    trim: true
  },
  processor: {
    type: String,
    trim: true
  },
  version: {
    type: String,
    required: [true, "Version / Model is required"],
    trim: true
  },
  ram: {
    type: String
  },
  hardDisk: {
    type: String
  },
  seatNo: {
    type: String,
    trim: true
  },
  serialNumber: {
    type: String,
    trim: true
  },
  screenSize: {
    type: String,
    trim: true
  },
  keyboardType: {
    type: String,
    trim: true
  },
  mouseType: {
    type: String,
    trim: true
  },
  headsetType: {
    type: String,
    trim: true
  },
  purchaseDate: {
    type: String,
    required: [true, "Purchase Date is required"]
  },
  condition: {
    type: String,
    required: [true, "Condition is required"]
  },
  location: {
    type: String,
    required: [true, "Location is required"]
  },
  status: {
    type: String,
    required: true,
    enum: ["Available", "Assigned", "Under Maintenance", "Damaged", "Scrapped"],
    default: "Available"
  }
}, { timestamps: true });

module.exports = mongoose.model("Asset", AssetSchema);
