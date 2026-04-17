const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SelfAppraisal = require('../models/SelfAppraisal');
const Employee = require('../models/Employee');
const Payroll = require('../models/Payroll');
const PayrollHistory = require('../models/PayrollHistory');
const AuditLog = require('../models/AuditLog');

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

// @desc    Get director's queue (Manager Approved records)
// @route   GET /api/performance/director
// @access  Private (Director/Admin)
router.get('/', auth, async (req, res) => {
  try {
    const tab = (req.query.tab || 'pending').toLowerCase();
    let statusFilter = {};
    const role = (req.user.role || '').toLowerCase();
    const isAdmin = role === 'admin';
    const isDirector = role === 'director';

    if (tab === 'completed') {
      statusFilter = { $in: ['released', 'accepted', 'effective', 'COMPLETED'] };
    } else {
      const basePending = ['reviewerApproved', 'directorInProgress', 'directorApproved', 'DIRECTOR_APPROVED'];

      // If Admin, also show what is with the manager or reviewer (submitted / in progress)
      if (isAdmin) {
        basePending.push('submitted', 'managerInProgress', 'managerApproved', 'reviewerPending', 'reviewerInProgress', 'directorPushedBack');
      }

      statusFilter = { $in: basePending };
    }

    if (!isDirector && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const query = {
      $and: [
        { status: statusFilter },
        isAdmin ? {} : {
          $or: [
            { directorId: req.user.employeeId },
            { director: { $regex: new RegExp(`^${req.user.name}$`, 'i') } }
          ]
        }
      ]
    };

    const appraisals = await SelfAppraisal.find(query)
      .populate('employeeId', 'name employeeId designation department division avatar ctc location branch status');

    const formattedAppraisals = await Promise.all(appraisals.map(async (app) => {
      const emp = app.employeeId || {};
      const derivedSalary = Number(app.currentSalarySnapshot || 0);

      return {
        id: app._id,
        financialYr: app.year,
        employeeMongoId: emp._id,
        empId: emp.employeeId || '',
        name: emp.name || 'Unknown',
        avatar: emp.avatar || '',
        designation: emp.designation || '',
        department: emp.department || '',
        division: app.division || emp.division || '',
        location: emp.location || emp.branch || '',
        status: app.status,
        employeeStatus: emp.status || 'Active',

        selfAppraiseeComments: app.overallContribution || '',
        managerComments: app.managerComments || '',
        reviewerComments: app.reviewerComments || '',
        directorComments: app.directorComments || '',

        currentSalary: derivedSalary,
        incrementPercentage: app.incrementPercentage || 0,
        incrementCorrectionPercentage: app.incrementCorrectionPercentage || 0,
        incrementAmount: app.incrementAmount || 0,
        revisedSalary: app.revisedSalary || 0,
        performancePay: Number(app.performancePay || 0),

        promotion: app.promotion || { recommended: false, newDesignation: '' },
        pushBack: app.pushBack || { isPushedBack: false },

        directorName: app.director || '',
        directorSignature: (app.director === 'Bala Krishnan') ? 'balaSignature' : (app.director === 'Uvaraj') ? 'uvarajSignature' : '',

        // Employee's Assessment Data (Original names and Aliases)
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

        // Include Manager Ratings and Overrides
        behaviourManagerRatings: mapToObj(app.behaviourManagerRatings),
        processManagerRatings: mapToObj(app.processManagerRatings),
        technicalManagerRatings: mapToObj(app.technicalManagerRatings),
        growthManagerRatings: mapToObj(app.growthManagerRatings),

        behaviourManagerComments: app.behaviourManagerComments || '',
        processManagerComments: app.processManagerComments || '',
        technicalManagerComments: app.technicalManagerComments || '',
        growthManagerComments: app.growthManagerComments || '',

        keyPerformance: app.keyPerformance || '',
        leadership: app.leadership || '',
        attitude: app.attitude || '',
        communication: app.communication || '',
        appraiserRating: app.appraiserRating || '',
        releaseSalarySnapshot: mapToObj(app.releaseSalarySnapshot),
        releaseRevisedSnapshot: mapToObj(app.releaseRevisedSnapshot),
        // Fix: Explicitly map promotion fields for Director dashboard display
        promotionRecommendedByReviewer: app.promotion?.recommended || false,
        newDesignation: app.promotion?.newDesignation || ''
      };
    }));

    res.json(formattedAppraisals);
  } catch (error) {
    console.error('Error fetching director queue:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @desc    Update appraisal details (as Director)
// @route   PUT /api/performance/director/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ success: false, message: 'Not found' });

    // Check Employee status before director update
    const appraisalEmployee = await Employee.findById(appraisal.employeeId);
    if (appraisalEmployee && appraisalEmployee.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Employee is not active. Cannot process appraisal for inactive or exited employees.' });
    }

    const {
      directorComments,
      incrementPercentage,
      incrementCorrectionPercentage,
      incrementAmount,
      revisedSalary,
      performancePay,
      behaviourManagerComments, processManagerComments, technicalManagerComments, growthManagerComments,
      keyPerformance, leadership, attitude, communication,
      behaviourManagerRatings, processManagerRatings, technicalManagerRatings, growthManagerRatings,
      effectiveDate,
      promotion,
      managerComments, appraiserRating
    } = req.body;

    if (directorComments !== undefined) appraisal.directorComments = directorComments;
    if (incrementPercentage !== undefined) appraisal.incrementPercentage = incrementPercentage;
    if (incrementCorrectionPercentage !== undefined) appraisal.incrementCorrectionPercentage = incrementCorrectionPercentage;
    if (incrementAmount !== undefined) appraisal.incrementAmount = incrementAmount;
    if (revisedSalary !== undefined) appraisal.revisedSalary = revisedSalary;
    if (performancePay !== undefined) appraisal.performancePay = performancePay;
    if (effectiveDate !== undefined) appraisal.effectiveDate = effectiveDate;

    // Direct overrides if director tweaks them
    if (behaviourManagerComments !== undefined) appraisal.behaviourManagerComments = behaviourManagerComments;
    if (processManagerComments !== undefined) appraisal.processManagerComments = processManagerComments;
    if (technicalManagerComments !== undefined) appraisal.technicalManagerComments = technicalManagerComments;
    if (growthManagerComments !== undefined) appraisal.growthManagerComments = growthManagerComments;

    // Dynamic Manager Ratings (Director can override)
    if (behaviourManagerRatings !== undefined) appraisal.behaviourManagerRatings = behaviourManagerRatings;
    if (processManagerRatings !== undefined) appraisal.processManagerRatings = processManagerRatings;
    if (technicalManagerRatings !== undefined) appraisal.technicalManagerRatings = technicalManagerRatings;
    if (growthManagerRatings !== undefined) appraisal.growthManagerRatings = growthManagerRatings;
    if (managerComments !== undefined) appraisal.managerComments = managerComments;
    if (appraiserRating !== undefined) appraisal.appraiserRating = appraiserRating;

    // Qualitative assessments
    if (keyPerformance !== undefined) appraisal.keyPerformance = keyPerformance;
    if (leadership !== undefined) appraisal.leadership = leadership;
    if (attitude !== undefined) appraisal.attitude = attitude;
    if (communication !== undefined) appraisal.communication = communication;

    if (promotion) {
      appraisal.promotion = { ...(appraisal.promotion || {}), ...promotion };
    }

    if (appraisal.currentSalarySnapshot === 0 || !appraisal.currentSalarySnapshot) {
      // Use numeric value from body if it is purely for initial snap
      if (req.body.currentSalary) appraisal.currentSalarySnapshot = Number(req.body.currentSalary);
    }

    await appraisal.save();
    res.json({ success: true, appraisal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Mark appraisal as "Under Review" (Director)
// @route   POST /api/performance/director/:id/open
router.post('/:id/open', auth, async (req, res) => {
  try {
    const appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ success: false, message: 'Not found' });

    if (appraisal.status === 'reviewerApproved') {
      appraisal.status = 'directorInProgress';
      appraisal.updatedAt = Date.now();
      await appraisal.save();
    }
    res.json({ success: true, status: appraisal.status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Push Back to Manager
// @route   POST /api/performance/director/:id/push-back
router.post('/:id/push-back', auth, async (req, res) => {
  try {
    const appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ success: false, message: 'Not found' });

    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Reason for push-back is required' });
    }

    appraisal.status = 'directorPushedBack';
    appraisal.pushBack = {
      isPushedBack: true,
      reason: reason,
      pushedBy: 'director',
      pushedAt: new Date()
    };

    await appraisal.save();

    res.json({ success: true, message: 'Appraisal pushed back to Reviewer for correction' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Approve Final (Director Approve)
// @route   POST /api/performance/director/:id/approve
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const appraisal = await SelfAppraisal.findById(req.params.id).populate('employeeId');
    if (!appraisal) return res.status(404).json({ success: false, message: 'Not found' });

    if (appraisal.employeeId && appraisal.employeeId.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Employee is not active. Cannot approve appraisal for inactive or exited employees.' });
    }

    appraisal.status = 'directorApproved';
    if (!appraisal.workflow) appraisal.workflow = {};
    appraisal.workflow.directorApprovedAt = new Date();

    await appraisal.save();
    res.json({ success: true, message: 'Appraisal officially approved by Director' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Reject Appraisal
// @route   POST /api/performance/director/:id/reject
router.post('/:id/reject', auth, async (req, res) => {
  try {
    const appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ success: false, message: 'Not found' });

    appraisal.status = 'rejected';
    await appraisal.save();
    res.json({ success: true, message: 'Appraisal officially rejected' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Batch Release Appraisals
// @route   POST /api/performance/director/release
router.post('/release', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No records selected' });
    }

    const appraisals = await SelfAppraisal.find({ _id: { $in: ids }, status: 'directorApproved' })
      .populate('employeeId', 'employeeId name ctc status');

    if (!appraisals.length) {
      return res.status(403).json({ success: false, message: 'No eligible appraisals (directorApproved) to release' });
    }

    // Check if any employee is inactive among the selected ones
    const inactiveFound = appraisals.some(app => app.employeeId && app.employeeId.status !== 'Active');
    if (inactiveFound) {
      return res.status(400).json({ success: false, message: 'Some selected employees are not active. Cannot release appraisals for inactive or exited employees.' });
    }

    const allPayroll = await Payroll.find({});

    let modifiedCount = 0;
    for (const appraisal of appraisals) {
      const empId = appraisal.employeeId?.employeeId || appraisal.empId;
      const baseCtc = Number(appraisal.currentSalary || appraisal.salary || appraisal.currentSalarySnapshot || appraisal.employeeId?.ctc || 0);

      // Find payroll record
      const payrollRecord = allPayroll.find(p => String(p.employeeId || '').toLowerCase() === String(empId || '').toLowerCase());

      const calculateSalaryAnnexure = (gross) => {
        const grossVal = Math.round(gross || 0);
        const basic = Math.round(grossVal * 0.50);
        const hra = Math.round(basic * 0.50);
        const specialInitial = Math.round(basic * 0.50);
        
        const employerPF = 1950;
        const employeePF = 1800;
        
        const special = Math.max(0, specialInitial - employeePF - employerPF);
        const net = basic + hra + special;
        const gratuity = Math.round(basic * 0.0486);
        const ctc = net + employeePF + employerPF + gratuity;

        return {
          basic,
          hra,
          special,
          net,
          empPF: employeePF,
          gross: grossVal,
          employerPF,
          gratuity,
          ctc: Math.round(ctc)
        };
      };

      const salaryOld = calculateSalaryAnnexure(baseCtc);
      
      const totalPct = Number(appraisal.incrementPercentage || 0) + Number(appraisal.incrementCorrectionPercentage || 0);
      let revisedGross = Number(appraisal.revisedSalary || (baseCtc * (1 + totalPct / 100)));

      // Safety check: Ensure revised is not lower than current
      if (revisedGross < baseCtc && totalPct > 0) {
        revisedGross = Math.round(baseCtc * (1 + totalPct / 100));
      }
      if (revisedGross < baseCtc) revisedGross = baseCtc;

      const salaryNew = calculateSalaryAnnexure(revisedGross);


      appraisal.status = 'released';
      if (!appraisal.workflow) appraisal.workflow = {};
      appraisal.workflow.releasedAt = new Date();

      // Use .set() and markModified for Map fields to ensure persistence
      appraisal.set('releaseSalarySnapshot', salaryOld);
      appraisal.set('releaseRevisedSnapshot', salaryNew);
      appraisal.markModified('releaseSalarySnapshot');
      appraisal.markModified('releaseRevisedSnapshot');

      appraisal.releaseDate = new Date();
      appraisal.revisedSalary = Number(revisedGross); // Ensure this is also synced

      if (appraisal.promotion?.recommended && appraisal.promotion?.newDesignation) {
        appraisal.promotion.approvedBy = 'director';
      }

      await appraisal.save();

      await AuditLog.create({
        employeeId: appraisal.employeeId?._id || appraisal.employeeId,
        appraisalId: appraisal._id,
        action: 'RELEASED',
        role: 'Director',
        doneBy: req.user.name,
        doneById: req.user.employeeId
      });
      modifiedCount++;
    }

    res.json({ success: true, message: `Successfully released ${modifiedCount} appraisals.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update Promotion Details
// @route   POST /api/performance/director/:id/promotion
router.post('/:id/promotion', auth, async (req, res) => {
  try {
    const appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ success: false, message: 'Not found' });

    const { recommended, remarks, effectiveDate, newDesignation } = req.body;

    appraisal.promotion = {
      ...appraisal.promotion,
      recommended: recommended !== undefined ? recommended : appraisal.promotion.recommended,
      remarksDirector: remarks || appraisal.promotion.remarksDirector,
      effectiveDate: effectiveDate || appraisal.promotion.effectiveDate,
      newDesignation: newDesignation || appraisal.promotion.newDesignation
    };

    await appraisal.save();
    res.json({ success: true, appraisal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Revoke and Restore (Undo finalize and create editable clone)
// @route   POST /api/performance/director/revoke/:id
router.post('/revoke/:id', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Reason for revocation is required' });
    }

    const appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ success: false, message: 'Appraisal not found' });

    // 1. Mark current record as REVOKED
    appraisal.revoked = true;
    appraisal.revokedAt = new Date();
    appraisal.revokedReason = reason;
    appraisal.status = 'revoked';
    appraisal.isLocked = true; // Block original after revocation
    await appraisal.save();

    // 2. Undo Payroll History if finalized
    if (appraisal.payrollProcessed === true) {
      await PayrollHistory.deleteOne({ appraisalId: appraisal._id });
      // Restore previous record for this employee (set effectiveTo to null)
      const previous = await PayrollHistory.findOne({
        employeeId: appraisal.employeeId,
        effectiveTo: { $ne: null }
      }).sort({ effectiveTo: -1 });

      if (previous) {
        previous.effectiveTo = null;
        await previous.save();
      }
    }

    // 3. Create Audit Trail for revocation
    await AuditLog.create({
      employeeId: appraisal.employeeId,
      appraisalId: appraisal._id,
      action: 'REVOKED',
      role: 'Director',
      reason: reason,
      doneBy: req.user.name,
      doneById: req.user.employeeId
    });

    // 4. Create CLONE for new workflow (version incremented)
    const cloneData = appraisal.toObject();
    delete cloneData._id;
    delete cloneData.createdAt;
    delete cloneData.updatedAt;

    const newAppraisal = new SelfAppraisal({
      ...cloneData,
      status: 'managerApproved', // Send back to editable Director state
      revoked: false,
      revokedAt: null,
      revokedReason: null,
      isLocked: false,
      version: (appraisal.version || 1) + 1,
      parentAppraisalId: appraisal._id,
      payrollProcessed: false,
      workflow: {
        submittedAt: appraisal.workflow?.submittedAt,
        managerApprovedAt: appraisal.workflow?.managerApprovedAt
      }
    });

    await newAppraisal.save();

    res.json({
      success: true,
      message: 'Appraisal safely revoked. A new version is available for corrections.',
      newAppraisalId: newAppraisal._id
    });

  } catch (err) {
    console.error('Revocation Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
