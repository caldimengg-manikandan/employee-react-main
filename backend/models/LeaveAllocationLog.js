const mongoose = require('mongoose');

const leaveAllocationLogSchema = new mongoose.Schema({
  performedBy: {
    type: String, // Employee ID or User ID
    required: true
  },
  performedByName: {
    type: String
  },
  runDate: {
    type: Date,
    default: Date.now
  },
  targetMonth: {
    type: Number,
    required: true
  },
  targetYear: {
    type: Number,
    required: true
  },
  processedCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Success', 'Failed'],
    default: 'Success'
  },
  error: {
    type: String
  },
  details: [{
    employeeId: String,
    employeeName: String,
    cl: Number,
    sl: Number,
    pl: Number,
    isConfirmed: Boolean,
    status: String // 'Success', 'Skipped', etc.
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('LeaveAllocationLog', leaveAllocationLogSchema);
