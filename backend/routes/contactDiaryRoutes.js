const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleAuth');
const ContactDiary = require('../models/ContactDiary');
const Employee = require('../models/Employee');

const PREDEFINED_CATEGORIES = [
  'Cleaning Service',
  'Milk Supplier',
  'Water Supplier',
  'Tea / Coffee Supplier',
  'Newspaper',
  'Stationery Supplier',
  'Printer / Photocopier Service',
  'Computer / Laptop Service',
  'Internet / Network Service',
  'Electrical Service',
  'Plumbing Service',
  'AC Service',
  'Pest Control',
  'Security Service',
  'Courier Service',
  'Cab / Transport',
  'Office Maintenance',
  'Nearby Hospital',
  'Ambulance',
  'Police',
  'Fire & Rescue',
  'Other'
];

/**
 * @route   GET /api/contact-diary/categories
 * @desc    Get standard category list
 * @access  Private
 */
router.get('/categories', auth, async (req, res) => {
  try {
    res.json({ success: true, data: PREDEFINED_CATEGORIES });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

/**
 * @route   GET /api/contact-diary/locations
 * @desc    Get distinct locations list
 * @access  Private
 */
router.get('/locations', auth, async (req, res) => {
  try {
    const diaryLocs = await ContactDiary.distinct('location');
    const empLocs = await Employee.distinct('location');
    const merged = Array.from(new Set([...diaryLocs, ...empLocs].filter(Boolean))).sort();
    res.json({ success: true, data: merged });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

/**
 * @route   GET /api/contact-diary
 * @desc    Get all contacts with optional search & filters
 * @access  Private (All authenticated users)
 */
router.get('/', auth, async (req, res) => {
  try {
    const { search, category, location, status } = req.query;
    const userRole = String(req.user?.role || '').toLowerCase();
    const isAdminOrHr = ['admin', 'hr', 'director', 'manager'].includes(userRole);

    const filter = {};

    // Non-admin users only see Active contacts by default
    if (!isAdminOrHr) {
      filter.status = 'Active';
    } else if (status && status !== 'All') {
      filter.status = status;
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (location && location !== 'All') {
      filter.location = { $regex: new RegExp(`^${location}$`, 'i') };
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      const searchConditions = [
        { serviceName: regex },
        { contactName: regex },
        { contactPerson: regex },
        { contactNumber: regex },
        { alternateContactNumber: regex },
        { category: regex },
        { location: regex },
        { description: regex }
      ];

      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: searchConditions }
        ];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const contacts = await ContactDiary.find(filter)
      .sort({ isEmergency: -1, category: 1, serviceName: 1 })
      .lean();

    res.json({ success: true, data: contacts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

/**
 * @route   POST /api/contact-diary
 * @desc    Add a new office contact
 * @access  Private (Admin / HR only)
 */
router.post('/', auth, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const {
      serviceName,
      contactName,
      category,
      contactPerson,
      contactNumber,
      alternateContactNumber,
      location,
      description,
      status,
      isEmergency
    } = req.body;

    if (!serviceName || !serviceName.trim()) {
      return res.status(400).json({ success: false, message: 'Service Name is required' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }
    if (!contactNumber || !contactNumber.trim()) {
      return res.status(400).json({ success: false, message: 'Contact Number is required' });
    }

    const doc = await ContactDiary.create({
      serviceName: serviceName.trim(),
      contactName: (contactName || serviceName).trim(),
      category: category.trim(),
      contactPerson: (contactPerson || '').trim(),
      contactNumber: contactNumber.trim(),
      alternateContactNumber: (alternateContactNumber || '').trim(),
      location: (location || '').trim(),
      description: (description || '').trim(),
      status: status || 'Active',
      isEmergency: isEmergency !== undefined ? Boolean(isEmergency) : ['Nearby Hospital', 'Ambulance', 'Police', 'Fire & Rescue'].includes(category?.trim()),
      createdBy: req.user._id,
      createdByName: req.user.name || 'Admin',
      updatedBy: req.user._id,
      updatedByName: req.user.name || 'Admin'
    });

    res.status(201).json({ success: true, message: 'Contact added successfully', data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

/**
 * @route   PUT /api/contact-diary/:id
 * @desc    Update an office contact
 * @access  Private (Admin / HR only)
 */
router.put('/:id', auth, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const {
      serviceName,
      contactName,
      category,
      contactPerson,
      contactNumber,
      alternateContactNumber,
      location,
      description,
      status,
      isEmergency
    } = req.body;

    const contact = await ContactDiary.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    if (serviceName !== undefined) contact.serviceName = serviceName.trim();
    if (contactName !== undefined) contact.contactName = contactName.trim();
    if (category !== undefined) contact.category = category.trim();
    if (contactPerson !== undefined) contact.contactPerson = contactPerson.trim();
    if (contactNumber !== undefined) contact.contactNumber = contactNumber.trim();
    if (alternateContactNumber !== undefined) contact.alternateContactNumber = alternateContactNumber.trim();
    if (location !== undefined) contact.location = location.trim();
    if (description !== undefined) contact.description = description.trim();
    if (status !== undefined) contact.status = status;
    if (isEmergency !== undefined) contact.isEmergency = Boolean(isEmergency);

    contact.updatedBy = req.user._id;
    contact.updatedByName = req.user.name || 'Admin';

    await contact.save();

    res.json({ success: true, message: 'Contact updated successfully', data: contact });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

/**
 * @route   PATCH /api/contact-diary/:id/status
 * @desc    Activate or deactivate contact (soft delete)
 * @access  Private (Admin / HR only)
 */
router.patch('/:id/status', auth, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const contact = await ContactDiary.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    const newStatus = req.body.status || (contact.status === 'Active' ? 'Inactive' : 'Active');
    contact.status = newStatus;
    contact.updatedBy = req.user._id;
    contact.updatedByName = req.user.name || 'Admin';

    await contact.save();

    res.json({
      success: true,
      message: `Contact marked as ${newStatus}`,
      data: contact
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
