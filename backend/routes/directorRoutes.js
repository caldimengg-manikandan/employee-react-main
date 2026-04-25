const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SelfAppraisal = require('../models/SelfAppraisal');
const Employee = require('../models/Employee');
const Payroll = require('../models/Payroll');

// @desc    Get appraisals for Director (DirectorApproval status or all)
// @route   GET /api/performance/director
// @access  Private (Director/Admin)
router.get('/', auth, async (req, res) => {
  try {
    const statusFilter = { $in: ['REVIEWER_COMPLETED', 'DIRECTOR_APPROVED', 'Released Letter', 'RELEASED', 'Reviewed', 'Accepted'] };

    const role = (req.user.role || '').toLowerCase();
    const isDirector = role === 'director';
    const isAdmin = role === 'admin';

    if (!isDirector && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view director appraisals' });
    }

    const query = {
      $and: [
        { status: statusFilter },
        {
          $or: [
            { directorId: req.user.employeeId },
            { director: req.user.name }
          ]
        }
      ]
    };

    const appraisals = await SelfAppraisal.find(query)
      .populate('employeeId', 'name employeeId designation department division avatar ctc location branch');

    const formattedAppraisals = await Promise.all(
      appraisals.map(async (app) => {
        const emp = app.employeeId || {};

        let baseSalary = 0;
        try {
          if (emp.employeeId) {
            const payrollRec = await Payroll.findOne({ employeeId: emp.employeeId }).sort({ createdAt: -1 }).lean();
            if (payrollRec && (payrollRec.ctc || payrollRec.totalEarnings || payrollRec.basicDA || payrollRec.hra || payrollRec.specialAllowance || payrollRec.gratuity)) {
              const ctcFromPayroll = Number(payrollRec.ctc || 0);
              if (ctcFromPayroll > 0) {
                baseSalary = ctcFromPayroll;
              } else {
                const basic = Number(payrollRec.basicDA || 0);
                const hra = Number(payrollRec.hra || 0);
                const spec = Number(payrollRec.specialAllowance || 0);
                const grat = Number(payrollRec.gratuity || 0);
                const computedCtc = basic + hra + spec + grat;
                baseSalary = computedCtc > 0 ? computedCtc : 0;
              }
            }
          }
        } catch (e) {
          baseSalary = 0;
        }
        if (baseSalary === 0) {
          baseSalary = Number(emp.ctc || 0);
        }
        const existingSalarySnapshot = Number(app.currentSalarySnapshot || 0);
        const derivedSalary = (existingSalarySnapshot > 0) ? existingSalarySnapshot : baseSalary;
        
        if (derivedSalary > 0 && existingSalarySnapshot !== derivedSalary) {
          try {
            await SelfAppraisal.updateOne(
              { _id: app._id },
              { $set: { currentSalarySnapshot: derivedSalary } }
            );
          } catch (e) {}
        }

        const incrementPercentage = Number(app.incrementPercentage || 0);
        const incrementCorrectionPercentage = Number(app.incrementCorrectionPercentage || 0);
        let incrementAmount = Number(app.incrementAmount || 0);
        let revisedSalary = Number(app.revisedSalary || 0);

        if (derivedSalary > 0) {
          const totalPct = incrementPercentage + incrementCorrectionPercentage;
          const updateDoc = {};

          if ((!incrementAmount || incrementAmount === 0) && totalPct !== 0) {
            incrementAmount = Math.round((derivedSalary * totalPct) / 100);
            updateDoc.incrementAmount = incrementAmount;
          }

          if ((!revisedSalary || revisedSalary === 0) && (incrementAmount !== 0 || totalPct !== 0)) {
            revisedSalary = Math.round(derivedSalary + incrementAmount);
            updateDoc.revisedSalary = revisedSalary;
          }

          if (Object.keys(updateDoc).length > 0) {
            try {
              await SelfAppraisal.updateOne({ _id: app._id }, { $set: updateDoc });
            } catch (err) {}
          }
        }

        return {
          id: app._id,
          financialYr: app.year,
          employeeMongoId: emp._id,
          empId: emp.employeeId || '',
          name: emp.name || 'Unknown',
          avatar: emp.avatar || (emp.name ? emp.name[0] : '?'),
          designation: emp.designation || '',
          department: emp.department || '',
          division: app.division || emp.division || '',
          location: emp.location || emp.branch || 'Chennai',
          status: app.status,

          selfAppraiseeComments: app.overallContribution || '',
          managerComments: app.managerComments || '',

          reviewerComments: app.reviewerComments || '',
          directorComments: app.directorComments || '',
          currentSalary: derivedSalary,
          incrementPercentage,
          incrementCorrectionPercentage,
          incrementAmount,
          revisedSalary,
          performancePay: Number(app.performancePay || 0),

          updatedAt: app.updatedAt
        };
      })
    );

    res.json(formattedAppraisals);
  } catch (error) {
    console.error('Error fetching director appraisals:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @desc    Update appraisal status (Approve/Reject)
// @route   PUT /api/performance/director/:id
// @access  Private (Director/Admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      status,
      directorComments,
      incrementPercentage,
      incrementCorrectionPercentage,
      incrementAmount,
      revisedSalary,
      performancePay
    } = req.body;

    let appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) {
      return res.status(404).json({ success: false, message: 'Appraisal not found' });
    }

    const role = (req.user.role || '').toLowerCase();
    const isDirectorRole = role === 'director';
    const isAdmin = role === 'admin';

    if (!isDirectorRole && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this appraisal' });
    }

    const userEmployeeId = req.user.employeeId;
    const userName = req.user.name;

    const isDirectorAssigned =
      (appraisal.directorId && appraisal.directorId === userEmployeeId) ||
      (appraisal.director && appraisal.director === userName);

    if (!isDirectorAssigned) {
      return res
        .status(403)
        .json({ success: false, message: 'Not authorized to update this appraisal' });
    }

    if (status) {
      appraisal.status = status;
      if (status === 'DIRECTOR_APPROVED' || status === 'Released Letter') {
        appraisal.employeeAcceptanceStatus = 'PENDING';
        appraisal.finalStatus = undefined;
      }
    }
    if (directorComments !== undefined) appraisal.directorComments = directorComments;
    if (incrementPercentage !== undefined) appraisal.incrementPercentage = incrementPercentage;
    if (incrementCorrectionPercentage !== undefined) appraisal.incrementCorrectionPercentage = incrementCorrectionPercentage;
    if (incrementAmount !== undefined) appraisal.incrementAmount = incrementAmount;
    if (revisedSalary !== undefined) appraisal.revisedSalary = revisedSalary;
    if (performancePay !== undefined) appraisal.performancePay = performancePay;

    appraisal.updatedAt = Date.now();
    await appraisal.save();

    res.json(appraisal);
  } catch (error) {
    console.error('Error updating director appraisal:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @desc    Batch Release Appraisals
// @route   POST /api/performance/director/release
// @access  Private (Director/Admin)
router.post('/release', auth, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No records selected' });
    }

    const role = (req.user.role || '').toLowerCase();
    const isDirectorRole = role === 'director';
    const isAdmin = role === 'admin';

    if (!isDirectorRole && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to release appraisals' });
    }

    const userEmployeeId = req.user.employeeId;
    const userName = req.user.name;

    const findQuery = {
      _id: { $in: ids },
      $or: [
        { directorId: userEmployeeId },
        { director: userName }
      ]
    };

    const appraisals = await SelfAppraisal.find(findQuery);

    if (!appraisals.length) {
      return res.status(403).json({ success: false, message: 'No authorized appraisals to release' });
    }

    let modifiedCount = 0;

    for (const appraisal of appraisals) {
      try {
        // Capture salary snapshot at the moment of release so letters remain immutable
        let baseCtc = 0;
        let oldSnapshot = {
          basic: 0,
          hra: 0,
          special: 0,
          gross: 0,
          empPF: 0,
          employerPF: 0,
          net: 0,
          gratuity: 0,
          ctc: 0
        };

        try {
          const emp = await Employee.findById(appraisal.employeeId).select('employeeId').lean();
          const employeeIdStr = emp?.employeeId;
          if (employeeIdStr) {
            const payrollRec = await Payroll.findOne({ employeeId: employeeIdStr }).sort({ createdAt: -1 }).lean();
            if (payrollRec) {
              const basic = Number(payrollRec.basicDA || 0);
              const hra = Number(payrollRec.hra || 0);
              const special = Number(payrollRec.specialAllowance || 0);
              const gross = Number(
                payrollRec.totalEarnings !== undefined
                  ? payrollRec.totalEarnings
                  : basic + hra + special
              );
              const empPF = Number(payrollRec.pf || 0);
              const employerPF = Number(payrollRec.employerPF || payrollRec.pf || 0);
              const net = Number(payrollRec.netSalary || gross);
              const gratuity = Number(payrollRec.gratuity || 0);
              const ctc = Number(
                payrollRec.ctc !== undefined ? payrollRec.ctc : gross + gratuity
              );
              oldSnapshot = { basic, hra, special, gross, empPF, employerPF, net, gratuity, ctc };
            }
          }
        } catch (e) {}

        baseCtc = Number(oldSnapshot.ctc || 0);
        const frozenBase = Number(appraisal.currentSalarySnapshot || 0);

        if (frozenBase > 0 && Math.abs(baseCtc - frozenBase) > 1) {
          // Payroll differs from frozen base - likely already updated by bug or previous action.
          // Normalize proportions to frozenBase.
          const normFactor = frozenBase / baseCtc;
          oldSnapshot = {
            basic: Math.round((oldSnapshot.basic || 0) * normFactor),
            hra: Math.round((oldSnapshot.hra || 0) * normFactor),
            special: Math.round((oldSnapshot.special || 0) * normFactor),
            gross: Math.round((oldSnapshot.gross || 0) * normFactor),
            empPF: oldSnapshot.empPF || 0,
            employerPF: oldSnapshot.employerPF || 0,
            net: Math.round((oldSnapshot.net || 0) * normFactor),
            gratuity: Math.round((oldSnapshot.gratuity || 0) * normFactor),
            ctc: frozenBase
          };
          baseCtc = frozenBase;
        }

        if (!baseCtc && frozenBase) {
          baseCtc = frozenBase;
          oldSnapshot = {
            basic: 0,
            hra: 0,
            special: 0,
            gross: baseCtc,
            empPF: 0,
            employerPF: 0,
            net: baseCtc,
            gratuity: 0,
            ctc: baseCtc
          };
        }

        const totalPct =
          Number(appraisal.incrementPercentage || 0) +
          Number(appraisal.incrementCorrectionPercentage || 0);
        const revisedFromAppraisal = Number(appraisal.revisedSalary || 0);

        let factor = 1;
        if (baseCtc && totalPct > 0) {
          factor = 1 + totalPct / 100;
        } else if (baseCtc && revisedFromAppraisal > 0) {
          factor = revisedFromAppraisal / baseCtc;
        }

        const newSnapshot = {
          basic: Math.round((oldSnapshot.basic || 0) * factor),
          hra: Math.round((oldSnapshot.hra || 0) * factor),
          special: Math.round((oldSnapshot.special || 0) * factor),
          gross: Math.round((oldSnapshot.gross || baseCtc) * factor),
          empPF: oldSnapshot.empPF || 0,
          employerPF: oldSnapshot.employerPF || 0,
          net: Math.round((oldSnapshot.net || baseCtc) * factor),
          gratuity: Math.round((oldSnapshot.gratuity || 0) * factor),
          ctc: Math.round((oldSnapshot.ctc || baseCtc) * factor)
        };

        // Update appraisal with release details
        appraisal.status = 'Released Letter';
        appraisal.employeeAcceptanceStatus = 'PENDING';
        appraisal.finalStatus = undefined;
        appraisal.releaseSalarySnapshot = oldSnapshot;
        appraisal.releaseRevisedSnapshot = newSnapshot;
        appraisal.releaseDate = new Date();
        if (!appraisal.currentSalarySnapshot && baseCtc) {
          appraisal.currentSalarySnapshot = baseCtc;
        }
        appraisal.updatedAt = Date.now();
        await appraisal.save();
      } catch (e) {
        // Even if snapshot fails, still mark as released
        appraisal.status = 'Released Letter';
        appraisal.employeeAcceptanceStatus = 'PENDING';
        appraisal.finalStatus = undefined;
        appraisal.updatedAt = Date.now();
        await appraisal.save();
      }
      modifiedCount++;
    }

    res.json({ success: true, message: `Successfully released ${modifiedCount} appraisals. Salary changes will apply after employee acceptance.` });
  } catch (error) {
    console.error('Error releasing appraisals:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @desc    Revoke an approved/released/accepted appraisal
// @route   POST /api/performance/director/revoke/:id
// @access  Private (Director/Admin)
router.post('/revoke/:id', auth, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Revoke reason is required' });
    }

    let appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) {
      return res.status(404).json({ success: false, message: 'Appraisal not found' });
    }

    const role = (req.user.role || '').toLowerCase();
    const isDirectorRole = role === 'director';
    const isAdmin = role === 'admin';

    if (!isDirectorRole && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to revoke appraisals' });
    }

    // Capture old state
    const oldVersion = appraisal.version || 1;
    const oldStatus = appraisal.status;

    // 1. Mark current appraisal as revoked
    appraisal.revoked = true;
    appraisal.revokedAt = new Date();
    appraisal.revokedReason = reason;
    appraisal.status = 'REVOKED';
    appraisal.isLocked = false;
    await appraisal.save();

    // 2. Mark any related PayrollHistory as REVOKED
    try {
       const PayrollHistory = require('../models/PayrollHistory');
       await PayrollHistory.updateMany(
         { appraisalId: appraisal._id },
         { $set: { status: 'REVOKED' } }
       );
    } catch (e) {
       console.error("Error revoking payroll history:", e);
    }

    // 3. Create a new Appraisal Version
    const newAppraisalData = appraisal.toObject();
    delete newAppraisalData._id;
    delete newAppraisalData.createdAt;
    delete newAppraisalData.updatedAt;
    
    // Reset specific fields for the new version
    newAppraisalData.version = oldVersion + 1;
    newAppraisalData.parentAppraisalId = appraisal._id;
    newAppraisalData.status = 'SUBMITTED'; // Send back to pending review by reviewer
    newAppraisalData.employeeAcceptanceStatus = 'PENDING';
    newAppraisalData.isLocked = false;
    newAppraisalData.revoked = false;
    newAppraisalData.revokedAt = null;
    newAppraisalData.revokedReason = null;
    delete newAppraisalData.releaseLetter;
    delete newAppraisalData.releaseSalarySnapshot;
    delete newAppraisalData.releaseRevisedSnapshot;
    delete newAppraisalData.releaseDate;

    const newAppraisal = new SelfAppraisal(newAppraisalData);
    await newAppraisal.save();

    // 4. Create Audit Log
    try {
      const AuditLog = require('../models/AuditLog');
      const emp = await Employee.findById(appraisal.employeeId).select('employeeId').lean();
      if (emp && emp.employeeId) {
         const log = new AuditLog({
           employeeId: emp.employeeId,
           action: 'REVOKED_APPRAISAL',
           oldVersion: oldVersion,
           newVersion: newAppraisal.version,
           reason: reason,
           doneBy: req.user.name || req.user.employeeId
         });
         await log.save();
      }
    } catch (e) {
      console.error("Error creating audit log:", e);
    }

    res.json({ success: true, message: 'Appraisal revoked successfully and new version created.', newAppraisal });
  } catch (error) {
    console.error('Error revoking appraisal:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

module.exports = router;
