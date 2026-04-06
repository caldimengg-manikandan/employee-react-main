const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const SelfAppraisal = require('../models/SelfAppraisal');
const Employee = require('../models/Employee');
const Payroll = require('../models/Payroll');

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

// Helper to mask manager details until released
const maskManagerData = (app) => {
    const status = (app.status || '').toLowerCase();
    const isReleased = ['released', 'accepted', 'effective', 'completed'].includes(status);
    
    if (!isReleased) {
        return {
            ...app,
            behaviourManagerRatings: {},
            processManagerRatings: {},
            technicalManagerRatings: {},
            growthManagerRatings: {},
            behaviourManagerComments: '',
            processManagerComments: '',
            technicalManagerComments: '',
            growthManagerComments: '',
            managerComments: '',
            appraiserRating: '',
            keyPerformance: '',
            leadership: '',
            attitude: '',
            communication: '',
            incrementPercentage: 0,
            incrementCorrectionPercentage: 0,
            incrementAmount: 0,
            revisedSalary: 0,
            performancePay: 0,
            promotion: { recommended: false, newDesignation: '' },
            releaseSalarySnapshot: {},
            releaseRevisedSnapshot: {}
        };
    }
    return app;
};

// @desc    Get current user's self appraisals
// @route   GET /api/performance/self-appraisals/me
// @access  Private
router.get('/self-appraisals/me', auth, async (req, res) => {
  try {
    const employee = await Employee.findOne({ employeeId: req.user.employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }
    const appraisals = await SelfAppraisal.find({ employeeId: employee._id })
      .sort({ createdAt: -1 });

    const formattedAppraisals = appraisals.map(app => {
        const doc = app.toJSON ? app.toJSON() : app;
        const formatted = {
            ...doc,
            behaviourManagerRatings: mapToObj(app.behaviourManagerRatings),
            processManagerRatings: mapToObj(app.processManagerRatings),
            technicalManagerRatings: mapToObj(app.technicalManagerRatings),
            growthManagerRatings: mapToObj(app.growthManagerRatings),
            releaseSalarySnapshot: mapToObj(app.releaseSalarySnapshot),
            releaseRevisedSnapshot: mapToObj(app.releaseRevisedSnapshot)
        };
        return maskManagerData(formatted);
    });
    res.json(formattedAppraisals);
  } catch (error) {
    console.error('Error fetching my appraisals:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @desc    Get self appraisal by ID
// @route   GET /api/performance/self-appraisals/:id
// @access  Private
router.get('/self-appraisals/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Appraisal ID' });
    }
    const appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) {
      return res.status(404).json({ success: false, message: 'Appraisal not found' });
    }
    const employee = await Employee.findOne({ employeeId: req.user.employeeId });
    if (!employee) {
       return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const doc = appraisal.toJSON ? appraisal.toJSON() : appraisal;
    const formattedAppraisal = {
        ...doc,
        behaviourManagerRatings: mapToObj(appraisal.behaviourManagerRatings),
        processManagerRatings: mapToObj(appraisal.processManagerRatings),
        technicalManagerRatings: mapToObj(appraisal.technicalManagerRatings),
        growthManagerRatings: mapToObj(appraisal.growthManagerRatings),
        releaseSalarySnapshot: mapToObj(appraisal.releaseSalarySnapshot),
        releaseRevisedSnapshot: mapToObj(appraisal.releaseRevisedSnapshot)
    };
    
    // Safety check: only mask if the requester is the employee themselves
    // (Managers fetching team appraisals use teamAppraisalRoutes.js)
    res.json(maskManagerData(formattedAppraisal));
  } catch (error) {
    console.error('Error fetching appraisal:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @desc    Create a self appraisal
// @route   POST /api/performance/self-appraisals
// @access  Private
router.post('/self-appraisals', auth, async (req, res) => {
  try {
    const { 
      year, 
      division,
      projects, 
      overallContribution, 
      status,
      behaviourBased,
      processAdherence,
      technicalBased,
      growthBased
    } = req.body;

    if (!division || !division.trim()) {
      return res.status(400).json({ success: false, message: 'Division is required for self appraisal' });
    }

    const employee = await Employee.findOne({ employeeId: req.user.employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    // Check if appraisal for this year already exists
    const existing = await SelfAppraisal.findOne({ 
      employeeId: employee._id, 
      year 
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `Appraisal for FY ${year} already exists` });
    }

    // Resolve Workflow IDs based on Employee profile
    let appraiserId = null, reviewerId = null, directorId = null;
    
    if (employee.appraiser) {
        const appraiserUser = await Employee.findOne({ name: { $regex: new RegExp(`^${employee.appraiser}$`, 'i') } });
        if (appraiserUser) appraiserId = appraiserUser.employeeId;
    }
    if (employee.reviewer) {
        const reviewerUser = await Employee.findOne({ name: { $regex: new RegExp(`^${employee.reviewer}$`, 'i') } });
        if (reviewerUser) reviewerId = reviewerUser.employeeId;
    }
    if (employee.director) {
        const directorUser = await Employee.findOne({ name: { $regex: new RegExp(`^${employee.director}$`, 'i') } });
        if (directorUser) directorId = directorUser.employeeId;
    }

    const newAppraisal = new SelfAppraisal({
      employeeId: employee._id,
      year,
      division,
      projects,
      overallContribution,
      status: (status || 'draft').toLowerCase(),
      behaviourBased,
      processAdherence,
      technicalBased,
      growthBased,
      appraiser: employee.appraiser || 'Pending Assignment',
      appraiserId,
      reviewer: employee.reviewer,
      reviewerId,
      director: employee.director,
      directorId
    });

    await newAppraisal.save();

    res.status(201).json(newAppraisal);
  } catch (error) {
    console.error('Error creating appraisal:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

const AuditLog = require('../models/AuditLog');

// @desc    Update a self appraisal
// @route   PUT /api/performance/self-appraisals/:id
router.put('/self-appraisals/:id', auth, async (req, res) => {
  try {
    const { projects, overallContribution, status, division, behaviourBased, processAdherence, technicalBased, growthBased, employeeAcceptanceStatus } = req.body;

    let appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ success: false, message: 'Not found' });

    const employee = await Employee.findOne({ employeeId: req.user.employeeId });
    if (!employee || appraisal.employeeId.toString() !== employee._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (projects) appraisal.projects = projects;
    if (overallContribution !== undefined) appraisal.overallContribution = overallContribution;
    if (division !== undefined) appraisal.division = division;
    if (behaviourBased !== undefined) appraisal.behaviourBased = behaviourBased;
    if (processAdherence !== undefined) appraisal.processAdherence = processAdherence;
    if (technicalBased !== undefined) appraisal.technicalBased = technicalBased;
    if (growthBased !== undefined) appraisal.growthBased = growthBased;

    // Submission Logic
    if (status === 'submitted') {
        appraisal.status = 'submitted';
        appraisal.workflow.submittedAt = new Date();
        
        // Refresh routing from Employee profile
        if (employee.appraiser) {
            const appraiserUser = await Employee.findOne({ name: { $regex: new RegExp(`^${employee.appraiser}$`, 'i') } });
            if (appraiserUser) appraisal.appraiserId = appraiserUser.employeeId;
            appraisal.appraiser = employee.appraiser;
        }
        if (employee.director) {
            const directorUser = await Employee.findOne({ name: { $regex: new RegExp(`^${employee.director}$`, 'i') } });
            if (directorUser) appraisal.directorId = directorUser.employeeId;
            appraisal.director = employee.director;
        }

        await AuditLog.create({
          employeeId: appraisal.employeeId,
          appraisalId: appraisal._id,
          action: 'SUBMITTED',
          role: 'Employee',
          doneBy: req.user.name,
          doneById: req.user.employeeId
        });
    } else if (status) {
        appraisal.status = status;
    }

    // Acceptance Logic
    if (employeeAcceptanceStatus === 'ACCEPTED') {
      appraisal.status = 'effective';
      appraisal.workflow.acceptedAt = new Date();
      appraisal.isLocked = true;

      await AuditLog.create({
        employeeId: appraisal.employeeId,
        appraisalId: appraisal._id,
        action: 'ACCEPTED',
        role: 'Employee',
        doneBy: req.user.name,
        doneById: req.user.employeeId
      });

      // ---- Update Employee and Payroll Salary Structure ---- //
      try {
        const revised = mapToObj(appraisal.releaseRevisedSnapshot) || {};
        
        const updateData = {
          designation: appraisal.promotion?.recommended && appraisal.promotion?.newDesignation 
             ? appraisal.promotion.newDesignation 
             : employee.designation,
          basicDA: revised.basic || revised.basicDA || 0,
          hra: revised.hra || 0,
          specialAllowance: revised.special || revised.specialAllowance || 0,
          gratuity: revised.gratuity || 0,
          pf: revised.empPF || revised.pf || 0,
          employerPF: revised.employerPF || 0,
          netSalary: revised.net || revised.netSalary || appraisal.revisedSalary || 0,
          ctc: revised.ctc || appraisal.revisedSalary || 0,
          updatedAt: new Date()
        };

        // Update Employee Model
        await Employee.findByIdAndUpdate(employee._id, { $set: updateData });

        // Update main Payroll Model
        await Payroll.findOneAndUpdate(
          { employeeId: employee.employeeId },
          { $set: {
              ...updateData,
              employeeName: employee.name || employee.employeename,
              department: employee.department,
              location: employee.location,
              accountNumber: employee.bankAccount || '-'
            } 
          },
          { upsert: true }
        );

        // ---- Legacy snapshot update for FY collection ---- //
        await mongoose.connection.db.collection('payroll_FY25-26').updateOne(
           { employeeId: employee.employeeId },
           { $set: {
               ...updateData,
               employeeName: employee.name || employee.employeename,
               department: employee.department,
               location: employee.location,
               dateOfJoining: employee.dateOfJoining,
               employmentType: employee.employmentType || 'Permanent',
               accountNumber: employee.bankAccount || '-'
             } 
           },
           { upsert: true }
        );
      } catch (err) {
        console.error('Failed to update employee/payroll salary structure:', err);
      }
      // ----------------------------------------------------- //
    }

    await appraisal.save();
    res.json(appraisal);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete a self appraisal
// @route   DELETE /api/performance/self-appraisals/:id
// @access  Private
router.delete('/self-appraisals/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Appraisal ID' });
    }

    const appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) {
      return res.status(404).json({ success: false, message: 'Appraisal not found' });
    }

    // Check ownership
    const employee = await Employee.findOne({ employeeId: req.user.employeeId });
    if (appraisal.employeeId.toString() !== employee._id.toString()) {
       return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await SelfAppraisal.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Appraisal deleted' });
  } catch (error) {
    console.error('Error deleting appraisal:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @desc    Calculate suggested increment based on rating and designation
// @route   POST /api/performance/calculate-increment
router.post('/calculate-increment', auth, async (req, res) => {
  try {
    const { designation, rating } = req.body;
    
    // Standard metric logic (can be moved to DB later)
    let percentage = 0;
    const isTrainee = String(designation || '').toLowerCase().includes('trainee');

    if (isTrainee) {
      switch (rating) {
        case 'ES': percentage = 15; break;
        case 'ME': percentage = 10; break;
        case 'BE': percentage = 0; break;
        default: percentage = 0;
      }
    } else {
      switch (rating) {
        case 'ES': percentage = 12; break;
        case 'ME': percentage = 8; break;
        case 'BE': percentage = 0; break;
        default: percentage = 0;
      }
    }

    res.json({ success: true, percentage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
