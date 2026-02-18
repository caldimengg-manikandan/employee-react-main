const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const HolidayAllowance = require("../models/HolidayAllowance");

router.post("/bulk-save", auth, async (req, res) => {
  try {
    const { month, year, allowances } = req.body;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }

    if (!Array.isArray(allowances) || allowances.length === 0) {
      return res.status(400).json({ message: "No allowances provided" });
    }

    const saved = [];

    for (const item of allowances) {
      if (!item.employeeId) {
        continue;
      }

      const filter = {
        employeeId: item.employeeId,
        month,
        year,
      };

      const update = {
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        location: item.location,
        accountNumber: item.accountNumber,
        grossSalary: item.grossSalary,
        month,
        year,
        holidayDays: item.holidayDays,
        perDayAmount: item.perDayAmount,
        holidayTotal: item.holidayTotal,
        shiftAllottedAmount: item.shiftAllottedAmount,
        shiftDays: item.shiftDays,
        shiftTotal: item.shiftTotal,
        totalAmount: item.totalAmount,
      };

      const doc = await HolidayAllowance.findOneAndUpdate(filter, update, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      });

      saved.push(doc);
    }

    return res.status(201).json({
      message: "Holiday allowances saved successfully",
      count: saved.length,
      data: saved,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to save holiday allowances",
    });
  }
});

module.exports = router;

