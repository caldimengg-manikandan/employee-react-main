const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const auth = require('../middleware/auth');
const SupportTicket = require('../models/SupportTicket');
const SupportComment = require('../models/SupportComment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Team = require('../models/Team');
const { validateSupportTicket } = require('../middleware/validation');

// Multer and File Upload Security Setup
const storage = multer.memoryStorage();

const sanitizeFilename = (filename) => {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  // Allow only alphanumeric, dash, and underscore in the name
  const cleanBase = base.replace(/[^a-zA-Z0-9_-]/g, '_');
  // Allow only alphanumeric and dots in the extension
  const cleanExt = ext.replace(/[^a-zA-Z0-9.]/g, '');
  return `${cleanBase}${cleanExt}`;
};

const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt', '.zip'];
const allowedMimes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed'
];

const fileFilter = (req, file, cb) => {
  // 1. Validate MIME Type
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type (MIME type not allowed)'), false);
  }

  // 2. Validate Extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error('Invalid file extension'), false);
  }

  // 3. Malware Scan Placeholder
  /*
  // Integrate real-time malware scanner (e.g. ClamAV, VirusTotal)
  const isMalicious = scanForMalware(file.buffer);
  if (isMalicious) {
    return cb(new Error('Security threat detected'), false);
  }
  */

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // max 5 files
  },
  fileFilter
});

const handleUpload = (req, res, next) => {
  upload.array('attachments', 5)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size limit exceeded. Max size allowed is 5MB.' });
      }
      return res.status(400).json({ error: `File upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    // Sanitize filenames of uploaded files
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(file => {
        file.originalname = sanitizeFilename(file.originalname);
      });
    }
    next();
  });
};

async function getTeamManagementAssignmentSets(userEmployeeId) {
  const teams = await Team.find({})
    .select('leaderEmployeeId members')
    .lean();

  const allAssigned = new Set();
  const mine = new Set();

  for (const t of teams) {
    const members = Array.isArray(t.members) ? t.members : [];
    for (const m of members) {
      if (!m) continue;
      allAssigned.add(m);
      if (userEmployeeId && t.leaderEmployeeId === userEmployeeId) {
        mine.add(m);
      }
    }
  }

  return {
    allAssignedMemberIds: Array.from(allAssigned),
    myAssignedMemberIds: Array.from(mine)
  };
}

router.get('/attachments/:ticketId/:attachmentId', auth, async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).send('Ticket not found');
    }

    const isOwner = String(ticket.employeeId) === String(req.user._id);
    const role = String(req.user.role || '').toLowerCase();
    const isHRAdmin = ['admin', 'hr', 'director', 'manager'].includes(role);

    let canView = isOwner || isHRAdmin;

    if (!canView && ['manager', 'projectmanager', 'project_manager'].includes(role)) {
      const ownerUser = await User.findById(ticket.employeeId).select('employeeId').lean();
      if (ownerUser && ownerUser.employeeId) {
        const { myAssignedMemberIds } = await getTeamManagementAssignmentSets(req.user.employeeId);
        if (myAssignedMemberIds.includes(ownerUser.employeeId)) {
          canView = true;
        }
      }
    }

    if (!canView) {
      return res.status(403).send('Access denied');
    }
    
    const attachment = ticket.attachments.id(req.params.attachmentId);
    if (!attachment || !attachment.data) {
      return res.status(404).send('Attachment not found');
    }

    const fileBuffer = Buffer.from(attachment.data, 'base64');
    res.set('Content-Type', attachment.contentType || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${attachment.name}"`);
    res.send(fileBuffer);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/support/tickets
// @desc    Create a new support ticket with optional attachments
// @access  Private
router.post('/tickets', auth, handleUpload, validateSupportTicket, async (req, res) => {
  try {
    const { category, priority, subject, description } = req.body;
    
    const attachments = (req.files || []).map(file => ({
      name: file.originalname,
      contentType: file.mimetype,
      data: file.buffer.toString('base64'),
      url: '' // Set placeholder first
    }));

    const newTicket = new SupportTicket({
      employeeId: req.user._id,
      category,
      priority,
      subject,
      description,
      attachments
    });

    // Generate url for each attachment dynamically using ticket and attachment IDs
    newTicket.attachments = newTicket.attachments.map(att => {
      att.url = `/api/support/attachments/${newTicket._id}/${att._id}`;
      return att;
    });

    const ticket = await newTicket.save();

    // Notify Admins
    const admins = await User.find({ role: { $in: ['admin', 'hr'] } });
    for (const admin of admins) {
      await Notification.create({
        recipient: admin._id,
        sender: req.user._id,
        type: 'SUPPORT_TICKET',
        title: 'New Support Ticket Raised',
        message: `${req.user.name} raised a new ticket: ${subject}`,
        link: `/admin/support/tickets/${ticket._id}`,
        relatedId: ticket._id
      });
    }

    res.json(ticket);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/support/tickets/my
// @desc    Get current user's tickets
// @access  Private
router.get('/tickets/my', auth, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ employeeId: req.user._id }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.get('/tickets/all', auth, async (req, res) => {
  try {
    const role = String(req.user.role || '').toLowerCase();
    const isHRAdmin = ['admin', 'hr', 'director', 'manager'].includes(role);
    const isPM = ['manager', 'projectmanager', 'project_manager'].includes(role);

    if (!isHRAdmin && !isPM) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status, category, priority } = req.query;
    let query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    if (!isHRAdmin && isPM) {
      const { myAssignedMemberIds } = await getTeamManagementAssignmentSets(req.user.employeeId);
      const teamUsers = await User.find({ employeeId: { $in: myAssignedMemberIds } }).select('_id').lean();
      const teamUserIds = teamUsers.map(u => u._id);
      query.employeeId = { $in: [...teamUserIds, req.user._id] };
    }

    const tickets = await SupportTicket.find(query)
      .populate('employeeId', 'name employeeId email')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 });

    const enrichedTickets = await Promise.all(tickets.map(async (t) => {
      const ticketObj = t.toObject();
      if (ticketObj.employeeId && ticketObj.employeeId.employeeId) {
        const emp = await Employee.findOne({ employeeId: ticketObj.employeeId.employeeId }).select('division location');
        if (emp) {
          ticketObj.employeeId.division = emp.division || 'N/A';
          ticketObj.employeeId.location = emp.location || 'N/A';
        } else {
          ticketObj.employeeId.division = 'N/A';
          ticketObj.employeeId.location = 'N/A';
        }
      } else if (ticketObj.employeeId) {
        ticketObj.employeeId.division = 'N/A';
        ticketObj.employeeId.location = 'N/A';
      }
      return ticketObj;
    }));
    
    res.json(enrichedTickets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/support/tickets/:id
// @desc    Get ticket by ID
// @access  Private
router.get('/tickets/:id', auth, async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('employeeId', 'name employeeId email')
      .populate('assignedTo', 'name')
      .populate('resolution.resolvedBy', 'name');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const ticketObj = ticket.toObject();
    if (ticketObj.employeeId && ticketObj.employeeId.employeeId) {
      const emp = await Employee.findOne({ employeeId: ticketObj.employeeId.employeeId }).select('division location');
      if (emp) {
        ticketObj.employeeId.division = emp.division || 'N/A';
        ticketObj.employeeId.location = emp.location || 'N/A';
      } else {
        ticketObj.employeeId.division = 'N/A';
        ticketObj.employeeId.location = 'N/A';
      }
    } else if (ticketObj.employeeId) {
      ticketObj.employeeId.division = 'N/A';
      ticketObj.employeeId.location = 'N/A';
    }

    // Check ownership and hierarchy
    const isOwner = ticketObj.employeeId && ticketObj.employeeId._id.toString() === req.user._id.toString();
    const role = String(req.user.role || '').toLowerCase();
    const isHRAdmin = ['admin', 'hr', 'director', 'manager'].includes(role);
    const isPM = ['manager', 'projectmanager', 'project_manager'].includes(role);

    let canView = isOwner || isHRAdmin;

    if (!canView && isPM) {
      const ownerUser = await User.findById(ticket.employeeId).select('employeeId').lean();
      if (ownerUser && ownerUser.employeeId) {
        const { myAssignedMemberIds } = await getTeamManagementAssignmentSets(req.user.employeeId);
        if (myAssignedMemberIds.includes(ownerUser.employeeId)) {
          canView = true;
        }
      }
    }

    if (!canView) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const comments = await SupportComment.find({ ticketId: req.params.id })
      .populate('userId', 'name role')
      .sort({ createdAt: 1 });

    res.json({ ticket: ticketObj, comments });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/support/tickets/:id/status
// @desc    Update ticket status
// @access  Private
router.put('/tickets/:id/status', auth, async (req, res) => {
  try {
    const { status, comment, assignedTo } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Validation for status change
    const role = String(req.user.role || '').toLowerCase();
    const isHRAdmin = ['admin', 'hr', 'director', 'manager'].includes(role);
    const isOwner = ticket.employeeId.toString() === req.user._id.toString();
    const isPM = ['manager', 'projectmanager', 'project_manager'].includes(role);

    let isAuthorized = isHRAdmin;

    if (!isAuthorized) {
      if (isOwner) {
        if (!['Closed', 'Reopened'].includes(status)) {
          return res.status(400).json({ message: 'Invalid status update for employee' });
        }
        isAuthorized = true;
      } else if (isPM) {
        const ownerUser = await User.findById(ticket.employeeId).select('employeeId').lean();
        if (ownerUser && ownerUser.employeeId) {
          const { myAssignedMemberIds } = await getTeamManagementAssignmentSets(req.user.employeeId);
          if (myAssignedMemberIds.includes(ownerUser.employeeId)) {
            isAuthorized = true;
          }
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Access denied' });
    }

    ticket.status = status;
    if (assignedTo) ticket.assignedTo = assignedTo;
    
    if (status === 'Resolved') {
      ticket.resolution = {
        text: comment,
        resolvedAt: new Date(),
        resolvedBy: req.user._id
      };
    }

    ticket.history.push({
      status,
      updatedBy: req.user._id,
      comment
    });

    await ticket.save();

    // Notify Employee if Admin updated
    if (['admin', 'hr'].includes(req.user.role)) {
      await Notification.create({
        recipient: ticket.employeeId,
        sender: req.user._id,
        type: 'SUPPORT_STATUS',
        title: `Ticket Status Updated: ${status}`,
        message: `Your ticket ${ticket.ticketId} is now ${status}.`,
        link: `/support/tickets/${ticket._id}`,
        relatedId: ticket._id
      });
    }

    res.json(ticket);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/support/tickets/:id/comments
// @desc    Add a comment to a ticket
// @access  Private
router.post('/tickets/:id/comments', auth, async (req, res) => {
  try {
    const { message, attachments, isInternal } = req.body;
    
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // Validate access
    const isOwner = ticket.employeeId.toString() === req.user._id.toString();
    const role = String(req.user.role || '').toLowerCase();
    const isHRAdmin = ['admin', 'hr', 'director', 'manager'].includes(role);
    const isPM = ['manager', 'projectmanager', 'project_manager'].includes(role);

    let isAuthorized = isOwner || isHRAdmin;

    if (!isAuthorized && isPM) {
      const ownerUser = await User.findById(ticket.employeeId).select('employeeId').lean();
      if (ownerUser && ownerUser.employeeId) {
        const { myAssignedMemberIds } = await getTeamManagementAssignmentSets(req.user.employeeId);
        if (myAssignedMemberIds.includes(ownerUser.employeeId)) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const newComment = new SupportComment({
      ticketId: req.params.id,
      userId: req.user._id,
      message,
      attachments,
      isInternal: isInternal || false
    });

    const comment = await newComment.save();
    const populatedComment = await SupportComment.findById(comment._id).populate('userId', 'name role');

    // Notify other party
    const recipient = isOwner ? ticket.assignedTo || null : ticket.employeeId;

    if (recipient && !isInternal) {
      await Notification.create({
        recipient: recipient,
        sender: req.user._id,
        type: 'SUPPORT_COMMENT',
        title: 'New Comment on Ticket',
        message: `New message on ticket ${ticket.ticketId}`,
        link: isOwner ? `/admin/support/tickets/${ticket._id}` : `/support/tickets/${ticket._id}`,
        relatedId: ticket._id
      });
    }

    res.json(populatedComment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/support/dashboard-stats
// @desc    Get ticket stats for admin dashboard
// @access  Private (Admin/HR)
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const stats = {
      total: await SupportTicket.countDocuments(),
      open: await SupportTicket.countDocuments({ status: 'Open' }),
      resolved: await SupportTicket.countDocuments({ status: 'Resolved' }),
      closed: await SupportTicket.countDocuments({ status: 'Closed' }),
      reopened: await SupportTicket.countDocuments({ status: 'Reopened' }),
      highPriority: await SupportTicket.countDocuments({ priority: { $in: ['High', 'Critical'] } }),
      recent: await SupportTicket.find().sort({ createdAt: -1 }).populate('employeeId', 'name')
    };

    res.json(stats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
