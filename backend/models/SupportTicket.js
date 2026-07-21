const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true
  },
  ticketNumber: {
    type: String,
    unique: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mainCategory: {
    type: String,
    required: true,
    enum: ['IT Queries', 'Non-IT Queries']
  },
  subCategory: {
    type: String,
    required: true
  },
  category: {
    type: String
  },
  priority: {
    type: String,
    required: true,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  status: {
    type: String,
    required: true,
    enum: ['Open', 'In Review', 'Assigned', 'In Progress', 'Waiting for Employee', 'Resolved', 'Closed', 'Reopened', 'Rejected'],
    default: 'Open'
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  attachments: [{
    name: String,
    url: String,
    data: String,
    contentType: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedRole: {
    type: String
  },
  internalRemarks: {
    type: String
  },
  resolutionRemarks: {
    type: String
  },
  emailNotificationStatus: {
    type: String,
    enum: ['Pending', 'Sent', 'Failed'],
    default: 'Pending'
  },
  resolution: {
    text: String,
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  slaDeadline: {
    type: Date
  },
  history: [{
    status: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now },
    comment: String
  }]
}, {
  timestamps: true
});

// Auto-generate Ticket Number before saving
supportTicketSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const prefix = this.mainCategory === 'IT Queries' ? 'IT' : 'NIT';
    const pattern = new RegExp(`^${prefix}-${dateStr}-`);

    // Find the latest ticket matching prefix and date
    const latestTicket = await this.constructor.findOne({
      $or: [
        { ticketNumber: pattern },
        { ticketId: pattern }
      ]
    }).sort({ createdAt: -1, _id: -1 });

    let sequence = 1;
    if (latestTicket) {
      const existingId = latestTicket.ticketNumber || latestTicket.ticketId;
      if (existingId) {
        const parts = existingId.split('-');
        if (parts.length === 3) {
          const parsedSeq = parseInt(parts[2], 10);
          if (!isNaN(parsedSeq)) {
            sequence = parsedSeq + 1;
          }
        }
      }
    }

    const generatedNumber = `${prefix}-${dateStr}-${sequence.toString().padStart(4, '0')}`;
    this.ticketNumber = generatedNumber;
    this.ticketId = generatedNumber;
    if (!this.category) {
      this.category = this.subCategory;
    }

    // Set SLA Deadline based on priority
    const hours = {
      'Low': 72,
      'Medium': 48,
      'High': 24,
      'Critical': 4
    };
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + (hours[this.priority] || 48));
    this.slaDeadline = deadline;
  }
  next();
});

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

module.exports = SupportTicket;
