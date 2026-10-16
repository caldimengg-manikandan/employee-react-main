const mongoose = require('mongoose');

const ContactDiarySchema = new mongoose.Schema({
  serviceName: {
    type: String,
    required: [true, 'Service Name is required'],
    trim: true
  },
  contactName: {
    type: String,
    trim: true,
    default: ''
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  contactPerson: {
    type: String,
    trim: true,
    default: ''
  },
  contactNumber: {
    type: String,
    required: [true, 'Contact Number is required'],
    trim: true
  },
  alternateContactNumber: {
    type: String,
    trim: true,
    default: ''
  },
  location: {
    type: String,
    trim: true,
    default: ''
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
    index: true
  },
  isEmergency: {
    type: Boolean,
    default: false,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdByName: {
    type: String,
    default: ''
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedByName: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Sync contactName with serviceName if not explicitly provided
ContactDiarySchema.pre('save', function(next) {
  if (!this.contactName && this.serviceName) {
    this.contactName = this.serviceName;
  }
  next();
});

module.exports = mongoose.model('ContactDiary', ContactDiarySchema);
