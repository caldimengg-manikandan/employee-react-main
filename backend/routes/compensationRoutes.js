const express = require("express");
const router = express.Router();
const Compensation = require("../models/Compensation");
const Payroll = require("../models/Payroll");
const Employee = require("../models/Employee");

// Helper: Build payroll data from compensation fields (50/25/25 Rule)
const buildPayrollData = (comp, employee) => {
  const basicDA = Number(comp.basicDA) || 0;
  const hra = Number(comp.hra) || 0;
  const specialAllowance = Number(comp.specialAllowance) || 0;
  const employeePF = Number(comp.employeePfContribution) || Number(comp.pf) || 1800;
  const employerPF = Number(comp.employerPfContribution) || 1950;
  const esi = Number(comp.esi) || 0;
  const tax = Number(comp.tax) || 0;
  const professionalTax = Number(comp.professionalTax) || 0;
  const gratuity = Number(comp.gratuity) || 0;

  const volunteerPF = Number(comp.volunteerPF) || 0;

  const totalEarnings = basicDA + hra + specialAllowance;
  const reconstructedGross = totalEarnings + employeePF + employerPF + esi + volunteerPF;
  const totalDeductions = employeePF + employerPF + esi + tax + professionalTax + volunteerPF;
  const netSalary = totalEarnings; // Net = Basic + HRA + Special
  const ctc = Math.round(reconstructedGross + gratuity); // CTC = Gross + Gratuity

  return {
    employeeId: employee.employeeId,
    employeeName: employee.name || employee.employeename,
    designation: comp.designation,
    department: comp.department,
    location: comp.location || employee.location || 'Chennai',
    dateOfJoining: comp.effectiveDate || employee.dateOfJoining,
    employmentType: "Permanent",
    basicDA,
    hra,
    specialAllowance,
    employeePfContribution: employeePF,
    employerPfContribution: employerPF,
    esi,
    tax,
    professionalTax,
    gratuity,
    volunteerPF,
    totalEarnings,
    totalDeductions,
    netSalary,
    ctc,
    status: "Pending"
  };
};

// Helper: Find employee by ID or name
const findEmployee = async (employeeId, employeeName) => {
  if (employeeId) {
    const emp = await Employee.findOne({ employeeId });
    if (emp) return emp;
  }
  if (employeeName) {
    const emp = await Employee.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${employeeName}$`, "i") } },
        { employeename: { $regex: new RegExp(`^${employeeName}$`, "i") } }
      ]
    });
    if (emp) return emp;
  }
  return null;
};

// ➕ CREATE Compensation
router.post("/", async (req, res) => {
  try {
    const compensation = new Compensation(req.body);
    await compensation.save();

    // Create/Update Payroll record
    const employee = await findEmployee(req.body.employeeId, req.body.name);

    if (employee) {
      if (employee.status !== "Active") {
        return res.status(400).json({ message: "Employee is not active. Cannot create compensation for inactive or exited employees." });
      }

      const payrollData = buildPayrollData(compensation, employee);

      // Upsert: update if exists, create if not
      await Payroll.findOneAndUpdate(
        { employeeId: { $regex: new RegExp(`^${employee.employeeId}$`, 'i') } },
        { $set: payrollData },
        { upsert: true, new: true }
      );

      // Sync dateOfJoining back to Employee if effectiveDate is set
      if (compensation.effectiveDate) {
        await Employee.findOneAndUpdate(
          { employeeId: employee.employeeId },
          { $set: { dateOfJoining: compensation.effectiveDate } }
        );
      }
    }

    res.status(201).json(compensation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 📥 GET all Compensations
router.get("/", async (req, res) => {
  try {
    const compensations = await Compensation.find().sort({ createdAt: -1 });
    res.json(compensations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 👁️ GET single Compensation by ID
router.get("/:id", async (req, res) => {
  try {
    const compensation = await Compensation.findById(req.params.id);
    if (!compensation) return res.status(404).json({ message: "Not found" });
    res.json(compensation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✏️ UPDATE Compensation + Sync to Payroll
router.put("/:id", async (req, res) => {
  try {
    // Check employee status before update
    const employee = await findEmployee(req.body.employeeId, req.body.name);
    if (employee && employee.status !== "Active") {
      return res.status(400).json({ success: false, message: "Employee is not active. Cannot update compensation for inactive or exited employees." });
    }
    
    const updated = await Compensation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    // Sync changes to Payroll record
    if (employee && updated) {
      const payrollData = buildPayrollData(updated, employee);

      await Payroll.findOneAndUpdate(
        { employeeId: { $regex: new RegExp(`^${employee.employeeId}$`, 'i') } },
        { $set: payrollData },
        { upsert: true, new: true }
      );

      // Sync dateOfJoining back to Employee if effectiveDate is set
      if (updated.effectiveDate) {
        await Employee.findOneAndUpdate(
          { employeeId: employee.employeeId },
          { $set: { dateOfJoining: updated.effectiveDate } }
        );
      }
    }

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ❌ DELETE Compensation
router.delete("/:id", async (req, res) => {
  try {
    await Compensation.findByIdAndDelete(req.params.id);
    res.json({ message: "Compensation deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
