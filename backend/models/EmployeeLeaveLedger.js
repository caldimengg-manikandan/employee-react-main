const mongoose = require('mongoose');

/**
 * EmployeeLeaveLedger  (employee_leave_monthly_ledger)
 * Monthly leave ledger — the single source of truth for leave balances.
 *
 * One record per employee × year × month × leave_type.
 *
 * Flow:
 *   opening_balance  = previous month's closing_balance (or 0 if carry_forward=false / first month)
 *   allocated_leave  = monthly allocation from EmployeeLeavePolicy
 *   used_leave       = sum of approved leave deductions in this month
 *   closing_balance  = opening_balance + allocated_leave - used_leave
 *   lop_days         = days that exceeded all available leave (Loss of Pay)
 *   is_locked        = true after payroll is processed for this month
 */
const employeeLeaveLedgerSchema = new mongoose.Schema({
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
    enum: ['CL', 'SL', 'PL', 'BEREAVEMENT'],
    required: true
  },
  opening_balance: {
    type: Number,
    default: 0
  },
  allocated_leave: {
    type: Number,
    default: 0
  },
  used_leave: {
    type: Number,
    default: 0
  },
  closing_balance: {
    type: Number,
    default: 0
  },
  carry_forward: {
    type: Boolean,
    default: true
  },
  lop_days: {
    type: Number,
    default: 0
  },
  is_locked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Unique: one record per employee × year × month × leave_type
// This prevents duplicate monthly allocations
employeeLeaveLedgerSchema.index(
  { employee_id: 1, year: 1, month: 1, leave_type: 1 },
  { unique: true }
);

module.exports = mongoose.model('EmployeeLeaveLedger', employeeLeaveLedgerSchema);
