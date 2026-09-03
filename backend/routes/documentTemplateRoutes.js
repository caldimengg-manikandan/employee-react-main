const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const DocumentTemplate = require('../models/DocumentTemplate');
const GeneratedDocument = require('../models/GeneratedDocument');
const DirectorProfile = require('../models/DirectorProfile');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');

// Default Seed Templates for HR Documents
const DEFAULT_TEMPLATES = [
  {
    templateId: 'OFFER_LETTER',
    title: 'Employment Offer Letter',
    category: 'Recruitment',
    description: 'Official employment offer letter for prospective employees.',
    defaultContent: `<p>Dear <strong>{{employeeName}}</strong>,</p>
<p>We are pleased to extend an offer of employment for the position of <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department at <strong>CALDIM Technologies Private Limited</strong>.</p>
<p>Your Date of Joining will be <strong>{{doj}}</strong>. Your annual compensation package will be <strong>INR {{salary}}</strong> per annum, subject to statutory deductions.</p>
<p>You will be reporting directly to <strong>{{reportingManager}}</strong>. Detailed terms and conditions of your employment are outlined in the appointment agreement.</p>
<p>Please sign and return a copy of this letter as acceptance of this offer.</p>
<p>Welcome aboard!</p>`
  },
  {
    templateId: 'APPOINTMENT_LETTER',
    title: 'Official Appointment Letter',
    category: 'Onboarding',
    description: 'Formal appointment letter confirming terms of employment.',
    defaultContent: `<p>Date: <strong>{{currentDate}}</strong></p>
<p>To,<br/><strong>{{employeeName}}</strong><br/>Employee ID: <strong>{{employeeId}}</strong></p>
<p>Dear <strong>{{employeeName}}</strong>,</p>
<p>With reference to your application and subsequent interviews, we are delighted to appoint you as <strong>{{designation}}</strong> in <strong>{{department}}</strong> at CALDIM Technologies Private Limited, effective <strong>{{doj}}</strong>.</p>
<p>Your total CTC will be <strong>INR {{salary}}</strong> per annum. Your employment will be governed by the rules, regulations, and policies of the Company.</p>
<p>We wish you a successful and rewarding career with CALDIM.</p>`
  },
  {
    templateId: 'EXPERIENCE_LETTER',
    title: 'Relieving & Experience Certificate',
    category: 'Separation',
    description: 'Official experience certificate confirming service duration and designation.',
    defaultContent: `<p>To,<br/><strong>{{employeeName}}</strong><br/>Employee ID: <strong>{{employeeId}}</strong><br/>Designation: <strong>{{designation}}</strong></p>

<p>Subject: <strong>Relieving & Experience Certificate</strong></p>

<p>Dear <strong>{{employeeName}}</strong>,</p>

<p>This is to certify that <strong>{{employeeName}}</strong> (Employee ID: <strong>{{employeeId}}</strong>) worked at <strong>CALDIM Engineering Private Limited</strong> ("Company") as <strong>{{designation}}</strong> in <strong>{{department}}</strong> from <strong>{{doj}}</strong> to <strong>{{currentDate}}</strong>.</p>

<p>During their tenure with us, we found them to be sincere, dedicated, and hard-working. Pursuant to cessation of employment, all exit clearances and full & final settlement have been completed.</p>

<p>We remind you that obligations regarding proprietary work created during employment, confidentiality of company information, and non-disparagement remain in effect.</p>

<p>We wish <strong>{{employeeName}}</strong> all the best for their future endeavours!</p>`
  },
  {
    templateId: 'SALARY_CERTIFICATE',
    title: 'Salary Certificate',
    category: 'Payroll',
    description: 'Salary confirmation certificate for bank/visa purposes.',
    defaultContent: `<p>Date: <strong>{{currentDate}}</strong></p>
<p><strong>TO WHOM IT MAY CONCERN</strong></p>
<p>This is to certify that <strong>{{employeeName}}</strong> (Employee ID: <strong>{{employeeId}}</strong>) is currently working with <strong>CALDIM Engineering Private Limited</strong> as <strong>{{designation}}</strong> in <strong>{{department}}</strong> since <strong>{{doj}}</strong>.</p>
<p>Their current gross annual compensation is <strong>INR {{salary}}</strong> per annum.</p>
<p>This certificate is issued upon the request of the employee for official purposes without any financial liability on the Company.</p>`
  },
  {
    templateId: 'WARNING_LETTER',
    title: 'Formal Warning Letter',
    category: 'Disciplinary',
    description: 'Official performance or conduct warning notice.',
    defaultContent: `<p>Date: <strong>{{currentDate}}</strong></p>
<p>To,<br/><strong>{{employeeName}}</strong> (Employee ID: <strong>{{employeeId}}</strong>)<br/>Designation: <strong>{{designation}}</strong></p>
<p>Subject: <strong>Formal Warning Notice</strong></p>
<p>Dear <strong>{{employeeName}}</strong>,</p>
<p>This letter serves as a formal warning regarding performance / workplace policy compliance issues observed in your department (<strong>{{department}}</strong>).</p>
<p>You are advised to discuss these matters with your Reporting Manager <strong>{{reportingManager}}</strong> and take immediate corrective measures. Failure to demonstrate required standards within 30 days may lead to further administrative action.</p>`
  },
  {
    templateId: 'PROMOTION_LETTER',
    title: 'Promotion & Salary Revision Letter',
    category: 'Performance',
    description: 'Official letter confirming promotion and compensation revision.',
    defaultContent: `<p>Date: <strong>{{currentDate}}</strong></p>
<p>Dear <strong>{{employeeName}}</strong> (Employee ID: <strong>{{employeeId}}</strong>),</p>
<p>In recognition of your exceptional performance and outstanding contribution to <strong>CALDIM Engineering Private Limited</strong>, management is pleased to promote you to <strong>{{designation}}</strong> in <strong>{{department}}</strong>, effective <strong>{{currentDate}}</strong>.</p>
<p>Your revised annual compensation package will be <strong>INR {{salary}}</strong> per annum. Your reporting manager will continue to be <strong>{{reportingManager}}</strong>.</p>
<p>We congratulate you on this well-deserved promotion!</p>`
  },
  {
    templateId: 'RELIEVING_LETTER',
    title: 'Relieving Letter',
    category: 'Separation',
    description: 'Official letter confirming release from company service.',
    defaultContent: `<p>To,<br/><strong>{{employeeName}}</strong><br/>Employee ID: <strong>{{employeeId}}</strong><br/>Designation: <strong>{{designation}}</strong></p>

<p>Subject: <strong>Relieving from your employment</strong></p>

<p>Dear <strong>{{employeeName}}</strong>,</p>

<p>You worked at <strong>CALDIM Engineering Private Limited</strong> ("Company") from <strong>{{doj}}</strong> to <strong>{{currentDate}}</strong>. Pursuant to your cessation of employment with the Company from <strong>{{currentDate}}</strong>, your Employment Agreement stands terminated.</p>

<p>We would also like to take this opportunity to remind you that, notwithstanding the termination of your employment with the Company, certain of your obligations under your Employment Agreement will continue. These obligations include, but may not be limited to the following:</p>

<ol>
  <li>All developments made and works created by you during the Term of your employment with the Company is the exclusive proprietary property of the Company.</li>
  <li>You shall not divulge Confidential Information of the Company to any third party.</li>
  <li>You shall not give any statement or post anything regarding the Company in any form of media.</li>
</ol>

<p>We confirm that:</p>
<ul>
  <li>Full and final settlement has been processed.</li>
  <li>All company assets have been returned.</li>
  <li>All exit formalities have been completed.</li>
</ul>

<p>We wish you all the best for your future endeavours!</p>`
  },
  {
    templateId: 'NOC',
    title: 'No Objection Certificate (NOC)',
    category: 'General',
    description: 'Official NOC for passport, higher studies, or bank loans.',
    defaultContent: `<p>Date: <strong>{{currentDate}}</strong></p>
<p><strong>TO WHOM IT MAY CONCERN</strong></p>
<p>This is to certify that <strong>{{employeeName}}</strong> (Employee ID: <strong>{{employeeId}}</strong>) is a permanent employee of <strong>CALDIM Technologies Private Limited</strong> working as <strong>{{designation}}</strong> in <strong>{{department}}</strong> since <strong>{{doj}}</strong>.</p>
<p>The Management has <strong>NO OBJECTION</strong> to <strong>{{employeeName}}</strong> applying for official visa / higher studies / financial processing.</p>
<p>This certificate is issued at the request of the employee.</p>`
  },
  {
    templateId: 'CUSTOM',
    title: 'Custom Official Document',
    category: 'General',
    description: 'Custom document template on official CALDIM letterhead.',
    defaultContent: `<p>Date: <strong>{{currentDate}}</strong></p>
<p>To,<br/><strong>{{employeeName}}</strong> (Employee ID: <strong>{{employeeId}}</strong>)<br/>Designation: <strong>{{designation}}</strong></p>
<p>Dear <strong>{{employeeName}}</strong>,</p>
<p>Insert custom official document text here...</p>`
  }
];

// Seed templates helper
async function seedDefaultTemplates() {
  try {
    for (const t of DEFAULT_TEMPLATES) {
      await DocumentTemplate.updateOne(
        { templateId: t.templateId },
        { $set: t },
        { upsert: true }
      );
    }
  } catch (err) {
    console.error('Error seeding document templates:', err);
  }
}

// Ensure default templates on start
seedDefaultTemplates();

// ----------------------------------------------------
// 1. GET /templates - Fetch all document templates
// ----------------------------------------------------
router.get('/templates', auth, async (req, res) => {
  try {
    await seedDefaultTemplates();
    const templates = await DocumentTemplate.find({ isActive: true }).sort({ category: 1, title: 1 });
    res.json({ success: true, data: templates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 1b. POST /templates - Create new custom template
// ----------------------------------------------------
router.post('/templates', auth, async (req, res) => {
  try {
    const { title, category, description, defaultContent } = req.body;
    if (!title || !defaultContent) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const templateId = 'CUSTOM_' + Date.now();
    const newTemplate = await DocumentTemplate.create({
      templateId,
      title,
      category: category || 'Custom',
      description: description || 'Custom template created by HR',
      defaultContent,
      isCustom: true,
      createdBy: req.user._id
    });

    res.json({ success: true, data: newTemplate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 2. GET /director-profile - Fetch Director Signature & Seal Settings
// ----------------------------------------------------
router.get('/director-profile', auth, async (req, res) => {
  try {
    let profile = await DirectorProfile.findOne();
    if (!profile) {
      // Find a Director user if exists
      const directorUser = await User.findOne({
        $or: [
          { role: { $regex: /director/i } },
          { designation: { $regex: /director/i } }
        ]
      });

      profile = await DirectorProfile.create({
        userId: directorUser ? directorUser._id : req.user._id,
        name: directorUser ? directorUser.name : 'Dr. Manikandan S',
        designation: directorUser ? (directorUser.designation || 'Managing Director & CEO') : 'Managing Director & CEO',
        companyName: 'CALDIM Technologies Private Limited',
        signatureImage: '',
        digitalSeal: ''
      });
    }
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 3. POST /director-profile - Upload / Update Director Signature & Seal
// ----------------------------------------------------
router.post('/director-profile', auth, async (req, res) => {
  try {
    const roleLower = String(req.user.role || '').toLowerCase();
    const designationLower = String(req.user.designation || '').toLowerCase();
    const isDirectorOrAdmin = ['admin', 'director', 'manager'].includes(roleLower) || designationLower.includes('director');

    if (!isDirectorOrAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: Only Director / Admin can update signature settings.' });
    }

    const { name, designation, companyName, signatureImage, digitalSeal } = req.body;

    let profile = await DirectorProfile.findOne();
    if (!profile) {
      profile = new DirectorProfile({
        userId: req.user._id,
        name: name || req.user.name,
        designation: designation || 'Managing Director & CEO',
        companyName: companyName || 'CALDIM Technologies Private Limited',
        signatureImage: signatureImage || '',
        digitalSeal: digitalSeal || ''
      });
    } else {
      if (name) profile.name = name;
      if (designation) profile.designation = designation;
      if (companyName) profile.companyName = companyName;
      if (signatureImage !== undefined) profile.signatureImage = signatureImage;
      if (digitalSeal !== undefined) profile.digitalSeal = digitalSeal;
      profile.updatedBy = req.user._id;
    }

    await profile.save();
    res.json({ success: true, data: profile, message: 'Director signature profile updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 4. POST /documents - Create New Document Draft (HR / Admin)
// ----------------------------------------------------
router.post('/documents', auth, async (req, res) => {
  try {
    const roleLower = String(req.user.role || '').toLowerCase();
    const isAllowed = ['admin', 'hr', 'director', 'gm', 'general_manager', 'generalmanager'].includes(roleLower);

    if (!isAllowed) {
      return res.status(403).json({ success: false, message: 'Access denied: HR/Admin/GM/Director only' });
    }

    const { templateId, templateName, employeeId, employeeDetails, title, content, submitNow } = req.body;

    if (!templateId || !employeeId || !content) {
      return res.status(400).json({ success: false, message: 'Template, Employee, and Content are required.' });
    }

    // Generate unique document number e.g. CAL-DOC-2026-0001
    const year = new Date().getFullYear();
    const count = await GeneratedDocument.countDocuments();
    const docNumber = `CAL-DOC-${year}-${String(count + 1).padStart(4, '0')}`;

    const newDoc = new GeneratedDocument({
      documentNumber: docNumber,
      templateId,
      templateName: templateName || templateId,
      employeeId,
      employeeDetails: employeeDetails || {},
      title: title || templateName || 'Official Company Document',
      content,
      status: submitNow ? 'Pending Director Approval' : 'Draft',
      createdBy: req.user._id,
      auditLog: [
        {
          action: submitNow ? 'SUBMITTED' : 'CREATED',
          performedBy: { userId: req.user._id, name: req.user.name, role: req.user.role },
          notes: submitNow ? 'Created and submitted directly for Director approval' : 'Created document draft'
        }
      ]
    });

    await newDoc.save();

    // If submitted immediately, notify Directors
    if (submitNow) {
      try {
        const directors = await User.find({
          $or: [
            { role: 'director' },
            { designation: { $regex: /director/i } },
            { role: 'admin' }
          ]
        }).select('_id');

        for (const dir of directors) {
          if (String(dir._id) === String(req.user._id)) continue;
          await Notification.create({
            recipient: dir._id,
            sender: req.user._id,
            title: 'Document Pending Director Approval',
            message: `${req.user.name} submitted ${newDoc.templateName} (${newDoc.documentNumber}) for ${employeeDetails?.name || employeeId} for approval.`,
            type: 'SUPPORT_TICKET',
            link: '/document-templates'
          });
        }
      } catch (notifErr) {
        console.error('Error sending Director notification:', notifErr);
      }
    }

    res.status(201).json({ success: true, data: newDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 5. PUT /documents/:id - Update Draft Content
// ----------------------------------------------------
router.put('/documents/:id', auth, async (req, res) => {
  try {
    const doc = await GeneratedDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    if (doc.status !== 'Draft' && doc.status !== 'Rejected') {
      return res.status(400).json({ success: false, message: 'Only Draft or Rejected documents can be edited.' });
    }

    const { title, content, employeeDetails } = req.body;
    if (title) doc.title = title;
    if (content) doc.content = content;
    if (employeeDetails) doc.employeeDetails = employeeDetails;

    doc.auditLog.push({
      action: 'UPDATED',
      performedBy: { userId: req.user._id, name: req.user.name, role: req.user.role },
      notes: 'Updated document content'
    });

    await doc.save();
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 6. POST /documents/:id/submit - Submit Draft for Director Approval
// ----------------------------------------------------
router.post('/documents/:id/submit', auth, async (req, res) => {
  try {
    const doc = await GeneratedDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    doc.status = 'Pending Director Approval';
    doc.auditLog.push({
      action: 'SUBMITTED',
      performedBy: { userId: req.user._id, name: req.user.name, role: req.user.role },
      notes: 'Submitted for Director approval'
    });

    await doc.save();

    // Notify Directors
    try {
      const directors = await User.find({
        $or: [
          { role: 'director' },
          { designation: { $regex: /director/i } },
          { role: 'admin' }
        ]
      }).select('_id');

      for (const dir of directors) {
        if (String(dir._id) === String(req.user._id)) continue;
        await Notification.create({
          recipient: dir._id,
          sender: req.user._id,
          title: 'Document Pending Director Approval',
          message: `${req.user.name} submitted ${doc.templateName} (${doc.documentNumber}) for ${doc.employeeDetails?.name || doc.employeeId} for approval.`,
          type: 'SUPPORT_TICKET',
          link: '/document-templates'
        });
      }
    } catch (notifErr) {
      console.error('Error sending Director notification:', notifErr);
    }

    res.json({ success: true, data: doc, message: 'Document submitted for Director approval' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 7. POST /documents/:id/approve - Director Approves & Embeds Signature
// ----------------------------------------------------
router.post('/documents/:id/approve', auth, async (req, res) => {
  try {
    const roleLower = String(req.user.role || '').toLowerCase();
    const designationLower = String(req.user.designation || '').toLowerCase();
    const isDirector = roleLower === 'director' || roleLower === 'admin' || designationLower.includes('director');

    if (!isDirector) {
      return res.status(403).json({ success: false, message: 'Access denied: Only Director / Admin can approve official documents.' });
    }

    const doc = await GeneratedDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    // Fetch latest Director profile settings
    const dirProfile = await DirectorProfile.findOne();

    doc.status = 'Approved';
    doc.approvedBy = req.user._id;
    doc.rejectionReason = '';

    doc.directorSignature = {
      signatureImage: dirProfile?.signatureImage || '',
      digitalSeal: dirProfile?.digitalSeal || '',
      name: dirProfile?.name || req.user.name,
      designation: dirProfile?.designation || 'Managing Director & CEO',
      companyName: dirProfile?.companyName || 'CALDIM Technologies Private Limited',
      signedAt: new Date()
    };

    doc.auditLog.push({
      action: 'APPROVED',
      performedBy: { userId: req.user._id, name: req.user.name, role: req.user.role },
      notes: 'Approved document and attached digital signature'
    });

    await doc.save();

    // Notify HR / Creator
    try {
      await Notification.create({
        recipient: doc.createdBy,
        sender: req.user._id,
        title: 'Document Approved by Director',
        message: `${doc.templateName} (${doc.documentNumber}) for ${doc.employeeDetails?.name || doc.employeeId} has been approved by ${req.user.name}.`,
        type: 'SUPPORT_STATUS',
        link: '/document-templates'
      });
    } catch (notifErr) {
      console.error('Error sending HR notification:', notifErr);
    }

    res.json({ success: true, data: doc, message: 'Document approved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 8. POST /documents/:id/reject - Director Rejects Document
// ----------------------------------------------------
router.post('/documents/:id/reject', auth, async (req, res) => {
  try {
    const roleLower = String(req.user.role || '').toLowerCase();
    const designationLower = String(req.user.designation || '').toLowerCase();
    const isDirector = roleLower === 'director' || roleLower === 'admin' || designationLower.includes('director');

    if (!isDirector) {
      return res.status(403).json({ success: false, message: 'Access denied: Only Director / Admin can reject official documents.' });
    }

    const { reason } = req.body;
    const doc = await GeneratedDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    doc.status = 'Rejected';
    doc.rejectionReason = reason || 'Changes requested by Director';

    doc.auditLog.push({
      action: 'REJECTED',
      performedBy: { userId: req.user._id, name: req.user.name, role: req.user.role },
      notes: `Rejected with comments: ${doc.rejectionReason}`
    });

    await doc.save();

    // Notify HR / Creator
    try {
      await Notification.create({
        recipient: doc.createdBy,
        sender: req.user._id,
        title: 'Document Rejected by Director',
        message: `${doc.templateName} (${doc.documentNumber}) was rejected.${reason ? ` Reason: ${reason}` : ''}`,
        type: 'SUPPORT_STATUS',
        link: '/document-templates'
      });
    } catch (notifErr) {
      console.error('Error sending HR rejection notification:', notifErr);
    }

    res.json({ success: true, data: doc, message: 'Document rejected and sent back to HR' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 9. POST /documents/:id/log-action - Log Download / Print Action
// ----------------------------------------------------
router.post('/documents/:id/log-action', auth, async (req, res) => {
  try {
    const { action, notes } = req.body; // 'DOWNLOADED' or 'PRINTED'
    const allowed = ['DOWNLOADED', 'PRINTED'];
    if (!allowed.includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid audit action' });
    }

    const doc = await GeneratedDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    if (doc.status === 'Approved' && action === 'DOWNLOADED') {
      doc.status = 'Downloaded';
    }

    doc.auditLog.push({
      action,
      performedBy: { userId: req.user._id, name: req.user.name, role: req.user.role },
      notes: notes || `Document ${action.toLowerCase()} by user`
    });

    await doc.save();
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 10. GET /documents - Fetch All Generated Documents
// ----------------------------------------------------
router.get('/documents', auth, async (req, res) => {
  try {
    const { status, search, templateId } = req.query;
    const filter = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    } else if (!status) {
      filter.status = { $ne: 'Archived' };
    }

    if (templateId) {
      filter.templateId = templateId;
    }

    if (search) {
      filter.$or = [
        { documentNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { 'employeeDetails.name': { $regex: search, $options: 'i' } }
      ];
    }

    const docs = await GeneratedDocument.find(filter)
      .populate('createdBy', 'name email employeeId')
      .populate('approvedBy', 'name email employeeId')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 11. GET /documents/:id - Single Document Details
// ----------------------------------------------------
router.get('/documents/:id', auth, async (req, res) => {
  try {
    const doc = await GeneratedDocument.findById(req.params.id)
      .populate('createdBy', 'name email employeeId')
      .populate('approvedBy', 'name email employeeId')
      .lean();

    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 12. DELETE /documents/:id - Delete Document Permanently
// ----------------------------------------------------
router.delete('/documents/:id', auth, async (req, res) => {
  try {
    const deletedDoc = await GeneratedDocument.findByIdAndDelete(req.params.id);
    if (!deletedDoc) return res.status(404).json({ success: false, message: 'Document not found' });

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
