const express = require('express');
const { body, validationResult } = require('express-validator');
const Attendance = require('../models/Attendance');
const { auth, requirePermission } = require('../middleware/auth');
const moment = require('moment');

const router = express.Router();

// Punch in/out
router.post('/punch', [
  auth,
  requirePermission('timesheet_access'),
  body('type').isIn(['in', 'out'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { type, notes } = req.body;
    const today = moment().startOf('day').toDate();

    let attendance = await Attendance.findOne({
      userId: req.user._id,
      date: today
    });

    if (!attendance) {
      attendance = new Attendance({
        userId: req.user._id,
        employeeId: req.user.employeeId,
        date: today,
        status: 'present'
      });
    }

    const now = new Date();

    if (type === 'in') {
      if (attendance.punchIn) {
        return res.status(400).json({ message: 'Already punched in for today' });
      }
      attendance.punchIn = now;
    } else if (type === 'out') {
      if (!attendance.punchIn) {
        return res.status(400).json({ message: 'Please punch in first' });
      }
      if (attendance.punchOut) {
        return res.status(400).json({ message: 'Already punched out for today' });
      }
      attendance.punchOut = now;
    }

    if (notes) {
      attendance.notes = notes;
    }

    await attendance.save();

    res.json({
      success: true,
      message: `Punched ${type} successfully at ${now.toLocaleTimeString()}`,
      attendance
    });
  } catch (error) {
    console.error('Punch error:', error);
    res.status(500).json({ message: 'Server error during punch operation' });
  }
});

// Get attendance records
router.get('/', auth, requirePermission('timesheet_access'), async (req, res) => {
  try {
    const { userId, startDate, endDate, page = 1, limit = 30 } = req.query;
    const targetUserId = userId || req.user._id;

    // Check permissions
    if (userId && userId !== req.user._id.toString() && !req.user.permissions.includes('employee_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filter = { userId: targetUserId };
    
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendances = await Attendance.find(filter)
      .populate('userId', 'name email employeeId department')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(filter);

    res.json({
      success: true,
      count: attendances.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: attendances
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Server error while fetching attendance records' });
  }
});

// Get today's attendance status
router.get('/today', auth, requirePermission('timesheet_access'), async (req, res) => {
  try {
    const today = moment().startOf('day').toDate();

    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: today
    });

    res.json({
      success: true,
      data: attendance || null
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({ message: 'Server error while fetching today\'s attendance' });
  }
});

// Get user's own attendance
router.get('/my-attendance', auth, requirePermission('timesheet_access'), async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 30 } = req.query;

    const filter = { userId: req.user._id };
    
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendances = await Attendance.find(filter)
      .populate('userId', 'name email employeeId department')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(filter);

    res.json({
      success: true,
      count: attendances.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: attendances
    });
  } catch (error) {
    console.error('Get my attendance error:', error);
    res.status(500).json({ message: 'Server error while fetching attendance records' });
  }
});

module.exports = router;