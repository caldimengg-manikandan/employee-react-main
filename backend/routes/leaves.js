const express = require('express');
const auth = require('../middleware/auth');
const LeaveApplication = require('../models/LeaveApplication');
const Employee = require('../models/Employee');

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

function monthsBetween(startDate) {
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return 0;
  const now = new Date();
  const years = now.getFullYear() - start.getFullYear();
  const months = now.getMonth() - start.getMonth();
  const total = years * 12 + months;
  return Math.max(0, total);
}

function toLower(s) {
  return String(s || '').toLowerCase();
}

function calcBalanceForEmployee(emp, used = { CL: 0, SL: 0, PL: 0 }) {
  const position = emp.position || emp.role || '';
  const doj = emp.dateOfJoining || emp.hireDate || emp.createdAt;
  const mos = monthsBetween(doj);
  const isTrainee = toLower(position) === 'trainee' || toLower(position).includes('trainee');

  // Derive trainee months from previous organizations if present
  let traineeMonths = 0;
  if (Array.isArray(emp.previousOrganizations) && emp.previousOrganizations.length > 0) {
    const traineeOrg = emp.previousOrganizations.find((o) => toLower(o.position).includes('trainee'));
    if (traineeOrg && (traineeOrg.startDate || doj)) {
      const start = traineeOrg.startDate || doj;
      const end = traineeOrg.endDate || new Date();
      const totalMonths = monthsBetween(start);
      traineeMonths = Math.min(12, totalMonths);
    }
  }
  if (isTrainee) {
    traineeMonths = Math.min(12, mos);
  }
  const regularMonths = isTrainee ? 0 : Math.max(0, mos - traineeMonths);

  let casual = 0, sick = 0, privilege = 0;
  // Trainee accrual: 1 PL per month up to 12 months
  privilege += traineeMonths * 1;
  // Regular accrual: 2.25 days/month split
  casual += regularMonths * 0.5;
  sick += regularMonths * 0.5;
  privilege += regularMonths * 1.25;

  const allocated = {
    casual: Math.round(casual * 10) / 10,
    sick: Math.round(sick * 10) / 10,
    privilege: Math.round(privilege * 10) / 10
  };
  const balance = {
    casual: Math.max(0, Math.round((allocated.casual - (used.CL || 0)) * 10) / 10),
    sick: Math.max(0, Math.round((allocated.sick - (used.SL || 0)) * 10) / 10),
    privilege: Math.max(0, Math.round((allocated.privilege - (used.PL || 0)) * 10) / 10)
  };
  const totalBalance = Math.max(0, Math.round((balance.casual + balance.sick + balance.privilege) * 10) / 10);

  return {
    employeeId: emp.employeeId || '',
    name: emp.name || emp.employeename || '',
    position: emp.position || emp.role || '',
    division: emp.division || '',
    monthsOfService: mos,
    traineeMonths,
    regularMonths,
    balances: {
      casual: { allocated: allocated.casual, used: used.CL || 0, balance: balance.casual },
      sick: { allocated: allocated.sick, used: used.SL || 0, balance: balance.sick },
      privilege: { allocated: allocated.privilege, used: used.PL || 0, balance: balance.privilege },
      totalBalance
    }
  };
}

// Leave balance for all employees or by employeeId
router.get('/balance', auth, async (req, res) => {
  try {
    const { employeeId } = req.query;
    // Fetch employees
    const filter = employeeId ? { employeeId } : {};
    const employees = await Employee.find(filter).sort({ name: 1 }).lean();
    // Aggregate used leaves per employeeId
    const empIds = employees.map(e => e.employeeId).filter(Boolean);
    const usedMap = {};
    if (empIds.length > 0) {
      const approvals = await LeaveApplication.aggregate([
        { $match: { employeeId: { $in: empIds }, status: 'Approved' } },
        { $group: { _id: { employeeId: '$employeeId', leaveType: '$leaveType' }, days: { $sum: '$totalDays' } } }
      ]);
      for (const rec of approvals) {
        const id = rec._id.employeeId;
        const type = rec._id.leaveType;
        if (!usedMap[id]) usedMap[id] = { CL: 0, SL: 0, PL: 0 };
        if (type === 'CL') usedMap[id].CL += rec.days;
        else if (type === 'SL') usedMap[id].SL += rec.days;
        else if (type === 'PL') usedMap[id].PL += rec.days;
      }
    }
    const result = employees.map(emp => calcBalanceForEmployee(emp, usedMap[emp.employeeId] || { CL: 0, SL: 0, PL: 0 }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
