const mongoose = require('mongoose');

const inductionAssessmentSchema = new mongoose.Schema({
  passingPercentage: {
    type: Number,
    default: 70
  },
  maxAttempts: {
    type: Number,
    default: 0 // 0 means unlimited
  },
  questions: [{
    id: { type: String, required: true },
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctOptionIndex: { type: Number, required: true }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('InductionAssessment', inductionAssessmentSchema);
