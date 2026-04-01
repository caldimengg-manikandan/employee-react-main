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
  status: {
    type: String,
    enum: [
      'draft',
      'submitted',
      'managerInProgress',
      'reviewerPending',
      'reviewerInProgress',
      'reviewerApproved',
      'directorInProgress',
      'directorApproved',
      'directorPushedBack',
      'released',
      'effective',
      'rejected',
      'revoked',
      // Keeping legacy for compatibility
      'managerApproved',
      'REVIEWER_COMPLETED'
    ],
    default: 'draft'
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
  // Manager Fields
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

  // Final Review/Director Fields
  reviewerComments: { type: String, default: '' },
  directorComments: { type: String, default: '' },
  currentSalarySnapshot: { type: Number, default: 0 },
  incrementPercentage: { type: Number, default: 0 },
  incrementCorrectionPercentage: { type: Number, default: 0 },
  incrementAmount: { type: Number, default: 0 },
  revisedSalary: { type: Number, default: 0 },
  performancePay: { type: Number, default: 0 },

  // Letter Release Snapshots
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
  
  // Refined Workflow Metadata
  workflow: {
    submittedAt: Date,
    managerApprovedAt: Date,
    directorApprovedAt: Date,
    releasedAt: Date,
    acceptedAt: Date
  },

  pushBack: {
    isPushedBack: { type: Boolean, default: false },
    reason: String,
    pushedBy: String,
    pushedAt: Date
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
  },

  // Promotion Handling
  promotion: {
    recommended: { type: Boolean, default: false },
    newDesignation: { type: String, default: '' },
    remarksReviewer: { type: String, default: '' },
    remarksDirector: { type: String, default: '' },
    effectiveDate: { type: Date }
  },

  effectiveDate: { type: Date }, // Overall effective date for payroll changes
  
  payrollProcessed: {
    type: Boolean,
    default: false
  },

  // Added for Stage 1: Team Appraisal Input
  managerReview: {
    performanceRating: { type: String, default: '' },
    rating: { type: String, default: '' },
    behaviouralRatings: {
      knowledgeSharing: { type: Number, default: 0 },
      teamWork: { type: Number, default: 0 },
      communication: { type: Number, default: 0 },
      ownership: { type: Number, default: 0 }
    },
    sectionRatings: {
      type: Map,
      of: Number,
      default: {}
    },
    comments: { type: String, default: '' },
    summary: { type: String, default: '' },
    strengths: { type: String, default: '' },
    areasOfImprovement: { type: String, default: '' },
    reviewedAt: { type: Date },
    reviewedBy: { type: String }
  }
}, { timestamps: true });

SelfAppraisalSchema.index({ employeeId: 1, year: 1, version: 1 }, { unique: true });

module.exports = mongoose.model('SelfAppraisal', SelfAppraisalSchema);
