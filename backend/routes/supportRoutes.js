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

// Multer Setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// @route   GET api/support/attachments/:ticketId/:attachmentId
// @desc    Get ticket attachment from database
// @access  Public
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
router.post('/tickets', auth, upload.array('attachments', 5), async (req, res) => {
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

// @route   GET api/support/tickets/all
// @desc    Get all tickets (Admin/HR only)
// @access  Private
router.get('/tickets/all', auth, async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status, category, priority } = req.query;
    let query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

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

    // Check ownership
    const isOwner = ticketObj.employeeId && ticketObj.employeeId._id.toString() === req.user._id.toString();
    if (!isOwner && !['admin', 'hr'].includes(req.user.role)) {
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
    if (!['admin', 'hr'].includes(req.user.role)) {
       if (ticket.employeeId.toString() !== req.user._id.toString()) {
         return res.status(403).json({ message: 'Access denied' });
       }
       if (!['Closed', 'Reopened'].includes(status)) {
         return res.status(400).json({ message: 'Invalid status update for employee' });
       }
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
    const isOwner = ticket.employeeId.toString() === req.user._id.toString();
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
