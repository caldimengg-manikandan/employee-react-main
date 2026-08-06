const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationService = require('../services/notificationService');

// Get all notifications for logged-in user based on role and team access
router.get('/', auth, async (req, res) => {
  try {
    const result = await notificationService.getNotificationsForUser(req.user, req.query);
    // Maintain direct array compatibility for existing frontend consumption while attaching metadata headers/properties if needed
    const notifications = result.notifications || [];
    notifications.unreadCount = result.unreadCount;
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications visible to user as read
router.put('/read-all', auth, async (req, res) => {
  try {
    await notificationService.markAllAsReadForUser(req.user);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark a single notification as read using only _id
router.put('/:id/read', auth, async (req, res) => {
  try {
    const updated = await notificationService.markAsRead(req.params.id);
    if (!updated) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a single notification using only _id
router.delete('/:id', auth, async (req, res) => {
  try {
    await notificationService.deleteNotification(req.params.id);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
