const mongoose = require("mongoose");

const LoanSchema = new mongoose.Schema(
  {
    loanId: {
      type: String,
      required: false,
    },

    employeeId: {
      type: String,
      required: true,
      index: true,
    },

    employeeName: {
      type: String,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    tenureMonths: {
      type: Number,
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    paidMonths: {
      type: Number,
      default: 0,
    },

    remainingBalance: {
      type: Number,
      default: 0,
    },

    monthlyEMI: {
      type: Number,
      default: 0,
    },

    location: {
      type: String,
      required: true,
    },

    division: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "completed", "on-hold"],
      default: "active",
    },

    lastPaymentDate: {
      type: Date,
    },

    nextDueDate: {
      type: Date,
    },

    lastDeductionDate: {
      type: Date,
    },

    nextDeductionDate: {
      type: Date,
    },

    paymentEnabled: {
      type: Boolean,
      default: true,
    },

    repaymentHistory: [
      {
        emiMonth: { type: String, required: true },
        emiAmount: { type: Number, required: true },
        deductionDate: { type: Date, required: true },
        remainingBalance: { type: Number, required: true },
        paymentStatus: { type: String, default: "deducted" },
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Loan", LoanSchema);
