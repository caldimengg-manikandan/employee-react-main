const mongoose = require('mongoose');

const SelfAppraisalSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  year: {
    type: String,
    required: true
  },
  division: {
    type: String
  },
  projects: [{
    id: String,
    name: String,
    contribution: String
  }],
  overallContribution: {
    type: String
  },
  behaviourBased: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => ({ comments: '' })
  },
  processAdherence: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => ({ comments: '' })
  },
  technicalBased: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => ({ comments: '' })
  },
  growthBased: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => ({ comments: '', careerGoals: '' })
  },
  // Dynamic Manager Ratings
  behaviourManagerRatings: {
    type: Map,
    of: Number,
    default: {}
  },
  processManagerRatings: {
    type: Map,
    of: Number,
    default: {}
  },
  technicalManagerRatings: {
    type: Map,
    of: Number,
    default: {}
  },
  growthManagerRatings: {
    type: Map,
    of: Number,
    default: {}
  },
  status: {
    type: String,
    enum: [
      'Draft',
      'Submitted',
      'SUBMITTED',
      'APPRAISER_COMPLETED',
      'REVIEWER_COMPLETED',
      'DIRECTOR_APPROVED',
      'AppraiserReview', 'ReviewerReview', 'DirectorApproval', 'Released', 'Reviewed',
      'Released Letter', 'Accepted'
    ],
    default: 'Draft'
  },
  employeeAcceptanceStatus: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'NOT_ACCEPTED'],
    default: 'PENDING'
  },
  finalStatus: {
    type: String,
    enum: ['COMPLETED']
  },
  appraiser: {
    type: String
  },
  appraiserId: {
    type: String
  },
  reviewer: {
    type: String
  },
  reviewerId: {
    type: String
  },
  director: {
    type: String
  },
  directorId: {
    type: String
  },
  // Manager/Appraiser Fields
  managerComments: { type: String, default: '' },
  keyPerformance: { type: String, default: '' },
  appraiseeComments: { type: String, default: '' },
  appraiserRating: { type: String, default: '' },
  leadership: { type: String, default: '' },
  attitude: { type: String, default: '' },
  communication: { type: String, default: '' },

  // Detailed Manager Ratings (per attribute)
  behaviourCommunicationManager: { type: Number, default: 0 },
  behaviourTeamworkManager: { type: Number, default: 0 },
  behaviourLeadershipManager: { type: Number, default: 0 },
  behaviourAdaptabilityManager: { type: Number, default: 0 },
  behaviourInitiativesManager: { type: Number, default: 0 },

  processTimesheetManager: { type: Number, default: 0 },
  processReportStatusManager: { type: Number, default: 0 },
  processMeetingManager: { type: Number, default: 0 },

  technicalCodingSkillsManager: { type: Number, default: 0 },
  technicalTestingManager: { type: Number, default: 0 },
  technicalDebuggingManager: { type: Number, default: 0 },
  technicalSdsManager: { type: Number, default: 0 },
  technicalTeklaManager: { type: Number, default: 0 },

  growthLearningNewTechManager: { type: Number, default: 0 },
  growthCertificationsManager: { type: Number, default: 0 },

  behaviourManagerComments: { type: String, default: '' },
  processManagerComments: { type: String, default: '' },
  technicalManagerComments: { type: String, default: '' },
  growthManagerComments: { type: String, default: '' },

  // Reviewer Fields
  reviewerComments: { type: String, default: '' },
  directorComments: { type: String, default: '' },
  currentSalarySnapshot: { type: Number, default: 0 },
  incrementPercentage: { type: Number, default: 0 },
  incrementCorrectionPercentage: { type: Number, default: 0 },
  incrementAmount: { type: Number, default: 0 },
  revisedSalary: { type: Number, default: 0 },
  performancePay: { type: Number, default: 0 },

  // Snapshots captured at the moment of release so letters never change later
  releaseSalarySnapshot: {
    type: Map,
    of: Number,
    default: {}
  },
  releaseRevisedSnapshot: {
    type: Map,
    of: Number,
    default: {}
  },
  releaseDate: {
    type: Date
  },

  releaseLetter: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // Versioning & Locking
  version: {
    type: Number,
    default: 1
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  revoked: {
    type: Boolean,
    default: false
  },
  revokedAt: {
    type: Date,
    default: null
  },
  revokedReason: {
    type: String,
    default: null
  },
  parentAppraisalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SelfAppraisal',
    default: null
  }
});

module.exports = mongoose.model('SelfAppraisal', SelfAppraisalSchema);
