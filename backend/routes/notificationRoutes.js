const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// Helper to check if logged in user is Admin, GM, Director, HR, or has admin permissions
const checkIsAdminOrGM = (user) => {
  const roleLower = String(user?.role || '').toLowerCase();
  const designationLower = String(user?.designation || '').toLowerCase();
  return (
    ['admin', 'director', 'manager', 'hr'].includes(roleLower) ||
    designationLower.includes('general manager') ||
    designationLower.includes('gm') ||
    designationLower.includes('director') ||
    user?.permissions?.includes('employee_access') ||
    user?.permissions?.includes('user_access')
  );
};

// Get all notifications
// - Employees see ONLY their own notifications (recipient: userId)
// - Admin and GM see ALL notifications across the system
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const isAdminOrGM = checkIsAdminOrGM(req.user);

    let query = {};
    if (!isAdminOrGM) {
      query = { recipient: userId };
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
    const isAdminOrGM = checkIsAdminOrGM(req.user);

    let query = { _id: req.params.id };
    if (!isAdminOrGM) {
      query.recipient = userId;
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
    const isAdminOrGM = checkIsAdminOrGM(req.user);

    let query = { isRead: false };
    if (!isAdminOrGM) {
      query.recipient = userId;
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
    const isAdminOrGM = checkIsAdminOrGM(req.user);

    let query = { _id: req.params.id };
    if (!isAdminOrGM) {
      query.recipient = userId;
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
