const router = require("express").Router();
const mongoose = require("mongoose");
const Project = require("../models/Project");
const Allocation = require("../models/Allocation");
const ProjectAuditLog = require("../models/ProjectAuditLog");
const { validateProject } = require("../middleware/validation");

// CREATE
router.post("/", validateProject, async (req, res) => {
  try {
    // Prevent duplicate project by name + division
    const exists = await Project.findOne({
      name: req.body.name,
      division: req.body.division
    }).lean();
    if (exists) {
      return res.status(400).json({ error: "Project with same name and division already exists" });
    }
    const s = new Date(req.body.startDate);
    const e = new Date(req.body.endDate);
    if (isFinite(s) && isFinite(e) && e < s) {
      return res.status(400).json({ error: "End Date must be on or after Start Date" });
    }
    const project = await Project.create(req.body);
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET ALL
router.get("/", async (req, res) => {
  try {
    const list = await Project.find().sort({ createdAt: -1 }).lean();
    const normalized = list.map(item => ({
      ...item,
      projectCategory: item.projectCategory || "Product"
    }));
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET AUDIT LOGS FOR ALL PROJECTS
router.get("/audit-logs", async (req, res) => {
  try {
    const logs = await ProjectAuditLog.find()
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET AUDIT LOGS FOR SPECIFIC PROJECT
router.get("/:id/audit-logs", async (req, res) => {
  try {
    const { id } = req.params;
    let query = {};
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ projectId: id }, { projectCode: id }] };
    } else {
      query = { projectCode: id };
    }
    const logs = await ProjectAuditLog.find(query)
      .sort({ createdAt: -1 })
      .lean();
    res.json(Array.isArray(logs) ? logs : []);
  } catch (err) {
    console.error("Error fetching project audit logs:", err);
    res.json([]);
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    const existingProject = await Project.findById(req.params.id);
    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Prevent duplicates on update (name + division must be unique)
    const dup = await Project.findOne({
      name: req.body.name,
      division: req.body.division,
      _id: { $ne: req.params.id }
    }).lean();
    if (dup) {
      return res.status(400).json({ error: "Project with same name and division already exists" });
    }
    const s = new Date(req.body.startDate);
    const e = new Date(req.body.endDate);
    if (isFinite(s) && isFinite(e) && e < s) {
      return res.status(400).json({ error: "End Date must be on or after Start Date" });
    }
    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (updated) {
      const updateFields = {
        projectName: updated.name,
        projectCode: updated.code,
        projectDivision: updated.division,
        projectCategory: updated.projectCategory || "Product"
      };
      if (updated.branch) {
        updateFields.branch = updated.branch;
      }
      const escapeRegex = (str) => String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
      const exactRegex = (str) => new RegExp(`^${escapeRegex(str)}$`, "i");

      const allocRes = await Allocation.updateMany(
        {
          $or: [
            { projectId: updated._id },
            { projectId: String(updated._id) },
            { projectCode: exactRegex(existingProject.code) },
            { projectCode: exactRegex(updated.code) },
            { projectName: exactRegex(existingProject.name) },
            { projectName: exactRegex(updated.name) }
          ]
        },
        { $set: updateFields }
      );

      // Audit log track changes
      const changes = [];
      const trackFields = ['name', 'code', 'division', 'branch', 'projectCategory', 'startDate', 'endDate', 'status'];
      trackFields.forEach(field => {
        const oldVal = existingProject[field] !== undefined && existingProject[field] !== null ? String(existingProject[field]) : '';
        const newVal = updated[field] !== undefined && updated[field] !== null ? String(updated[field]) : '';
        if (oldVal !== newVal) {
          changes.push({
            field,
            oldValue: existingProject[field] || '',
            newValue: updated[field] || ''
          });
        }
      });

      if (changes.length > 0) {
        const affectedAllocationsCount = allocRes.modifiedCount !== undefined ? allocRes.modifiedCount : (allocRes.nModified || 0);
        await ProjectAuditLog.create({
          projectId: updated._id,
          projectCode: updated.code,
          action: existingProject.name !== updated.name ? 'PROJECT_NAME_UPDATED' : 'PROJECT_UPDATED',
          oldProjectName: existingProject.name,
          newProjectName: updated.name,
          changes,
          affectedAllocationsCount,
          updatedBy: req.body.updatedBy || 'Admin',
          updatedById: req.body.updatedById || '',
          userRole: req.body.userRole || ''
        });
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const deletedProject = await Project.findByIdAndDelete(req.params.id);
    if (deletedProject) {
      const allocDelRes = await Allocation.deleteMany({
        $or: [
          { projectId: deletedProject._id },
          { projectCode: deletedProject.code },
          { projectName: deletedProject.name }
        ]
      });

      const updatedBy = req.body?.updatedBy || req.query?.updatedBy || 'Admin';
      const updatedById = req.body?.updatedById || req.query?.updatedById || '';
      const userRole = req.body?.userRole || req.query?.userRole || '';
      const affectedAllocationsCount = allocDelRes.deletedCount !== undefined ? allocDelRes.deletedCount : 0;

      await ProjectAuditLog.create({
        projectId: deletedProject._id,
        projectCode: deletedProject.code,
        action: 'PROJECT_DELETED',
        oldProjectName: deletedProject.name,
        newProjectName: `${deletedProject.name} (Deleted)`,
        changes: [
          { field: 'status', oldValue: deletedProject.status || 'Active', newValue: 'DELETED' },
          { field: 'division', oldValue: deletedProject.division || '', newValue: 'N/A' }
        ],
        affectedAllocationsCount,
        updatedBy,
        updatedById,
        userRole
      });
    }
    res.json({ message: "Project deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
