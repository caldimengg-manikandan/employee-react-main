const mongoose = require("mongoose");

const payrollAuditLogSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
    index: true
  },
  appraisalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SelfAppraisal"
  },
  action: {
    type: String,
    enum: ["APPLIED", "ROLLED_BACK", "MANUAL_EDIT"],
    default: "APPLIED"
  },
  oldSalary: {
    type: Number
  },
  newSalary: {
    type: Number
  },
  notes: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model("PayrollAuditLog", payrollAuditLogSchema);
