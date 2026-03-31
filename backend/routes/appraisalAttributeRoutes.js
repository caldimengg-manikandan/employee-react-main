const express = require('express');
const router = express.Router();
const AppraisalAttribute = require('../models/AppraisalAttribute');
const AppraisalAttributeMaster = require('../models/AppraisalAttributeMaster');
const auth = require('../middleware/auth');

// @desc    Get master attributes list
// @route   GET /api/performance/attributes/master
// @access  Private
router.get('/master', auth, async (req, res) => {
  try {
    let master = await AppraisalAttributeMaster.findOne();
    
    if (!master) {
      // Seed initial data if empty
      master = new AppraisalAttributeMaster({
        knowledgeSubItems: [],
        processSubItems: [],
        technicalSubItems: [],
        growthSubItems: []
      });
      await master.save();
    }
    
    res.json(master);
  } catch (error) {
    console.error('Error fetching master attributes:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Add attribute to master list and all designations
// @route   POST /api/performance/attributes/master/add
// @access  Private (Admin/Manager)
router.post('/master/add', auth, async (req, res) => {
  const { section, key, label } = req.body;

  if (!section || !key || !label) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // 1. Add to Master List
    let master = await AppraisalAttributeMaster.findOne();
    if (!master) {
      master = new AppraisalAttributeMaster(); // Should use seed logic ideally, but empty is fine
    }

    // Check if exists
    const exists = master[section]?.some(item => item.key === key);
    if (!exists) {
      if (!master[section]) master[section] = [];
      master[section].push({ key, label });
      await master.save();
    }

    // 2. Add to all existing AppraisalAttribute documents (default false)
    // We set it to false so it appears unchecked but available
    const updateQuery = {};
    updateQuery[`sections.${section}.${key}`] = true;
    
    await AppraisalAttribute.updateMany({}, { $set: updateQuery });

    res.json({ success: true, message: 'Attribute added to master and designations', master });
  } catch (error) {
    console.error('Error adding master attribute:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Delete attribute from master list and all designations
// @route   DELETE /api/performance/attributes/master/:section/:key
// @access  Private (Admin/Manager)
router.delete('/master/:section/:key', auth, async (req, res) => {
  const { section, key } = req.params;

  if (!section || !key) {
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  try {
    // 1. Remove from Master List
    const updateQueryMaster = {};
    updateQueryMaster[section] = { key: key };
    
    await AppraisalAttributeMaster.updateOne(
      {}, 
      { $pull: updateQueryMaster }
    );

    // 2. Remove from all existing AppraisalAttribute documents
    // The structure in AppraisalAttribute is sections.<section>.<key>
    const updateQueryAttribute = {};
    updateQueryAttribute[`sections.${section}.${key}`] = "";
    
    await AppraisalAttribute.updateMany({}, { $unset: updateQueryAttribute });

    res.json({ success: true, message: 'Attribute deleted from master and designations' });
  } catch (error) {
    console.error('Error deleting master attribute:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get all appraisal attributes
// @route   GET /api/performance/attributes
// @access  Private (Admin/Manager)
router.get('/', auth, async (req, res) => {
  try {
    const attributes = await AppraisalAttribute.find({});
    res.json(attributes);
  } catch (error) {
    console.error('Error fetching appraisal attributes:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

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

// @desc    Get appraisal attributes for a specific designation
// @route   GET /api/performance/attributes/:designation
// @access  Private
router.get('/:designation', auth, async (req, res) => {
  try {
    const designation = String(req.params.designation || '').trim();
    if (!designation) return res.status(400).json({ message: 'Designation is required' });

    // Escape special characters for regex
    const escapedDesignation = designation.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    
    // Case-insensitive search with escaped string
    const attribute = await AppraisalAttribute.findOne({ 
        designation: { $regex: new RegExp(`^${escapedDesignation}$`, 'i') } 
    });
    
    if (!attribute) {
      // Fetch master lists to build default
      const master = await AppraisalAttributeMaster.findOne();
      
      const buildDefaultSubItems = (section) => {
        const items = {};
        if (master && master[section]) {
          master[section].forEach(item => {
            // Default to false unless it's a legacy standard item we want to show by default
            // For now, keeping them false to respect explicitly configured attributes
            items[item.key] = false;
          });
        }
        return items;
      };

      // Return default if not found
      return res.json({
        designation: designation,
        sections: {
          selfAppraisal: true,
          knowledgeSharing: true,
          knowledgeSubItems: buildDefaultSubItems('knowledgeSubItems'),
          processAdherence: true,
          processSubItems: buildDefaultSubItems('processSubItems'),
          technicalAssessment: true,
          technicalSubItems: buildDefaultSubItems('technicalSubItems'),
          growthAssessment: true,
          growthSubItems: buildDefaultSubItems('growthSubItems')
        }
      });
    }
    
    // Convert Maps to Objects for consistent frontend processing
    const result = attribute.toJSON();
    if (result.sections) {
        result.sections.knowledgeSubItems = mapToObj(attribute.sections.knowledgeSubItems);
        result.sections.processSubItems = mapToObj(attribute.sections.processSubItems);
        result.sections.technicalSubItems = mapToObj(attribute.sections.technicalSubItems);
        result.sections.growthSubItems = mapToObj(attribute.sections.growthSubItems);
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching appraisal attribute:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Create or update appraisal attributes
// @route   POST /api/performance/attributes
// @access  Private (Admin/Manager)
router.post('/', auth, async (req, res) => {
  const { designation, sections } = req.body;

  if (!designation) {
    return res.status(400).json({ message: 'Designation is required' });
  }

  try {
    const trimmedDesignation = String(designation || '').trim();
    if (!trimmedDesignation) return res.status(400).json({ message: 'Designation is required' });

    // Escape special characters for regex
    const escapedDesignation = trimmedDesignation.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    // Case-insensitive search with escaped string
    let attribute = await AppraisalAttribute.findOne({ 
        designation: { $regex: new RegExp(`^${escapedDesignation}$`, 'i') } 
    });

    if (attribute) {
      // Update existing
      if (sections) {
        // Top level toggles
        if (sections.selfAppraisal !== undefined) attribute.sections.selfAppraisal = sections.selfAppraisal;
        if (sections.knowledgeSharing !== undefined) attribute.sections.knowledgeSharing = sections.knowledgeSharing;
        if (sections.processAdherence !== undefined) attribute.sections.processAdherence = sections.processAdherence;
        if (sections.technicalAssessment !== undefined) attribute.sections.technicalAssessment = sections.technicalAssessment;
        if (sections.growthAssessment !== undefined) attribute.sections.growthAssessment = sections.growthAssessment;

        // Sub-item Maps - Must handle Map fields explicitly for reliable persistency
        const handleMapUpdate = (modelPath, inputData) => {
          if (!inputData) return;
          const map = attribute.sections[modelPath];
          // Clear current keys first to ensure exact match with input
          if (map.size > 0) map.clear();
          Object.entries(inputData).forEach(([k, v]) => {
            map.set(k, !!v);
          });
        };

        handleMapUpdate('knowledgeSubItems', sections.knowledgeSubItems);
        handleMapUpdate('processSubItems', sections.processSubItems);
        handleMapUpdate('technicalSubItems', sections.technicalSubItems);
        handleMapUpdate('growthSubItems', sections.growthSubItems);
      }
      
      // In case we found it with different case, update the name to requested one or keep consistent
      attribute.designation = trimmedDesignation; 
      attribute.updatedAt = Date.now();
      await attribute.save();
    } else {
      // Create new
      attribute = new AppraisalAttribute({
        designation: trimmedDesignation,
        sections
      });
      await attribute.save();
    }

    res.json(attribute);
  } catch (error) {
    console.error('Error saving appraisal attribute:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Bulk add/remove sub-items for all designations
// @route   POST /api/performance/attributes/bulk-subitem
// @access  Private (Admin/Manager)
router.post('/bulk-subitem', auth, async (req, res) => {
  const { action, section, key, value } = req.body;
  
  if (!action || !section || !key) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    if (action === 'add') {
      const updateQuery = {};
      // Ensure we set nested field correctly for Map type or Object
      // sections.knowledgeSubItems.key
      updateQuery[`sections.${section}.${key}`] = value !== undefined ? value : true;
      
      // Update all documents
      await AppraisalAttribute.updateMany({}, { $set: updateQuery });
    } else if (action === 'remove') {
      const updateQuery = {};
      updateQuery[`sections.${section}.${key}`] = "";
      
      await AppraisalAttribute.updateMany({}, { $unset: updateQuery });
    }
    
    res.json({ success: true, message: `Sub-item ${action}ed successfully for all designations` });
  } catch (error) {
    console.error('Error bulk updating attributes:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
