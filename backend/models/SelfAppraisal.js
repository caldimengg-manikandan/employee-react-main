const mongoose = require('mongoose');

const SelfAppraisalSchema = new mongoose.Schema({
  employeeId: {
    type: String, // Storing Employee ID string (e.g. EMP001) or ObjectId. Based on Employee model, employeeId is a String field. 
    // However, usually we reference by ObjectId. But the system seems to use `employeeId` string often. 
    // Let's store the ObjectId ref for populate, but also keep employeeId string if needed.
    // Looking at other models (e.g. Timesheet), let's see how they reference.
    // For now I will use ObjectId ref to 'Employee'.
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
    communication: { type: Number, default: 0 },
    teamwork: { type: Number, default: 0 },
    leadership: { type: Number, default: 0 },
    adaptability: { type: Number, default: 0 },
    initiatives: { type: Number, default: 0 },
    comments: { type: String, default: '' }
  },
  processAdherence: {
    timesheet: { type: Number, default: 0 },
    reportStatus: { type: Number, default: 0 },
    meeting: { type: Number, default: 0 },
    comments: { type: String, default: '' }
  },
  technicalBased: {
    codingSkills: { type: Number, default: 0 },
    testing: { type: Number, default: 0 },
    debugging: { type: Number, default: 0 },
    sds: { type: Number, default: 0 },
    tekla: { type: Number, default: 0 },
    comments: { type: String, default: '' }
  },
  growthBased: {
    learningNewTech: { type: Number, default: 0 },
    certifications: { type: Number, default: 0 },
    careerGoals: { type: String, default: '' },
    comments: { type: String, default: '' }
  },
  status: {
    type: String,
    enum: [
      'Draft', 
      'Submitted', // Employee has submitted
      'SUBMITTED', // Normalize to uppercase if needed, but keeping mixed for now based on existing code. User requested "SUBMITTED" explicitly. 
      // Let's support both or standardized. The user input used uppercase. I will add uppercase versions.
      'APPRAISER_COMPLETED', 
      'REVIEWER_COMPLETED', 
      'DIRECTOR_APPROVED',
      // Keeping legacy/other statuses for safety if needed, or remove if strict. 
      // User requested strict flow: DRAFT -> SUBMITTED -> APPRAISER_COMPLETED -> REVIEWER_COMPLETED -> DIRECTOR_APPROVED
      'AppraiserReview', 'ReviewerReview', 'DirectorApproval', 'Released', 'Reviewed'
    ],
    default: 'Draft'
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

  technicalCodingManager: { type: Number, default: 0 },
  technicalTestingManager: { type: Number, default: 0 },
  technicalDebuggingManager: { type: Number, default: 0 },
  technicalSdsManager: { type: Number, default: 0 },
  technicalTeklaManager: { type: Number, default: 0 },

  growthLearningNewTechManager: { type: Number, default: 0 },
  growthCertificationsManager: { type: Number, default: 0 },

  // Reviewer Fields
  reviewerComments: { type: String, default: '' },
  directorComments: { type: String, default: '' },
  incrementPercentage: { type: Number, default: 0 },
  incrementCorrectionPercentage: { type: Number, default: 0 },
  incrementAmount: { type: Number, default: 0 },
  revisedSalary: { type: Number, default: 0 },
  
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
  }
});

module.exports = mongoose.model('SelfAppraisal', SelfAppraisalSchema);
