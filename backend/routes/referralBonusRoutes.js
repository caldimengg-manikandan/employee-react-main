const express = require("express");
const router = express.Router();
const ReferralBonus = require("../models/ReferralBonus");
const User = require("../models/User");
const Notification = require("../models/Notification");
const auth = require("../middleware/auth");

// Apply JWT authentication to all routes
router.use(auth);

// Helper to check if role has full access
const hasFullAccess = (user) => {
  const privilegedRoles = ["admin", "hr", "finance", "director", "manager"];
  const userRole = String(user?.role || "").toLowerCase();
  return privilegedRoles.includes(userRole) || user?.permissions?.includes("referral_bonus");
};

// Helper to calculate referral bonus based on candidate designation
const calculateReferralBonus = (designation) => {
  if (!designation) {
    return {
      amount: 0,
      eligible: false,
      category: "None",
      remarks: "Designation is not eligible for Referral Bonus."
    };
  }

  const d = designation.trim().toLowerCase().replace(/\s+/g, ' ');

  // Helper check for exact or keyword matching
  const hasKeyword = (keywords) => keywords.some(k => d === k || d.includes(k));

  // 1. Project Manager & Above: ₹10,000
  if (hasKeyword([
    'managing director', 'md', 'general manager', 'gm', 'branch manager', 
    'admin manager', 'sr.admin manager', 'sr. admin manager', 'project manager', 
    'sr project manager', 'senior project manager', 'asst project manager', 
    'assistant project manager', 'delivery manager', 'operations manager', 
    'marketing manager', 'consultant', 'director', 'manager'
  ])) {
    return { amount: 10000, eligible: true, category: "Project Manager & Above", remarks: "" };
  }

  // 2. Team Lead & Above: ₹7,500
  if (hasKeyword([
    'team lead', 'teamlead', 'sr team lead', 'senior team lead', 'project co-ordinator', 'project coordinator'
  ])) {
    return { amount: 7500, eligible: true, category: "Team Lead & Above", remarks: "" };
  }

  // 3. Sr. Detailer, Sr. Checker & Above: ₹5,000
  if (hasKeyword([
    'sr. detailer', 'senior detailer', 'sr. checker', 'senior checker', 
    'sr. modeler', 'senior modeler', 'sr.engineer', 'senior engineer', 'sr. engineer',
    'system engineer', 'database administrator', 'dba', 'business analyst', 
    'software developer', 'quality analyst', 'qa engineer', 'qa analyst'
  ])) {
    return { amount: 5000, eligible: true, category: "Sr. Detailer, Sr. Checker & Above", remarks: "" };
  }

  // 4. Jr. Detailer, Jr. Checker & Above: ₹2,500
  if (hasKeyword([
    'jr. detailer', 'junior detailer', 'jr. checker', 'junior checker', 
    'jr. modeler', 'junior modeler', 'jr.engineer', 'junior engineer', 'jr. engineer',
    'asst system engineer', 'assistant system engineer', 'modeler', 'detailer', 
    'checker', 'technical support', 'network engineer', 'hr executive', 
    'accountant', 'sales executive', 'office assistant', 'it admin'
  ])) {
    return { amount: 2500, eligible: true, category: "Jr. Detailer, Jr. Checker & Above", remarks: "" };
  }

  // Fallback / Trainees / Others
  return {
    amount: 0,
    eligible: false,
    category: "None",
    remarks: "Designation is not eligible for Referral Bonus."
  };
};

// 📥 GET all referral bonuses with filters
router.get("/", async (req, res) => {
  try {
    const query = {};

    // Access control: if not admin/hr/finance, only show their own referrals
    if (!hasFullAccess(req.user)) {
      if (!req.user.employeeId) {
        return res.json({ success: true, data: [] });
      }
      query.referringEmployeeId = req.user.employeeId;
    } else {
      // Admin/HR can filter by referring employee
      if (req.query.referringEmployeeId) {
        query.referringEmployeeId = req.query.referringEmployeeId;
      }
    }

    // Apply other filters
    if (req.query.division) {
      query.division = req.query.division;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Search query (Candidate Name, Referral ID, Referring Employee Name)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { referralId: searchRegex },
        { candidateName: searchRegex },
        { referringEmployeeName: searchRegex }
      ];
    }

    // Date Referred filter
    if (req.query.dateReferredStart || req.query.dateReferredEnd) {
      query.dateReferred = {};
      if (req.query.dateReferredStart) {
        query.dateReferred.$gte = new Date(req.query.dateReferredStart);
      }
      if (req.query.dateReferredEnd) {
        query.dateReferred.$lte = new Date(req.query.dateReferredEnd);
      }
    }

    // Date of Joining filter
    if (req.query.dateOfJoiningStart || req.query.dateOfJoiningEnd) {
      query.dateOfJoining = {};
      if (req.query.dateOfJoiningStart) {
        query.dateOfJoining.$gte = new Date(req.query.dateOfJoiningStart);
      }
      if (req.query.dateOfJoiningEnd) {
        query.dateOfJoining.$lte = new Date(req.query.dateOfJoiningEnd);
      }
    }

    // Payment Date filter
    if (req.query.paymentDateStart || req.query.paymentDateEnd) {
      query.paymentDate = {};
      if (req.query.paymentDateStart) {
        query.paymentDate.$gte = new Date(req.query.paymentDateStart);
      }
      if (req.query.paymentDateEnd) {
        query.paymentDate.$lte = new Date(req.query.paymentDateEnd);
      }
    }

    const list = await ReferralBonus.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// 📊 GET referral stats for dashboard cards
router.get("/stats", async (req, res) => {
  try {
    const filter = {};
    // Access control for stats
    if (!hasFullAccess(req.user)) {
      if (!req.user.employeeId) {
        return res.json({
          success: true,
          data: { total: 0, pendingProbation: 0, eligible: 0, approved: 0, paid: 0, rejected: 0, totalPaidAmount: 0 }
        });
      }
      filter.referringEmployeeId = req.user.employeeId;
    }

    const allRecords = await ReferralBonus.find(filter);

    const paidRecords = allRecords.filter(r => r.status === "Paid");
    const totalPaidAmount = paidRecords.reduce((sum, r) => sum + (r.bonusAmount || 0), 0);

    const stats = {
      total: allRecords.length,
      pendingProbation: allRecords.filter(r => r.status === "Pending Probation").length,
      eligible: allRecords.filter(r => r.status === "Eligible").length,
      approved: allRecords.filter(r => r.status === "Approved").length,
      paid: allRecords.filter(r => r.status === "Paid").length,
      rejected: allRecords.filter(r => r.status === "Rejected").length,
      totalPaidAmount
    };

    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// 👁️ GET single referral by ID
router.get("/:id", async (req, res) => {
  try {
    const doc = await ReferralBonus.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Referral not found" });
    }

    // Access control
    if (!hasFullAccess(req.user) && doc.referringEmployeeId !== req.user.employeeId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// ➕ CREATE referral bonus record
router.post("/", async (req, res) => {
  try {
    const {
      referringEmployeeId,
      referringEmployeeName,
      division,
      designation,
      candidateName,
      candidateEmployeeId,
      candidateDesignation,
      candidateExperience,
      dateReferred,
      dateOfJoining,
      bonusAmount,
      remarks
    } = req.body;

    // Validate inputs
    if (!referringEmployeeId || !referringEmployeeName || !division || !designation) {
      return res.status(400).json({ success: false, message: "Referring employee details are required" });
    }
    if (!candidateName || !candidateDesignation || candidateExperience === undefined || !dateReferred) {
      return res.status(400).json({ success: false, message: "Candidate details are required" });
    }
    if (!bonusAmount) {
      return res.status(400).json({ success: false, message: "Bonus amount is required" });
    }
    if (Number(bonusAmount) > 10000) {
      return res.status(400).json({ success: false, message: "Referral bonus cannot exceed ₹10,000" });
    }

    // Calculate bonus amount based on candidate designation
    const calcResult = calculateReferralBonus(candidateDesignation);
    const calculatedBonusAmount = calcResult.amount;

    // Determine status & eligibility based on company policy
    let eligibility = "Pending";
    let status = "Pending Probation";
    let rejectionReason = "";
    let probationCompletionDate = null;

    const experienceNum = Number(candidateExperience);

    // Rule 1: Non-eligible designation
    if (!calcResult.eligible) {
      eligibility = "No";
      status = "Not Eligible";
      rejectionReason = calcResult.remarks;
    }
    // Rule 2: Candidate Experience < 1 Year
    else if (experienceNum < 1) {
      eligibility = "No";
      status = "Rejected";
      rejectionReason = "Referral bonus is not applicable for candidates with less than one year of experience.";
    }
    // Rule 3: Otherwise (Calculate probation date if DOJ is provided)
    else {
      eligibility = "Pending";
      status = "Pending Probation";
      if (dateOfJoining) {
        const dojDate = new Date(dateOfJoining);
        dojDate.setMonth(dojDate.getMonth() + 6);
        probationCompletionDate = dojDate;
      }
    }

    const newReferral = new ReferralBonus({
      referringEmployeeId,
      referringEmployeeName,
      division,
      designation,
      candidateName,
      candidateEmployeeId: candidateEmployeeId || "",
      candidateDesignation,
      candidateExperience: experienceNum,
      dateReferred: new Date(dateReferred),
      dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
      probationCompletionDate,
      eligibility,
      bonusAmount: calculatedBonusAmount,
      status,
      remarks: remarks || (calcResult.eligible ? "" : calcResult.remarks),
      rejectionReason,
      createdBy: req.user.name || req.user.username || "System"
    });

    await newReferral.save();

    // Notify HR/Admin about new referral creation
    try {
      const hrUsers = await User.find({ role: { $in: ["hr", "admin"] } }).select("_id");
      for (const hr of hrUsers) {
        await Notification.create({
          recipient: hr._id,
          title: "New Employee Referral Submitted",
          message: `${referringEmployeeName} referred candidate ${candidateName} for the role of ${candidateDesignation}.`,
          type: "OTHER"
        });
      }
    } catch (notifErr) {
      console.error("Error sending HR notifications:", notifErr.message);
    }

    res.status(201).json({ success: true, data: newReferral });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// ✏️ UPDATE referral bonus record (restricted to HR, Admin, Finance roles or users with permissions)
router.put("/:id", async (req, res) => {
  try {
    // Only HR, Admin, Finance can edit referral records
    if (!hasFullAccess(req.user)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const doc = await ReferralBonus.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Referral not found" });
    }

    const updates = req.body;

    // Validate bonus amount if being updated
    if (updates.bonusAmount && Number(updates.bonusAmount) > 10000) {
      return res.status(400).json({ success: false, message: "Referral bonus cannot exceed ₹10,000" });
    }

    // Save previous values for comparison
    const prevStatus = doc.status;

    // Apply standard updates
    if (updates.candidateName !== undefined) doc.candidateName = updates.candidateName;
    if (updates.candidateEmployeeId !== undefined) doc.candidateEmployeeId = updates.candidateEmployeeId;
    if (updates.candidateDesignation !== undefined) doc.candidateDesignation = updates.candidateDesignation;
    if (updates.candidateExperience !== undefined) doc.candidateExperience = Number(updates.candidateExperience);
    if (updates.remarks !== undefined) doc.remarks = updates.remarks;
    if (updates.rejectionReason !== undefined) doc.rejectionReason = updates.rejectionReason;
    if (updates.division !== undefined) doc.division = updates.division;

    if (updates.dateReferred !== undefined) doc.dateReferred = new Date(updates.dateReferred);
    if (updates.dateOfJoining !== undefined) {
      doc.dateOfJoining = updates.dateOfJoining ? new Date(updates.dateOfJoining) : null;
    }
    if (updates.paymentDate !== undefined) {
      doc.paymentDate = updates.paymentDate ? new Date(updates.paymentDate) : null;
    }

    // Re-calculate probation date if DOJ changed or was added
    if (doc.dateOfJoining) {
      const dojDate = new Date(doc.dateOfJoining);
      dojDate.setMonth(dojDate.getMonth() + 6);
      doc.probationCompletionDate = dojDate;
    } else {
      doc.probationCompletionDate = null;
    }

    // Re-evaluate automatic validation rules
    const calcResult = calculateReferralBonus(doc.candidateDesignation);
    doc.bonusAmount = calcResult.amount;

    const experienceNum = Number(doc.candidateExperience);

    // Perform eligibility validation when transitioning to Eligible, Approved, or Paid
    if (updates.status !== undefined && ["Eligible", "Approved", "Paid"].includes(updates.status)) {
      if (!calcResult.eligible) {
        return res.status(400).json({ success: false, message: "Cannot update status: Designation is not eligible for Referral Bonus." });
      }
      if (experienceNum < 1) {
        return res.status(400).json({ success: false, message: "Cannot update status: Candidate experience is less than 1 year." });
      }
      if (!doc.dateOfJoining) {
        return res.status(400).json({ success: false, message: "Cannot update status: Candidate Date of Joining must be set first." });
      }
      const today = new Date();
      if (doc.probationCompletionDate && new Date(doc.probationCompletionDate) > today) {
        return res.status(400).json({ success: false, message: `Cannot update status: Candidate is still in probation until ${new Date(doc.probationCompletionDate).toLocaleDateString()}.` });
      }
    }

    if (!calcResult.eligible) {
      doc.eligibility = "No";
      doc.status = "Not Eligible";
      doc.rejectionReason = calcResult.remarks;
    } else if (experienceNum < 1) {
      doc.eligibility = "No";
      doc.status = "Rejected";
      doc.rejectionReason = updates.rejectionReason || "Referral bonus is not applicable for candidates with less than one year of experience.";
    } else {
      // Respect manual status transitions if supplied in request
      if (updates.status !== undefined) {
        doc.status = updates.status;
        if (updates.status === "Eligible") {
          doc.eligibility = "Yes";
        } else if (updates.status === "Approved") {
          doc.eligibility = "Yes";
        } else if (updates.status === "Paid") {
          doc.eligibility = "Yes";
          if (!doc.paymentDate) doc.paymentDate = new Date();
        } else if (updates.status === "Rejected") {
          doc.eligibility = "No";
        } else if (updates.status === "Pending Probation") {
          doc.eligibility = "Pending";
        } else if (updates.status === "Not Eligible") {
          doc.eligibility = "No";
        }
      }
    }

    doc.updatedBy = req.user.name || req.user.username || "System";
    await doc.save();

    // 🔔 Notifications triggers:
    
    // 1. Notify HR when status is manually marked as Eligible
    if (doc.status === "Eligible" && prevStatus !== "Eligible") {
      try {
        const hrUsers = await User.find({ role: { $in: ["hr", "admin"] } }).select("_id");
        for (const hr of hrUsers) {
          await Notification.create({
            recipient: hr._id,
            title: "Referral Eligible for Approval",
            message: `Referral ${doc.referralId} for ${doc.candidateName} is now Eligible. HR/Admin can approve or reject the bonus.`,
            type: "OTHER"
          });
        }
      } catch (notifErr) {
        console.error("Error sending Eligible notification to HR:", notifErr.message);
      }
    }

    // 2. Notify Referring Employee when status becomes Paid
    if (doc.status === "Paid" && prevStatus !== "Paid") {
      try {
        const referringUser = await User.findOne({ employeeId: doc.referringEmployeeId }).select("_id");
        if (referringUser) {
          await Notification.create({
            recipient: referringUser._id,
            title: "Referral Bonus Paid",
            message: `Congratulations! Your referral bonus of ₹${doc.bonusAmount.toLocaleString()} for candidate ${doc.candidateName} has been processed and marked as Paid.`,
            type: "OTHER"
          });
        }
      } catch (notifErr) {
        console.error("Error sending Paid notification to Employee:", notifErr.message);
      }
    }

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// ❌ DELETE referral bonus record (restricted to HR/Admin)
router.delete("/:id", async (req, res) => {
  try {
    if (!hasFullAccess(req.user)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const doc = await ReferralBonus.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Referral not found" });
    }

    res.json({ success: true, message: "Referral bonus record deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

module.exports = router;
