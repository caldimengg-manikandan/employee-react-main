const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  employeeName: String,
  year: {
    type: Number,
    default: new Date().getFullYear()
  },
  balances: {
    casual: {
      allocated: { type: Number, default: 0 },
      used: { type: Number, default: 0 },
      balance: { type: Number, default: 0 },
      expired: { type: Number, default: 0 }
    },
    sick: {
      allocated: { type: Number, default: 0 },
      used: { type: Number, default: 0 },
      balance: { type: Number, default: 0 },
      expired: { type: Number, default: 0 }
    },
    privilege: {
      allocated: { type: Number, default: 0 },
      used: { type: Number, default: 0 },
      balance: { type: Number, default: 0 },
      nonCarryAllocated: { type: Number, default: 0 },
      carryAllocated: { type: Number, default: 0 },
      carryForwardEligibleBalance: { type: Number, default: 0 },
      expired: { type: Number, default: 0 },
      carryForwardBalance: { type: Number, default: 0 }
    },
    bereavement: {
      allocated: { type: Number, default: 0 },
      used: { type: Number, default: 0 },
      balance: { type: Number, default: 0 }
    },
    totalBalance: { type: Number, default: 0 }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastAllocationMonth: {
    type: Number
  },
  lastAllocationYear: {
    type: Number
  },
  lastAllocationDate: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
