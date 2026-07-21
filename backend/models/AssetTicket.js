const mongoose = require("mongoose");

const AssetTicketSchema = new mongoose.Schema({
  ticketId: {
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
  employeeId: {
    type: String,
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  issueType: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    required: true,
    enum: ["Low", "Medium", "High"]
  },
  status: {
    type: String,
    enum: ["Pending", "Resolved"],
    default: "Pending"
  },
  resolutionNotes: {
    type: String
  },
  adminComments: {
    type: String
  },
  timeline: [{
    date: { type: String },
    status: { type: String },
    note: { type: String }
  }]
}, { timestamps: true });

module.exports = mongoose.model("AssetTicket", AssetTicketSchema);
