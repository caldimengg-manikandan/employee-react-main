const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const MonthlyPayroll = require("../models/MonthlyPayroll");

/**
 * ✅ CREATE LOAN
 * POST /api/loans
 */
router.post("/", async (req, res) => {
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
 * ✅ GET ALL LOANS (with filters)
 * GET /api/loans
 */
router.get("/", async (req, res) => {
  try {
    const { employeeId, location, division, status } = req.query;

    const filter = {};

    if (employeeId) filter.employeeId = new RegExp(employeeId, "i");
    if (location && location !== "all") filter.location = location;
    if (division && division !== "all") filter.division = division;
    if (status && status !== "all") filter.status = status;

    const loans = await Loan.find(filter).sort({ createdAt: -1 });

    const updatedLoans = loans.map(loan => {
      const loanObj = loan.toObject();
      const totalAmount = Number(loanObj.amount || 0);
      const repaymentHistory = loanObj.repaymentHistory || [];

      // Source of truth: Sum of all actual payments in history
      const totalPaid = repaymentHistory.reduce((sum, entry) => {
        return sum + (Number(entry.emiAmount) || 0);
      }, 0);
      
      let rBalance = totalAmount - totalPaid;
      
      if (loanObj.status === "completed" || rBalance <= 0 || repaymentHistory.length >= (loanObj.tenureMonths || 1)) {
        rBalance = 0;
      }

      return {
        ...loanObj,
        paidMonths: repaymentHistory.length,
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
 * ✅ GET SINGLE LOAN
 * GET /api/loans/:id
 */
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid Loan ID" });
    }

    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    const loanObj = loan.toObject();
    const totalAmount = Number(loanObj.amount || 0);
    const repaymentHistory = loanObj.repaymentHistory || [];

    // Source of truth: Sum of all actual payments in history
    const totalPaid = repaymentHistory.reduce((sum, entry) => {
      return sum + (Number(entry.emiAmount) || 0);
    }, 0);

    let rBalance = totalAmount - totalPaid;

    if (loanObj.status === "completed" || rBalance <= 0 || repaymentHistory.length >= (loanObj.tenureMonths || 1)) {
      rBalance = 0;
    }

    const updatedLoan = {
      ...loanObj,
      paidMonths: repaymentHistory.length,
      remainingBalance: rBalance,
      repaymentHistory: repaymentHistory
    };

    res.json({ success: true, loan: updatedLoan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ✅ RECONCILE LOAN WITH PAYROLL
 * POST /api/loans/:id/reconcile
 */
router.post("/:id/reconcile", async (req, res) => {
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
 * ✅ UPDATE LOAN
 * PUT /api/loans/:id
 */
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid Loan ID" });
    }

    const currentLoan = await Loan.findById(req.params.id);
    if (!currentLoan) return res.status(404).json({ message: "Loan not found" });

    const amount = req.body.amount !== undefined ? Number(req.body.amount) : currentLoan.amount;
    const tenureMonths = req.body.tenureMonths !== undefined ? Number(req.body.tenureMonths) : currentLoan.tenureMonths;
    
    // Auto-calculate EMI if amount or tenure changed
    const monthlyEMI = Math.round(amount / tenureMonths);
    
    // Recalculate remaining balance based on actual history
    const totalPaid = (currentLoan.repaymentHistory || []).reduce((sum, h) => sum + (Number(h.emiAmount) || 0), 0);
    const remainingBalance = amount - totalPaid;

    const updateBody = {
      ...req.body,
      monthlyEMI,
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
 * ✅ TOGGLE PAYMENT ENABLE / DISABLE
 * PATCH /api/loans/:id/payment
 */
router.patch("/:id/payment", async (req, res) => {
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
 * ✅ DELETE LOAN
 * DELETE /api/loans/:id
 */
router.delete("/:id", async (req, res) => {
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
