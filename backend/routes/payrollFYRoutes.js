const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleAuth');

/**
 * @desc    Get all payroll snapshots for a specific financial year
 * @route   GET /api/payroll/snapshot/:fy
 * @access  Private (Admin, HR, Finance, Director, Project Manager)
 */
router.get('/snapshot/:fy', auth, authorizeRoles('admin', 'hr', 'finance', 'director', 'manager', 'projectmanager'), async (req, res) => {
  try {
    const { fy } = req.params;
    const collectionName = `payroll_FY${fy}`;

    const db = mongoose.connection.db;
    const snapshots = await db.collection(collectionName).find({}).toArray();

    res.json({
      success: true,
      data: snapshots
    });
  } catch (error) {
    console.error('Error fetching FY snapshots:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * @desc    Get payroll snapshot for a specific financial year and employee
 * @route   GET /api/payroll/snapshot/:fy/:employeeId
 * @access  Private (Privileged roles or snapshot owner)
 */
router.get('/snapshot/:fy/:employeeId', auth, async (req, res) => {
  try {
    const { fy, employeeId } = req.params;

    const privilegedRoles = ['admin', 'hr', 'finance', 'director', 'projectmanager', 'manager'];
    const userRole = String(req.user?.role || '').toLowerCase();

    if (!privilegedRoles.includes(userRole)) {
      if (!req.user?.employeeId || String(req.user.employeeId).toLowerCase() !== String(employeeId).toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Cannot view financial year snapshot of another employee.'
        });
      }
    }

    const collectionName = `payroll_FY${fy}`; // e.g., payroll_FY24-25

    const db = mongoose.connection.db;
    const snapshot = await db.collection(collectionName).findOne({
      employeeId: { $regex: new RegExp(`^${employeeId}$`, 'i') }
    });

    if (!snapshot) {
      return res.status(404).json({
        success: false,
        message: `Snapshot for ${employeeId} not found in ${collectionName}`
      });
    }

    res.json({
      success: true,
      data: snapshot
    });
  } catch (error) {
    console.error('Error fetching FY snapshot:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;

