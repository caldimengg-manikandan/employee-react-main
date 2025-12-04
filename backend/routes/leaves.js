const express = require('express');
const auth = require('../middleware/auth');
const LeaveApplication = require('../models/LeaveApplication');

const router = express.Router();

function countWorkingDays(startDate, endDate, dayType) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (isNaN(s) || isNaN(e) || s > e) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  if (dayType === 'Half Day' && count === 1) return 0.5;
  return count;
}

router.get('/my', auth, async (req, res) => {
  try {
    const items = await LeaveApplication.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { leaveType, startDate, endDate, dayType, reason, bereavementRelation, totalDays } = req.body;
    const computedDays = countWorkingDays(startDate, endDate, dayType);
    const finalDays = typeof totalDays === 'number' && totalDays > 0 ? totalDays : computedDays;
    const created = await LeaveApplication.create({
      userId: req.user._id,
      employeeId: req.user.employeeId || '',
      leaveType,
      startDate,
      endDate,
      dayType,
      totalDays: finalDays,
      reason: reason || '',
      bereavementRelation: bereavementRelation || ''
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

