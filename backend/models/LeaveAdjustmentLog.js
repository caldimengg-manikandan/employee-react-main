const mongoose = require('mongoose');

/**
 * LeaveAdjustmentLog
 * Audit trail for all manual leave balance edits made by HR/Admin.
 * Created whenever current month balances are manually modified.
 */
const leaveAdjustmentLogSchema = new mongoose.Schema({
  employee_id: {
    type: String,
    required: true,
    index: true
  },
  employee_name: {
    type: String
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,  // 1–12
    required: true
  },
  leave_type: {
    type: String,
    enum: ['CL', 'SL', 'PL'],
    required: true
  },
  old_balance: {
    type: Number,
    required: true
  },
  new_balance: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  modified_by: {
    type: String,   // employeeId of the HR/Admin who made the change
    required: true
  },
  modified_by_name: {
    type: String
  },
  modified_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LeaveAdjustmentLog', leaveAdjustmentLogSchema);
