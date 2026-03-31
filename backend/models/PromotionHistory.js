const mongoose = require('mongoose');

const promotionHistorySchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String, required: true, index: true },
    oldDesignation: { type: String, required: true },
    newDesignation: { type: String, required: true },
    effectiveDate: { type: Date, required: true, index: true },
    remarks: { type: String, default: '' },
    promotedBy: { type: String, required: true, index: true },
    division: { type: String, default: '', index: true },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true
    },
    approvedBy: { type: String, default: '', index: true },
    approvedAt: { type: Date, default: null }
  },
  {
    timestamps: true,
    collection: 'promotionHistory'
  }
);

module.exports = mongoose.model('PromotionHistory', promotionHistorySchema);
