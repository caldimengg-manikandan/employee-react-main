const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');

/**
 * @desc    Get all payroll snapshots for a specific financial year
 * @route   GET /api/payroll/snapshot/:fy
 * @access  Private
 */
router.get('/snapshot/:fy', auth, async (req, res) => {
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
 * @access  Private
 */
router.get('/snapshot/:fy/:employeeId', auth, async (req, res) => {
  try {
    const { fy, employeeId } = req.params;
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
