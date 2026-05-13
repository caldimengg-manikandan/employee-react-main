const mongoose = require('mongoose');

const ExpenseTypeSchema = new mongoose.Schema({
  type_name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ExpenseType', ExpenseTypeSchema);
