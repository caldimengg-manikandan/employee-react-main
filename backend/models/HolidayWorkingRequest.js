const mongoose = require("mongoose");

const TimelineSchema = new mongoose.Schema({
  status: String,
  updatedBy: String,
  updatedAt: { type: Date, default: Date.now },
  remarks: String
}, { _id: false });

const EmployeeSelectionSchema = new mongoose.Schema({
  employeeId: String,
  employeeName: String,
  department: String,
  location: String,
  division: String,
  attendanceStatus: {
    type: String,
    enum: ["Pending", "Present", "Absent"],
    default: "Pending"
  },
  workedHours: {
    type: Number,
    default: 0
  },
  allowanceEligibility: {
    type: String,
    enum: ["Eligible", "Not Eligible"],
    default: "Not Eligible"
  },
  holidayDaysValue: {
    type: Number,
    default: 0
  }
}, { _id: false });

const HolidayWorkingRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
    },
    workingDate: {
      type: Date,
      required: true,
    },
    holidayType: {
      type: String,
      enum: ["Saturday", "Sunday", "Public Holiday"],
      required: true,
    },
    division: {
      type: String,
      required: true,
    },
    department: {
      type: String,
    },
    projectName: {
      type: String,
    },
    reason: {
      type: String,
      required: true,
    },
    shiftTiming: {
      type: String,
      required: true,
    },
    employees: [EmployeeSelectionSchema],
    remarks: {
      type: String,
    },
    status: {
      type: String,
      enum: [
        "Pending HR Approval",
        "Pending General Manager Approval",
        "Approved",
        "Attendance Pending",
        "Attendance Verified",
        "Completed",
        "Rejected"
      ],
      default: "Pending HR Approval",
    },
    createdBy: {
      type: String,
      required: true,
    },
    createdByName: {
      type: String,
    },
    hrApprovedBy: String,
    hrApprovedAt: Date,
    gmApprovedBy: String,
    gmApprovedAt: Date,
    timeline: [TimelineSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("HolidayWorkingRequest", HolidayWorkingRequestSchema);
