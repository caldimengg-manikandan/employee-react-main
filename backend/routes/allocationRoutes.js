const router = require("express").Router();
const Allocation = require("../models/Allocation");
const Project = require("../models/Project");
const Employee = require("../models/Employee");

// CREATE ALLOCATION
router.post("/", async (req, res) => {
  try {
    const { projectName, employeeName } = req.body;

    const project = await Project.findOne({ name: projectName });
    const employee = await Employee.findOne({ name: employeeName });

    if (!project) return res.status(400).json({ error: "Project not found" });
    if (!employee) return res.status(400).json({ error: "Employee not found" });

    req.body.projectId = project._id;
    req.body.projectCode = project.code;
    req.body.projectDivision = project.division;

    req.body.employeeId = employee._id;
    req.body.employeeCode = employee.employeeId;

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

module.exports = router;
