const mongoose = require("mongoose");

const ReferralBonusSchema = new mongoose.Schema(
  {
    referralId: {
      type: String,
      unique: true
    },
    // Referring Employee details
    referringEmployeeId: {
      type: String,
      required: true,
      index: true
    },
    referringEmployeeName: {
      type: String,
      required: true
    },
    division: {
      type: String,
      required: true
    },
    designation: {
      type: String,
      required: true
    },
    // Candidate details
    candidateName: {
      type: String,
      required: true
    },
    candidateEmployeeId: {
      type: String,
      default: ""
    },
    candidateDesignation: {
      type: String,
      required: true
    },
    candidateExperience: {
      type: Number, // Years
      required: true
    },
    dateReferred: {
      type: Date,
      required: true
    },
    dateOfJoining: {
      type: Date
    },
    probationCompletionDate: {
      type: Date
    },
    eligibility: {
      type: String,
      enum: ["Yes", "No", "Pending"],
      default: "Pending"
    },
    bonusAmount: {
      type: Number,
      required: true,
      max: 10000
    },
    status: {
      type: String,
      enum: ["Pending Probation", "Eligible", "Approved", "Paid", "Rejected", "Not Eligible"],
      default: "Pending Probation"
    },
    paymentDate: {
      type: Date
    },
    remarks: {
      type: String,
      default: ""
    },
    rejectionReason: {
      type: String,
      default: ""
    },
    probationNotificationSent: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: String
    },
    updatedBy: {
      type: String
    }
  },
  { timestamps: true }
);

// Auto-generate Referral ID before saving (format: REF-YYYYMM-XXXX)
ReferralBonusSchema.pre("save", async function(next) {
  if (this.isNew && !this.referralId) {
    const date = new Date();
    const yearMonth = date.getFullYear().toString() + (date.getMonth() + 1).toString().padStart(2, "0");
    
    // Find the latest referral for this month
    const latestReferral = await this.constructor.findOne({
      referralId: new RegExp(`^REF-${yearMonth}-`)
    }).sort({ referralId: -1 });

    let sequence = 1;
    if (latestReferral && latestReferral.referralId) {
      const parts = latestReferral.referralId.split("-");
      if (parts.length === 3) {
        sequence = parseInt(parts[2]) + 1;
      }
    }

    this.referralId = `REF-${yearMonth}-${sequence.toString().padStart(4, "0")}`;
  }
  next();
});

module.exports = mongoose.model("ReferralBonus", ReferralBonusSchema);
