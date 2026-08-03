const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const Team = require('../models/Team');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Allocation = require('../models/Allocation');
const auth = require('../middleware/auth');

// Helper function to resolve all team member User ObjectIds for a logged-in user
async function getTeamMemberUserIds(user) {
  const userEmpId = user?.employeeId;
  const userName = user?.name;

  const memberEmpIds = new Set();

  // 1. Members from Team collection where leader is this user
  if (userEmpId) {
    const leaderTeams = await Team.find({ leaderEmployeeId: userEmpId }).select('members').lean();
    for (const t of leaderTeams) {
      if (Array.isArray(t.members)) {
        t.members.forEach(m => { if (m) memberEmpIds.add(m); });
      }
    }
  }

  // 2. Members from Allocation collection where assignedBy is this user
  if (userEmpId || userName) {
    const allocConditions = [];
    if (userEmpId) allocConditions.push({ assignedBy: userEmpId });
    if (userName) allocConditions.push({ assignedBy: userName });
    if (allocConditions.length > 0) {
      const allocs = await Allocation.find({ $or: allocConditions }).select('employeeCode').lean();
      allocs.forEach(a => { if (a.employeeCode) memberEmpIds.add(a.employeeCode); });
    }
  }

  // 3. Members from Employee collection where reportingManager matches this user
  if (userEmpId || userName) {
    const empConditions = [];
    if (userEmpId) empConditions.push({ reportingManager: userEmpId });
    if (userName) empConditions.push({ reportingManager: userName });
    if (empConditions.length > 0) {
      const emps = await Employee.find({ $or: empConditions }).select('employeeId').lean();
      emps.forEach(e => { if (e.employeeId) memberEmpIds.add(e.employeeId); });
    }
  }

  // Convert member employeeIds to User ObjectIds
  let teamUserIds = [];
  if (memberEmpIds.size > 0) {
    const teamUsers = await User.find({ employeeId: { $in: Array.from(memberEmpIds) } }).select('_id').lean();
    teamUserIds = teamUsers.map(u => u._id);
  }

  return {
    memberEmpIds: Array.from(memberEmpIds),
    teamUserIds
  };
}

// Helper to check if user has top-level executive/admin role (Admin, Director, HR)
const checkIsTopLevelAdmin = (user) => {
  const roleLower = String(user?.role || '').toLowerCase();
  const designationLower = String(user?.designation || '').toLowerCase();
  return (
    ['admin', 'director', 'hr'].includes(roleLower) ||
    designationLower.includes('general manager') ||
    designationLower.includes('gm') ||
    designationLower.includes('director')
  );
};

// Get all notifications
// - Regular Employees see ONLY their own notifications (recipient: userId)
// - Reporting Managers see their own notifications + all notifications of their team members
// - Top-level Admins/HR/Directors see system-wide notifications
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const isTopAdmin = checkIsTopLevelAdmin(req.user);

    let query = {};

    if (isTopAdmin) {
      // Top Admin / Director / HR sees system-wide notifications
      query = {};
    } else {
      // Resolve team members for this user (if reporting manager / project manager / team lead)
      const { teamUserIds } = await getTeamMemberUserIds(req.user);

      if (teamUserIds.length > 0) {
        // Reporting Manager sees:
        // 1. Notifications sent to the manager themselves
        // 2. Notifications sent to or from any of their team members
        query = {
          $or: [
            { recipient: userId },
            { sender: userId },
            { recipient: { $in: teamUserIds } },
            { sender: { $in: teamUserIds } }
          ]
        };
      } else {
        // Regular Employee: ONLY sees notifications sent directly to them
        query = { recipient: userId };
      }
    }

    const notifications = await Notification.find(query)
      .populate('sender', 'name email employeeId')
      .populate('recipient', 'name email employeeId')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark a notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const isTopAdmin = checkIsTopLevelAdmin(req.user);

    let query = { _id: req.params.id };

    if (!isTopAdmin) {
      const { teamUserIds } = await getTeamMemberUserIds(req.user);
      if (teamUserIds.length > 0) {
        query.$or = [
          { recipient: userId },
          { recipient: { $in: teamUserIds } }
        ];
      } else {
        query.recipient = userId;
      }
    }

    const notification = await Notification.findOne(query);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read
router.put('/read-all', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const isTopAdmin = checkIsTopLevelAdmin(req.user);

    let query = { isRead: false };

    if (!isTopAdmin) {
      const { teamUserIds } = await getTeamMemberUserIds(req.user);
      if (teamUserIds.length > 0) {
        query.$or = [
          { recipient: userId },
          { recipient: { $in: teamUserIds } }
        ];
      } else {
        query.recipient = userId;
      }
    }

    await Notification.updateMany(query, { $set: { isRead: true } });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const isTopAdmin = checkIsTopLevelAdmin(req.user);

    let query = { _id: req.params.id };

    if (!isTopAdmin) {
      const { teamUserIds } = await getTeamMemberUserIds(req.user);
      if (teamUserIds.length > 0) {
        query.$or = [
          { recipient: userId },
          { recipient: { $in: teamUserIds } }
        ];
      } else {
        query.recipient = userId;
      }
    }

    const notification = await Notification.findOneAndDelete(query);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
