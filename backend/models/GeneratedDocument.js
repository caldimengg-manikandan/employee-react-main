const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['CREATED', 'UPDATED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'DOWNLOADED', 'PRINTED', 'ARCHIVED'],
    required: true
  },
  performedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, default: 'System' },
    role: { type: String, default: 'User' }
  },
  notes: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
}, { _id: true });

const generatedDocumentSchema = new mongoose.Schema({
  documentNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  templateId: {
    type: String,
    required: true,
    trim: true
  },
  templateName: {
    type: String,
    required: true,
    trim: true
  },
  employeeId: {
    type: String, // String employee identifier e.g. CDE001
    required: true,
    trim: true
  },
  employeeObjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  employeeDetails: {
    name: { type: String, default: '' },
    employeeId: { type: String, default: '' },
    designation: { type: String, default: '' },
    department: { type: String, default: '' },
    doj: { type: String, default: '' },
    salary: { type: String, default: '' },
    reportingManager: { type: String, default: '' },
    currentDate: { type: String, default: '' },
    email: { type: String, default: '' }
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Draft', 'Pending Director Approval', 'Approved', 'Rejected', 'Downloaded', 'Archived'],
    default: 'Draft'
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  directorSignature: {
    signatureImage: { type: String, default: '' },
    digitalSeal: { type: String, default: '' },
    name: { type: String, default: '' },
    designation: { type: String, default: '' },
    companyName: { type: String, default: 'CALDIM Technologies Private Limited' },
    signedAt: { type: Date }
  },
  auditLog: [auditLogSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('GeneratedDocument', generatedDocumentSchema);
