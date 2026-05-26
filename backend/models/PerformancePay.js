const mongoose = require("mongoose");

const PerformancePaySchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      index: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    department: String,
    designation: String,
    location: String,
    financialYear: {
      type: String,
      required: true,
    },
    currentSalary: {
      type: Number,
      default: 0,
    },
    performancePayAmount: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      enum: [
        "Outstanding Performance",
        "Project Completion Bonus",
        "Annual Bonus",
        "Client Appreciation",
        "Team Achievement",
        "Special Contribution",
        "Retention Bonus",
        "Performance Payouts",
      ],
      required: true,
    },
    remarks: String,
    status: {
      type: String,
      enum: ["DRAFT", "APPROVED", "LETTER_GENERATED", "PAYROLL_CREDITED"],
      default: "DRAFT",
    },
    payrollCredited: {
      type: Boolean,
      default: false,
    },
    letterGenerated: {
      type: Boolean,
      default: false,
    },
    letterGeneratedDate: Date,
    createdBy: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PerformancePay", PerformancePaySchema);
