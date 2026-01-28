const express = require('express');
const router = express.Router();
const MonthlyExpenditure = require('../models/MonthlyExpenditure');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/expenditure');
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalName
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and PDF are allowed.'));
    }
  }
});

// Upload File Route
router.post('/upload', auth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    // Return the relative path to be stored in DB
    const filePath = `/uploads/expenditure/${req.file.filename}`;
    res.json({ success: true, filePath: filePath, fileName: req.file.originalname });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Health Check
router.get('/health-check', (req, res) => {
  res.json({ success: true, message: 'Expenditure API is running' });
});

// Save Monthly Record (Create new)
router.post('/save-monthly', auth, async (req, res) => {
  try {
    const { month, year, location, budgetAllocated, expenditures } = req.body;
    
    // Check if record already exists
    const existingRecord = await MonthlyExpenditure.findOne({ month, year, location });
    if (existingRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'Record for this Month, Year and Location already exists. Please edit the existing record.' 
      });
    }

    const newRecord = new MonthlyExpenditure({
      month,
      year,
      location,
      budgetAllocated,
      expenditures,
      createdBy: req.user.id
    });

    await newRecord.save();
    res.status(201).json({ success: true, data: newRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Record
router.put('/update/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedRecord = await MonthlyExpenditure.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedRecord) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({ success: true, data: updatedRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Summary
router.get('/summary', auth, async (req, res) => {
  try {
    const { year, location } = req.query;
    const query = {};
    if (year) query.year = parseInt(year);
    if (location && location !== 'Select All') query.location = location;

    const records = await MonthlyExpenditure.find(query);
    
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Record By ID
router.get('/record/:id', auth, async (req, res) => {
  
  try {
    const record = await MonthlyExpenditure.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete Record
router.delete('/record/:id', auth, async (req, res) => {
  try {
    const deletedRecord = await MonthlyExpenditure.findByIdAndDelete(req.params.id);
    if (!deletedRecord) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    res.json({ success: true, message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
