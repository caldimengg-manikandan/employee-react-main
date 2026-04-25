const mongoose = require('mongoose');

const PayrollHistorySchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  financialYear: {
    type: String,
    required: true
  },
  previousCTC: {
    type: Number,
    default: 0
  },
  revisedCTC: {
    type: Number,
    default: 0
  },
  incrementPercentage: {
    type: Number,
    default: 0
  },
  incrementAmount: {
    type: Number,
    default: 0
  },
  salary: {
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    special: { type: Number, default: 0 },
    gross: { type: Number, default: 0 },
    net: { type: Number, default: 0 },
    gratuity: { type: Number, default: 0 }
  },
  performancePay: {
    type: Number,
    default: 0
  },
  appraisalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SelfAppraisal'
  },
  releasedAt: {
    type: Date
  },
  acceptedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'REVOKED'],
    default: 'ACTIVE'
  },
  version: {
    type: Number,
    default: 1
  },
  createdBy: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('PayrollHistory', PayrollHistorySchema);
