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
  // Calculate dynamic PF based on basicDA
  let calculatedEmployeePF = 1800;
  let calculatedEmployerPF = 1950;
  if (basicDA > 0) {
    if (basicDA < 15000) {
      calculatedEmployeePF = Math.round(basicDA * 0.12);
      calculatedEmployerPF = Math.round(basicDA * 0.13) + 150;
    } else {
      calculatedEmployeePF = 1800;
      calculatedEmployerPF = 1950;
    }
  }

  // Ensure we use the specific contribution fields if available, otherwise fallback to dynamic calculated values
  // Do NOT fallback to 'pf' as it may contain the combined (Emp+Empr) value
  const employeePF = comp.employeePfContribution !== undefined && comp.employeePfContribution !== null && comp.employeePfContribution !== "" ? Number(comp.employeePfContribution) : calculatedEmployeePF;
  const employerPF = comp.employerPfContribution !== undefined && comp.employerPfContribution !== null && comp.employerPfContribution !== "" ? Number(comp.employerPfContribution) : calculatedEmployerPF;
  const esi = Number(comp.esi) || 0;
  const tax = Number(comp.tax) || 0;
  const professionalTax = Number(comp.professionalTax) || 0;
  const gratuity = Number(comp.gratuity) || 0;

  const volunteerPF = Number(comp.volunteerPF) || 0;

  // Reconstructed Gross (Total Earnings) = Basic + HRA + Special + Employee PF + Employer PF + ESI
  const reconstructedGross = basicDA + hra + specialAllowance + employeePF + employerPF + esi;
  const totalEarnings = Math.round(reconstructedGross);
  const totalDeductions = employeePF + employerPF + esi + tax + professionalTax + volunteerPF;

  // Net Salary = (Basic + HRA + Special) - Tax - Professional Tax - Volunteer PF
  const netSalary = (basicDA + hra + specialAllowance) - tax - professionalTax - volunteerPF;

  const ctc = Math.round(reconstructedGross + gratuity); // CTC = Gross + Gratuity

  return {
    employeeId: employee.employeeId,
    employeeName: employee.name || employee.employeename,
    designation: comp.designation,
    department: comp.department,
    location: comp.location || employee.location || 'Chennai',
    dateOfJoining: employee.dateOfJoining || comp.effectiveDate,
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
    const emp = await Employee.findOne({ employeeId: { $regex: new RegExp(`^${employeeId}$`, "i") } });
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

      // Sync dateOfJoining and salary details back to Employee if effectiveDate is set
      if (compensation.effectiveDate) {
        await Employee.findOneAndUpdate(
          { employeeId: employee.employeeId },
          {
            $set: {
              dateOfJoining: employee.dateOfJoining || compensation.effectiveDate,
              basicDA: payrollData.basicDA,
              hra: payrollData.hra,
              specialAllowance: payrollData.specialAllowance,
              employeePfContribution: payrollData.employeePfContribution,
              employerPfContribution: payrollData.employerPfContribution,
              esi: payrollData.esi,
              tax: payrollData.tax,
              professionalTax: payrollData.professionalTax,
              gratuity: payrollData.gratuity,
              volunteerPF: payrollData.volunteerPF,
              totalEarnings: payrollData.totalEarnings,
              totalDeductions: payrollData.totalDeductions,
              netSalary: payrollData.netSalary,
              ctc: payrollData.ctc
            }
          }
        );
      }
    }

    res.status(201).json(compensation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 🔄 SYNC ALL EMPLOYEES TO COMPENSATION MASTER
router.post("/sync-all", async (req, res) => {
  try {
    const employees = await Employee.find({ status: { $in: ["Active", "ACTIVE"] } });
    const existingComp = await Compensation.find();
    const existingCompMap = new Set(existingComp.map(c => String(c.employeeId || '').toLowerCase()));
    
    const payrolls = await Payroll.find();
    const payrollMap = new Map(payrolls.map(p => [String(p.employeeId || '').toLowerCase(), p]));

    const created = [];
    for (const emp of employees) {
      const empIdKey = String(emp.employeeId || '').toLowerCase();
      if (!empIdKey || existingCompMap.has(empIdKey)) continue;

      const pRec = payrollMap.get(empIdKey);
      
      const basic = Number(emp.basicDA || emp.basic || pRec?.basicDA || 0);
      const hra = Number(emp.hra || pRec?.hra || (basic > 0 ? Math.round(basic * 0.5) : 0));
      const special = Number(emp.specialAllowance || pRec?.specialAllowance || 0);
      const empPF = Number(emp.employeePfContribution || emp.pfDeduction || pRec?.employeePfContribution || (basic > 0 ? (basic < 15000 ? Math.round(basic * 0.12) : 1800) : 0));
      const emprPF = Number(emp.employerPfContribution || pRec?.employerPfContribution || (basic > 0 ? (basic < 15000 ? Math.round(basic * 0.13) + 150 : 1950) : 0));
      const esi = Number(emp.esi || pRec?.esi || 0);
      const tax = Number(emp.tax || pRec?.tax || 0);
      const pt = Number(emp.professionalTax || pRec?.professionalTax || 0);
      const volunteerPF = Number(emp.volunteerPF || pRec?.volunteerPF || 0);
      const gratuity = Number(emp.gratuity || pRec?.gratuity || Math.round(basic * 0.0486));

      const grossSum = basic + hra + special + empPF + emprPF + esi;
      const gross = grossSum > 0 ? grossSum : (pRec?.totalEarnings || emp.totalEarnings || emp.gross || 0);
      const ctc = gross + gratuity;

      const compBody = {
        employeeId: emp.employeeId,
        name: emp.name,
        designation: emp.designation || pRec?.designation || 'Staff',
        department: emp.department || emp.division || pRec?.department || 'General',
        location: emp.location || emp.address || pRec?.location || 'Chennai',
        effectiveDate: emp.dateOfJoining || emp.dateofjoin || new Date().toISOString().slice(0, 10),
        gross,
        basicDA: basic,
        hra,
        specialAllowance: special,
        employeePfContribution: empPF,
        employerPfContribution: emprPF,
        esi,
        tax,
        professionalTax: pt,
        volunteerPF,
        gratuity,
        netSalary: (basic + hra + special) - tax - pt - volunteerPF,
        ctc,
        status: "Active"
      };

      const newComp = await Compensation.create(compBody);
      created.push(newComp);
    }

    res.json({
      success: true,
      message: `Synced ${created.length} employees into Compensation Master`,
      count: created.length,
      created
    });
  } catch (error) {
    console.error("Error syncing employees to compensation:", error);
    res.status(500).json({ success: false, message: error.message });
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
    // Optional: Log if employee is not active, but don't block the update
    // Compensation Master is often used for F&F for exited employees
    const employee = await findEmployee(req.body.employeeId, req.body.name);


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

      // Sync dateOfJoining and salary details back to Employee if effectiveDate is set
      if (updated.effectiveDate) {
        await Employee.findOneAndUpdate(
          { employeeId: employee.employeeId },
          {
            $set: {
              dateOfJoining: employee.dateOfJoining || updated.effectiveDate,
              basicDA: payrollData.basicDA,
              hra: payrollData.hra,
              specialAllowance: payrollData.specialAllowance,
              employeePfContribution: payrollData.employeePfContribution,
              employerPfContribution: payrollData.employerPfContribution,
              esi: payrollData.esi,
              tax: payrollData.tax,
              professionalTax: payrollData.professionalTax,
              gratuity: payrollData.gratuity,
              volunteerPF: payrollData.volunteerPF,
              totalEarnings: payrollData.totalEarnings,
              totalDeductions: payrollData.totalDeductions,
              netSalary: payrollData.netSalary,
              ctc: payrollData.ctc
            }
          }
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
