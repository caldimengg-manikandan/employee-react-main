const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const PerformancePay = require("../models/PerformancePay");
const Employee = require("../models/Employee");
const Payroll = require("../models/Payroll");

// @desc    Get all performance pay records
// @route   GET /api/performance-pay
// @access  Private (Admin/HR/Manager)
router.get("/", auth, async (req, res) => {
  try {
    const { financialYear, department, location, status, search } = req.query;
    const filter = {};

    if (financialYear) filter.financialYear = financialYear;
    if (department) filter.department = department;
    if (location) filter.location = location;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { employeeName: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
      ];
    }

    const records = await PerformancePay.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: records });
  } catch (error) {
    console.error("Error fetching performance pay:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Create performance pay record
// @route   POST /api/performance-pay
// @access  Private (Admin/HR)
router.post("/", auth, async (req, res) => {
  try {
    const { employeeId, financialYear, performancePayAmount, reason, remarks } = req.body;

    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Get current salary (gross/totalEarnings) from Payroll or Employee
    const payroll = await Payroll.findOne({ employeeId });
    const currentSalary = payroll ? (payroll.totalEarnings || 0) : (employee.gross || 0);

    const newRecord = new PerformancePay({
      employeeId: employee.employeeId,
      employeeName: employee.name,
      department: employee.department || employee.division,
      designation: employee.designation,
      location: employee.location || "Chennai",
      financialYear,
      currentSalary,
      performancePayAmount: parseFloat(performancePayAmount) || 0,
      reason,
      remarks,
      status: "DRAFT",
      createdBy: req.user.name,
    });

    await newRecord.save();
    res.status(201).json({ success: true, data: newRecord });
  } catch (error) {
    console.error("Error creating performance pay:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// @desc    Update performance pay record
// @route   PUT /api/performance-pay/:id
// @access  Private (Admin/HR)
router.put("/:id", auth, async (req, res) => {
  try {
    const { financialYear, performancePayAmount, reason, remarks } = req.body;

    const record = await PerformancePay.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    if (record.status !== "DRAFT") {
      return res.status(400).json({
        success: false,
        message: "Only records in DRAFT status can be modified.",
      });
    }

    record.financialYear = financialYear || record.financialYear;
    record.performancePayAmount = parseFloat(performancePayAmount) || record.performancePayAmount;
    record.reason = reason || record.reason;
    record.remarks = remarks || record.remarks;

    await record.save();
    res.json({ success: true, data: record });
  } catch (error) {
    console.error("Error updating performance pay:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// @desc    Delete performance pay record
// @route   DELETE /api/performance-pay/:id
// @access  Private (Admin/HR)
router.delete("/:id", auth, async (req, res) => {
  try {
    const record = await PerformancePay.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    if (record.status !== "DRAFT") {
      return res.status(400).json({
        success: false,
        message: "Only records in DRAFT status can be deleted.",
      });
    }

    await PerformancePay.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Record deleted successfully" });
  } catch (error) {
    console.error("Error deleting performance pay:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Bulk approve performance pay records
// @route   POST /api/performance-pay/approve
// @access  Private (Admin/HR)
router.post("/approve", auth, async (req, res) => {
  try {
    const { ids } = req.body; // Array of IDs
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No record IDs provided." });
    }

    await PerformancePay.updateMany(
      { _id: { $in: ids }, status: "DRAFT" },
      { $set: { status: "APPROVED" } }
    );

    res.json({ success: true, message: "Selected performance pay awards approved successfully." });
  } catch (error) {
    console.error("Error approving performance pay:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Bulk generate letters for performance pay records
// @route   POST /api/performance-pay/generate-letter
// @access  Private (Admin/HR)
router.post("/generate-letter", auth, async (req, res) => {
  try {
    const { ids } = req.body; // Array of IDs
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No record IDs provided." });
    }

    await PerformancePay.updateMany(
      { _id: { $in: ids }, status: "APPROVED" },
      { $set: { status: "LETTER_GENERATED", letterGenerated: true, letterGeneratedDate: new Date() } }
    );

    res.json({ success: true, message: "Letters generated for selected awards." });
  } catch (error) {
    console.error("Error generating letters:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Bulk mark performance pay as credited
// @route   POST /api/performance-pay/credit
// @access  Private (Admin/HR)
router.post("/credit", auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No record IDs provided." });
    }

    await PerformancePay.updateMany(
      { _id: { $in: ids }, status: { $in: ["APPROVED", "LETTER_GENERATED"] } },
      { $set: { status: "PAYROLL_CREDITED", payrollCredited: true } }
    );

    res.json({ success: true, message: "Selected performance pay marked as payroll credited." });
  } catch (error) {
    console.error("Error crediting performance pay:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get pending/accepted performance pay for payroll simulation
// @route   GET /api/performance-pay/pending-payroll
// @access  Private
router.get("/pending-payroll", auth, async (req, res) => {
  try {
    const records = await PerformancePay.find({ status: { $in: ["APPROVED", "LETTER_GENERATED"] }, payrollCredited: false });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
