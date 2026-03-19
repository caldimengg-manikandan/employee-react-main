const express = require('express');
const auth = require('../middleware/auth');
const RegionalHoliday = require('../models/RegionalHoliday');

const router = express.Router();

const toUtcDayRange = (dateInput) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0));
  return { start, end };
};

const canManageRegionalHolidays = (user) => {
  const role = String(user?.role || '').toLowerCase();
  if (role === 'admin' || role === 'hr') return true;
  const perms = Array.isArray(user?.permissions) ? user.permissions : [];
  return perms.includes('leave_manage') || perms.includes('leave_view') || perms.includes('leave_summary');
};

router.get('/', auth, async (req, res) => {
  try {
    const items = await RegionalHoliday.find({ isActive: true }).sort({ date: 1, name: 1 }).lean();
    const mapped = items.map((h) => ({
      id: h._id,
      name: h.name,
      date: h.date,
      dateISO: h.date ? new Date(h.date).toISOString().slice(0, 10) : ''
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    if (!canManageRegionalHolidays(req.user)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const name = String(req.body?.name || '').trim();
    const dateISO = String(req.body?.date || '').trim();
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!dateISO) return res.status(400).json({ error: 'Date is required' });

    const range = toUtcDayRange(dateISO);
    if (!range) return res.status(400).json({ error: 'Invalid date' });

    const existing = await RegionalHoliday.findOne({
      name,
      date: { $gte: range.start, $lt: range.end }
    }).select('_id');
    if (existing) {
      return res.status(400).json({ error: 'Holiday already exists for this date' });
    }

    const created = await RegionalHoliday.create({
      name,
      date: range.start,
      isActive: true,
      createdBy: req.user?._id
    });

    res.status(201).json({
      id: created._id,
      name: created.name,
      date: created.date,
      dateISO: created.date ? new Date(created.date).toISOString().slice(0, 10) : ''
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!canManageRegionalHolidays(req.user)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const deleted = await RegionalHoliday.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
