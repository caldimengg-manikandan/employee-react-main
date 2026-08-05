const mongoose = require('mongoose');

const directorProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    default: 'Dr. Manikandan S'
  },
  designation: {
    type: String,
    required: true,
    trim: true,
    default: 'Managing Director & CEO'
  },
  companyName: {
    type: String,
    default: 'CALDIM Technologies Private Limited'
  },
  signatureImage: {
    type: String, // Base64 or image URL
    default: ''
  },
  digitalSeal: {
    type: String, // Base64 or image URL
    default: ''
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('DirectorProfile', directorProfileSchema);
