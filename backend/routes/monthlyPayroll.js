const express = require("express");
const router = express.Router();
const MonthlyPayroll = require("../models/MonthlyPayroll");
const auth = require("../middleware/auth");
const authorizeRoles = require("../middleware/roleAuth");

// Apply JWT Authentication to all routes in this module
router.use(auth);


// ✅ SAVE MONTHLY PAYROLL (Simulation Result) - Admin, HR, Finance, Director only
router.post("/run", authorizeRoles("admin", "hr", "finance", "director"), async (req, res) => {
  try {
    const { payrolls } = req.body; // array from simulation

    if (!Array.isArray(payrolls) || payrolls.length === 0) {
      return res.status(400).json({ message: "No payroll data received" });
    }

    const saved = [];
    const Employee = require("../models/Employee");

    const employeeIds = payrolls.map(p => p.employeeId).filter(Boolean);
    const employeesList = await Employee.find({ employeeId: { $in: employeeIds } }).select('employeeId status');
    const activeEmpSet = new Set(employeesList.filter(e => e.status === 'Active').map(e => String(e.employeeId).toLowerCase()));

    for (const p of payrolls) {
      // Check employee status
      if (p.employeeId && !activeEmpSet.has(String(p.employeeId).toLowerCase())) {
        continue; // Skip inactive employees
      }

      // Format paymentDate to DD-MM-YYYY or default today
      if (!p.paymentDate) {
        const d = new Date();
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        p.paymentDate = `${dd}-${mm}-${yyyy}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(p.paymentDate)) {
        const [y, m, d] = p.paymentDate.split('-');
        p.paymentDate = `${d}-${m}-${y}`;
      }

      const pData = { ...p };
      delete pData._id;
      delete pData.__v;
      delete pData.createdAt;
      delete pData.updatedAt;

      const empIdFilter = p.employeeId ? { $regex: new RegExp(`^${p.employeeId}$`, "i") } : p.employeeId;
      const record = await MonthlyPayroll.findOneAndUpdate(
        { employeeId: empIdFilter, salaryMonth: p.salaryMonth },
        { $set: pData },
        { upsert: true, new: true }
      );

      // Process loan updates if the employee has active loans
      try {
        const Loan = require("../models/Loan");
        const activeLoans = await Loan.find({
          employeeId: p.employeeId,
          status: "active",
          paymentEnabled: true
        });

        for (const loan of activeLoans) {
          const monthStr = p.salaryMonth || new Date().toISOString().substring(0, 7);
          
          // Source of Truth: Check history to prevent duplicate deductions for the same month
          if (!loan.repaymentHistory) loan.repaymentHistory = [];
          const alreadyDeducted = loan.repaymentHistory.some(h => h.emiMonth === monthStr);
          if (alreadyDeducted) continue;

          // Determine EMI amount (use actual deduction from payroll if available, else standard)
          const monthlyEMI = p.loanDeduction > 0 ? p.loanDeduction : (loan.monthlyEMI || Math.round(loan.amount / loan.tenureMonths));
          
          // Update History first
          loan.repaymentHistory.push({
            emiMonth: monthStr,
            emiAmount: monthlyEMI,
            deductionDate: new Date(),
            remainingBalance: 0, // Placeholder, calculated below
            paymentStatus: "deducted"
          });

          // Increment the paid months counter (Manual baseline + 1)
          loan.paidMonths = (loan.paidMonths || 0) + 1;

          // Calculate remaining balance
          // We use the greater of (manual EMI total) or (actual history total) to be safe
          const historyPaidAmount = loan.repaymentHistory.reduce((sum, h) => sum + (Number(h.emiAmount) || 0), 0);
          const manualPaidAmount = Number(loan.paidMonths) * (Number(loan.monthlyEMI) || 0);
          const totalPaid = Math.max(historyPaidAmount, manualPaidAmount);
          
          const remaining = (Number(loan.amount) || 0) - totalPaid;
          loan.remainingBalance = remaining < 0 ? 0 : remaining;
          loan.lastDeductionDate = new Date();
          
          // Update the specific entry's balance for the statement
          loan.repaymentHistory[loan.repaymentHistory.length - 1].remainingBalance = loan.remainingBalance;

          const nextDate = new Date();
          nextDate.setMonth(nextDate.getMonth() + 1);
          loan.nextDeductionDate = nextDate;
          
          if (loan.remainingBalance <= 0 || loan.paidMonths >= loan.tenureMonths) {
            loan.status = "completed";
            loan.paymentEnabled = false;
            loan.remainingBalance = 0;
            loan.nextDeductionDate = null;
          }
          
          await loan.save();
        }
      } catch (loanErr) {
        console.error("Error processing loan deduction for employee", p.employeeId, loanErr);
      }

      // Process performance pay status updates
      try {
        if (p.performancePay > 0) {
          const PerformancePay = require("../models/PerformancePay");
          await PerformancePay.updateMany(
            { employeeId: p.employeeId, status: { $in: ["APPROVED", "LETTER_GENERATED"] }, payrollCredited: false },
            { $set: { status: "PAYROLL_CREDITED", payrollCredited: true } }
          );
        }
      } catch (ppErr) {
        console.error("Error processing performance pay credit for employee", p.employeeId, ppErr);
      }

      saved.push(record);
    }

    res.status(201).json({
      message: "Monthly payroll saved successfully",
      count: saved.length,
      data: saved,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 📥 GET PAYROLL BY MONTH (Filtered by ownership for unprivileged employees)
router.get("/", async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    const privilegedRoles = ["admin", "hr", "finance", "director"];
    const userRole = String(req.user?.role || "").toLowerCase();

    const filter = month ? { salaryMonth: month } : {};

    if (!privilegedRoles.includes(userRole)) {
      if (!req.user?.employeeId) {
        return res.json([]);
      }
      filter.employeeId = { $regex: new RegExp(`^${req.user.employeeId}$`, "i") };
    }

    const records = await MonthlyPayroll.find(filter).sort({
      employeeName: 1,
    });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 📜 GET EMPLOYEE PAYROLL HISTORY (Privileged roles or record owner only)
router.get("/history/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const privilegedRoles = ["admin", "hr", "finance", "director"];
    const userRole = String(req.user?.role || "").toLowerCase();

    if (!privilegedRoles.includes(userRole)) {
      if (!req.user?.employeeId || String(req.user.employeeId).toLowerCase() !== String(employeeId).toLowerCase()) {
        return res.status(403).json({
          message: "Access denied: Cannot view monthly payroll history of another employee."
        });
      }
    }

    const records = await MonthlyPayroll.find({ 
      employeeId: { $regex: new RegExp(`^${employeeId}$`, "i") } 
    }).sort({ salaryMonth: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 📤 MARK PAYMENT EMAIL SENT (Admin, HR, Finance, Director only)
router.put("/mark-email-sent", authorizeRoles("admin", "hr", "finance", "director"), async (req, res) => {
  try {
    const { month, employeeIds } = req.body;

    const result = await MonthlyPayroll.updateMany(
      { salaryMonth: month, employeeId: { $in: employeeIds } },
      { $set: { status: "Payment Email Sent" } }
    );

    res.json({
      message: "Payment email status updated",
      modified: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 💰 MARK AS PAID (Admin, HR, Finance, Director only)
router.put("/mark-paid", authorizeRoles("admin", "hr", "finance", "director"), async (req, res) => {
  try {
    const { month, employeeIds } = req.body;

    const result = await MonthlyPayroll.updateMany(
      { salaryMonth: month, employeeId: { $in: employeeIds } },
      { $set: { status: "Paid" } }
    );

    res.json({
      message: "Payroll marked as paid",
      modified: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ❌ DELETE MONTH PAYROLL (Admin, HR, Finance, Director only)
router.delete("/:month", authorizeRoles("admin", "hr", "finance", "director"), async (req, res) => {
  try {
    await MonthlyPayroll.deleteMany({ salaryMonth: req.params.month });
    res.json({ message: "Monthly payroll deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;