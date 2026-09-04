const mongoose = require('mongoose');

const ProjectAuditLogSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  projectCode: {
    type: String,
    required: true
  },
  action: {
    type: String,
    default: 'PROJECT_UPDATED'
  },
  oldProjectName: {
    type: String,
    required: true
  },
  newProjectName: {
    type: String,
    required: true
  },
  changes: [{
    field: { type: String, required: true },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed }
  }],
  affectedAllocationsCount: {
    type: Number,
    default: 0
  },
  updatedBy: {
    type: String,
    default: 'System/Admin'
  },
  updatedById: {
    type: String,
    default: ''
  },
  userRole: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('ProjectAuditLog', ProjectAuditLogSchema);
