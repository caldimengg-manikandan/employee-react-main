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
const { sendZohoMail } = require('../zohoMail.service');

// Helper function to send email notification based on Main Category
async function sendTicketEmailNotification(ticket, reqUser, host) {
  try {
    const emp = await Employee.findOne({ employeeId: reqUser.employeeId }).lean();
    const empName = reqUser.name || 'N/A';
    const empId = reqUser.employeeId || 'N/A';
    const department = (emp && (emp.department || emp.division)) || 'N/A';
    const designation = (emp && (emp.designation || emp.position)) || reqUser.role || 'N/A';
    const createdDateTime = new Date(ticket.createdAt || Date.now()).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'medium'
    });

    let attachmentHtml = 'None';
    if (ticket.attachments && ticket.attachments.length > 0) {
      const links = ticket.attachments.map((att, i) => {
        const fullUrl = att.url.startsWith('http') ? att.url : `http://${host}${att.url}`;
        return `<a href="${fullUrl}" target="_blank" style="color: #4F1A6F; text-decoration: underline;">Attachment ${i + 1}: ${att.name}</a>`;
      });
      attachmentHtml = links.join('<br/>');
    }

    let toAddresses = [];
    let ccAddresses = [];
    let emailSubject = '';

    // Helper to fetch IT Admin emails
    const fetchITAdminEmails = async () => {
      const itAdminMails = [];
      const itAdminEmps = await Employee.find({ 
        designation: { $regex: /IT Admin|IT Support|IT Manager|IT System Administrator/i },
        status: { $nin: ['Inactive', 'Exited'] }
      }).select('officialEmail email').lean();

      itAdminEmps.forEach(e => {
        const mail = (e.officialEmail || e.email || '').trim();
        if (mail) itAdminMails.push(mail);
      });

      const itAdminUsers = await User.find({ role: 'it_admin' }).select('email employeeId').lean();
      for (const u of itAdminUsers) {
        if (u.employeeId) {
          const uEmp = await Employee.findOne({ employeeId: u.employeeId, status: { $nin: ['Inactive', 'Exited'] } }).select('officialEmail email').lean();
          if (uEmp) {
            const mail = (uEmp.officialEmail || uEmp.email || u.email || '').trim();
            if (mail) itAdminMails.push(mail);
            continue;
          }
        }
        if (u.email) itAdminMails.push(u.email.trim());
      }
      return Array.from(new Set(itAdminMails.map(e => e.trim().toLowerCase())));
    };

    // Helper to fetch active HR and General Admin email addresses (EXCLUDING IT Admin)
    const fetchHRAndAdminEmails = async () => {
      const hrAdminMails = [];
      // 1. Employees with HR or General Admin designation (excluding IT) or department/division
      const hrAdminEmps = await Employee.find({
        $or: [
          { designation: { $regex: /HR|Human Resource/i } },
          { designation: { $regex: /Admin/i, $not: /IT/i } },
          { department: { $regex: /^(HR|Human Resource|Admin)$/i } },
          { division: { $regex: /^(HR|Human Resource|Admin)$/i } }
        ],
        designation: { $not: /IT Admin|IT Support|IT Manager|IT System Administrator/i },
        status: { $nin: ['Inactive', 'Exited'] }
      }).select('officialEmail email').lean();

      hrAdminEmps.forEach(e => {
        const m = (e.officialEmail || e.email || '').trim();
        if (m) hrAdminMails.push(m);
      });

      // 2. Users with role 'hr' or 'admin'
      const hrAdminUsers = await User.find({ role: { $regex: /^(hr|admin)$/i } }).select('email employeeId').lean();
      for (const u of hrAdminUsers) {
        if (u.employeeId) {
          const uEmp = await Employee.findOne({ employeeId: u.employeeId, status: { $nin: ['Inactive', 'Exited'] } }).select('officialEmail email designation').lean();
          if (uEmp) {
            if (/IT Admin|IT Support|IT Manager|IT System Administrator/i.test(uEmp.designation || '')) continue;
            const m = (uEmp.officialEmail || uEmp.email || u.email || '').trim();
            if (m) hrAdminMails.push(m);
            continue;
          }
        }
        if (u.email) hrAdminMails.push(u.email.trim());
      }
      return hrAdminMails;
    };

    // Helper to fetch GM emails
    const fetchGMEmails = async () => {
      const gmMails = [];
      const gmEmps = await Employee.find({
        designation: { $regex: /General Manager|GM/i },
        status: { $nin: ['Inactive', 'Exited'] }
      }).select('officialEmail email').lean();

      gmEmps.forEach(e => {
        const m = (e.officialEmail || e.email || '').trim();
        if (m) gmMails.push(m);
      });
      return gmMails;
    };

    const itAdminEmails = await fetchITAdminEmails();
    const hrAdminEmails = await fetchHRAndAdminEmails();
    const gmEmails = await fetchGMEmails();

    if (ticket.mainCategory === 'IT Queries') {
      emailSubject = `[IT SUPPORT] ${ticket.ticketNumber || ticket.ticketId} - ${ticket.subject}`;

      // TO IT Admin
      toAddresses.push(...itAdminEmails);

      if (toAddresses.length === 0) {
        toAddresses.push('support@caldimengg.in');
      }

      // CC HR/Admin and General Manager
      ccAddresses.push(...hrAdminEmails, ...gmEmails);

    } else {
      // Non-IT Queries
      emailSubject = `[NON-IT SUPPORT] ${ticket.ticketNumber || ticket.ticketId} - ${ticket.subject}`;

      // TO Admin and HR (excluding IT Admin)
      toAddresses.push(...hrAdminEmails);

      if (toAddresses.length === 0) {
        toAddresses.push('support@caldimengg.in');
      }

      // CC General Manager
      ccAddresses.push(...gmEmails);
    }

    // Clean and deduplicate TO & CC addresses
    toAddresses = Array.from(new Set(toAddresses.map(e => e.trim().toLowerCase())));
    ccAddresses = Array.from(new Set(ccAddresses.map(e => e.trim().toLowerCase())));

    // Explicitly remove IT Admin emails from Non-IT Queries
    if (ticket.mainCategory !== 'IT Queries') {
      toAddresses = toAddresses.filter(e => !itAdminEmails.includes(e));
      ccAddresses = ccAddresses.filter(e => !itAdminEmails.includes(e));
    }

    // Remove any TO address from CC list so recipients aren't duplicated
    ccAddresses = ccAddresses.filter(e => !toAddresses.includes(e));

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
        <h2 style="color: #4F1A6F; border-bottom: 2px solid #4F1A6F; padding-bottom: 8px; margin-top: 0;">CALDIM Support Center Notification</h2>
        <p>A new support ticket has been raised with the details below:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 8px; font-weight: bold; width: 35%; border-bottom: 1px solid #f1f5f9;">Ticket Number:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #4F1A6F;">${ticket.ticketNumber || ticket.ticketId}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9;">Employee Name:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${empName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9;">Employee ID:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${empId}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9;">Department:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${department}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9;">Designation:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${designation}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9;">Main Category:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${ticket.mainCategory}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9;">Sub Category:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${ticket.subCategory}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9;">Priority:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${ticket.priority}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9;">Subject:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${ticket.subject}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9; vertical-align: top;">Description:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; white-space: pre-wrap;">${ticket.description}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9; vertical-align: top;">Attachment Links:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${attachmentHtml}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9;">Date & Time:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${createdDateTime}</td></tr>
        </table>
        <p style="margin-top: 20px; font-size: 12px; color: #64748b;">This is an automated notification from the CALDIM Employee Support Portal.</p>
      </div>
    `;

    await sendZohoMail({
      to: toAddresses,
      cc: ccAddresses.length > 0 ? ccAddresses : undefined,
      subject: emailSubject,
      html: htmlContent
    });

    ticket.emailNotificationStatus = 'Sent';
    await ticket.save();
  } catch (err) {
    console.error('Failed to send ticket email notification:', err.message);
    ticket.emailNotificationStatus = 'Failed';
    await ticket.save();
  }
}

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

router.get('/attachments/:ticketId/:attachmentId', async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).send('Ticket not found');
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
    const { mainCategory, subCategory, category, priority, subject, description } = req.body;

    const resolvedMainCategory = mainCategory || 'Non-IT Queries';
    const resolvedSubCategory = subCategory || category || 'General Query';
    
    const attachments = (req.files || []).map(file => ({
      name: file.originalname,
      contentType: file.mimetype,
      data: file.buffer.toString('base64'),
      url: '' // Set placeholder first
    }));

    const newTicket = new SupportTicket({
      employeeId: req.user._id,
      mainCategory: resolvedMainCategory,
      subCategory: resolvedSubCategory,
      category: resolvedSubCategory,
      priority: priority || 'Medium',
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

    // Trigger Dynamic Email Notification
    sendTicketEmailNotification(ticket, req.user, req.headers.host);

    // Notify Admins in In-App Notifications
    const admins = await User.find({ role: { $in: ['admin', 'hr', 'it_admin'] } });
    for (const admin of admins) {
      await Notification.create({
        recipient: admin._id,
        sender: req.user._id,
        type: 'SUPPORT_TICKET',
        title: 'New Support Ticket Raised',
        message: `${req.user.name} raised ticket ${ticket.ticketNumber || ticket.ticketId}: ${subject}`,
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
    const userEmp = await Employee.findOne({ employeeId: req.user.employeeId }).select('designation').lean();
    const isITAdmin = role === 'it_admin' || (userEmp && /IT Admin/i.test(userEmp.designation || ''));
    const isHRAdmin = ['admin', 'hr', 'director', 'manager'].includes(role) || isITAdmin;
    const isPM = ['manager', 'projectmanager', 'project_manager'].includes(role);

    if (!isHRAdmin && !isPM) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status, category, mainCategory, subCategory, priority } = req.query;
    let query = {};
    if (status) query.status = status;
    if (mainCategory) query.mainCategory = mainCategory;
    if (subCategory) query.subCategory = subCategory;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    // IT Admin restriction: View only IT Query tickets
    if (isITAdmin && !['admin', 'hr'].includes(role)) {
      query.mainCategory = 'IT Queries';
    }

    if (!isHRAdmin && isPM) {
      const { myAssignedMemberIds } = await getTeamManagementAssignmentSets(req.user.employeeId);
      const teamUsers = await User.find({ employeeId: { $in: myAssignedMemberIds } }).select('_id').lean();
      const teamUserIds = teamUsers.map(u => u._id);
      query.employeeId = { $in: [...teamUserIds, req.user._id] };
    }

    const tickets = await SupportTicket.find(query)
      .populate('employeeId', 'name employeeId email')
      .populate('assignedTo', 'name email employeeId')
      .sort({ createdAt: -1 });

    const enrichedTickets = await Promise.all(tickets.map(async (t) => {
      const ticketObj = t.toObject();
      if (ticketObj.employeeId && ticketObj.employeeId.employeeId) {
        const emp = await Employee.findOne({ employeeId: ticketObj.employeeId.employeeId }).select('division location department designation');
        if (emp) {
          ticketObj.employeeId.division = emp.division || emp.department || 'N/A';
          ticketObj.employeeId.location = emp.location || 'N/A';
          ticketObj.employeeId.designation = emp.designation || 'N/A';
        } else {
          ticketObj.employeeId.division = 'N/A';
          ticketObj.employeeId.location = 'N/A';
          ticketObj.employeeId.designation = 'N/A';
        }
      } else if (ticketObj.employeeId) {
        ticketObj.employeeId.division = 'N/A';
        ticketObj.employeeId.location = 'N/A';
        ticketObj.employeeId.designation = 'N/A';
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
      .populate('assignedTo', 'name email employeeId')
      .populate('resolution.resolvedBy', 'name');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const ticketObj = ticket.toObject();
    if (ticketObj.employeeId && ticketObj.employeeId.employeeId) {
      const emp = await Employee.findOne({ employeeId: ticketObj.employeeId.employeeId }).select('division location department designation');
      if (emp) {
        ticketObj.employeeId.division = emp.division || emp.department || 'N/A';
        ticketObj.employeeId.location = emp.location || 'N/A';
        ticketObj.employeeId.designation = emp.designation || 'N/A';
      } else {
        ticketObj.employeeId.division = 'N/A';
        ticketObj.employeeId.location = 'N/A';
        ticketObj.employeeId.designation = 'N/A';
      }
    } else if (ticketObj.employeeId) {
      ticketObj.employeeId.division = 'N/A';
      ticketObj.employeeId.location = 'N/A';
      ticketObj.employeeId.designation = 'N/A';
    }

    // Check ownership and hierarchy
    const isOwner = ticketObj.employeeId && ticketObj.employeeId._id.toString() === req.user._id.toString();
    const role = String(req.user.role || '').toLowerCase();
    const userEmp = await Employee.findOne({ employeeId: req.user.employeeId }).select('designation').lean();
    const isITAdmin = role === 'it_admin' || (userEmp && /IT Admin/i.test(userEmp.designation || ''));
    const isHRAdmin = ['admin', 'hr', 'director', 'manager'].includes(role) || isITAdmin;
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

    // Restriction for IT Admin viewing Non-IT tickets if strictly scoped
    if (isITAdmin && !['admin', 'hr'].includes(role) && ticketObj.mainCategory === 'Non-IT Queries' && !isOwner) {
      return res.status(403).json({ message: 'Access denied: IT Admins can only view IT Query tickets' });
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
    const { status, comment, assignedTo, assignedRole, internalRemarks, resolutionRemarks } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Validation for status change
    const role = String(req.user.role || '').toLowerCase();
    const userEmp = await Employee.findOne({ employeeId: req.user.employeeId }).select('designation').lean();
    const isITAdmin = role === 'it_admin' || (userEmp && /IT Admin/i.test(userEmp.designation || ''));
    const isHRAdmin = ['admin', 'hr', 'director', 'manager'].includes(role) || isITAdmin;
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

    if (status) ticket.status = status;
    if (assignedTo !== undefined) ticket.assignedTo = assignedTo;
    if (assignedRole !== undefined) ticket.assignedRole = assignedRole;
    if (internalRemarks !== undefined) ticket.internalRemarks = internalRemarks;
    if (resolutionRemarks !== undefined) ticket.resolutionRemarks = resolutionRemarks;

    if (status === 'Resolved') {
      ticket.resolution = {
        text: resolutionRemarks || comment || 'Issue resolved',
        resolvedAt: new Date(),
        resolvedBy: req.user._id
      };
      if (resolutionRemarks) ticket.resolutionRemarks = resolutionRemarks;
    }

    ticket.history.push({
      status: status || ticket.status,
      updatedBy: req.user._id,
      comment: comment || internalRemarks || resolutionRemarks || `Status updated to ${status}`
    });

    await ticket.save();

    // Notify Employee if Admin / HR / IT Admin updated
    if (isHRAdmin && String(ticket.employeeId) !== String(req.user._id)) {
      await Notification.create({
        recipient: ticket.employeeId,
        sender: req.user._id,
        type: 'SUPPORT_STATUS',
        title: `Ticket Status Updated: ${ticket.status}`,
        message: `Your ticket ${ticket.ticketNumber || ticket.ticketId} is now ${ticket.status}.`,
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
// @access  Private (Admin/HR/IT Admin)
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    const role = String(req.user.role || '').toLowerCase();
    const userEmp = await Employee.findOne({ employeeId: req.user.employeeId }).select('designation').lean();
    const isITAdmin = role === 'it_admin' || (userEmp && /IT Admin/i.test(userEmp.designation || ''));
    const isHRAdmin = ['admin', 'hr', 'director', 'manager'].includes(role) || isITAdmin;

    if (!isHRAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let filterQuery = {};
    if (req.query.mainCategory) {
      filterQuery.mainCategory = req.query.mainCategory;
    }
    if (isITAdmin && !['admin', 'hr'].includes(role)) {
      filterQuery.mainCategory = 'IT Queries';
    }

    const stats = {
      total: await SupportTicket.countDocuments(filterQuery),
      open: await SupportTicket.countDocuments({ ...filterQuery, status: 'Open' }),
      resolved: await SupportTicket.countDocuments({ ...filterQuery, status: 'Resolved' }),
      closed: await SupportTicket.countDocuments({ ...filterQuery, status: 'Closed' }),
      reopened: await SupportTicket.countDocuments({ ...filterQuery, status: 'Reopened' }),
      highPriority: await SupportTicket.countDocuments({ ...filterQuery, priority: { $in: ['High', 'Critical'] } }),
      recent: await SupportTicket.find(filterQuery).sort({ createdAt: -1 }).populate('employeeId', 'name employeeId')
    };

    res.json(stats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
