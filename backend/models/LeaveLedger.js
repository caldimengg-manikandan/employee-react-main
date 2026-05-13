const mongoose = require('mongoose');

const leaveLedgerSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  leaveType: {
    type: String,
    enum: ['CL', 'SL', 'PL'],
    required: true
  },
  transactionType: {
    type: String,
    enum: ['Credit', 'Debit', 'Reset', 'Expire'],
    required: true
  },
  days: {
    type: Number,
    required: true
  },
  transactionDate: {
    type: Date,
    default: Date.now
  },
  month: {
    type: Number,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  remarks: {
    type: String
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate allocations for the same month/year/employee/type
leaveLedgerSchema.index({ employeeId: 1, leaveType: 1, month: 1, year: 1, transactionType: 1 }, { unique: true });

module.exports = mongoose.model('LeaveLedger', leaveLedgerSchema);
