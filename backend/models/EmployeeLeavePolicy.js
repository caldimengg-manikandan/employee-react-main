const mongoose = require('mongoose');

/**
 * EmployeeLeavePolicy
 * Stores per-employee leave allocation configuration.
 * If no record exists for an employee, the system falls back to defaults:
 *   CL = 0.5/month (carry forward ON)
 *   SL = 0.5/month (carry forward ON)
 *   PL = 1.25/month (carry forward ON)
 */
const employeeLeavePolicySchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  employeeName: {
    type: String
  },

  // Casual Leave
  monthly_cl_allocation: {
    type: Number,
    default: 0.5,
    min: 0
  },
  cl_carry_forward: {
    type: Boolean,
    default: true
  },

  // Sick Leave
  monthly_sl_allocation: {
    type: Number,
    default: 0.5,
    min: 0
  },
  sl_carry_forward: {
    type: Boolean,
    default: true
  },

  // Privilege Leave
  monthly_pl_allocation: {
    type: Number,
    default: 1.25,
    min: 0
  },
  pl_carry_forward: {
    type: Boolean,
    default: true
  },

  // Bereavement Leave
  bereavement_leave_enabled: {
    type: Boolean,
    default: false
  },
  monthly_bereavement_allocation: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('EmployeeLeavePolicy', employeeLeavePolicySchema);
