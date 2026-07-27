const mongoose = require('mongoose');

const extensionSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    trim: true
  },
  employeeName: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    trim: true,
    default: ''
  },
  designation: {
    type: String,
    trim: true,
    default: ''
  },
  extensionNumber: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    enum: ['Chennai', 'Hosur'],
    default: 'Chennai',
    trim: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  createdBy: {
    type: String,
    default: 'System'
  },
  updatedBy: {
    type: String,
    default: 'System'
  }
}, {
  timestamps: true
});

// Indexes for fast real-time search & lookup
extensionSchema.index({ status: 1, location: 1, employeeName: 1 });
extensionSchema.index({ extensionNumber: 1 });

module.exports = mongoose.model('Extension', extensionSchema);
