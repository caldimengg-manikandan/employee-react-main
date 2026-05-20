const express = require("express");
const router = express.Router();
const MonthlyPayroll = require("../models/MonthlyPayroll");


// ✅ SAVE MONTHLY PAYROLL (Simulation Result)
router.post("/run", async (req, res) => {
  try {
    const { payrolls } = req.body; // array from simulation

    if (!Array.isArray(payrolls) || payrolls.length === 0) {
      return res.status(400).json({ message: "No payroll data received" });
    }

    const saved = [];
    const Employee = require("../models/Employee");

    for (const p of payrolls) {
      // Check employee status
      if (p.employeeId) {
        const emp = await Employee.findOne({ employeeId: p.employeeId }).select('status');
        if (emp && emp.status !== 'Active') {
          continue; // Skip inactive employees
        }
      }
      const record = await MonthlyPayroll.findOneAndUpdate(
        { employeeId: p.employeeId, salaryMonth: p.salaryMonth },
        p,
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
          const alreadyDeducted = loan.repaymentHistory && loan.repaymentHistory.some(h => h.emiMonth === monthStr);
          if (alreadyDeducted) {
            continue;
          }

          const monthlyEMI = Math.round(loan.amount / loan.tenureMonths);
          
          loan.paidMonths = (loan.paidMonths || 0) + 1;
          
          const remaining = loan.amount - (monthlyEMI * loan.paidMonths);
          loan.remainingBalance = remaining < 0 ? 0 : remaining;
          loan.lastDeductionDate = new Date();
          
          const nextDate = new Date();
          nextDate.setMonth(nextDate.getMonth() + 1);
          loan.nextDeductionDate = nextDate;
          
          if (loan.paidMonths >= loan.tenureMonths) {
            loan.status = "completed";
            loan.paymentEnabled = false;
            loan.remainingBalance = 0;
            loan.nextDeductionDate = null;
          }
          
          if (!loan.repaymentHistory) {
            loan.repaymentHistory = [];
          }

          loan.repaymentHistory.push({
            emiMonth: monthStr,
            emiAmount: monthlyEMI,
            deductionDate: new Date(),
            remainingBalance: loan.remainingBalance,
            paymentStatus: "deducted"
          });
          
          await loan.save();
        }
      } catch (loanErr) {
        console.error("Error processing loan deduction for employee", p.employeeId, loanErr);
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


// 📥 GET PAYROLL BY MONTH
router.get("/", async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM

    const filter = month ? { salaryMonth: month } : {};

    const records = await MonthlyPayroll.find(filter).sort({
      employeeName: 1,
    });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 📜 GET EMPLOYEE PAYROLL HISTORY
router.get("/history/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const records = await MonthlyPayroll.find({ 
      employeeId: { $regex: new RegExp(`^${employeeId}$`, "i") } 
    }).sort({ salaryMonth: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 📤 MARK PAYMENT EMAIL SENT
router.put("/mark-email-sent", async (req, res) => {
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


// 💰 MARK AS PAID
router.put("/mark-paid", async (req, res) => {
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


// ❌ DELETE MONTH PAYROLL (Admin only)
router.delete("/:month", async (req, res) => {
  try {
    await MonthlyPayroll.deleteMany({ salaryMonth: req.params.month });
    res.json({ message: "Monthly payroll deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;