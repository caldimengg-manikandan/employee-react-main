const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true
  },
  oldVersion: {
    type: Number
  },
  newVersion: {
    type: Number
  },
  reason: {
    type: String
  },
  doneBy: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
