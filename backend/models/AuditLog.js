const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  appraisalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SelfAppraisal'
  },
  action: {
    type: String,
    required: true
  },
  role: {
    type: String
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
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  doneBy: {
    type: String
  },
  doneById: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
