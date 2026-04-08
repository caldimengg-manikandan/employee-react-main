const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SelfAppraisal = require('../models/SelfAppraisal');
const Employee = require('../models/Employee');
const Payroll = require('../models/Payroll');
const AuditLog = require('../models/AuditLog');

const { calculateIncrement } = require('../utils/incrementUtils');

// Helper to convert Map to Object
const mapToObj = (map) => {
    if (!map) return {};
    try {
        if (typeof map.toJSON === 'function') return map.toJSON();
        if (map instanceof Map) return Object.fromEntries(map);
        return map;
    } catch (e) {
        return map || {};
    }
};

// @desc    Get manager's queue (Team Appraisals)
// @route   GET /api/performance/team-appraisals
// @access  Private (Manager)
router.get('/', auth, async (req, res) => {
  try {
    const statusFilter = {
      $in: [
        'submitted',
        'managerInProgress',
        'reviewerPending',
        'reviewerInProgress',
        'reviewerApproved',
        'directorInProgress',
        'directorPushedBack',
        'directorApproved',
        'released',
        'accepted_pending_effect',
        'effective'
      ]
    };

    const employeeId = req.user.employeeId;
    const name = req.user.name;

    const query = {
      $and: [
        { status: statusFilter },
        {
          $or: [
            { appraiserId: employeeId },
            { appraiser: { $regex: new RegExp(`^${name}$`, 'i') } }
          ]
        }
      ]
    };

    const appraisals = await SelfAppraisal.find(query)
      .populate('employeeId', 'name employeeId designation department division avatar location branch ctc status');

    const formattedAppraisals = await Promise.all(appraisals.map(async (app) => {
      const emp = app.employeeId || {};
      
      let derivedSalary = Number(app.currentSalarySnapshot || 0);
      if (derivedSalary === 0) {
          try {
              if (emp.employeeId) {
                  const payrollRec = await Payroll.findOne({ employeeId: emp.employeeId }).sort({ createdAt: -1 }).lean();
                  derivedSalary = Number(payrollRec?.ctc || emp.ctc || 0);
                  if (derivedSalary > 0) {
                      await SelfAppraisal.updateOne({ _id: app._id }, { $set: { currentSalarySnapshot: derivedSalary } });
                  }
              }
          } catch (e) {}
      }

      return {
        id: app._id,
        financialYr: app.year,
        empId: emp.employeeId || '',
        name: emp.name || 'Unknown',
        avatar: emp.avatar || '',
        designation: emp.designation || '',
        status: app.status,
        employeeStatus: emp.status || 'Active',
        
        selfAppraiseeComments: app.overallContribution || '',
        managerComments: app.managerComments || '',
        
        currentSalary: derivedSalary,
        incrementPercentage: app.incrementPercentage || 0,
        incrementCorrectionPercentage: app.incrementCorrectionPercentage || 0,
        incrementAmount: app.incrementAmount || 0,
        revisedSalary: app.revisedSalary || 0,
        performancePay: app.performancePay || 0,
        
        promotion: app.promotion || { recommended: false, newDesignation: '' },
        pushBack: app.pushBack || { isPushedBack: false },

        leadership: app.leadership || '',
        attitude: app.attitude || '',
        communication: app.communication || '',
        appraiserRating: app.appraiserRating || '',
        keyPerformance: app.keyPerformance || '',
        
        behaviourManagerComments: app.behaviourManagerComments || '',
        processManagerComments: app.processManagerComments || '',
        technicalManagerComments: app.technicalManagerComments || '',
        growthManagerComments: app.growthManagerComments || '',
        
        behaviourManagerRatings: mapToObj(app.behaviourManagerRatings),
        processManagerRatings: mapToObj(app.processManagerRatings),
        technicalManagerRatings: mapToObj(app.technicalManagerRatings),
        growthManagerRatings: mapToObj(app.growthManagerRatings),

        // Employee's Assessment Data (Original names and Aliases for UI consistency)
        behaviourBased: mapToObj(app.behaviourBased),
        behaviourSelf: mapToObj(app.behaviourBased),
        processAdherence: mapToObj(app.processAdherence),
        processSelf: mapToObj(app.processAdherence),
        technicalBased: mapToObj(app.technicalBased),
        technicalSelf: mapToObj(app.technicalBased),
        growthBased: mapToObj(app.growthBased),
        growthSelf: mapToObj(app.growthBased),
        
        projects: app.projects || [],
        overallContribution: app.overallContribution || '',
        effectiveDate: app.effectiveDate,
        managerReview: app.managerReview || {},
        releaseSalarySnapshot: mapToObj(app.releaseSalarySnapshot),
        releaseRevisedSnapshot: mapToObj(app.releaseRevisedSnapshot)
      };
    }));

    res.json(formattedAppraisals);
  } catch (error) {
    console.error('Error fetching manager queue:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @desc    Update appraisal details (as Manager)
// @route   PUT /api/performance/team-appraisals/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ success: false, message: 'Not found' });

    // Simple auth check
    if (appraisal.appraiserId !== req.user.employeeId && appraisal.appraiser !== req.user.name) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Check Employee status before manager update
    const appraisalEmployee = await Employee.findById(appraisal.employeeId);
    if (appraisalEmployee && appraisalEmployee.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Employee is not active. Cannot process appraisal for inactive or exited employees.' });
    }

    const {
      managerComments, keyPerformance, appraiserRating,
      incrementPercentage, incrementCorrectionPercentage, incrementAmount, revisedSalary, performancePay,
      currentSalarySnapshot, effectiveDate,
      behaviourManagerComments, processManagerComments, technicalManagerComments, growthManagerComments,
      leadership, attitude, communication,
      promotion, behaviourManagerRatings, processManagerRatings,
      technicalManagerRatings, growthManagerRatings
    } = req.body;

    if (managerComments !== undefined) appraisal.managerComments = managerComments;
    if (keyPerformance !== undefined) appraisal.keyPerformance = keyPerformance;
    if (appraiserRating !== undefined) appraisal.appraiserRating = appraiserRating;
    
    // Financials
    if (incrementPercentage !== undefined) appraisal.incrementPercentage = incrementPercentage;
    if (incrementCorrectionPercentage !== undefined) appraisal.incrementCorrectionPercentage = incrementCorrectionPercentage;
    if (incrementAmount !== undefined) appraisal.incrementAmount = incrementAmount;
    if (revisedSalary !== undefined) appraisal.revisedSalary = revisedSalary;
    if (performancePay !== undefined) appraisal.performancePay = performancePay;
    if (currentSalarySnapshot !== undefined) appraisal.currentSalarySnapshot = currentSalarySnapshot;
    if (effectiveDate !== undefined) appraisal.effectiveDate = effectiveDate;
    
    // Sectional Comments
    if (behaviourManagerComments !== undefined) appraisal.behaviourManagerComments = behaviourManagerComments;
    if (processManagerComments !== undefined) appraisal.processManagerComments = processManagerComments;
    if (technicalManagerComments !== undefined) appraisal.technicalManagerComments = technicalManagerComments;
    if (growthManagerComments !== undefined) appraisal.growthManagerComments = growthManagerComments;

    // Standard Fields
    if (leadership !== undefined) appraisal.leadership = leadership;
    if (attitude !== undefined) appraisal.attitude = attitude;
    if (communication !== undefined) appraisal.communication = communication;
    
    if (promotion) {
      appraisal.promotion = {
        ...appraisal.promotion,
        ...promotion
      };
    }

    if (behaviourManagerRatings) appraisal.behaviourManagerRatings = behaviourManagerRatings;
    if (processManagerRatings) appraisal.processManagerRatings = processManagerRatings;
    if (technicalManagerRatings) appraisal.technicalManagerRatings = technicalManagerRatings;
    if (growthManagerRatings) appraisal.growthManagerRatings = growthManagerRatings;

    await appraisal.save();
    res.json({ success: true, appraisal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Save Stage 1 Manager Review Input
// @route   PUT /api/performance/team-appraisals/:id/review
router.put('/:id/review', auth, async (req, res) => {
  try {
    const appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ success: false, message: 'Not found' });

    // Authorization: only the assigned appraiser
    if (appraisal.appraiserId !== req.user.employeeId && appraisal.appraiser !== req.user.name) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Check Employee status before manager review
    const appraisalEmployee = await Employee.findById(appraisal.employeeId);
    if (appraisalEmployee && appraisalEmployee.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Employee is not active. Cannot process appraisal for inactive or exited employees.' });
    }

    const { rating, behaviouralRatings, comments, strengths, areasOfImprovement, submitReview, summary } = req.body;

    // Update managerReview fields
    appraisal.managerReview = {
      performanceRating: String(rating || appraisal.appraiserRating || '').split(' ')[0],
      rating: rating || '',
      behaviouralRatings: {
        knowledgeSharing: behaviouralRatings?.knowledgeSharing || 0,
        teamWork: behaviouralRatings?.teamWork || 0,
        communication: behaviouralRatings?.communication || 0,
        ownership: behaviouralRatings?.ownership || 0
      },
      comments: comments || '',
      summary: summary || '',
      strengths: strengths || '',
      areasOfImprovement: areasOfImprovement || '',
      reviewedAt: new Date(),
      reviewedBy: req.user.name
    };

    // Snapshot current section ratings into managerReview.sectionRatings (display-only qualitative data)
    const toObj = (map) => {
      try {
        if (!map) return {};
        if (typeof map.toJSON === 'function') return map.toJSON();
        if (map instanceof Map) return Object.fromEntries(map);
        return map;
      } catch (e) {
        return {};
      }
    };
    appraisal.managerReview.sectionRatings = {
      technical: toObj(appraisal.technicalManagerRatings),
      behavioural: toObj(appraisal.behaviourManagerRatings),
      process: toObj(appraisal.processManagerRatings),
      growth: toObj(appraisal.growthManagerRatings)
    };

    // If submitted, update overall status
    if (submitReview) {
      if (!rating || !comments) {
        return res.status(400).json({ success: false, message: 'Rating and comments are mandatory for submission.' });
      }
      appraisal.status = 'managerInProgress';
    }

    await appraisal.save();
    res.json({ success: true, message: submitReview ? 'Review submitted successfully!' : 'Review saved as draft!', appraisal });
  } catch (err) {
    console.error('Error saving manager review:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Submit to Reviewer (Phase 1)
// @route   POST /api/performance/team-appraisals/:id/approve
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const appraisal = await SelfAppraisal.findById(req.params.id).populate('employeeId');
    if (!appraisal) return res.status(404).json({ success: false, message: 'Not found' });

    if (appraisal.employeeId && appraisal.employeeId.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Employee is not active. Cannot approve appraisal for inactive or exited employees.' });
    }

    let message = "";
    
    // Validation: Manager Performance Rating must exist before moving to reviewer
    const mgrPerfRating = String(appraisal.managerReview?.performanceRating || appraisal.appraiserRating || '').trim();
    if (!mgrPerfRating) {
      return res.status(400).json({ success: false, message: 'Manager performance rating is required before submission to Reviewer.' });
    }

    appraisal.status = 'reviewerPending';
    appraisal.workflow.managerApprovedAt = new Date();
    message = 'Submitted to Reviewer';
    
    // Clear push-back data after resubmit
    appraisal.pushBack = {
      isPushedBack: false,
      reason: null,
      pushedBy: null,
      pushedAt: null
    };

    await appraisal.save();

    await AuditLog.create({
      employeeId: appraisal.employeeId,
      appraisalId: appraisal._id,
      action: 'MANAGER_SUBMITTED',
      role: 'Manager',
      doneBy: req.user.name,
      doneById: req.user.employeeId
    });

    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Send Back to Employee
// @route   POST /api/performance/team-appraisals/:id/send-back
router.post('/:id/send-back', auth, async (req, res) => {
  try {
    const appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ success: false, message: 'Not found' });

    const { reason } = req.body;
    appraisal.status = 'draft';
    
    await appraisal.save();

    await AuditLog.create({
      employeeId: appraisal.employeeId,
      appraisalId: appraisal._id,
      action: 'SENT_BACK_TO_EMPLOYEE',
      role: 'Manager',
      reason: reason || 'Revision required',
      doneBy: req.user.name,
      doneById: req.user.employeeId
    });

    res.json({ success: true, message: 'Returned to employee for correction' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
