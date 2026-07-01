const mongoose = require('mongoose');

const inductionProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  employeeId: {
    type: String,
    default: ''
  },
  employeeName: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    default: ''
  },
  readDocuments: [{
    type: String // document ID or title
  }],
  completedTrainings: [{
    type: String // training ID or title
  }],
  acknowledgements: [{
    policyName: { type: String, required: true },
    employeeName: { type: String, default: '' },
    employeeId: { type: String, default: '' },
    digitalSignature: { type: String, default: 'Digitally Acknowledged & Signed' },
    acknowledgedAt: { type: Date, default: Date.now }
  }],
  assessmentAttempts: [{
    score: Number,
    totalQuestions: Number,
    percentage: Number,
    passed: Boolean,
    attemptedAt: { type: Date, default: Date.now }
  }],
  feedback: {
    rating: { type: Number, default: 0 },
    comments: { type: String, default: '' },
    suggestions: { type: String, default: '' },
    submittedAt: { type: Date }
  },
  progressPercentage: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Completed', 'Verified'],
    default: 'Not Started'
  },
  completedAt: {
    type: Date
  },
  hrVerified: {
    type: Boolean,
    default: false
  },
  hrVerifiedAt: {
    type: Date
  },
  hrVerifiedBy: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('InductionProgress', inductionProgressSchema);
