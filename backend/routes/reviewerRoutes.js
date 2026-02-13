const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SelfAppraisal = require('../models/SelfAppraisal');
const Employee = require('../models/Employee');

const { calculateIncrement } = require('../utils/incrementUtils');

// @desc    Get reviewer appraisals (for reviewers/HR)
// @route   GET /api/performance/reviewer
// @access  Private (Reviewer/Admin)
router.get('/', auth, async (req, res) => {
  try {
    // Check permissions if needed (e.g. req.user.role === 'Admin' or 'Reviewer')
    
    // Strict Visibility Rule: Only assigned Reviewer can view
    // Strict Sequential Flow: Show appraisals in 'APPRAISER_COMPLETED' (Pending) and 'REVIEWER_COMPLETED' (Submitted)
    const query = {
      $and: [
        { 
          status: { 
            $in: ['APPRAISER_COMPLETED', 'REVIEWER_COMPLETED', 'DIRECTOR_APPROVED', 'RELEASED'] 
          } 
        },
        {
          $or: [
            { reviewerId: req.user.employeeId },
            { reviewer: req.user.name }
          ]
        }
      ]
    };

    // Populate employee details
    const appraisals = await SelfAppraisal.find(query)
      .populate('employeeId', 'name employeeId designation department avatar ctc');

    // Transform to frontend format
    // Use Promise.all to handle async calculation
    const formattedAppraisals = await Promise.all(appraisals.map(async (app) => {
      const emp = app.employeeId || {};
      
      // AUTO-FIX: If incrementPercentage is 0 or missing, try to calculate it
      // This ensures old records or records where Manager didn't trigger calculation are fixed
      let finalIncrementPercentage = app.incrementPercentage || 0;
      
      if (finalIncrementPercentage === 0 && app.appraiserRating && app.year && emp.designation) {
         try {
           const calculated = await calculateIncrement(app.year, emp.designation, app.appraiserRating);
           if (calculated > 0) {
             finalIncrementPercentage = calculated;
             // Update the DB record silently so it is fixed for good
             // We can do this async without awaiting if we want faster response, 
             // but awaiting ensures consistency for this request.
             await SelfAppraisal.updateOne({ _id: app._id }, { $set: { incrementPercentage: calculated } });
           }
         } catch (err) {
           console.error(`Auto-calc failed for appraisal ${app._id}:`, err);
         }
      }

      return {
        id: app._id,
        financialYr: app.year,
        empId: emp.employeeId || 'N/A',
        name: emp.name || 'Unknown',
        avatar: emp.avatar || (emp.name ? emp.name[0] : '?'),
        designation: emp.designation || 'N/A',
        department: emp.department || 'N/A',
        status: app.status,
        
        // Appraisal content
        selfAppraiseeComments: app.overallContribution || '',
        managerComments: app.managerComments || '',
        
        // Reviewer content
        reviewerComments: app.reviewerComments || '',
        currentSalary: emp.ctc || 0, // Using CTC as current salary
        incrementPercentage: finalIncrementPercentage,
        incrementCorrectionPercentage: app.incrementCorrectionPercentage || 0,
        incrementAmount: app.incrementAmount || 0,
        revisedSalary: app.revisedSalary || 0
      };
    }));

    res.json(formattedAppraisals);
  } catch (error) {
    console.error('Error fetching reviewer appraisals:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @desc    Update reviewer appraisal
// @route   PUT /api/performance/reviewer/:id
// @access  Private (Reviewer)
router.put('/:id', auth, async (req, res) => {
  try {
    const { 
      reviewerComments, 
      incrementPercentage, 
      incrementCorrectionPercentage, 
      incrementAmount, 
      revisedSalary 
    } = req.body;

    let appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) {
      return res.status(404).json({ success: false, message: 'Appraisal not found' });
    }

    // Update fields - Prevent Reviewer from changing incrementPercentage directly
    if (reviewerComments !== undefined) appraisal.reviewerComments = reviewerComments;
    // incrementPercentage is READ-ONLY for Reviewer - it comes from Manager/System
    if (incrementCorrectionPercentage !== undefined) appraisal.incrementCorrectionPercentage = incrementCorrectionPercentage;
    if (incrementAmount !== undefined) appraisal.incrementAmount = incrementAmount;
    if (revisedSalary !== undefined) appraisal.revisedSalary = revisedSalary;
    
    appraisal.updatedAt = Date.now();
    
    await appraisal.save();

    res.json(appraisal);
  } catch (error) {
    console.error('Error updating reviewer appraisal:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @desc    Submit appraisals to Director (Batch update status)
// @route   POST /api/performance/reviewer/submit-director
// @access  Private (Reviewer)
router.post('/submit-director', auth, async (req, res) => {
  try {
    const { ids } = req.body; // Array of appraisal IDs

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No records selected' });
    }

    const result = await SelfAppraisal.updateMany(
      { _id: { $in: ids } },
      { 
        $set: { 
          status: 'REVIEWER_COMPLETED',
          updatedAt: Date.now()
        } 
      }
    );

    res.json({ 
      success: true, 
      message: `${result.modifiedCount} records submitted to Director`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error submitting to Director:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

module.exports = router;
