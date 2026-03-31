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

// @desc    Get reviewer appraisals (for reviewers/HR)
// @route   GET /api/performance/reviewer
// @access  Private (Reviewer/Admin)
router.get('/', auth, async (req, res) => {
  try {
    const tab = (req.query.tab || 'pending').toLowerCase();
    
    let statusFilter = {};
    if (tab === 'completed') {
      statusFilter = {
        $in: [
          'reviewerApproved',
          'directorInProgress',
          'directorApproved',
          'DIRECTOR_APPROVED',
          'released',
          'Released Letter',
          'RELEASED',
          'accepted_pending_effect',
          'accepted',
          'Accepted',
          'effective',
          'COMPLETED'
        ]
      };
    } else {
      statusFilter = {
        $in: [
          'reviewerPending',
          'reviewerInProgress',
          'directorPushedBack',
          'managerApproved'
        ]
      };
    }

    const query = {
      $and: [
        { status: statusFilter },
        {
          $or: [
            { reviewerId: req.user.employeeId },
            { reviewer: { $regex: new RegExp(`^${req.user.name}$`, 'i') } },
            { appraiserId: req.user.employeeId },
            { appraiser: { $regex: new RegExp(`^${req.user.name}$`, 'i') } }
          ]
        }
      ]
    };

    const appraisals = await SelfAppraisal.find(query)
      .populate('employeeId', 'name employeeId designation department division location branch avatar ctc');

    const formattedAppraisals = await Promise.all(
      appraisals.map(async (app) => {
        const emp = app.employeeId || {};
        let baseSalary = 0;
        try {
          if (emp.employeeId) {
            const payrollRec = await Payroll.findOne({ employeeId: emp.employeeId }).sort({ createdAt: -1 }).lean();
            baseSalary = Number(payrollRec?.ctc || emp.ctc || 0);
          }
        } catch (e) {
          baseSalary = 0;
        }
        
        const existingSalarySnapshot = Number(app.currentSalarySnapshot || 0);
        const derivedSalary = (existingSalarySnapshot > 0) ? existingSalarySnapshot : baseSalary;

        let finalIncrementPercentage = app.incrementPercentage || 0;
        let incrementCorrectionPercentage = app.incrementCorrectionPercentage || 0;
        let incrementAmount = app.incrementAmount || 0;
        let revisedSalary = app.revisedSalary || 0;
        const performancePay = Number(app.performancePay || 0);

        return {
          id: app._id,
          financialYr: app.year,
          empId: emp.employeeId || '',
          name: emp.name || 'Unknown',
          avatar: emp.avatar || (emp.name ? emp.name[0] : '?'),
          designation: emp.designation || '',
          department: emp.department || '',
          division: app.division || emp.division || '',
          location: emp.location || emp.branch || '',
          status: app.status,

          // Appraisal content
          selfAppraiseeComments: app.overallContribution || '',
          managerComments: app.managerComments || '',
          projects: app.projects || [],

          // Full Sectional Objects - Standardized names for all views
          behaviourBased: mapToObj(app.behaviourBased),
          behaviourSelf: mapToObj(app.behaviourBased),
          processAdherence: mapToObj(app.processAdherence),
          processSelf: mapToObj(app.processAdherence),
          technicalBased: mapToObj(app.technicalBased),
          technicalSelf: mapToObj(app.technicalBased),
          growthBased: mapToObj(app.growthBased),
          growthSelf: mapToObj(app.growthBased),

          behaviourManagerComments: app.behaviourManagerComments || '',
          processManagerComments: app.processManagerComments || '',
          technicalManagerComments: app.technicalManagerComments || '',
          growthManagerComments: app.growthManagerComments || '',

          behaviourManagerRatings: mapToObj(app.behaviourManagerRatings),
          processManagerRatings: mapToObj(app.processManagerRatings),
          technicalManagerRatings: mapToObj(app.technicalManagerRatings),
          growthManagerRatings: mapToObj(app.growthManagerRatings),

          keyPerformance: app.keyPerformance || '',
          appraiserRating: app.appraiserRating || '',
          leadership: app.leadership || '',
          attitude: app.attitude || '',
          communication: app.communication || '',

          reviewerComments: app.reviewerComments || '',
          directorComments: app.directorComments || '',
          pushBack: app.pushBack || { isPushedBack: false },
          currentSalary: derivedSalary,
          incrementPercentage: finalIncrementPercentage,
          incrementCorrectionPercentage,
          incrementAmount,
          revisedSalary,
          performancePay,
          effectiveDate: app.effectiveDate,
          
          promotion: app.promotion || { recommended: false, newDesignation: '' },
          releaseSalarySnapshot: mapToObj(app.releaseSalarySnapshot),
          releaseRevisedSnapshot: mapToObj(app.releaseRevisedSnapshot)
        };
      })
    );

    res.json(formattedAppraisals);
  } catch (error) {
    console.error('Error fetching reviewer appraisals:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @desc    Update reviewer appraisal
// @route   PUT /api/performance/reviewer/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      reviewerComments,
      incrementPercentage,
      incrementCorrectionPercentage,
      incrementAmount,
      revisedSalary,
      performancePay,
      effectiveDate,
      behaviourManagerComments, processManagerComments, technicalManagerComments, growthManagerComments,
      keyPerformance, leadership, attitude, communication,
      behaviourManagerRatings, processManagerRatings, technicalManagerRatings, growthManagerRatings,
      promotion,
      managerComments, appraiserRating
    } = req.body;

    let appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ success: false, message: 'Not found' });

    // Validation: Ensure manager performance rating exists
    const mgrPerfRating = String(appraisal.managerReview?.performanceRating || appraisal.appraiserRating || '').trim();
    if (!mgrPerfRating) {
      return res.status(400).json({ success: false, message: 'Manager performance rating missing. Please request manager to provide rating.' });
    }
    
    // Validation: Matrix must be configured for this year/designation
    try {
      const empProfile = await Employee.findById(appraisal.employeeId).lean();
      const basePct = await calculateIncrement(appraisal.year, String(empProfile?.designation || ''), mgrPerfRating);
      if (!basePct || Number(basePct) === 0) {
        return res.status(400).json({ success: false, message: 'Matrix not configured for this designation/year. Please configure Increment Matrix.' });
      }
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Matrix not configured or lookup failed.' });
    }

    if (reviewerComments !== undefined) appraisal.reviewerComments = reviewerComments;
    
    // Financials (Reviewer can also refine these)
    if (incrementPercentage !== undefined) appraisal.incrementPercentage = incrementPercentage;
    if (incrementCorrectionPercentage !== undefined) appraisal.incrementCorrectionPercentage = incrementCorrectionPercentage;
    if (incrementAmount !== undefined) appraisal.incrementAmount = incrementAmount;
    if (revisedSalary !== undefined) appraisal.revisedSalary = revisedSalary;
    if (performancePay !== undefined) appraisal.performancePay = performancePay;
    if (effectiveDate !== undefined) appraisal.effectiveDate = effectiveDate;
    
    // Sectional Comments override? (Sometimes reviewer tweaks them)
    if (behaviourManagerComments !== undefined) appraisal.behaviourManagerComments = behaviourManagerComments;
    if (processManagerComments !== undefined) appraisal.processManagerComments = processManagerComments;
    if (technicalManagerComments !== undefined) appraisal.technicalManagerComments = technicalManagerComments;
    if (growthManagerComments !== undefined) appraisal.growthManagerComments = growthManagerComments;
    
    // Qualitative Assessments
    if (keyPerformance !== undefined) appraisal.keyPerformance = keyPerformance;
    if (leadership !== undefined) appraisal.leadership = leadership;
    if (attitude !== undefined) appraisal.attitude = attitude;
    if (communication !== undefined) appraisal.communication = communication;

    // Granular Ratings
    if (behaviourManagerRatings !== undefined) appraisal.behaviourManagerRatings = behaviourManagerRatings;
    if (processManagerRatings !== undefined) appraisal.processManagerRatings = processManagerRatings;
    if (technicalManagerRatings !== undefined) appraisal.technicalManagerRatings = technicalManagerRatings;
    if (growthManagerRatings !== undefined) appraisal.growthManagerRatings = growthManagerRatings;
    if (managerComments !== undefined) appraisal.managerComments = managerComments;
    if (appraiserRating !== undefined) appraisal.appraiserRating = appraiserRating;

    if (promotion) {
      appraisal.promotion = { ...appraisal.promotion, ...promotion };
    }

    if (appraisal.currentSalarySnapshot === 0 || !appraisal.currentSalarySnapshot) {
      if (req.body.currentSalary) appraisal.currentSalarySnapshot = Number(req.body.currentSalary);
    }

    appraisal.updatedAt = Date.now();
    await appraisal.save();
    res.json(appraisal);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Mark appraisal as "Under Review" (Manager)
// @route   POST /api/performance/reviewer/:id/open
router.post('/:id/open', auth, async (req, res) => {
  try {
    const appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ success: false, message: 'Not found' });

    if (appraisal.status === 'reviewerPending' || appraisal.status === 'managerApproved') {
      appraisal.status = 'reviewerInProgress';
      appraisal.updatedAt = Date.now();
      await appraisal.save();
    }
    res.json({ success: true, status: appraisal.status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Submit appraisals to Director
// @route   POST /api/performance/reviewer/submit-director
router.post('/submit-director', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No records selected' });
    }

    await SelfAppraisal.updateMany(
      { _id: { $in: ids } },
      { 
        $set: { 
          status: 'reviewerApproved', 
          updatedAt: Date.now() 
        } 
      }
    );

    // Add Audit Log
    for (const id of ids) {
      const appraisal = await SelfAppraisal.findById(id);
      if (appraisal) {
        await AuditLog.create({
          employeeId: appraisal.employeeId,
          appraisalId: appraisal._id,
          action: 'REVIEWER_SUBMITTED',
          role: 'Reviewer',
          doneBy: req.user.name,
          doneById: req.user.employeeId
        });
      }
    }

    res.json({ success: true, message: `${ids.length} records submitted to Director` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
