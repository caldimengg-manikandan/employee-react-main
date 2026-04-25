const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const PayrollHistory = require('../models/PayrollHistory');
const Employee = require('../models/Employee');

// @desc    Get payroll history for an employee
// @route   GET /api/payroll/history/:employeeId
// @access  Private
router.get('/history/:employeeId', auth, async (req, res) => {
  try {
    const { fy } = req.query;
    const { employeeId } = req.params;

    // Check if user is requesting their own history or is an admin/hr
    const requestor = await Employee.findOne({ employeeId: req.user.employeeId });
    if (!requestor) {
      return res.status(404).json({ success: false, message: 'Requestor profile not found' });
    }

    const role = (req.user.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'hr' || role === 'director';

    if (req.user.employeeId !== employeeId && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this payroll history' });
    }

    let query = { employeeId };
    
    if (fy) {
      query.financialYear = fy;
    }

    const history = await PayrollHistory.find(query)
      .sort({ createdAt: -1 })
      .populate('appraisalId', 'status releaseDate');

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching payroll history:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

module.exports = router;
