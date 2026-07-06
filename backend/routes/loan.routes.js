const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const MonthlyPayroll = require("../models/MonthlyPayroll");
const auth = require("../middleware/auth");
const authorizeRoles = require("../middleware/roleAuth");
const { validateLoanApply } = require("../middleware/validation");

// Apply JWT authentication to all loan routes
router.use(auth);

/**
 * ✅ CREATE LOAN (Admin, HR, Finance, Director only)
 * POST /api/loans
 */
router.post("/", authorizeRoles("admin", "hr", "finance", "director", "manager"), validateLoanApply, async (req, res) => {
  try {
    const amount = Number(req.body.amount || 0);
    const tenureMonths = Number(req.body.tenureMonths || 1);
    const paidMonths = Number(req.body.paidMonths || 0);
    
    const monthlyEMI = Math.round(amount / tenureMonths);
    const calculatedRemaining = amount - (monthlyEMI * paidMonths);
    const remainingBalance = calculatedRemaining < 0 ? 0 : calculatedRemaining;

    const preparedBody = {
      ...req.body,
      monthlyEMI,
      remainingBalance,
      paidMonths,
      repaymentHistory: []
    };

    const loan = await Loan.create(preparedBody);
    res.status(201).json({ success: true, loan });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * ✅ GET ALL LOANS (with filters & ownership validation)
 * GET /api/loans
 */
router.get("/", async (req, res) => {
  try {
    const { employeeId, location, division, status } = req.query;
    const privilegedRoles = ["admin", "hr", "finance", "director", "manager"];
    const userRole = String(req.user?.role || "").toLowerCase();

    const filter = {};

    if (!privilegedRoles.includes(userRole)) {
      if (!req.user?.employeeId) {
        return res.json({ success: true, loans: [] });
      }
      filter.employeeId = new RegExp(`^${req.user.employeeId}$`, "i");
    } else if (employeeId) {
      filter.employeeId = new RegExp(employeeId, "i");
    }

    if (location && location !== "all") filter.location = location;
    if (division && division !== "all") filter.division = division;
    if (status && status !== "all") filter.status = status;

    const loans = await Loan.find(filter).sort({ createdAt: -1 });

    const updatedLoans = loans.map(loan => {
      const loanObj = loan.toObject();
      const totalAmount = Number(loanObj.amount || 0);
      const repaymentHistory = loanObj.repaymentHistory || [];
      const monthlyEMI = Number(loanObj.monthlyEMI || Math.round(totalAmount / (loanObj.tenureMonths || 1)));

      // Source of truth: Sum of history OR manual paid months (whichever is greater)
      const historyPaidAmount = repaymentHistory.reduce((sum, entry) => sum + (Number(entry.emiAmount) || 0), 0);
      const manualPaidAmount = Number(loanObj.paidMonths || 0) * monthlyEMI;
      
      const totalPaid = Math.max(historyPaidAmount, manualPaidAmount);
      const displayPaidMonths = Math.max(repaymentHistory.length, Number(loanObj.paidMonths || 0));
      
      let rBalance = totalAmount - totalPaid;
      
      if (loanObj.status === "completed" || rBalance <= 0 || displayPaidMonths >= (loanObj.tenureMonths || 1)) {
        rBalance = 0;
      }

      return {
        ...loanObj,
        paidMonths: displayPaidMonths,
        remainingBalance: rBalance,
        repaymentHistory: repaymentHistory
      };
    });

    res.json({ success: true, loans: updatedLoans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ✅ GET SINGLE LOAN (Privileged roles or loan owner only)
 * GET /api/loans/:id
 */
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid Loan Reference" });
    }

    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    const privilegedRoles = ["admin", "hr", "finance", "director", "manager"];
    const userRole = String(req.user?.role || "").toLowerCase();

    if (!privilegedRoles.includes(userRole)) {
      if (!req.user?.employeeId || String(loan.employeeId || "").toLowerCase() !== String(req.user.employeeId).toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You are not authorized to view loan details of another employee."
        });
      }
    }

    const loanObj = loan.toObject();
    const totalAmount = Number(loanObj.amount || 0);
    const repaymentHistory = loanObj.repaymentHistory || [];
    const monthlyEMI = Number(loanObj.monthlyEMI || Math.round(totalAmount / (loanObj.tenureMonths || 1)));

    // Source of truth: Sum of history OR manual paid months (whichever is greater)
    const historyPaidAmount = repaymentHistory.reduce((sum, entry) => sum + (Number(entry.emiAmount) || 0), 0);
    const manualPaidAmount = Number(loanObj.paidMonths || 0) * monthlyEMI;

    const totalPaid = Math.max(historyPaidAmount, manualPaidAmount);
    const displayPaidMonths = Math.max(repaymentHistory.length, Number(loanObj.paidMonths || 0));

    let rBalance = totalAmount - totalPaid;

    if (loanObj.status === "completed" || rBalance <= 0 || displayPaidMonths >= (loanObj.tenureMonths || 1)) {
      rBalance = 0;
    }

    const updatedLoan = {
      ...loanObj,
      paidMonths: displayPaidMonths,
      remainingBalance: rBalance,
      repaymentHistory: repaymentHistory
    };

    res.json({ success: true, loan: updatedLoan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ✅ RECONCILE LOAN WITH PAYROLL (Admin, HR, Finance, Director only)
 * POST /api/loans/:id/reconcile
 */
router.post("/:id/reconcile", authorizeRoles("admin", "hr", "finance", "director", "manager"), async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found" });

    // Find all payroll records for this employee with loan deductions
    const payrolls = await MonthlyPayroll.find({
      employeeId: loan.employeeId,
      loanDeduction: { $gt: 0 }
    }).sort({ salaryMonth: 1 });

    const history = [];
    let currentBalance = Number(loan.amount);
    const monthlyEMI = Number(loan.monthlyEMI) || Math.round(loan.amount / loan.tenureMonths);

    payrolls.forEach(p => {
      // Only count payrolls that happened after the loan start date
      const payrollDate = new Date(p.salaryMonth + "-01");
      const loanStartDate = new Date(loan.startDate);
      
      if (payrollDate >= new Date(loanStartDate.getFullYear(), loanStartDate.getMonth(), 1)) {
        const deduction = Number(p.loanDeduction);
        currentBalance -= deduction;
        
        history.push({
          emiMonth: p.salaryMonth,
          emiAmount: deduction,
          deductionDate: p.createdAt || new Date(),
          remainingBalance: currentBalance < 0 ? 0 : currentBalance,
          paymentStatus: "deducted"
        });
      }
    });

    loan.repaymentHistory = history;
    loan.paidMonths = history.length;
    loan.remainingBalance = currentBalance < 0 ? 0 : currentBalance;
    
    if (loan.remainingBalance <= 0) {
      loan.status = "completed";
      loan.paymentEnabled = false;
    }

    await loan.save();
    res.json({ success: true, loan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ✅ UPDATE LOAN (Admin, HR, Finance, Director only)
 * PUT /api/loans/:id
 */
router.put("/:id", authorizeRoles("admin", "hr", "finance", "director", "manager"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid Loan Reference" });
    }

    const currentLoan = await Loan.findById(req.params.id);
    if (!currentLoan) return res.status(404).json({ message: "Loan not found" });

    const amount = req.body.amount !== undefined ? Number(req.body.amount) : currentLoan.amount;
    const tenureMonths = req.body.tenureMonths !== undefined ? Number(req.body.tenureMonths) : currentLoan.tenureMonths;
    const paidMonths = req.body.paidMonths !== undefined ? Number(req.body.paidMonths) : (currentLoan.paidMonths || 0);
    
    // Auto-calculate EMI if amount or tenure changed
    const monthlyEMI = Math.round(amount / tenureMonths);
    
    // Recalculate remaining balance: history is primary, manual is fallback
    const historyPaid = (currentLoan.repaymentHistory || []).reduce((sum, h) => sum + (Number(h.emiAmount) || 0), 0);
    const manualPaid = paidMonths * monthlyEMI;
    const totalPaid = Math.max(historyPaid, manualPaid);
    
    const remainingBalance = amount - totalPaid;

    const updateBody = {
      ...req.body,
      monthlyEMI,
      paidMonths,
      remainingBalance: remainingBalance < 0 ? 0 : remainingBalance
    };

    const loan = await Loan.findByIdAndUpdate(
      req.params.id,
      updateBody,
      { new: true }
    );

    res.json({ success: true, loan });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * ✅ TOGGLE PAYMENT ENABLE / DISABLE (Admin, HR, Finance, Director only)
 * PATCH /api/loans/:id/payment
 */
router.patch("/:id/payment", authorizeRoles("admin", "hr", "finance", "director", "manager"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid Loan ID" });
    }

    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    loan.paymentEnabled = !loan.paymentEnabled;

    if (!loan.paymentEnabled && loan.status === "active") {
      loan.status = "on-hold";
    } else if (loan.paymentEnabled && loan.status === "on-hold") {
      loan.status = "active";
    }

    await loan.save();
    res.json({ success: true, loan });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * ✅ DELETE LOAN (Admin, HR, Finance, Director only)
 * DELETE /api/loans/:id
 */
router.delete("/:id", authorizeRoles("admin", "hr", "finance", "director", "manager"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid Loan ID" });
    }

    const loan = await Loan.findByIdAndDelete(req.params.id);
    
    if (!loan) {
      return res.status(404).json({ success: false, message: "Loan not found" });
    }

    res.json({ success: true, message: "Loan deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

