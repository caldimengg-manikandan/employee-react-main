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

        const incrementPercentage = Number(app.incrementPercentage || 0);
        const incrementCorrectionPercentage = Number(app.incrementCorrectionPercentage || 0);
        let incrementAmount = Number(app.incrementAmount || 0);
        let revisedSalary = Number(app.revisedSalary || 0);

        if (baseSalary > 0) {
          const totalPct = incrementPercentage + incrementCorrectionPercentage;
          const updateDoc = {};

          if ((!incrementAmount || incrementAmount === 0) && totalPct !== 0) {
            incrementAmount = Math.round((baseSalary * totalPct) / 100);
            updateDoc.incrementAmount = incrementAmount;
          }

          if ((!revisedSalary || revisedSalary === 0) && (incrementAmount !== 0 || totalPct !== 0)) {
            revisedSalary = Math.round(baseSalary + incrementAmount);
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
          currentSalary: baseSalary,
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

    const updatePayrollFromRevisedSalary = async () => {
      if (!(appraisal.revisedSalary > 0)) return;
      const emp = await Employee.findById(appraisal.employeeId).select('employeeId').lean();
      const employeeIdStr = emp?.employeeId;
      if (!employeeIdStr) return;

      const payrollRec = await Payroll.findOne({ employeeId: employeeIdStr }).sort({ createdAt: -1 });
      if (!payrollRec) return;

      const currentCtc = Number(
        payrollRec.ctc ||
          (Number(payrollRec.basicDA || 0) +
            Number(payrollRec.hra || 0) +
            Number(payrollRec.specialAllowance || 0) +
            Number(payrollRec.gratuity || 0)) ||
          0
      );
      if (!(currentCtc > 0)) return;

      const factor = Number(appraisal.revisedSalary) / currentCtc;
      if (!Number.isFinite(factor) || factor <= 0) return;

      payrollRec.basicDA = Math.round(Number(payrollRec.basicDA || 0) * factor);
      payrollRec.hra = Math.round(Number(payrollRec.hra || 0) * factor);
      payrollRec.specialAllowance = Math.round(Number(payrollRec.specialAllowance || 0) * factor);
      payrollRec.gratuity = Math.round(Number(payrollRec.gratuity || 0) * factor);

      payrollRec.totalEarnings = Number(payrollRec.basicDA || 0) + Number(payrollRec.hra || 0) + Number(payrollRec.specialAllowance || 0);
      payrollRec.totalDeductions =
        Number(payrollRec.pf || 0) +
        Number(payrollRec.esi || 0) +
        Number(payrollRec.tax || 0) +
        Number(payrollRec.professionalTax || 0) +
        Number(payrollRec.loanDeduction || 0) +
        Number(payrollRec.lop || 0);
      payrollRec.netSalary = payrollRec.totalEarnings - payrollRec.totalDeductions;
      payrollRec.ctc = payrollRec.totalEarnings + Number(payrollRec.gratuity || 0);

      await payrollRec.save();
    };

    // If released, update Employee CTC
    if ((status === 'Released' || status === 'RELEASED' || status === 'Released Letter') && appraisal.revisedSalary > 0) {
      await Employee.findByIdAndUpdate(appraisal.employeeId, {
        $set: { ctc: appraisal.revisedSalary }
      });
      await updatePayrollFromRevisedSalary();
    }

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
      appraisal.status = 'Released Letter';
      appraisal.employeeAcceptanceStatus = 'PENDING';
      appraisal.finalStatus = undefined;
      appraisal.updatedAt = Date.now();
      await appraisal.save();

      // Update Employee CTC if revised salary is present
      if (appraisal.revisedSalary > 0) {
        await Employee.findByIdAndUpdate(appraisal.employeeId, {
          $set: { ctc: appraisal.revisedSalary }
        });

        try {
          const emp = await Employee.findById(appraisal.employeeId).select('employeeId').lean();
          const employeeIdStr = emp?.employeeId;
          if (employeeIdStr) {
            const payrollRec = await Payroll.findOne({ employeeId: employeeIdStr }).sort({ createdAt: -1 });
            if (payrollRec) {
              const currentCtc = Number(
                payrollRec.ctc ||
                  (Number(payrollRec.basicDA || 0) +
                    Number(payrollRec.hra || 0) +
                    Number(payrollRec.specialAllowance || 0) +
                    Number(payrollRec.gratuity || 0)) ||
                  0
              );
              if (currentCtc > 0) {
                const factor = Number(appraisal.revisedSalary) / currentCtc;
                if (Number.isFinite(factor) && factor > 0) {
                  payrollRec.basicDA = Math.round(Number(payrollRec.basicDA || 0) * factor);
                  payrollRec.hra = Math.round(Number(payrollRec.hra || 0) * factor);
                  payrollRec.specialAllowance = Math.round(Number(payrollRec.specialAllowance || 0) * factor);
                  payrollRec.gratuity = Math.round(Number(payrollRec.gratuity || 0) * factor);

                  payrollRec.totalEarnings = Number(payrollRec.basicDA || 0) + Number(payrollRec.hra || 0) + Number(payrollRec.specialAllowance || 0);
                  payrollRec.totalDeductions =
                    Number(payrollRec.pf || 0) +
                    Number(payrollRec.esi || 0) +
                    Number(payrollRec.tax || 0) +
                    Number(payrollRec.professionalTax || 0) +
                    Number(payrollRec.loanDeduction || 0) +
                    Number(payrollRec.lop || 0);
                  payrollRec.netSalary = payrollRec.totalEarnings - payrollRec.totalDeductions;
                  payrollRec.ctc = payrollRec.totalEarnings + Number(payrollRec.gratuity || 0);

                  await payrollRec.save();
                }
              }
            }
          }
        } catch (e) {}
      }
      modifiedCount++;
    }

    res.json({ success: true, message: `Successfully released ${modifiedCount} appraisals and updated salaries` });
  } catch (error) {
    console.error('Error releasing appraisals:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

module.exports = router;
