const express = require("express");
const router = express.Router();
const Payroll = require("../models/Payroll");
const auth = require("../middleware/auth");
const authorizeRoles = require("../middleware/roleAuth");

// Apply JWT authentication to all payroll routes
router.use(auth);

// ➕ CREATE payroll (Admin, HR, Finance, Director only)
router.post("/", authorizeRoles("admin", "hr", "finance", "director"), async (req, res) => {
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


// 📥 GET all payroll records (Filtered: privileged roles see all, employees see only their own)
router.get("/", async (req, res) => {
  try {
    const privilegedRoles = ["admin", "hr", "finance", "director", "projectmanager"];
    const userRole = String(req.user?.role || "").toLowerCase();

    let filter = {};
    if (!privilegedRoles.includes(userRole)) {
      if (!req.user?.employeeId) {
        return res.json([]);
      }
      filter = { employeeId: { $regex: new RegExp(`^${req.user.employeeId}$`, "i") } };
    }

    const payrolls = await Payroll.find(filter).sort({ createdAt: -1 });
    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 👁️ GET single payroll by ID (Privileged roles or owner only)
router.get("/:id", async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: "Not found" });

    const privilegedRoles = ["admin", "hr", "finance", "director", "projectmanager"];
    const userRole = String(req.user?.role || "").toLowerCase();

    if (!privilegedRoles.includes(userRole)) {
      if (!req.user?.employeeId || String(payroll.employeeId || "").toLowerCase() !== String(req.user.employeeId).toLowerCase()) {
        return res.status(403).json({ message: "Access denied: Cannot view payroll records of other employees." });
      }
    }

    res.json(payroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ✏️ UPDATE payroll (Admin, HR, Finance, Director only)
router.put("/:id", authorizeRoles("admin", "hr", "finance", "director"), async (req, res) => {
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


// ❌ DELETE payroll (Admin, HR, Finance, Director only)
router.delete("/:id", authorizeRoles("admin", "hr", "finance", "director"), async (req, res) => {
  try {
    await Payroll.findByIdAndDelete(req.params.id);
    res.json({ message: "Payroll deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

