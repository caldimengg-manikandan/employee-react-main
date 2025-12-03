const mongoose = require("mongoose");

const TimesheetEntrySchema = new mongoose.Schema({
  project: { type: String, required: true },
  projectCode: { type: String, default: "" },
  task: { type: String, required: true },
  type: { type: String, enum: ["project", "leave"], default: "project" },
  hours: { type: [Number], default: [0, 0, 0, 0, 0, 0, 0] },
});

const TimesheetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    weekStartDate: { type: Date, required: true },
    weekEndDate: { type: Date, required: true },

    entries: { type: [TimesheetEntrySchema], default: [] },

    totalHours: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["Draft", "Submitted", "Approved", "Rejected"],
      default: "Draft",
    },

    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-calc total hours
TimesheetSchema.pre("save", function (next) {
  this.totalHours = this.entries.reduce((sum, entry) => {
    return sum + entry.hours.reduce((a, b) => a + (Number(b) || 0), 0);
  }, 0);
  next();
});

module.exports =
  mongoose.models.Timesheet || mongoose.model("Timesheet", TimesheetSchema);
