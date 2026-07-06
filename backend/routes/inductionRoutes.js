const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const InductionDocument = require('../models/InductionDocument');
const InductionAssessment = require('../models/InductionAssessment');
const InductionProgress = require('../models/InductionProgress');
const InductionConfig = require('../models/InductionConfig');
const User = require('../models/User');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const { validateInduction } = require('../middleware/validation');

// Setup multer upload directory
const uploadDir = path.join(__dirname, '..', 'uploads', 'induction');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeName}-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for docs & sample videos
});

// Helper: Ensure clean initialization without mock data
const ensureDefaultData = async () => {
  try {
    // Purge any previously seeded mock/dummy files with external test URLs
    await InductionDocument.deleteMany({ fileUrl: { $regex: /w3\.org|w3schools/ } });

    const cfgCount = await InductionConfig.countDocuments();
    if (cfgCount === 0) {
      await InductionConfig.create({
        aboutCompany: "Welcome to our organization. Please review our core policies and complete your induction modules.",
        vision: "To empower excellence and foster innovation across all teams.",
        mission: "Delivering exceptional value through collaboration, ownership, and continuous learning.",
        coreValues: "• Integrity\n• Innovation\n• Collaboration\n• Excellence",
        leadershipTeam: []
      });
    }

    const quizCount = await InductionAssessment.countDocuments();
    if (quizCount === 0) {
      await InductionAssessment.create({
        passingPercentage: 70,
        maxAttempts: 3,
        questions: []
      });
    }
  } catch (err) {
    console.error("Error ensuring clean induction data:", err);
  }
};

// Helper: Calculate progress score dynamically against real DB documents
const calculateProgress = async (progress) => {
  let score = 0;

  // 1. Acknowledgements against active policies in DB (25%)
  const policyDocs = await InductionDocument.find({ category: 'policy', isEnabled: true });
  const totalPolicies = policyDocs.length;
  if (totalPolicies > 0) {
    const ackCount = progress.acknowledgements ? progress.acknowledgements.length : 0;
    score += Math.min(25, Math.round((ackCount / totalPolicies) * 25));
  } else {
    score += 25;
  }

  // 2. Mandatory Trainings against active training docs in DB (25%)
  const trainingDocs = await InductionDocument.find({ category: 'training', isEnabled: true });
  const totalTrainings = trainingDocs.length;
  if (totalTrainings > 0) {
    const trainCount = progress.completedTrainings ? progress.completedTrainings.length : 0;
    score += Math.min(25, Math.round((trainCount / totalTrainings) * 25));
  } else {
    score += 25;
  }

  // 3. Assessment Quiz Passed or Existing Employee (25%)
  const passedQuiz = progress.assessmentAttempts && progress.assessmentAttempts.some(a => a.passed);
  let isExistingTenure = false;
  if (progress.employeeId) {
    const emp = await Employee.findOne({ employeeId: { $regex: new RegExp(`^${progress.employeeId.trim()}$`, 'i') } });
    if (emp && emp.dateOfJoining) {
      const days = (new Date() - new Date(emp.dateOfJoining)) / (1000 * 60 * 60 * 24);
      if (days > 185) isExistingTenure = true;
    }
  }
  if (passedQuiz || isExistingTenure) {
    score += 25;
  }

  // 4. Feedback Submitted (15%)
  if (progress.feedback && progress.feedback.submittedAt) {
    score += 15;
  }

  // 5. Document Reading (at least 2 read) (10%)
  const readCount = progress.readDocuments ? progress.readDocuments.length : 0;
  if (readCount >= 2) score += 10;
  else if (readCount === 1) score += 5;

  const total = Math.min(100, score);
  progress.progressPercentage = total;

  if (total === 100 && progress.status !== 'Verified') {
    progress.status = 'Completed';
    if (!progress.completedAt) progress.completedAt = new Date();
  } else if (total > 0 && progress.status === 'Not Started') {
    progress.status = 'In Progress';
  }

  return progress;
};

// GET /api/induction/config
router.get('/config', auth, async (req, res) => {
  try {
    await ensureDefaultData();
    const config = await InductionConfig.findOne();
    res.json(config || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/induction/config (HR update overview)
router.post('/config', auth, async (req, res) => {
  try {
    if (!['admin', 'hr', 'director', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied." });
    }
    const {
      aboutCompany, vision, mission, coreValues, leadershipTeam,
      companyHistory, organizationStructure, officeLocations,
      welcomeBannerUrl, welcomeVideoUrl, welcomeMessageHR, welcomeMessageCEO, welcomeMessageGM
    } = req.body;
    let config = await InductionConfig.findOne();
    if (config) {
      if (aboutCompany !== undefined) config.aboutCompany = aboutCompany;
      if (vision !== undefined) config.vision = vision;
      if (mission !== undefined) config.mission = mission;
      if (coreValues !== undefined) config.coreValues = coreValues;
      if (leadershipTeam !== undefined) config.leadershipTeam = leadershipTeam;
      if (companyHistory !== undefined) config.companyHistory = companyHistory;
      if (organizationStructure !== undefined) config.organizationStructure = organizationStructure;
      if (officeLocations !== undefined) config.officeLocations = officeLocations;
      if (welcomeBannerUrl !== undefined) config.welcomeBannerUrl = welcomeBannerUrl;
      if (welcomeVideoUrl !== undefined) config.welcomeVideoUrl = welcomeVideoUrl;
      if (welcomeMessageHR !== undefined) config.welcomeMessageHR = welcomeMessageHR;
      if (welcomeMessageCEO !== undefined) config.welcomeMessageCEO = welcomeMessageCEO;
      if (welcomeMessageGM !== undefined) config.welcomeMessageGM = welcomeMessageGM;
      await config.save();
    } else {
      config = await InductionConfig.create({
        aboutCompany, vision, mission, coreValues, leadershipTeam,
        companyHistory, organizationStructure, officeLocations,
        welcomeBannerUrl, welcomeVideoUrl, welcomeMessageHR, welcomeMessageCEO, welcomeMessageGM
      });
    }
    res.json(config);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/induction/documents
router.get('/documents', auth, async (req, res) => {
  try {
    await ensureDefaultData();
    const isHrOrAdmin = ['admin', 'hr', 'director', 'manager', 'projectmanager'].includes(req.user.role);
    const filter = isHrOrAdmin ? {} : { isEnabled: true };
    const docs = await InductionDocument.find(filter).sort({ category: 1, title: 1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/induction/documents (HR Upload)
router.post('/documents', auth, upload.single('file'), async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Only HR or Admin can upload induction documents." });
    }

    const { title, category, subCategory, description, fileUrl: bodyUrl, fileType: bodyType, isMandatory, effectiveDate } = req.body;

    let fileUrl = bodyUrl || '';
    let fileName = '';
    let fileSize = 0;
    let fileType = bodyType || 'pdf';

    if (req.file) {
      fileUrl = `/uploads/induction/${req.file.filename}`;
      fileName = req.file.originalname;
      fileSize = req.file.size;
      const ext = path.extname(fileName).toLowerCase();
      if (['.mp4', '.mov', '.avi', '.webm'].includes(ext)) fileType = 'video';
      else if (['.ppt', '.pptx'].includes(ext)) fileType = 'ppt';
      else if (['.doc', '.docx'].includes(ext)) fileType = 'docx';
      else if (['.png', '.jpg', '.jpeg', '.gif', '.svg'].includes(ext)) fileType = 'image';
      else fileType = 'pdf';
    }

    const newDoc = await InductionDocument.create({
      title: title || fileName || 'New Document',
      category: category || 'policy',
      subCategory: subCategory || 'General',
      description: description || '',
      isMandatory: isMandatory !== undefined ? (isMandatory === 'true' || isMandatory === true) : true,
      effectiveDate: effectiveDate || new Date(),
      fileUrl,
      fileType,
      fileName: fileName || title,
      fileSize,
      uploadedBy: req.user.name || 'HR Admin',
      versionHistory: [{
        version: 1,
        fileUrl,
        fileName: fileName || title,
        updatedAt: new Date()
      }]
    });

    res.status(201).json(newDoc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/induction/documents/:id (HR Edit / Update Version)
router.put('/documents/:id', auth, upload.single('file'), async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied." });
    }

    const doc = await InductionDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const { title, category, subCategory, description, isEnabled, isMandatory, effectiveDate } = req.body;
    if (title !== undefined) doc.title = title;
    if (category !== undefined) doc.category = category;
    if (subCategory !== undefined) doc.subCategory = subCategory;
    if (description !== undefined) doc.description = description;
    if (isEnabled !== undefined) doc.isEnabled = (isEnabled === 'true' || isEnabled === true);
    if (isMandatory !== undefined) doc.isMandatory = (isMandatory === 'true' || isMandatory === true);
    if (effectiveDate !== undefined) doc.effectiveDate = effectiveDate;

    if (req.file) {
      const fileUrl = `/uploads/induction/${req.file.filename}`;
      const fileName = req.file.originalname;
      const fileSize = req.file.size;

      doc.version += 1;
      doc.fileUrl = fileUrl;
      doc.fileName = fileName;
      doc.fileSize = fileSize;

      const ext = path.extname(fileName).toLowerCase();
      if (['.mp4', '.mov', '.avi', '.webm'].includes(ext)) doc.fileType = 'video';
      else if (['.ppt', '.pptx'].includes(ext)) doc.fileType = 'ppt';
      else if (['.doc', '.docx'].includes(ext)) doc.fileType = 'docx';
      else if (['.png', '.jpg', '.jpeg', '.gif', '.svg'].includes(ext)) doc.fileType = 'image';
      else doc.fileType = 'pdf';

      doc.versionHistory.push({
        version: doc.version,
        fileUrl,
        fileName,
        updatedAt: new Date()
      });
    }

    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/induction/documents/:id
router.delete('/documents/:id', auth, async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied." });
    }
    await InductionDocument.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Document deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/induction/assessment
router.get('/assessment', auth, async (req, res) => {
  try {
    await ensureDefaultData();
    const assessment = await InductionAssessment.findOne();
    res.json(assessment || { passingPercentage: 70, questions: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/induction/assessment (HR Update Quiz)
router.post('/assessment', auth, async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied." });
    }
    const { passingPercentage, maxAttempts, questions } = req.body;
    let assessment = await InductionAssessment.findOne();
    if (assessment) {
      if (passingPercentage !== undefined) assessment.passingPercentage = passingPercentage;
      if (maxAttempts !== undefined) assessment.maxAttempts = maxAttempts;
      if (questions !== undefined) assessment.questions = questions;
      await assessment.save();
    } else {
      assessment = await InductionAssessment.create({ passingPercentage, maxAttempts, questions });
    }
    res.json(assessment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/induction/progress/me
router.get('/progress/me', auth, async (req, res) => {
  try {
    let progress = await InductionProgress.findOne({ userId: req.user._id });
    if (!progress) {
      progress = await InductionProgress.create({
        userId: req.user._id,
        employeeId: req.user.employeeId || '',
        employeeName: req.user.name || '',
        email: req.user.email || '',
        department: req.user.department || 'General'
      });
    }
    await calculateProgress(progress);
    await progress.save();

    // Look up employee record robustly to find dateOfJoining and determine tenure
    const empIdQuery = progress.employeeId || req.user.employeeId;
    let queryList = [];
    if (empIdQuery) queryList.push({ employeeId: { $regex: new RegExp(`^${empIdQuery.trim()}$`, 'i') } });
    if (req.user.email) queryList.push({ email: { $regex: new RegExp(`^${req.user.email.trim()}$`, 'i') } });
    if (req.user._id) queryList.push({ userId: req.user._id });

    const employee = queryList.length > 0 ? await Employee.findOne({ $or: queryList }) : null;
    let isExistingEmployee = false;
    let dateOfJoining = null;

    if (employee && employee.dateOfJoining) {
      dateOfJoining = employee.dateOfJoining;
      const days = (new Date() - new Date(employee.dateOfJoining)) / (1000 * 60 * 60 * 24);
      if (days > 185) {
        isExistingEmployee = true;
      }
    } else if (req.user.dateOfJoining) {
      dateOfJoining = req.user.dateOfJoining;
      const days = (new Date() - new Date(req.user.dateOfJoining)) / (1000 * 60 * 60 * 24);
      if (days > 185) {
        isExistingEmployee = true;
      }
    } else {
      const days = (new Date() - new Date(req.user.createdAt || progress.createdAt)) / (1000 * 60 * 60 * 24);
      if (days > 185) {
        isExistingEmployee = true;
      }
    }

    res.json({
      ...progress.toObject(),
      isExistingEmployee,
      dateOfJoining
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/induction/progress/action
router.post('/progress/action', auth, validateInduction, async (req, res) => {
  try {
    const { actionType, data } = req.body;
    let progress = await InductionProgress.findOne({ userId: req.user._id });
    if (!progress) {
      progress = new InductionProgress({
        userId: req.user._id,
        employeeId: req.user.employeeId || '',
        employeeName: req.user.name || '',
        email: req.user.email || '',
        department: req.user.department || 'General'
      });
    }

    if (actionType === 'read_doc' && data.docId) {
      if (!progress.readDocuments.includes(data.docId)) {
        progress.readDocuments.push(data.docId);
      }
    } else if (actionType === 'complete_training' && data.trainingName) {
      if (!progress.completedTrainings.includes(data.trainingName)) {
        progress.completedTrainings.push(data.trainingName);
      }
    } else if (actionType === 'acknowledge' && data.policyName) {
      const exists = progress.acknowledgements.some(a => a.policyName === data.policyName);
      if (!exists) {
        progress.acknowledgements.push({
          policyName: data.policyName,
          employeeName: progress.employeeName || req.user.name || 'Employee',
          employeeId: progress.employeeId || req.user.employeeId || req.user.id || '',
          digitalSignature: 'Digitally Acknowledged & Signed',
          acknowledgedAt: new Date()
        });
      }
    } else if (actionType === 'submit_quiz' && data.attempt) {
      progress.assessmentAttempts.push({
        score: data.attempt.score,
        totalQuestions: data.attempt.totalQuestions,
        percentage: data.attempt.percentage,
        passed: data.attempt.passed,
        attemptedAt: new Date()
      });
    } else if (actionType === 'submit_feedback' && data.feedback) {
      progress.feedback = {
        rating: data.feedback.rating || 5,
        comments: data.feedback.comments || '',
        suggestions: data.feedback.suggestions || '',
        submittedAt: new Date()
      };
    }

    await calculateProgress(progress);
    await progress.save();
    res.json(progress);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/induction/progress/all (HR only)
router.get('/progress/all', auth, async (req, res) => {
  try {
    if (!['admin', 'hr', 'manager', 'director'].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied." });
    }

    // Fetch all active employees excluding MDs and directors
    const activeEmployees = await Employee.find({
      status: 'Active',
      role: { $nin: ['director', 'admin'] },
      designation: { $not: /director/i },
      employeeId: { $nin: ['CDE001', 'CDE002', 'cde001', 'cde002'] }
    }).select('employeeId').lean();
    const activeEmpIds = new Set(activeEmployees.map(e => e.employeeId).filter(Boolean));

    // Sync users into progress table if missing AND they are active employees
    const allUsers = await User.find({ role: { $ne: 'admin' } }).select('_id name email employeeId department role createdAt').lean();
    const activeUsers = allUsers.filter(u => u.employeeId && activeEmpIds.has(u.employeeId));

    const existingProgress = await InductionProgress.find().lean();
    const existingUserIds = new Set(existingProgress.map(p => p.userId.toString()));

    const missingProgress = [];
    for (const u of activeUsers) {
      if (!existingUserIds.has(u._id.toString())) {
        missingProgress.push({
          userId: u._id,
          employeeId: u.employeeId || '',
          employeeName: u.name || 'Unknown',
          email: u.email || '',
          department: u.department || 'General'
        });
      }
    }

    if (missingProgress.length > 0) {
      await InductionProgress.insertMany(missingProgress);
    }

    const allRecords = await InductionProgress.find().sort({ updatedAt: -1 }).lean();

    // Map each progress record to their dateOfJoining, status, location and division from Employee model
    const employeeIds = allRecords.map(r => r.employeeId).filter(Boolean);
    const employees = await Employee.find({ employeeId: { $in: employeeIds } }).select('employeeId dateOfJoining status location division').lean();
    const dojMap = {};
    const statusMap = {};
    const locationMap = {};
    const divisionMap = {};
    employees.forEach(emp => {
      dojMap[emp.employeeId] = emp.dateOfJoining;
      statusMap[emp.employeeId] = emp.status;
      locationMap[emp.employeeId] = emp.location || 'N/A';
      divisionMap[emp.employeeId] = emp.division || 'N/A';
    });

    const recordsWithDoj = allRecords
      .filter(r => {
        // Exclude records of employees whose status is not Active or who are Directors/MDs
        if (['CDE001', 'CDE002', 'cde001', 'cde002'].includes(r.employeeId)) {
          return false;
        }
        const status = statusMap[r.employeeId];
        if (status && status !== 'Active') {
          return false;
        }
        return true;
      })
      .map(r => {
        const doj = dojMap[r.employeeId] || null;
        let isExistingEmployee = false;
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        if (doj) {
          if (new Date(doj) < sixMonthsAgo) {
            isExistingEmployee = true;
          }
        } else {
          const userObj = allUsers.find(u => u._id.toString() === r.userId.toString());
          if (new Date((userObj && userObj.createdAt) || r.createdAt) < sixMonthsAgo) {
            isExistingEmployee = true;
          }
        }

        return {
          ...r,
          dateOfJoining: doj,
          isExistingEmployee,
          location: locationMap[r.employeeId] || 'N/A',
          division: divisionMap[r.employeeId] || 'N/A'
        };
      });

    res.json(recordsWithDoj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/induction/progress/verify/:userId
router.put('/progress/verify/:userId', auth, async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied." });
    }
    const progress = await InductionProgress.findOne({ userId: req.params.userId });
    if (!progress) return res.status(404).json({ error: "Progress record not found." });

    progress.status = 'Verified';
    progress.hrVerified = true;
    progress.hrVerifiedAt = new Date();
    progress.hrVerifiedBy = req.user.name || 'HR Admin';

    await progress.save();
    res.json(progress);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/induction/remind/:userId
router.post('/remind/:userId', auth, async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied." });
    }
    const progress = await InductionProgress.findOne({ userId: req.params.userId });
    if (!progress) return res.status(404).json({ error: "Employee record not found." });

    // Simulate sending email/notification
    console.log(`[INDUCTION REMINDER] Sent induction completion reminder to ${progress.email} (${progress.employeeName})`);

    res.json({ success: true, message: `Reminder notification sent successfully to ${progress.employeeName}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
