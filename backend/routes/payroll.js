const express = require("express");
const router = express.Router();
const Payroll = require("../models/Payroll");


// ➕ CREATE payroll
router.post("/", async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (employeeId) {
      const Employee = require("../models/Employee");
      const employee = await Employee.findOne({ employeeId });
      if (employee && employee.status !== "Active") {
        return res.status(400).json({ message: "Employee is not active. Cannot create payroll for inactive or exited employees." });
      }
    }
    const payroll = new Payroll(req.body);
    await payroll.save();
    res.status(201).json(payroll);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


// 📥 GET all payroll records
router.get("/", async (req, res) => {
  try {
    const payrolls = await Payroll.find().sort({ createdAt: -1 });
    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 👁️ GET single payroll by ID
router.get("/:id", async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: "Not found" });
    res.json(payroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ✏️ UPDATE payroll
router.put("/:id", async (req, res) => {
  try {
    // Check employee status before update
    if (req.body.employeeId) {
      const Employee = require("../models/Employee");
      const employee = await Employee.findOne({ employeeId: req.body.employeeId });
      if (employee && employee.status !== "Active") {
        return res.status(400).json({ success: false, message: "Employee is not active. Cannot update payroll for inactive or exited employees." });
      }
    } else {
      // Check existing payroll's employee status
      const existing = await Payroll.findById(req.params.id);
      if (existing) {
        const Employee = require("../models/Employee");
        const employee = await Employee.findOne({ employeeId: existing.employeeId });
        if (employee && employee.status !== "Active") {
          return res.status(400).json({ success: false, message: "Employee is not active. Cannot update payroll for inactive or exited employees." });
        }
      }
    }

    const updated = await Payroll.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


// ❌ DELETE payroll
router.delete("/:id", async (req, res) => {
  try {
    await Payroll.findByIdAndDelete(req.params.id);
    res.json({ message: "Payroll deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
