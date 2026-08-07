const Notification = require('../models/Notification');
const Team = require('../models/Team');
const Employee = require('../models/Employee');
const User = require('../models/User');

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
 * Resolve assigned team member User ObjectIds strictly from Team Management
 * (Do NOT use Project Allocation for notification mapping)
 */
async function getTeamMemberUserIds(user) {
  const userEmpId = user?.employeeId;
  const userName = user?.name;
  const memberEmpIds = new Set();

  // 1. Members from Team collection (Team Management module) where leader is this user
  if (userEmpId) {
    const leaderTeams = await Team.find({ leaderEmployeeId: userEmpId }).select('members').lean();
    for (const t of leaderTeams) {
      if (Array.isArray(t.members)) {
        t.members.forEach(m => { if (m) memberEmpIds.add(m); });
      }
    }
  }

  // 2. Members from Employee collection where reportingManager is this user (Team Management hierarchy)
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
 * - Employees: Only their own notifications (recipient = userId)
 * - Reporting Managers / Admins: Their own notifications + team members mapped under them in Team Management
 */
async function getNotificationQueryForUser(user) {
  const userId = user._id || user.id;
  const teamUserIds = await getTeamMemberUserIds(user);

  if (teamUserIds.length > 0) {
    // Reporting Manager sees personal notifications + mapped team member notifications
    return { recipient: { $in: [userId, ...teamUserIds] } };
  }

  // Regular Employee / User sees ONLY notifications where recipient is themselves
  return { recipient: userId };
}

/**
 * Centralized Atomic Notification Creation & Upsert Service
 * Prevents duplicate notifications by recipient, type, and relatedId (or 10-second deduplication window)
 */
async function createOrUpdateNotification({ recipient, title, message, type = 'OTHER', link, relatedId, sender }) {
  if (!recipient || !title || !message) {
    console.error('Notification creation failed: recipient, title, and message are required.');
    return null;
  }

  try {
    if (relatedId) {
      // Atomic findOneAndUpdate with upsert: true ensures no duplicate records are created
      const updated = await Notification.findOneAndUpdate(
        { recipient, type, relatedId },
        {
          $set: {
            title,
            message,
            link: link || '',
            sender: sender || null,
            isRead: false,
            createdAt: new Date()
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return updated;
    }

    // 10-second deduplication window for notifications without relatedId
    const tenSecondsAgo = new Date(Date.now() - 10000);
    const recentDuplicate = await Notification.findOne({
      recipient,
      type,
      message,
      createdAt: { $gte: tenSecondsAgo }
    });

    if (recentDuplicate) {
      recentDuplicate.title = title;
      recentDuplicate.createdAt = new Date();
      await recentDuplicate.save();
      return recentDuplicate;
    }

    const notif = await Notification.create({
      recipient,
      title,
      message,
      type,
      link: link || '',
      relatedId: relatedId || null,
      sender: sender || null,
      isRead: false,
      createdAt: new Date()
    });

    return notif;
  } catch (error) {
    // Handle MongoDB duplicate key error (E11000) gracefully
    if (error.code === 11000 && relatedId) {
      return await Notification.findOneAndUpdate(
        { recipient, type, relatedId },
        {
          $set: {
            title,
            message,
            link: link || '',
            sender: sender || null,
            isRead: false,
            createdAt: new Date()
          }
        },
        { new: true }
      );
    }
    console.error('Error in createOrUpdateNotification:', error);
    return null;
  }
}

/**
 * Bulk notification creation helper for multi-recipient notifications (e.g. HR approvals)
 * Prevents duplicate sends per recipient
 */
async function createBulkNotifications({ recipients, title, message, type = 'OTHER', link, relatedId, sender }) {
  if (!Array.isArray(recipients) || recipients.length === 0) return [];
  
  const results = [];
  const uniqueRecipients = Array.from(new Set(recipients.map(r => String(r._id || r))));

  for (const recipientId of uniqueRecipients) {
    const res = await createOrUpdateNotification({
      recipient: recipientId,
      title,
      message,
      type,
      link,
      relatedId,
      sender
    });
    if (res) results.push(res);
  }
  return results;
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
  createBulkNotifications,
  getNotificationsForUser,
  markAsRead,
  markAllAsReadForUser,
  deleteNotification
};
