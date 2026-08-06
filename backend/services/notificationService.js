const Notification = require('../models/Notification');
const Team = require('../models/Team');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Allocation = require('../models/Allocation');

/**
 * Check if logged-in user is a top-level admin (Admin, HR, Director, General Manager)
 */
function checkIsTopAdmin(user) {
  const roleLower = String(user?.role || '').toLowerCase();
  const designationLower = String(user?.designation || '').toLowerCase();
  return (
    ['admin', 'director', 'hr'].includes(roleLower) ||
    designationLower.includes('general manager') ||
    designationLower.includes('gm') ||
    designationLower.includes('director')
  );
}

/**
 * Resolve all assigned team member User ObjectIds for a manager/team lead
 */
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

  let teamUserIds = [];
  if (memberEmpIds.size > 0) {
    const teamUsers = await User.find({ employeeId: { $in: Array.from(memberEmpIds) } }).select('_id').lean();
    teamUserIds = teamUsers.map(u => u._id);
  }

  return teamUserIds;
}

/**
 * Build recipient/role based visibility query
 */
async function getNotificationQueryForUser(user) {
  const userId = user._id || user.id;
  const isTopAdmin = checkIsTopAdmin(user);

  if (isTopAdmin) {
    // Top Admins see system-wide notifications
    return {};
  }

  const teamUserIds = await getTeamMemberUserIds(user);
  if (teamUserIds.length > 0) {
    // Reporting Manager sees notifications for self + assigned team members
    return { recipient: { $in: [userId, ...teamUserIds] } };
  }

  // Regular Employee sees ONLY notifications where recipient is themselves
  return { recipient: userId };
}

/**
 * Centralized Notification Creation & Upsert Service
 * Prevents duplicates by recipient, type, and relatedId
 */
async function createOrUpdateNotification({ recipient, title, message, type = 'OTHER', link, relatedId, sender }) {
  if (!recipient || !title || !message) {
    console.error('Notification creation failed: recipient, title, and message are required.');
    return null;
  }

  try {
    if (relatedId) {
      const existing = await Notification.findOne({ recipient, type, relatedId });
      if (existing) {
        existing.title = title;
        existing.message = message;
        if (link) existing.link = link;
        if (sender) existing.sender = sender;
        existing.isRead = false;
        existing.createdAt = new Date();
        await existing.save();
        return existing;
      }
    }

    const notif = await Notification.create({
      recipient,
      title,
      message,
      type,
      link,
      relatedId,
      sender,
      isRead: false,
      createdAt: new Date()
    });

    return notif;
  } catch (error) {
    console.error('Error in createOrUpdateNotification:', error);
    return null;
  }
}

/**
 * Get paginated notifications & unread count for user
 */
async function getNotificationsForUser(user, options = {}) {
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(options.limit, 10) || 50));
  const query = await getNotificationQueryForUser(user);

  const totalCount = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({ ...query, isRead: false });

  const notifications = await Notification.find(query)
    .populate('sender', 'name email employeeId')
    .populate('recipient', 'name email employeeId')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    notifications,
    unreadCount,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit) || 1
  };
}

/**
 * Mark a single notification as read by _id
 */
async function markAsRead(notificationId) {
  return await Notification.findByIdAndUpdate(
    notificationId,
    { $set: { isRead: true } },
    { new: true }
  );
}

/**
 * Mark all notifications visible to user as read
 */
async function markAllAsReadForUser(user) {
  const query = await getNotificationQueryForUser(user);
  return await Notification.updateMany({ ...query, isRead: false }, { $set: { isRead: true } });
}

/**
 * Delete a single notification by _id
 */
async function deleteNotification(notificationId) {
  return await Notification.findByIdAndDelete(notificationId);
}

module.exports = {
  checkIsTopAdmin,
  getTeamMemberUserIds,
  createOrUpdateNotification,
  getNotificationsForUser,
  markAsRead,
  markAllAsReadForUser,
  deleteNotification
};
