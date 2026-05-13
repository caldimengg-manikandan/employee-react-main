const mongoose = require('mongoose');

const supportCommentSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupportTicket',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  attachments: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  isInternal: {
    type: Boolean,
    default: false // For admin-only notes
  }
}, {
  timestamps: true
});

const SupportComment = mongoose.model('SupportComment', supportCommentSchema);

module.exports = SupportComment;
