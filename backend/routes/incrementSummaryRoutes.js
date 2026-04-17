const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SelfAppraisal = require('../models/SelfAppraisal');
const Employee = require('../models/Employee');

router.get('/', auth, async (req, res) => {
  try {
    const {
      financialYear,
      division,
      designation,
      location,
      status,
      search,
    } = req.query;

    // ── Status Filter ─────────────────────────────────────────────────────────
    // Match all case-variants that can appear in the DB.
    let statusFilter = [];

    if (!status || status === 'All') {
      // Show everything approved or released/accepted by director
      statusFilter = [
        'directorApproved', 'DIRECTOR_APPROVED',
        'released', 'Released', 'RELEASED', 'Released Letter',
        'accepted_pending_effect', 'accepted', 'Accepted',
        'effective', 'COMPLETED',
      ];
    } else if (status === 'Approved') {
      statusFilter = ['directorApproved', 'DIRECTOR_APPROVED'];
    } else if (status === 'Released') {
      statusFilter = [
        'released', 'Released', 'RELEASED', 'Released Letter',
        'accepted_pending_effect', 'accepted', 'Accepted',
        'effective', 'COMPLETED',
      ];
    } else if (status === 'Pending') {
      statusFilter = [
        'draft', 'Draft',
        'submitted', 'Submitted', 'SUBMITTED',
        'managerInProgress', 'reviewerPending', 'managerApproved',
        'reviewerApproved', 'reviewerInProgress', 'directorInProgress', 'directorPushedBack',
        'APPRAISER_COMPLETED', 'REVIEWER_COMPLETED',
        'AppraiserReview', 'ReviewerReview', 'DirectorApproval',
      ];
    }

    const appraisalQuery = { status: { $in: statusFilter } };

    // ── Financial Year filter (handles YYYY-YY ↔ YYYY-YYYY mismatch) ─────────
    if (financialYear && financialYear !== 'All') {
      const parts = financialYear.split('-');
      let alternativeYear = financialYear;
      if (parts.length === 2) {
        if (parts[0].length === 4 && parts[1].length === 4) {
          // 2025-2026 → also match 2025-26
          alternativeYear = `${parts[0]}-${parts[1].substring(2)}`;
        } else if (parts[0].length === 4 && parts[1].length === 2) {
          // 2025-26 → also match 2025-2026
          alternativeYear = `${parts[0]}-20${parts[1]}`;
        }
      }
      appraisalQuery.year = { $in: [financialYear, alternativeYear] };
    }

    const appraisals = await SelfAppraisal.find(appraisalQuery)
      .populate('employeeId', 'name employeeId designation department division location avatar ctc');

    let results = appraisals.map((app) => {
      const emp = app.employeeId || {};

      // ── Increment % ───────────────────────────────────────────────────────
      // Combine base + director correction percentage for the true total.
      const baseIncrementPct       = Number(app.incrementPercentage           || 0);
      const correctionIncrementPct = Number(app.incrementCorrectionPercentage || 0);
      const totalIncrementPct      = baseIncrementPct + correctionIncrementPct;

      // ── Current Salary ────────────────────────────────────────────────────
      // Use currentSalarySnapshot (pre-increment salary stored by the director).
      // DO NOT use emp.ctc — it is overwritten to the revised value after acceptance.
      const currentSalary = Number(app.currentSalarySnapshot || app.currentSalary || 0);

      return {
        id:                            app._id,
        financialYr:                   app.year,
        empId:                         emp.employeeId || '',
        name:                          emp.name || 'Unknown',
        designation:                   emp.designation || '',
        division:                      emp.division || emp.department || '',
        location:                      emp.location || '',
        status:                        app.status,
        currentSalary,
        incrementPercentage:           baseIncrementPct,
        incrementCorrectionPercentage: correctionIncrementPct,
        totalIncrementPercentage:      totalIncrementPct,  // frontend uses this
        incrementAmount:               Number(app.incrementAmount || 0),
        revisedSalary:                 Number(app.revisedSalary  || 0),
        effectiveDate:                 app.effectiveDate || null,
        updatedAt:                     app.updatedAt,
      };
    });

    // ── Post-fetch filters ────────────────────────────────────────────────────
    if (division    && division    !== 'All') results = results.filter(i => i.division    === division);
    if (designation && designation !== 'All') results = results.filter(i => i.designation === designation);
    if (location    && location    !== 'All') results = results.filter(i => i.location    === location);
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      results = results.filter(i =>
        (i.name  || '').toLowerCase().includes(term) ||
        (i.empId || '').toLowerCase().includes(term)
      );
    }

    res.json(results);
  } catch (error) {
    console.error('Error fetching increment summary:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

module.exports = router;
