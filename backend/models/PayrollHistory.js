const mongoose = require("mongoose");

const payrollHistorySchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
    index: true
  },

  employeeIdString: { 
    type: String, // e.g. "CDE117"
    index: true
  },

  employeeName: {
    type: String,
    index: true
  },

  financialYear: {
    type: String, // e.g. "2025-26"
    index: true
  },

  fyStart: {
    type: Date // e.g. 2025-04-01
  },

  fyEnd: {
    type: Date   // e.g. 2026-03-31
  },

  salary: {
    type: Number,
    required: true
  },

  components: {
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    special: { type: Number, default: 0 },
    gross: { type: Number, default: 0 },
    net: { type: Number, default: 0 }
  },

  effectiveFrom: {
    type: Date,
    required: true
  },

  effectiveTo: {
    type: Date,
    default: null
  },

  source: {
    type: String,
    enum: ["appraisal", "promotion", "manual"],
    default: "appraisal"
  },

  appraisalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SelfAppraisal"
  },

  notes: {
    type: String,
    default: ""
  }

}, { timestamps: true });

// 🔒 UNIQUE INDEX (PREVENT DUPLICATES)
payrollHistorySchema.index(
  { employeeId: 1, effectiveFrom: 1, source: 1 },
  { unique: true }
);

// 🔒 COMPOUND INDEX (FAST REPORTS & UI)
payrollHistorySchema.index({ employeeId: 1, financialYear: 1, effectiveFrom: 1 });

module.exports = mongoose.model("PayrollHistory", payrollHistorySchema);
