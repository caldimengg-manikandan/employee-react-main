const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const { auth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Get all projects
router.get('/', auth, requirePermission('timesheet_access'), async (req, res) => {
  try {
    const projects = await Project.find({ isActive: true })
      .populate('projectManager', 'name email')
      .populate('teamMembers', 'name email employeeId')
      .sort({ name: 1 });

    res.json({
      success: true,
      count: projects.length,
      projects
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error while fetching projects' });
  }
});

// Create new project (Admin/Manager only)
router.post('/', [
  auth,
  requirePermission('employee_access'),
  body('name').notEmpty().trim(),
  body('code').notEmpty().trim(),
  body('client').notEmpty().trim(),
  body('startDate').isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const project = new Project({
      ...req.body,
      projectManager: req.user._id
    });

    await project.save();
    await project.populate('projectManager', 'name email');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Project name or code already exists' });
    }
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error while creating project' });
  }
});

module.exports = router;