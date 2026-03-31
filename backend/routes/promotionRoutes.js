const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Employee = require('../models/Employee');
const PromotionHistory = require('../models/PromotionHistory');
const SelfAppraisal = require('../models/SelfAppraisal');

function canPromote(user) {
  const role = String(user?.role || '').toLowerCase();
  const perms = Array.isArray(user?.permissions) ? user.permissions : [];
  if (perms.includes('reviewer_approval')) return true;
  if (perms.includes('employee_access')) return true;
  if (role === 'admin' || role === 'hr' || role === 'manager' || role === 'director') return true;
  return false;
}

function canViewHistory(user) {
  const role = String(user?.role || '').toLowerCase();
  const perms = Array.isArray(user?.permissions) ? user.permissions : [];
  // HR/Admin can view all, Employees can view their own
  if (perms.includes('employee_access')) return true;
  if (role === 'admin' || role === 'hr' || role === 'employee') return true;
  return false;
}

function canApprovePromotion(user) {
  const role = String(user?.role || '').toLowerCase();
  const perms = Array.isArray(user?.permissions) ? user.permissions : [];
  if (perms.includes('director_approval')) return true;
  if (role === 'director' || role === 'admin') return true;
  return false;
}

function parseFinancialYearRange(financialYear) {
  const raw = String(financialYear || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const startYear = Number(match[1]);
  const endTwo = Number(match[2]);
  const expectedEndTwo = (startYear + 1) % 100;
  if (endTwo !== expectedEndTwo) return null;
  const start = new Date(Date.UTC(startYear, 3, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(startYear + 1, 2, 31, 23, 59, 59, 999));
  return { start, end };
}

router.post('/promoteEmployee', auth, async (req, res) => {
  try {
    if (!canPromote(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const body = req.body || {};
    const employeeId = String(body.employeeId || '').trim();
    const newDesignation = String(body.newDesignation || '').trim();
    const effectiveDateRaw = body.effectiveDate;
    const remarks = String(body.remarks || '').trim();

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'employeeId is required' });
    }
    if (!newDesignation) {
      return res.status(400).json({ success: false, message: 'newDesignation is required' });
    }
    if (!effectiveDateRaw) {
      return res.status(400).json({ success: false, message: 'effectiveDate is required' });
    }

    const effectiveDate = new Date(effectiveDateRaw);
    if (Number.isNaN(effectiveDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid effectiveDate' });
    }

    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const existingPending = await PromotionHistory.findOne({ employeeId, status: 'Pending' }).lean();
    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: 'A promotion request is already pending for this employee'
      });
    }

    const oldDesignation = String(employee.designation || employee.position || employee.role || '').trim();
    const employeeName = String(employee.name || employee.employeename || body.employeeName || '').trim();

    const promotedBy =
      String(req.user?.name || '').trim() ||
      String(req.user?.employeeId || '').trim() ||
      String(req.user?.email || '').trim() ||
      'Unknown';

    const history = await PromotionHistory.create({
      employeeId,
      employeeName,
      oldDesignation,
      newDesignation,
      effectiveDate,
      remarks,
      promotedBy,
      division: String(employee.division || '').trim(),
      status: 'Pending'
    });

    return res.json({
      success: true,
      message: 'Promotion request submitted for director approval',
      data: {
        employeeId,
        employeeName,
        oldDesignation,
        newDesignation,
        effectiveDate,
        remarks,
        promotedBy,
        division: String(employee.division || '').trim(),
        status: history.status,
        historyId: history._id
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

router.get('/promotionRequests', auth, async (req, res) => {
  try {
    if (!canApprovePromotion(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const status = String(req.query.status || 'Pending').trim() || 'Pending';
    const division = String(req.query.division || '').trim();
    const search = String(req.query.search || '').trim();

    const query = { status };
    if (division) query.division = division;
    if (search) {
      query.$or = [
        { employeeName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const list = await PromotionHistory.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

router.put('/promotionRequests/:id/approve', auth, async (req, res) => {
  try {
    if (!canApprovePromotion(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const id = req.params.id;
    const history = await PromotionHistory.findById(id);
    if (!history) {
      return res.status(404).json({ success: false, message: 'Promotion request not found' });
    }
    if (history.status !== 'Pending') {
      return res.status(409).json({ success: false, message: `Cannot approve a ${history.status} request` });
    }

    const employee = await Employee.findOne({ employeeId: history.employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    employee.designation = history.newDesignation;
    employee.position = history.newDesignation;
    await employee.save();

    const approvedBy =
      String(req.user?.name || '').trim() ||
      String(req.user?.employeeId || '').trim() ||
      String(req.user?.email || '').trim() ||
      'Unknown';

    history.status = 'Approved';
    history.approvedBy = approvedBy;
    history.approvedAt = new Date();
    await history.save();

    return res.json({ success: true, message: 'Promotion approved', data: history.toObject() });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

router.put('/promotionRequests/:id/reject', auth, async (req, res) => {
  try {
    if (!canApprovePromotion(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const id = req.params.id;
    const history = await PromotionHistory.findById(id);
    if (!history) {
      return res.status(404).json({ success: false, message: 'Promotion request not found' });
    }
    if (history.status !== 'Pending') {
      return res.status(409).json({ success: false, message: `Cannot reject a ${history.status} request` });
    }

    const reason = String(req.body?.reason || '').trim();
    const approvedBy =
      String(req.user?.name || '').trim() ||
      String(req.user?.employeeId || '').trim() ||
      String(req.user?.email || '').trim() ||
      'Unknown';

    history.status = 'Rejected';
    history.approvedBy = approvedBy;
    history.approvedAt = new Date();
    if (reason) {
      history.remarks = history.remarks ? `${history.remarks} | Rejection: ${reason}` : `Rejection: ${reason}`;
    }
    await history.save();

    return res.json({ success: true, message: 'Promotion rejected', data: history.toObject() });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

router.get('/promotionHistory', auth, async (req, res) => {
  try {
    if (!canViewHistory(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const search = String(req.query.search || '').trim();
    const division = String(req.query.division || '').trim();
    const financialYear = String(req.query.financialYear || '').trim();
    const status = String(req.query.status || '').trim();

    const query = {};
    const role = String(req.user?.role || '').toLowerCase();
    const isHRorAdmin = role === 'hr' || role === 'admin';
    
    // If not HR/Admin, only show your own history
    if (!isHRorAdmin) {
      query.employeeId = req.user.employeeId;
    }

    if (division) query.division = division;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { employeeName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const range = financialYear ? parseFinancialYearRange(financialYear) : null;
    if (financialYear && !range) {
      return res.status(400).json({ success: false, message: 'Invalid financialYear' });
    }
    if (range) {
      query.effectiveDate = { $gte: range.start, $lte: range.end };
    }

    // Standard promotion history
    const list = await PromotionHistory.find(query).lean();

    // PROMOTION HISTORY FIX: Include Released & Accepted Appraisals with Recommendations
    const appraisalQuery = {
      status: { $in: ['released', 'accepted_pending_effect', 'effective'] },
      'promotion.recommended': true,
      'promotion.newDesignation': { $exists: true, $ne: '' }
    };
    if (!isHRorAdmin) {
      appraisalQuery.employeeId = req.user._id;
    }

    const appraisalList = await SelfAppraisal.find(appraisalQuery)
      .populate('employeeId', 'name employeeId division department designation');

    const formattedAppraisalPromotions = appraisalList.map(app => ({
      _id: app._id,
      employeeId: app.employeeId?.employeeId || 'EXT-000',
      employeeName: app.employeeId?.name || 'Unknown',
      oldDesignation: app.employeeId?.designation || 'Unknown',
      newDesignation: app.promotion?.newDesignation || 'Pending',
      effectiveDate: app.promotion?.effectiveDate || app.releaseDate || app.updatedAt,
      remarks: app.promotion?.remarksDirector || app.promotion?.remarksReviewer || '',
      promotedBy: app.director || 'Director',
      division: app.division || app.employeeId?.division || '',
      status: 'Approved',
      approvedBy: app.director || 'Director',
      approvedAt: app.releaseDate || app.updatedAt,
      type: 'appraisal'
    }));

    const combinedList = [...list, ...formattedAppraisalPromotions];

    combinedList.sort((a, b) => {
      const ad = new Date(a.effectiveDate).getTime();
      const bd = new Date(b.effectiveDate).getTime();
      if (bd !== ad) return bd - ad;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return res.json({ success: true, data: combinedList });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

router.get('/promotionHistory/me/latest', auth, async (req, res) => {
  try {
    const employeeId = String(req.user?.employeeId || '').trim();
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'employeeId not available' });
    }
    const status = String(req.query.status || 'Approved').trim() || 'Approved';
    const doc = await PromotionHistory.findOne({ employeeId, status })
      .sort({ effectiveDate: -1, createdAt: -1 })
      .lean();
    return res.json({ success: true, data: doc || null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

module.exports = router;
