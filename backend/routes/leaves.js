const express = require('express');
const auth = require('../middleware/auth');
const LeaveApplication = require('../models/LeaveApplication');
const Employee = require('../models/Employee');

const router = express.Router();

function hasPermission(user, perm) {
  return Array.isArray(user?.permissions) && user.permissions.includes(perm);
}

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

function monthsBetweenRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate || new Date());
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
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
      const totalMonths = monthsBetweenRange(start, end);
      traineeMonths = Math.min(12, totalMonths);
    }
  }
  if (isTrainee) {
    traineeMonths = Math.min(12, mos);
  }
  const postTraineeMonths = Math.max(0, mos - traineeMonths);

  let casual = 0, sick = 0, privilege = 0;
  // Trainee accrual: 1 PL per month up to 12 months
  privilege += traineeMonths * 1;
  // Non-trainee rule based on DOJ:
  // First 6 months: PL 1/day per month
  // After 6 months: CL 0.5, SL 0.5, PL 1.25 per month
  const firstSix = Math.min(postTraineeMonths, 6);
  const afterSix = Math.max(postTraineeMonths - 6, 0);
  const plNonCarry = (traineeMonths * 1) + (firstSix * 1);
  const plCarry = afterSix * 1.25;
  privilege = plNonCarry + plCarry;
  casual += afterSix * 0.5;
  sick += afterSix * 0.5;

  const allocated = {
    casual: Math.round(casual * 10) / 10,
    sick: Math.round(sick * 10) / 10,
    privilege: Math.round(privilege * 10) / 10
  };
  // Apply used PL against non-carry first, then carry-forward portion
  const usedPL = Number(used.PL || 0);
  const nonCarryAfterUse = Math.max(0, plNonCarry - usedPL);
  const carryAfterUse = Math.max(0, plCarry - Math.max(0, usedPL - plNonCarry));
  const balance = {
    casual: Math.max(0, Math.round((allocated.casual - (used.CL || 0)) * 10) / 10),
    sick: Math.max(0, Math.round((allocated.sick - (used.SL || 0)) * 10) / 10),
    privilege: Math.max(0, Math.round((nonCarryAfterUse + carryAfterUse) * 10) / 10)
  };
  const totalBalance = Math.max(0, Math.round((balance.casual + balance.sick + balance.privilege) * 10) / 10);

  return {
    employeeId: emp.employeeId || '',
    name: emp.name || emp.employeename || '',
    position: emp.position || emp.role || '',
    division: emp.division || '',
    monthsOfService: mos,
    traineeMonths,
    regularMonths: postTraineeMonths,
    balances: {
      casual: { allocated: allocated.casual, used: used.CL || 0, balance: balance.casual },
      sick: { allocated: allocated.sick, used: used.SL || 0, balance: balance.sick },
      privilege: { 
        allocated: allocated.privilege, 
        used: used.PL || 0, 
        balance: balance.privilege,
        nonCarryAllocated: Math.round(plNonCarry * 10) / 10,
        carryAllocated: Math.round(plCarry * 10) / 10,
        carryForwardEligibleBalance: Math.round(carryAfterUse * 10) / 10
      },
      totalBalance
    }
  };
}

// Leave balance for all employees or by employeeId
router.get('/balance', auth, async (req, res) => {
  try {
    if (!hasPermission(req.user, 'leave_view')) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { employeeId } = req.query;
    // Fetch employees
    const filter = employeeId ? { employeeId } : {};
    const employees = await Employee.find(filter).sort({ name: 1 }).lean();
    // Aggregate used leaves per employeeId
    const empIds = employees.map(e => e.employeeId).filter(Boolean);
    const usedMap = {};
    try {
      if (empIds.length > 0) {
        const approvals = await LeaveApplication.find({ employeeId: { $in: empIds }, status: 'Approved' }).lean();
        for (const rec of approvals) {
          const id = rec.employeeId;
          const type = rec.leaveType;
          if (!usedMap[id]) usedMap[id] = { CL: 0, SL: 0, PL: 0 };
          const val = Number(rec.totalDays || 0);
          if (type === 'CL') usedMap[id].CL += val;
          else if (type === 'SL') usedMap[id].SL += val;
          else if (type === 'PL') usedMap[id].PL += val;
        }
      }
    } catch (_) {
      // If usage aggregation fails, continue with zero used
    }
    const result = employees.map(emp => calcBalanceForEmployee(emp, usedMap[emp.employeeId] || { CL: 0, SL: 0, PL: 0 }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: list leave applications with filters
router.get('/', auth, async (req, res) => {
  try {
    if (!hasPermission(req.user, 'leave_view')) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { startDate, endDate, employeeId, status, leaveType } = req.query;
    const filter = {};
    if (employeeId) filter.employeeId = employeeId;
    if (status && status !== 'all') filter.status = status;
    if (leaveType && leaveType !== 'all') filter.leaveType = leaveType;
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }
    const items = await LeaveApplication.find(filter).sort({ createdAt: -1 }).lean();
    const ids = Array.from(new Set(items.map(i => i.employeeId).filter(Boolean)));
    let empMap = {};
    if (ids.length > 0) {
      const emps = await Employee.find({ employeeId: { $in: ids } }).lean();
      empMap = emps.reduce((acc, e) => {
        acc[e.employeeId] = e;
        return acc;
      }, {});
    }
    const mapped = items.map(i => {
      const emp = empMap[i.employeeId] || {};
      return {
        ...i,
        employeeName: emp.name || emp.employeename || '',
        location: emp.location || emp.branch || ''
      };
    });
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: approve/reject leave
router.put('/:id/status', auth, async (req, res) => {
  try {
    if (!hasPermission(req.user, 'leave_manage')) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { status, rejectionReason } = req.body || {};
    const allowed = ['Approved', 'Rejected', 'Pending'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const updated = await LeaveApplication.findByIdAndUpdate(
      req.params.id,
      { status, ...(status === 'Rejected' ? { rejectionReason: rejectionReason || '' } : { rejectionReason: '' }) },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Leave application not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
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

// Update own leave application (only when Pending)
router.put('/:id', auth, async (req, res) => {
  try {
    const existing = await LeaveApplication.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: 'Leave application not found' });
    if (String(existing.userId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not allowed to edit this application' });
    }
    if (existing.status !== 'Pending') {
      return res.status(400).json({ error: 'Only Pending applications can be edited' });
    }
    const { leaveType, startDate, endDate, dayType, reason, bereavementRelation, totalDays } = req.body;
    const computedDays = countWorkingDays(startDate, endDate, dayType);
    const finalDays = typeof totalDays === 'number' && totalDays > 0 ? totalDays : computedDays;
    const updated = await LeaveApplication.findByIdAndUpdate(
      req.params.id,
      {
        leaveType: leaveType || existing.leaveType,
        startDate: startDate || existing.startDate,
        endDate: endDate || existing.endDate,
        dayType: dayType || existing.dayType,
        totalDays: finalDays || existing.totalDays,
        reason: typeof reason === 'string' ? reason : existing.reason,
        bereavementRelation: typeof bereavementRelation === 'string' ? bereavementRelation : existing.bereavementRelation
      },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete own leave application (only when Pending)
router.delete('/:id', auth, async (req, res) => {
  try {
    const existing = await LeaveApplication.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: 'Leave application not found' });
    if (String(existing.userId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not allowed to delete this application' });
    }
    if (existing.status !== 'Pending') {
      return res.status(400).json({ error: 'Only Pending applications can be deleted' });
    }
    await LeaveApplication.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
