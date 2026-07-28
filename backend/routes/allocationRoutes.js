const router = require("express").Router();
const Allocation = require("../models/Allocation");
const Project = require("../models/Project");
const Employee = require("../models/Employee");

// Helper for case-insensitive exact regex match
const exactRegex = (str) => new RegExp(`^${String(str || '').trim()}$`, "i");

// GET project code by project name
router.get("/project-code/:projectName", async (req, res) => {
  try {
    const rawName = decodeURIComponent(req.params.projectName);
    const project = await Project.findOne({ name: exactRegex(rawName) });
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json({ projectCode: project.code, division: project.division, branch: project.branch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE ALLOCATION
router.post("/", async (req, res) => {
  try {
    const { projectId, projectCode, projectName, employeeName, employeeCode } = req.body;

    let project = null;
    if (projectId) {
      project = await Project.findById(projectId);
    }
    if (!project && projectCode) {
      project = await Project.findOne({ code: exactRegex(projectCode) });
    }
    if (!project && projectName) {
      project = await Project.findOne({ name: exactRegex(projectName) });
    }

    let employee = null;
    if (employeeCode) {
      employee = await Employee.findOne({ employeeId: exactRegex(employeeCode) });
    }
    if (!employee && employeeName) {
      employee = await Employee.findOne({ name: exactRegex(employeeName) });
    }

    if (!project) return res.status(400).json({ error: "Project not found" });
    if (!employee) return res.status(400).json({ error: "Employee not found" });

    // Prevent duplicate allocation (same project + employee)
    const existing = await Allocation.findOne({
      projectId: project._id,
      $or: [
        { employeeId: employee._id },
        { employeeCode: exactRegex(employee.employeeId) }
      ]
    }).lean();
    if (existing) {
      return res.status(400).json({ error: "Duplicate allocation detected for this project and employee" });
    }

    req.body.projectId = project._id;
    req.body.projectName = project.name;
    req.body.projectCode = project.code;
    req.body.projectDivision = project.division;

    req.body.employeeId = employee._id;
    req.body.employeeCode = employee.employeeId;
    req.body.employeeName = employee.name;

    const allocation = await Allocation.create(req.body);

    res.json(allocation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET ALL
router.get("/", async (req, res) => {
  try {
    const list = await Allocation.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    await Allocation.findByIdAndDelete(req.params.id);
    res.json({ message: "Allocation deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE ALLOCATION
router.put("/:id", async (req, res) => {
  try {
    const { projectId, projectCode, projectName, employeeName, employeeCode } = req.body;

    let project = null;
    if (projectId) {
      project = await Project.findById(projectId);
    }
    if (!project && projectCode) {
      project = await Project.findOne({ code: exactRegex(projectCode) });
    }
    if (!project && projectName) {
      project = await Project.findOne({ name: exactRegex(projectName) });
    }
    if (!project) return res.status(400).json({ error: "Project not found" });

    let employee = null;
    if (employeeCode) {
      employee = await Employee.findOne({ employeeId: exactRegex(employeeCode) });
    }
    if (!employee && employeeName) {
      employee = await Employee.findOne({ name: exactRegex(employeeName) });
    }
    if (!employee) return res.status(400).json({ error: "Employee not found" });

    // Get existing allocation to preserve role if not provided
    const existingAllocation = await Allocation.findById(req.params.id);
    if (!existingAllocation) {
      return res.status(404).json({ error: "Allocation not found" });
    }

    // Prevent duplicate allocation on update (same project + employee, different record)
    const dup = await Allocation.findOne({
      projectId: project._id,
      $or: [
        { employeeId: employee._id },
        { employeeCode: exactRegex(employee.employeeId) }
      ],
      _id: { $ne: existingAllocation._id }
    }).lean();
    if (dup) {
      return res.status(400).json({ error: "Duplicate allocation detected for this project and employee" });
    }

    // Update the allocation with new data, preserving role if not provided
    const updateData = {
      ...req.body,
      projectId: project._id,
      projectName: project.name,
      projectCode: project.code,
      projectDivision: project.division,
      employeeId: employee._id,
      employeeCode: employee.employeeId,
      employeeName: employee.name,
    };

    // Only update role if it's explicitly provided in the request
    if (req.body.role === undefined || req.body.role === null) {
      updateData.role = existingAllocation.role;
    }

    const updatedAllocation = await Allocation.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json(updatedAllocation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

