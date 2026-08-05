const mongoose = require('mongoose');

const documentTemplateSchema = new mongoose.Schema({
  templateId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    default: 'Official HR Document'
  },
  description: {
    type: String,
    default: ''
  },
  defaultContent: {
    type: String,
    required: true
  },
  headerTitle: {
    type: String,
    default: 'CALDIM TECHNOLOGIES PRIVATE LIMITED'
  },
  watermarkText: {
    type: String,
    default: 'CALDIM TECHNOLOGIES'
  },
  footerText: {
    type: String,
    default: 'Confidential - CALDIM Technologies Private Limited | Corporate Office'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('DocumentTemplate', documentTemplateSchema);
