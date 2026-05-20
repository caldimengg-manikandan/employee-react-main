const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Attendance Issue',
      'Leave Management Issue',
      'Timesheet Issue',
      'Payroll & Salary Issue',
      'PF/ESI Issue',
      'Appraisal Issue',
      'Employee Letter/Document Issue/download issues',
      'Portal Bug/Error',
      'Technical Support',
      'Exit & Relieving Process Issue',
      'HR Support',
      'General Query',
      'Other'
    ]
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
    enum: ['Open', 'In Review', 'Assigned', 'Resolved', 'Closed', 'Reopened', 'Rejected'],
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
    uploadedAt: { type: Date, default: Date.now }
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Auto-generate Ticket ID before saving
supportTicketSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const yearMonth = date.getFullYear().toString() + (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Find the latest ticket for this month
    const latestTicket = await this.constructor.findOne({
      ticketId: new RegExp(`^TCK-${yearMonth}-`)
    }).sort({ ticketId: -1 });

    let sequence = 1;
    if (latestTicket && latestTicket.ticketId) {
      const parts = latestTicket.ticketId.split('-');
      if (parts.length === 3) {
        sequence = parseInt(parts[2]) + 1;
      }
    }

    this.ticketId = `TCK-${yearMonth}-${sequence.toString().padStart(4, '0')}`;
    
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
