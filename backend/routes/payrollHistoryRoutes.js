const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const PayrollHistory = require('../models/PayrollHistory');
const Employee = require('../models/Employee');
const mongoose = require('mongoose');

// @desc    Get bulk snapshot data for a specific financial year
// @route   GET /api/payroll/history/snapshot/:fy
// @access  Private (Admin only)
router.get('/history/snapshot/:fy', auth, async (req, res) => {
  try {
    const { fy } = req.params;
    const role = (req.user.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'hr' || role === 'director';

    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view company-wide snapshot' });
    }

    if (fy === '2024-25' || fy === '2025-26') {
       const collectionName = fy === '2024-25' ? 'payroll_FY24-25' : 'payroll_FY25-26';
       // We query the native raw DB since there's no fixed strict Mongoose model for these historic frozen copies.
       const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
       return res.json({ success: true, data });
    }
    
    return res.json({ success: true, data: [] });
  } catch (error) {
    console.error('Error fetching payroll snapshot:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});
// @desc    Get payroll history for an employee
// @route   GET /api/payroll/history/:employeeId
// @access  Private
router.get('/history/:employeeId', auth, async (req, res) => {
  try {
    const { fy } = req.query;
    const { employeeId } = req.params;
    console.log(`[PayrollHistoryAPI] GET /history/${employeeId}?fy=${fy || 'All'}`);

    const role = (req.user.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'hr' || role === 'director';

    if (req.user.employeeId !== employeeId && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this payroll history' });
    }

    // 🔍 1. Resolve string employeeId to actual Employee _id
    const targetEmployee = await Employee.findOne({ employeeId: employeeId });
    if (!targetEmployee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    let query = { employeeId: targetEmployee._id };
    
    if (fy) {
      query.financialYear = fy;
    }

    // 🔍 2. Fetch history with populated appraisal data
    const rawHistory = await PayrollHistory.find(query)
      .sort({ effectiveFrom: -1 })
      .populate('appraisalId', 'currentSalarySnapshot revisedSalary incrementPercentage incrementAmount performancePay status');

    // 🔍 3. Transform for Frontend (Mapping backend fields to UI labels)
    const history = rawHistory.map(record => {
        // If coming from appraisal, use snapshots; else use baseline values
        const appraisal = record.appraisalId || {};
        const isInitial = record.source === 'manual';
        
        return {
            _id: record._id,
            financialYear: record.financialYear,
            previousCTC: isInitial ? record.salary : (appraisal.currentSalarySnapshot || 0),
            revisedCTC: record.salary || appraisal.revisedSalary || 0,
            incrementPercentage: appraisal.incrementPercentage || 0,
            incrementAmount: appraisal.incrementAmount || 0,
            performancePay: appraisal.performancePay || 0,
            status: isInitial ? 'BASE' : (record.effectiveTo ? 'PAST' : 'ACTIVE'),
            source: record.source,
            effectiveFrom: record.effectiveFrom,
            effectiveTo: record.effectiveTo
        };
    });

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching payroll history:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

module.exports = router;
