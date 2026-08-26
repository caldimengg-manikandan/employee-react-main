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
  division: {
    type: String
  },
  components: [
    {
      asset: { type: mongoose.Schema.Types.ObjectId, ref: "Asset" },
      assetId: String,
      category: String,
      serialNumber: String,
      condition: String
    }
  ],
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: false
  },
  employeeCode: {
    type: String,
    required: false
  },
  employeeName: {
    type: String,
    required: false
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
  },
  quantity: {
    type: Number,
    default: 1
  },
  assignmentType: {
    type: String,
    enum: ["Employee", "Department", "Team", "Location"],
    default: "Employee"
  },
  assignedDepartment: {
    type: String,
    trim: true
  },
  assignedTeam: {
    type: String,
    trim: true
  },
  assignedLocation: {
    type: String,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model("AssetAllocation", AssetAllocationSchema);
