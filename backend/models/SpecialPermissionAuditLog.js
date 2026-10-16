const mongoose = require('mongoose');

const SpecialPermissionAuditLogSchema = new mongoose.Schema({
  specialPermissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SpecialPermission',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  employeeName: {
    type: String,
    default: ''
  },
  employeeId: {
    type: String,
    default: ''
  },
  permissionDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['APPROVED', 'REJECTED'],
    required: true
  },
  actionById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  actionByName: {
    type: String,
    default: ''
  },
  actionAt: {
    type: Date,
    default: Date.now
  },
  approvedBy: {
    type: String,
    default: ''
  },
  approvedOn: {
    type: Date,
    default: null
  },
  rejectedBy: {
    type: String,
    default: ''
  },
  rejectedOn: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('SpecialPermissionAuditLog', SpecialPermissionAuditLogSchema);
