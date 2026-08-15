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
    const { employeeId, financialYear, performancePayAmount, reason, remarks, letterGeneratedDate, releaseDate, tdsAmount } = req.body;

    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Check if a performance pay record already exists for this employee in the same financial year
    const existingRecord = await PerformancePay.findOne({ employeeId: employee.employeeId, financialYear });
    if (existingRecord) {
      return res.status(400).json({
        success: false,
        message: `Performance Pay record already exists for employee ${employee.name} in Financial Year ${financialYear}.`
      });
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
      letterGeneratedDate: letterGeneratedDate ? new Date(letterGeneratedDate) : undefined,
      releaseDate: releaseDate ? new Date(releaseDate) : new Date("2026-08-18"),
      tdsAmount: parseFloat(tdsAmount) || 0,
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

// @desc    Get all approved performance pay records with employee details for payslips
// @route   GET /api/performance-pay/approved
// @access  Private
router.get("/approved", auth, async (req, res) => {
  try {
    const records = await PerformancePay.find({
      status: { $in: ["APPROVED", "LETTER_GENERATED", "PAYROLL_CREDITED"] },
      performancePayAmount: { $gt: 0 }
    }).sort({ createdAt: -1 });

    const employeeIds = records.map(r => r.employeeId);
    const employees = await Employee.find({ employeeId: { $in: employeeIds } });
    const empMap = {};
    employees.forEach(e => {
      empMap[String(e.employeeId).toLowerCase()] = e;
    });

    const enriched = records.map(r => {
      const emp = empMap[String(r.employeeId).toLowerCase()] || {};
      const obj = r.toObject();
      obj.panNumber = emp.pan || 'N/A';
      obj.uanNumber = emp.uan || 'N/A';
      obj.joiningDate = emp.dateOfJoining || emp.dateofjoin || 'N/A';
      obj.bankName = emp.bankName || emp.bank || 'N/A';
      obj.accountNumber = emp.bankAccount || emp.accountNumber || emp.accountNo || emp.bankAccountNo || 'N/A';
      obj.ifscCode = emp.ifsc || emp.ifscCode || emp.ifsc_code || 'N/A';
      return obj;
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error("Error fetching approved performance pay:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get approved performance pay for a specific employee
// @route   GET /api/performance-pay/employee/:employeeId
// @access  Private
router.get("/employee/:employeeId", auth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const records = await PerformancePay.find({
      employeeId: { $regex: new RegExp(`^${employeeId}$`, "i") },
      status: { $in: ["APPROVED", "LETTER_GENERATED", "PAYROLL_CREDITED"] },
      performancePayAmount: { $gt: 0 }
    }).sort({ createdAt: -1 });

    if (!records || records.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const emp = await Employee.findOne({ employeeId: { $regex: new RegExp(`^${employeeId}$`, "i") } });
    const enriched = records.map(r => {
      const obj = r.toObject();
      if (emp) {
        obj.panNumber = emp.pan || 'N/A';
        obj.uanNumber = emp.uan || 'N/A';
        obj.joiningDate = emp.dateOfJoining || emp.dateofjoin || 'N/A';
        obj.bankName = emp.bankName || emp.bank || 'N/A';
        obj.accountNumber = emp.bankAccount || emp.accountNumber || emp.accountNo || emp.bankAccountNo || 'N/A';
        obj.ifscCode = emp.ifsc || emp.ifscCode || emp.ifsc_code || 'N/A';
      }
      return obj;
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error("Error fetching employee performance pay:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update TDS & release date for a performance pay record
// @route   PUT /api/performance-pay/:id/tds
// @access  Private (Admin/HR)
router.put("/:id/tds", auth, async (req, res) => {
  try {
    const { tdsAmount, releaseDate } = req.body;
    const record = await PerformancePay.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    if (tdsAmount !== undefined) {
      record.tdsAmount = parseFloat(tdsAmount) || 0;
    }
    if (releaseDate !== undefined) {
      record.releaseDate = releaseDate ? new Date(releaseDate) : record.releaseDate;
    }

    await record.save();
    res.json({ success: true, data: record });
  } catch (error) {
    console.error("Error updating performance pay TDS:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// @desc    Update performance pay record
// @route   PUT /api/performance-pay/:id
// @access  Private (Admin/HR)
router.put("/:id", auth, async (req, res) => {
  try {
    const { financialYear, performancePayAmount, reason, remarks, letterGeneratedDate, releaseDate, tdsAmount } = req.body;

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
    record.performancePayAmount = parseFloat(performancePayAmount) !== undefined ? parseFloat(performancePayAmount) : record.performancePayAmount;
    record.reason = reason || record.reason;
    record.remarks = remarks || record.remarks;
    if (releaseDate !== undefined) {
      record.releaseDate = releaseDate ? new Date(releaseDate) : record.releaseDate;
    }
    if (tdsAmount !== undefined) {
      record.tdsAmount = parseFloat(tdsAmount) || 0;
    }
    if (letterGeneratedDate !== undefined) {
      record.letterGeneratedDate = letterGeneratedDate ? new Date(letterGeneratedDate) : null;
    }

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
