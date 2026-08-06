const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'TIMESHEET_SUBMIT',
      'TIMESHEET_APPROVED',
      'TIMESHEET_REJECTED',
      'LEAVE_APPLY',
      'LEAVE_APPROVED',
      'LEAVE_REJECTED',
      'CONFERENCE_BOOKING',
      'LOGIN',
      'EXIT_SUBMIT',
      'EXIT_APPROVED',
      'EXIT_REJECTED',
      'SPECIAL_PERMISSION_SUBMIT',
      'SPECIAL_PERMISSION_APPROVED',
      'SPECIAL_PERMISSION_REJECTED',
      'SUPPORT_TICKET',
      'SUPPORT_STATUS',
      'SUPPORT_COMMENT',
      'OTHER'
    ],
    default: 'OTHER'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  link: String,
  relatedId: mongoose.Schema.Types.ObjectId,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for optimal database queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ relatedId: 1 });
notificationSchema.index({ type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
