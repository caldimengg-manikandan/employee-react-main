const mongoose = require('mongoose');

const inductionDocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['policy', 'handbook', 'knowledge', 'training'],
    index: true
  },
  subCategory: {
    type: String,
    trim: true,
    default: 'General'
  },
  isMandatory: {
    type: Boolean,
    default: true
  },
  effectiveDate: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    default: ''
  },
  fileUrl: {
    type: String,
    required: false
  },
  division: {
    type: String,
    enum: ['SDS', 'TEKLA', 'DAS (Software)', 'Common'],
    required: false
  },
  fileType: {
    type: String,
    default: 'pdf' // pdf, docx, ppt, pptx, video, link
  },
  fileName: {
    type: String,
    default: ''
  },
  fileSize: {
    type: Number,
    default: 0
  },
  version: {
    type: Number,
    default: 1
  },
  versionHistory: [{
    version: Number,
    fileUrl: String,
    fileName: String,
    updatedAt: { type: Date, default: Date.now }
  }],
  isEnabled: {
    type: Boolean,
    default: true
  },
  uploadedBy: {
    type: String,
    default: 'HR Admin'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('InductionDocument', inductionDocumentSchema);
