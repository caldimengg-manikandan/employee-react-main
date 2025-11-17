const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeId: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  punchIn: {
    type: Date
  },
  punchOut: {
    type: Date
  },
  breakStart: {
    type: Date
  },
  breakEnd: {
    type: Date
  },
  totalBreakMinutes: {
    type: Number,
    default: 0
  },
  totalWorkingMinutes: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half-day', 'holiday', 'leave'],
    default: 'absent'
  },
  overtimeMinutes: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate working hours
attendanceSchema.pre('save', function(next) {
  if (this.punchIn && this.punchOut) {
    const workDuration = (this.punchOut - this.punchIn) / (1000 * 60); // in minutes
    const breakDuration = this.totalBreakMinutes || 0;
    this.totalWorkingMinutes = Math.max(0, workDuration - breakDuration);
    
    // Calculate overtime (more than 8 hours)
    const standardWorkMinutes = 8 * 60; // 8 hours in minutes
    this.overtimeMinutes = Math.max(0, this.totalWorkingMinutes - standardWorkMinutes);
    
    // Determine status
    if (this.totalWorkingMinutes >= 480) {
      this.status = 'present';
    } else if (this.totalWorkingMinutes >= 240) {
      this.status = 'half-day';
    }
  }
  
  this.updatedAt = Date.now();
  next();
});

// Compound index for unique attendance per user per day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);