const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Extension = require('../models/Extension');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');

// Middleware to authorize Super Admin and IT Admin ONLY
const isSuperAdminOrITAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized access' });
  }

  const role = String(req.user.role || '').trim().toLowerCase();
  const designation = String(req.user.designation || '').trim().toLowerCase();

  const isSuperAdmin = role === 'admin' || role === 'super_admin' || designation.includes('super admin');
  const isITAdmin = role === 'it_admin' || designation.includes('it admin');

  if (isSuperAdmin || isITAdmin) {
    return next();
  }

  return res.status(403).json({
    message: 'Access denied. Extension Master is accessible only by Super Admin and IT Admin.'
  });
};

/**
 * @route   GET /api/extensions/public
 * @desc    Public API to fetch active extension records for Phone Extension Directory
 * @access  Public
 */
router.get('/public', async (req, res) => {
  try {
    const { location } = req.query;
    let query = { status: 'Active' };
    if (location && location !== 'All') {
      query.location = location;
    }

    // Strictly select ONLY non-confidential fields: employeeName, department, designation, extensionNumber, location
    const activeExtensions = await Extension.find(query)
      .select('employeeName department designation extensionNumber location')
      .sort({ employeeName: 1 })
      .lean();

    res.json(activeExtensions);
  } catch (error) {
    console.error('Error fetching public extensions:', error);
    res.status(500).json({ message: 'Error fetching phone extension directory' });
  }
});

/**
 * @route   GET /api/extensions
 * @desc    Get all extensions (Active & Inactive) for Extension Master
 * @access  Private (Super Admin & IT Admin)
 */
router.get('/', auth, isSuperAdminOrITAdmin, async (req, res) => {
  try {
    const { location } = req.query;
    let query = {};
    if (location && location !== 'All') {
      query.location = location;
    }

    const extensions = await Extension.find(query).sort({ employeeName: 1 }).lean();
    res.json(extensions);
  } catch (error) {
    console.error('Error fetching extensions:', error);
    res.status(500).json({ message: 'Error fetching extensions' });
  }
});

/**
 * @route   POST /api/extensions
 * @desc    Add a new phone extension
 * @access  Private (Super Admin & IT Admin)
 */
router.post('/', auth, isSuperAdminOrITAdmin, async (req, res) => {
  try {
    const { employeeId, extensionNumber, location, status } = req.body;

    if (!employeeId || !extensionNumber) {
      return res.status(400).json({ message: 'Employee ID and Extension Number are required' });
    }

    // Lookup employee from Employee Master
    const emp = await Employee.findOne({
      $or: [
        { employeeId: String(employeeId).trim() },
        { _id: mongoose.Types.ObjectId.isValid(employeeId) ? employeeId : null }
      ]
    }).lean();

    const empName = (emp && (emp.name || emp.employeename)) || req.body.employeeName;
    const dept = (emp && (emp.department || emp.division)) || req.body.department || '';
    const desig = (emp && (emp.designation || emp.position)) || req.body.designation || '';
    const empLocation = (emp && (emp.location || emp.branch)) || location || 'Chennai';

    if (!empName) {
      return res.status(404).json({ message: 'Selected employee not found in Employee Master' });
    }

    const newExtension = new Extension({
      employeeId: emp ? emp.employeeId : String(employeeId),
      employeeName: empName,
      department: dept,
      designation: desig,
      extensionNumber: String(extensionNumber).trim(),
      location: empLocation,
      status: status || 'Active',
      createdBy: req.user.name || req.user.email || 'Admin',
      updatedBy: req.user.name || req.user.email || 'Admin'
    });

    await newExtension.save();
    res.status(201).json(newExtension);
  } catch (error) {
    console.error('Error creating extension:', error);
    res.status(500).json({ message: error.message || 'Error creating extension' });
  }
});

/**
 * @route   PUT /api/extensions/:id
 * @desc    Edit an existing extension
 * @access  Private (Super Admin & IT Admin)
 */
router.put('/:id', auth, isSuperAdminOrITAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId, extensionNumber, location, status } = req.body;

    let extension = await Extension.findById(id);
    if (!extension) {
      return res.status(404).json({ message: 'Extension record not found' });
    }

    if (employeeId) {
      const emp = await Employee.findOne({
        $or: [
          { employeeId: String(employeeId).trim() },
          { _id: mongoose.Types.ObjectId.isValid(employeeId) ? employeeId : null }
        ]
      }).lean();

      if (emp) {
        extension.employeeId = emp.employeeId;
        extension.employeeName = emp.name || emp.employeename;
        extension.department = emp.department || emp.division || '';
        extension.designation = emp.designation || emp.position || '';
        if (!location && (emp.location || emp.branch)) {
          extension.location = emp.location || emp.branch;
        }
      }
    }

    if (extensionNumber) {
      extension.extensionNumber = String(extensionNumber).trim();
    }
    if (location) {
      extension.location = location;
    }
    if (status) {
      extension.status = status;
    }

    extension.updatedBy = req.user.name || req.user.email || 'Admin';

    await extension.save();
    res.json(extension);
  } catch (error) {
    console.error('Error updating extension:', error);
    res.status(500).json({ message: 'Error updating extension' });
  }
});

/**
 * @route   PATCH /api/extensions/:id/status
 * @desc    Activate or deactivate extension
 * @access  Private (Super Admin & IT Admin)
 */
router.patch('/:id/status', auth, isSuperAdminOrITAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Active or Inactive' });
    }

    const extension = await Extension.findByIdAndUpdate(
      id,
      { status, updatedBy: req.user.name || req.user.email || 'Admin' },
      { new: true }
    );

    if (!extension) {
      return res.status(404).json({ message: 'Extension record not found' });
    }

    res.json(extension);
  } catch (error) {
    console.error('Error toggling status:', error);
    res.status(500).json({ message: 'Error toggling extension status' });
  }
});

/**
 * @route   DELETE /api/extensions/:id
 * @desc    Delete an extension record
 * @access  Private (Super Admin & IT Admin)
 */
router.delete('/:id', auth, isSuperAdminOrITAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const extension = await Extension.findByIdAndDelete(id);

    if (!extension) {
      return res.status(404).json({ message: 'Extension record not found' });
    }

    res.json({ message: 'Extension deleted successfully' });
  } catch (error) {
    console.error('Error deleting extension:', error);
    res.status(500).json({ message: 'Error deleting extension' });
  }
});

module.exports = router;
