const router = require("express").Router();
const auth = require("../middleware/auth");
const Asset = require("../models/Asset");
const AssetAllocation = require("../models/AssetAllocation");
const AssetRequest = require("../models/AssetRequest");
const AssetTicket = require("../models/AssetTicket");
const AssetMaintenance = require("../models/AssetMaintenance");
const AssetHandover = require("../models/AssetHandover");
const ExitClearance = require("../models/ExitClearance");
const ExitFormality = require("../models/ExitFormality");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const Employee = require("../models/Employee");
const User = require("../models/User");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { sendZohoMail } = require("../zohoMail.service");

// Configure Multer storage for Asset Request Attachments
const uploadDir = path.join(__dirname, "../uploads/asset-requests");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `AR-ATT-${Date.now()}-${Math.round(Math.random() * 1e4)}${ext}`);
  }
});
const upload = multer({ storage });

// Helper to send Email Notification for Asset Request
async function sendAssetRequestEmail(assetReq, reqUser, host) {
  try {
    const emp = await Employee.findOne({ employeeId: assetReq.employeeCode }).lean();
    const empName = assetReq.employeeName || reqUser.name || 'N/A';
    const empId = assetReq.employeeCode || reqUser.employeeId || 'N/A';
    const department = assetReq.department || (emp && (emp.department || emp.division)) || 'N/A';
    const designation = assetReq.designation || (emp && (emp.designation || emp.position)) || 'N/A';
    const requestDate = assetReq.requestDate || new Date().toISOString().split('T')[0];

    let attachmentHtml = 'None';
    if (assetReq.attachment) {
      const fullUrl = assetReq.attachment.startsWith('http') ? assetReq.attachment : `http://${host}${assetReq.attachment}`;
      attachmentHtml = `<a href="${fullUrl}" target="_blank" style="color: #262760; font-weight: bold; text-decoration: underline;">${assetReq.attachmentName || 'View Attachment'}</a>`;
    }

    let toAddresses = [];
    let ccAddresses = [];

    // 1. TO: All IT Admin users
    const itAdminEmps = await Employee.find({
      designation: { $regex: /^IT Admin$/i },
      status: { $nin: ['Inactive', 'Exited'] }
    }).select('officialEmail email').lean();

    itAdminEmps.forEach(e => {
      const mail = (e.officialEmail || e.email || '').trim();
      if (mail && !toAddresses.includes(mail)) toAddresses.push(mail);
    });

    const itAdminUsers = await User.find({ role: 'it_admin' }).select('email employeeId').lean();
    for (const u of itAdminUsers) {
      if (u.employeeId) {
        const uEmp = await Employee.findOne({ employeeId: u.employeeId, status: { $nin: ['Inactive', 'Exited'] } }).select('officialEmail email').lean();
        if (uEmp) {
          const mail = (uEmp.officialEmail || uEmp.email || u.email || '').trim();
          if (mail && !toAddresses.includes(mail)) toAddresses.push(mail);
          continue;
        }
      }
      if (u.email && !toAddresses.includes(u.email.trim())) toAddresses.push(u.email.trim());
    }

    // 2. CC: HR & Admin
    const hrEmps = await Employee.find({
      $or: [
        { designation: { $regex: /HR|Human Resource/i } },
        { department: { $regex: /^HR$/i } },
        { division: { $regex: /^HR$/i } }
      ],
      status: { $nin: ['Inactive', 'Exited'] }
    }).select('officialEmail email').lean();

    hrEmps.forEach(e => {
      const mail = (e.officialEmail || e.email || '').trim();
      if (mail && !toAddresses.includes(mail) && !ccAddresses.includes(mail)) ccAddresses.push(mail);
    });

    const adminUsers = await User.find({ role: { $regex: /^admin$/i } }).select('email employeeId').lean();
    for (const u of adminUsers) {
      if (u.employeeId) {
        const uEmp = await Employee.findOne({ employeeId: u.employeeId, status: { $nin: ['Inactive', 'Exited'] } }).select('officialEmail email').lean();
        if (uEmp) {
          const mail = (uEmp.officialEmail || uEmp.email || u.email || '').trim();
          if (mail && !toAddresses.includes(mail) && !ccAddresses.includes(mail)) ccAddresses.push(mail);
          continue;
        }
      }
      if (u.email && !toAddresses.includes(u.email.trim()) && !ccAddresses.includes(u.email.trim())) {
        ccAddresses.push(u.email.trim());
      }
    }

    if (toAddresses.length === 0) {
      toAddresses.push('admin@caldim.in');
    }

    const emailSubject = `[ASSET REQUEST] ${assetReq.requestNumber} - ${empName}`;
    const emailBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #262760 0%, #1a1c43 100%); color: #ffffff; padding: 24px 28px;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700;">New IT Asset Request Submitted</h2>
          <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Request Number: <strong>${assetReq.requestNumber}</strong></p>
        </div>
        <div style="padding: 24px 28px; background: #f8fafc;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr><td style="padding: 8px 0; font-weight: bold; width: 140px;">Employee Name:</td><td style="padding: 8px 0;">${empName}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Employee ID:</td><td style="padding: 8px 0;">${empId}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Department:</td><td style="padding: 8px 0;">${department}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Designation:</td><td style="padding: 8px 0;">${designation}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Asset Category:</td><td style="padding: 8px 0; font-weight: bold; color: #262760;">${assetReq.assetCategory}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Request Type:</td><td style="padding: 8px 0;"><span style="background: #e0e7ff; color: #3730a3; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${assetReq.requestType}</span></td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Request Date:</td><td style="padding: 8px 0;">${requestDate}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Reason:</td><td style="padding: 8px 0; background: #ffffff; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1;">${assetReq.reason}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Attachment:</td><td style="padding: 8px 0;">${attachmentHtml}</td></tr>
          </table>
        </div>
        <div style="padding: 16px 28px; background: #f1f5f9; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          CALDIM IT Asset Provisioning System
        </div>
      </div>
    `;

    await sendZohoMail({
      to: toAddresses.join(','),
      cc: ccAddresses.join(','),
      subject: emailSubject,
      html: emailBody
    });
  } catch (emailErr) {
    console.error('Error sending asset request email notification:', emailErr);
  }
}

// ==========================================
// ASSET CRUD
// ==========================================

// Get all assets
router.get("/", auth, async (req, res) => {
  try {
    const assets = await Asset.find({}).sort({ createdAt: -1 }).lean();
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Create new asset
router.post("/", auth, async (req, res) => {
  try {
    const {
      assetId, category, brandName, division, processor, version,
      ram, hardDisk, serialNumber, screenSize, keyboardType, mouseType,
      headsetType, purchaseDate, condition, location, status
    } = req.body;

    // Common mandatory fields validation
    if (!assetId || !category || !brandName || !division || !version ||
        !purchaseDate || !condition || !location) {
      return res.status(400).json({ error: "All required common fields are mandatory" });
    }

    // Check duplicate Asset ID
    const existingAsset = await Asset.findOne({ assetId: assetId.trim().toUpperCase() });
    if (existingAsset) {
      return res.status(400).json({ error: "This Asset ID already exists." });
    }

    const payload = {
      assetId: assetId.trim().toUpperCase(),
      category,
      brandName: brandName.trim(),
      division,
      version: version.trim(),
      serialNumber: serialNumber ? serialNumber.trim() : "",
      purchaseDate,
      condition,
      location,
      status: status || "Available"
    };

    if (processor) payload.processor = processor.trim();
    if (ram) payload.ram = ram;
    if (hardDisk) payload.hardDisk = hardDisk;
    if (screenSize) payload.screenSize = screenSize.trim();
    if (keyboardType) payload.keyboardType = keyboardType;
    if (mouseType) payload.mouseType = mouseType;
    if (headsetType) payload.headsetType = headsetType;

    const asset = new Asset(payload);
    await asset.save();
    res.status(201).json(asset);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update asset
router.put("/:id", auth, async (req, res) => {
  try {
    const {
      assetId, category, brandName, division, processor, version,
      ram, hardDisk, serialNumber, screenSize, keyboardType, mouseType,
      headsetType, purchaseDate, condition, location, status
    } = req.body;

    if (!assetId || !category || !brandName || !division || !version ||
        !purchaseDate || !condition || !location) {
      return res.status(400).json({ error: "All required fields are mandatory" });
    }

    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    // Check Asset ID uniqueness if changed
    if (assetId.trim().toUpperCase() !== asset.assetId) {
      const existingAsset = await Asset.findOne({ assetId: assetId.trim().toUpperCase() });
      if (existingAsset) {
        return res.status(400).json({ error: "This Asset ID already exists." });
      }
    }

    asset.assetId = assetId.trim().toUpperCase();
    asset.category = category;
    asset.brandName = brandName.trim();
    asset.division = division;
    asset.version = version.trim();
    asset.serialNumber = serialNumber ? serialNumber.trim() : "";
    asset.purchaseDate = purchaseDate;
    asset.condition = condition;
    asset.location = location;
    if (status) asset.status = status;

    asset.processor = processor ? processor.trim() : undefined;
    asset.ram = ram || undefined;
    asset.hardDisk = hardDisk || undefined;
    asset.screenSize = screenSize ? screenSize.trim() : undefined;
    asset.keyboardType = keyboardType || undefined;
    asset.mouseType = mouseType || undefined;
    asset.headsetType = headsetType || undefined;

    await asset.save();
    res.json(asset);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete asset
router.delete("/:id", auth, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    if (asset.status === "Assigned") {
      return res.status(400).json({ error: "Cannot delete an asset that is currently assigned to an employee" });
    }

    await Asset.findByIdAndDelete(req.params.id);
    res.json({ message: "Asset deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// ==========================================
// ALLOCATIONS CRUD
// ==========================================

// Get all allocations
router.get("/allocations", auth, async (req, res) => {
  try {
    const allocations = await AssetAllocation.find({}).sort({ createdAt: -1 }).populate("asset").lean();
    res.json(allocations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Allocate an asset
router.post("/allocations", auth, async (req, res) => {
  try {
    const { assetId, assignedToId, allocatedDate } = req.body;

    if (!assetId || !assignedToId || !allocatedDate) {
      return res.status(400).json({ error: "Asset, Employee, and Allocation Date are required" });
    }

    // Find asset
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    if (asset.status === "Assigned") {
      return res.status(400).json({ error: "Asset is already assigned" });
    }

    // Find employee
    const employee = await Employee.findOne({ employeeId: assignedToId });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Check if employee already has an active allocation of this asset category
    const activeAlloc = await AssetAllocation.findOne({
      employeeId: employee._id,
      category: asset.category,
      status: "Assigned"
    });
    if (activeAlloc) {
      return res.status(400).json({ error: `Employee ${employee.name} (${employee.employeeId}) already has an active allocation for a ${asset.category} (Asset ID: ${activeAlloc.assetId}).` });
    }

    const allocation = new AssetAllocation({
      asset: asset._id,
      assetId: asset.assetId,
      category: asset.category,
      brandName: asset.brandName,
      version: asset.version,
      employeeId: employee._id,
      employeeCode: employee.employeeId,
      employeeName: employee.name,
      allocatedDate,
      conditionOnAllocation: asset.condition,
      status: "Assigned"
    });

    await allocation.save();

    // Update asset status
    asset.status = "Assigned";
    await asset.save();

    res.status(201).json(allocation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Return allocated asset
router.put("/allocations/:id/return", auth, async (req, res) => {
  try {
    const { returnDate, conditionOnReturn } = req.body;

    const allocation = await AssetAllocation.findById(req.params.id);
    if (!allocation) {
      return res.status(404).json({ error: "Allocation record not found" });
    }

    if (allocation.status === "Returned") {
      return res.status(400).json({ error: "Asset has already been returned" });
    }

    const asset = await Asset.findById(allocation.asset);
    if (asset) {
      asset.status = "Available";
      if (conditionOnReturn) {
        asset.condition = conditionOnReturn;
      }
      await asset.save();
    }

    allocation.status = "Returned";
    allocation.returnDate = returnDate || new Date().toISOString().split("T")[0];
    allocation.conditionOnReturn = conditionOnReturn || (asset ? asset.condition : "Good");
    await allocation.save();

    res.json(allocation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// ==========================================
// REQUESTS CRUD (Enterprise Asset Request Management)
// ==========================================

// Get all requests (with Search & Filters)
router.get("/requests", auth, async (req, res) => {
  try {
    const { search, status, category, requestType, department, location } = req.query;
    let filter = {};

    if (status && status !== "All") {
      filter.status = status;
    }
    if (category && category !== "All") {
      filter.$or = [{ assetCategory: category }, { category: category }];
    }
    if (requestType && requestType !== "All") {
      filter.requestType = requestType;
    }
    if (department && department !== "All") {
      filter.department = department;
    }
    if (location && location !== "All") {
      filter.location = location;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, "i");
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { employeeName: regex },
          { employeeCode: regex },
          { requestNumber: regex },
          { requestId: regex }
        ]
      });
    }

    const requests = await AssetRequest.find(filter)
      .populate("allocatedAssetId")
      .sort({ createdAt: -1 })
      .lean();

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get employee's own requests
router.get("/requests/my", auth, async (req, res) => {
  try {
    const loggedUser = req.user;
    const empCode = loggedUser.employeeId || "CDE001";
    const requests = await AssetRequest.find({
      $or: [
        { employeeCode: empCode },
        { employeeId: loggedUser._id }
      ]
    })
      .populate("allocatedAssetId")
      .sort({ createdAt: -1 })
      .lean();

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new Asset Request
router.post("/requests", auth, upload.single("attachment"), async (req, res) => {
  try {
    const reqCategory = req.body.assetCategory || req.body.category;
    const reqType = req.body.requestType;
    const reason = req.body.reason;

    // 1. Mandatory Fields Validation
    if (!reqCategory || !reqType || !reason || !reason.trim()) {
      return res.status(400).json({ error: "Asset Category, Request Type, and Reason are mandatory fields." });
    }

    const loggedUser = req.user;
    let employeeCode = loggedUser.employeeId || "CDE001";
    let employeeName = loggedUser.name || "Employee";
    let employeeId = loggedUser._id;
    let division = "N/A";
    let department = "N/A";
    let designation = loggedUser.role || "N/A";
    let location = "N/A";

    // Lookup full employee details from Employee master
    const emp = await Employee.findOne({
      $or: [
        { employeeId: employeeCode },
        { officialEmail: loggedUser.email },
        { email: loggedUser.email }
      ]
    }).lean();

    if (emp) {
      employeeId = emp._id;
      employeeCode = emp.employeeId || employeeCode;
      employeeName = emp.name || emp.employeename || employeeName;
      designation = emp.designation || emp.position || designation;
      const rawLoc = emp.location || emp.branch || emp.currentCity || "N/A";
      let finalLoc = rawLoc;
      if (rawLoc && rawLoc !== "N/A") {
        const u = rawLoc.toUpperCase();
        if (u.includes("BAGALUR") || u.includes("HOSUR")) finalLoc = "Hosur Office";
        else if (u.includes("CHENNAI")) finalLoc = "Chennai Office";
      }
      location = finalLoc;
    }

    // 2. Duplicate Pending Request Validation
    const existingPending = await AssetRequest.findOne({
      employeeCode,
      $or: [{ assetCategory: reqCategory }, { category: reqCategory }],
      requestType: reqType,
      status: "Pending"
    });

    if (existingPending) {
      return res.status(400).json({
        error: `You already have a pending request (${existingPending.requestNumber || existingPending.requestId}) for '${reqCategory}' (${reqType}).`
      });
    }

    // 3. Auto Request Number Generation (AR-YYYYMMDD-0001)
    const todayStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const prefix = `AR-${todayStr}-`;
    const countToday = await AssetRequest.countDocuments({
      requestNumber: { $regex: new RegExp(`^${prefix}`) }
    });
    const seq = String(countToday + 1).padStart(4, "0");
    const requestNumber = `${prefix}${seq}`;

    // Handle Attachment
    let attachmentPath = "";
    let attachmentName = "";
    if (req.file) {
      attachmentPath = `/uploads/asset-requests/${req.file.filename}`;
      attachmentName = req.file.originalname;
    }

    const todayDate = new Date().toISOString().split("T")[0];

    const request = new AssetRequest({
      requestNumber,
      requestId: requestNumber,
      employeeId,
      employeeCode,
      employeeName,
      division,
      department,
      designation,
      location,
      assetCategory: reqCategory,
      category: reqCategory,
      requestType: reqType,
      reason: reason.trim(),
      attachment: attachmentPath,
      attachmentName,
      status: "Pending",
      requestDate: todayDate
    });

    await request.save();

    // Trigger Email Notification in background
    const host = req.get("host") || "localhost:5003";
    sendAssetRequestEmail(request, loggedUser, host);

    res.status(201).json(request);
  } catch (err) {
    console.error("Error creating asset request:", err);
    res.status(400).json({ error: err.message });
  }
});

// Approve Request (IT Admin)
router.put("/requests/:id/approve", auth, async (req, res) => {
  try {
    const { remarks } = req.body;
    const request = await AssetRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Asset request not found" });
    }

    request.status = "Approved";
    request.remarks = remarks || request.remarks || "Approved by IT Admin";
    request.approvedBy = req.user.name || "IT Admin";
    request.approvedDate = new Date().toISOString().split("T")[0];

    await request.save();
    res.json(request);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Reject Request (IT Admin)
router.put("/requests/:id/reject", auth, async (req, res) => {
  try {
    const { remarks } = req.body;
    const request = await AssetRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Asset request not found" });
    }

    request.status = "Rejected";
    request.remarks = remarks || "Rejected by IT Admin";
    request.approvedBy = req.user.name || "IT Admin";
    request.approvedDate = new Date().toISOString().split("T")[0];

    await request.save();
    res.json(request);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Allocate Asset for Request (IT Admin) -> Updates status to "Asset Allocated" then "Completed"
router.put("/requests/:id/allocate", auth, async (req, res) => {
  try {
    const { assetId, allocatedDate } = req.body;
    if (!assetId) {
      return res.status(400).json({ error: "Please select an available asset to allocate." });
    }

    const request = await AssetRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Asset request not found" });
    }

    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({ error: "Selected asset not found in Asset Master" });
    }

    // 1. Create Asset Allocation Record
    const dateStr = allocatedDate || new Date().toISOString().split("T")[0];
    const allocation = new AssetAllocation({
      asset: asset._id,
      assetId: asset.assetId,
      category: asset.category,
      brandName: asset.brandName,
      version: asset.version,
      assignedTo: request.employeeId,
      employeeName: request.employeeName,
      employeeCode: request.employeeCode,
      allocatedDate: dateStr,
      status: "Assigned"
    });
    await allocation.save();

    // 2. Update Asset Status in Master to "Assigned"
    asset.status = "Assigned";
    await asset.save();

    // 3. Update Asset Request Status -> "Asset Allocated" -> "Completed"
    request.status = "Completed";
    request.allocatedAssetId = asset._id;
    request.allocatedAssetCode = asset.assetId;
    request.completedDate = dateStr;
    request.remarks = request.remarks
      ? `${request.remarks} | Asset ${asset.assetId} (${asset.brandName}) allocated on ${dateStr}.`
      : `Asset ${asset.assetId} (${asset.brandName}) allocated on ${dateStr}.`;

    await request.save();
    res.json(request);
  } catch (err) {
    console.error("Error allocating asset for request:", err);
    res.status(400).json({ error: err.message });
  }
});

// Complete Request
router.put("/requests/:id/complete", auth, async (req, res) => {
  try {
    const request = await AssetRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Asset request not found" });
    }

    request.status = "Completed";
    request.completedDate = new Date().toISOString().split("T")[0];
    await request.save();
    res.json(request);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Cancel Pending Request (Employee)
router.put("/requests/:id/cancel", auth, async (req, res) => {
  try {
    const request = await AssetRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Asset request not found" });
    }
    if (request.status !== "Pending") {
      return res.status(400).json({ error: "Only Pending requests can be cancelled." });
    }

    request.status = "Cancelled";
    await request.save();
    res.json(request);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Request
router.delete("/requests/:id", auth, async (req, res) => {
  try {
    await AssetRequest.findByIdAndDelete(req.params.id);
    res.json({ message: "Asset request deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// SUPPORT TICKETS CRUD
// ==========================================

// Get all tickets
router.get("/tickets", auth, async (req, res) => {
  try {
    const tickets = await AssetTicket.find({}).sort({ createdAt: -1 }).lean();
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create support ticket
router.post("/tickets", auth, async (req, res) => {
  try {
    const { assetId, issueType, priority, description } = req.body;

    if (!assetId || !issueType || !priority || !description) {
      return res.status(400).json({ error: "Asset ID, issue type, priority, and description are required" });
    }

    // Find the asset to get the name
    const asset = await Asset.findOne({ assetId });
    const assetName = asset ? `${asset.brandName} ${asset.version}` : "Unknown Asset";

    const loggedUser = req.user;
    const ticketId = `TCK-${Date.now().toString().slice(-4)}`;

    const ticket = new AssetTicket({
      ticketId,
      assetId,
      assetName,
      employeeId: loggedUser.employeeId || "CDE001",
      employeeName: loggedUser.name || "Default User",
      issueType,
      description,
      priority,
      status: "Pending",
      timeline: [
        {
          date: new Date().toISOString().split("T")[0],
          status: "Ticket Created",
          note: "Ticket raised by employee"
        }
      ]
    });

    await ticket.save();
    res.status(201).json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Resolve support ticket
router.put("/tickets/:id/resolve", auth, async (req, res) => {
  try {
    const { resolutionNotes, adminComments } = req.body;

    if (!resolutionNotes) {
      return res.status(400).json({ error: "Resolution notes are required" });
    }

    const ticket = await AssetTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    ticket.status = "Resolved";
    ticket.resolutionNotes = resolutionNotes;
    ticket.adminComments = adminComments || "";
    ticket.timeline.push({
      date: new Date().toISOString().split("T")[0],
      status: "Resolved",
      note: resolutionNotes
    });

    await ticket.save();
    res.json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// ==========================================
// MAINTENANCE CRUD
// ==========================================

// Get all maintenance schedules
router.get("/maintenance", auth, async (req, res) => {
  try {
    const maintenance = await AssetMaintenance.find({}).sort({ createdAt: -1 }).lean();
    res.json(maintenance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Schedule maintenance
router.post("/maintenance", auth, async (req, res) => {
  try {
    const { assetId, maintenanceType, cost, startDate, endDate, vendorName, description } = req.body;

    if (!assetId || !maintenanceType || !startDate || !endDate || !vendorName || !description) {
      return res.status(400).json({ error: "Asset, maintenance type, start/end dates, vendor, and description are required" });
    }

    const asset = await Asset.findOne({ assetId });
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const maintenanceId = `MNT-${Date.now().toString().slice(-4)}`;

    const maintenance = new AssetMaintenance({
      maintenanceId,
      assetId,
      assetName: `${asset.brandName} ${asset.version}`,
      maintenanceType,
      cost: parseFloat(cost) || 0,
      startDate,
      endDate,
      vendorName,
      status: "Scheduled",
      description
    });

    await maintenance.save();

    // Automatically update the Asset Status to 'Under Maintenance'
    asset.status = "Under Maintenance";
    await asset.save();

    res.status(201).json(maintenance);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ========================================================
// ASSET HANDOVER ENDPOINTS
// ========================================================

// Get Handover History
router.get("/handovers/history", auth, async (req, res) => {
  try {
    const history = await AssetHandover.find({}).sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process Asset Handover
router.post("/handovers", auth, async (req, res) => {
  try {
    const { allocationId, assetId, employeeCode, employeeName, department, division, handoverDate, condition, remarks } = req.body;

    if (!assetId || !employeeCode || !handoverDate || !condition) {
      return res.status(400).json({ error: "Asset ID, Employee Code, Handover Date and Condition are required." });
    }

    // 1. Find and update AssetAllocation record
    let allocation = null;
    if (allocationId) {
      allocation = await AssetAllocation.findById(allocationId);
    }
    if (!allocation) {
      allocation = await AssetAllocation.findOne({ assetId: assetId.trim().toUpperCase(), employeeCode, status: "Assigned" });
    }

    if (allocation) {
      allocation.status = "Returned";
      await allocation.save();
    }

    // 2. Find and update Asset record status based on condition
    const asset = await Asset.findOne({ assetId: assetId.trim().toUpperCase() });
    if (asset) {
      asset.condition = condition;
      if (condition === "Damaged") {
        asset.status = "Damaged";
      } else if (condition === "Minor Damage") {
        asset.status = "Under Maintenance";
      } else if (condition === "Lost") {
        asset.status = "Scrapped";
      } else {
        asset.status = "Available";
      }
      await asset.save();
    }

    // 3. Save or Update entry in AssetHandover collection
    let verifier = "IT Admin";
    if (req.user) {
      if (req.user.name) verifier = req.user.name;
      else if (req.user.email) verifier = req.user.email.split("@")[0];
    }

    let handover = await AssetHandover.findOne({
      assetId: assetId.trim().toUpperCase(),
      status: "Pending"
    });

    if (handover) {
      handover.handoverDate = handoverDate;
      handover.condition = condition;
      handover.remarks = remarks || "";
      handover.verifiedBy = verifier;
      handover.status = "Completed";
      await handover.save();
    } else {
      const handoverCount = await AssetHandover.countDocuments();
      const handoverId = `HO-${String(handoverCount + 1).padStart(4, '0')}`;

      handover = new AssetHandover({
        handoverId,
        assetId: assetId.trim().toUpperCase(),
        employeeId: employeeCode,
        employeeCode,
        employeeName: employeeName || (allocation ? allocation.employeeName : "Employee"),
        department: department || division || (allocation ? allocation.department : ""),
        division: division || department || (allocation ? allocation.department : ""),
        handoverDate,
        condition,
        remarks: remarks || "",
        verifiedBy: verifier,
        status: "Completed"
      });
      await handover.save();
    }

    res.status(201).json({ message: "Asset handover completed successfully", handover });
  } catch (err) {
    console.error("Error processing handover:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// EXIT CLEARANCE ENDPOINTS
// ==========================================

// Get all exit clearances
router.get("/exit-clearances", auth, async (req, res) => {
  try {
    const clearances = await ExitClearance.find({}).sort({ createdAt: -1 }).lean();
    res.json(clearances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Exit Clearance / Complete Exit Clearance
router.put("/exit-clearances/:id", auth, async (req, res) => {
  try {
    const { status, assignedAssets, overallRemarks } = req.body;
    const clearance = await ExitClearance.findById(req.params.id);

    if (!clearance) {
      return res.status(404).json({ error: "Exit Clearance record not found" });
    }

    let verifier = "IT Admin";
    if (req.user) {
      if (req.user.name) verifier = req.user.name;
      else if (req.user.email) verifier = req.user.email.split("@")[0];
    }

    if (assignedAssets && Array.isArray(assignedAssets)) {
      clearance.assignedAssets = assignedAssets;
    }

    if (overallRemarks !== undefined) {
      clearance.overallRemarks = overallRemarks;
    }

    // Business Rule Validation: Trigger completion workflow ONLY if all assigned assets are verified as returned
    if (status === "Completed") {
      const allReturned = (clearance.assignedAssets || []).every(ast => ast.returned === true);
      if (!allReturned) {
        return res.status(400).json({
          error: "Cannot complete Exit Clearance. All assigned assets must be verified as returned first."
        });
      }
    }

    if (status) {
      clearance.status = status;
    }

    // If status is set to Completed, process automated workflow
    if (status === "Completed") {
      clearance.verifiedBy = verifier;
      clearance.verificationDate = new Date().toISOString().split("T")[0];

      // 1. Process asset allocations, asset conditions, and audit logs
      for (const assetItem of clearance.assignedAssets) {
        if (assetItem.returned) {
          // Update AssetAllocation status to Returned
          const allocation = await AssetAllocation.findOne({
            assetId: assetItem.assetId.trim().toUpperCase(),
            status: "Assigned"
          });

          if (allocation) {
            allocation.status = "Returned";
            await allocation.save();
          }

          // Update Asset condition & status
          const asset = await Asset.findOne({ assetId: assetItem.assetId.trim().toUpperCase() });
          if (asset) {
            asset.condition = assetItem.condition || "Good";
            if (assetItem.condition === "Damaged") {
              asset.status = "Damaged";
            } else if (assetItem.condition === "Minor Damage") {
              asset.status = "Under Maintenance";
            } else if (assetItem.condition === "Lost") {
              asset.status = "Scrapped";
            } else {
              asset.status = "Available";
            }
            await asset.save();
          }

          // Audit Log Entry
          try {
            await AuditLog.create({
              employeeId: clearance.employeeCode || clearance.employeeId,
              action: "IT_ASSET_CLEARANCE_COMPLETED",
              doneBy: verifier,
              details: {
                employeeName: clearance.employeeName,
                exitRequestNumber: clearance.exitRequestNumber,
                assetId: assetItem.assetId,
                category: assetItem.category,
                condition: assetItem.condition,
                remarks: assetItem.remarks || "N/A",
                verifiedBy: verifier,
                verificationDate: clearance.verificationDate,
                clearanceStatus: "Completed"
              }
            });
          } catch (errAudit) {
            console.error("Error creating audit log:", errAudit);
          }
        }
      }

      // 2. Update Employee ExitFormality document & stage
      try {
        let exitForm = null;
        if (clearance.exitRequestId) {
          exitForm = await ExitFormality.findById(clearance.exitRequestId);
        }
        if (!exitForm && clearance.exitRequestNumber) {
          exitForm = await ExitFormality.findOne({
            $or: [
              { applicationNo: clearance.exitRequestNumber },
              { exitId: clearance.exitRequestNumber }
            ]
          });
        }

        if (exitForm) {
          // Update IT clearance department in clearanceDepartments array
          if (exitForm.clearanceDepartments && Array.isArray(exitForm.clearanceDepartments)) {
            const itDeptIndex = exitForm.clearanceDepartments.findIndex(d => d.department === "it");
            if (itDeptIndex !== -1) {
              exitForm.clearanceDepartments[itDeptIndex].status = "approved";
              exitForm.clearanceDepartments[itDeptIndex].approvedBy = verifier;
              exitForm.clearanceDepartments[itDeptIndex].approvedDate = new Date();
              exitForm.clearanceDepartments[itDeptIndex].remarks = overallRemarks || "All assigned company assets have been verified and returned successfully.";
            }
          }

          // Advance workflow stage
          exitForm.currentStage = "hr_final_clearance";

          // Update IT clearance info subdocument for employee portal read-only view
          const completedDateFormatted = new Date().toLocaleDateString("en-GB");
          exitForm.itAssetClearanceInfo = {
            status: "Completed",
            completedBy: verifier,
            completedDate: completedDateFormatted,
            remarks: overallRemarks || "All assigned company assets have been verified and returned successfully."
          };

          await exitForm.save();
        }
      } catch (errExit) {
        console.error("Error updating ExitFormality document:", errExit);
      }

      // 3. Send Notifications & Email Alerts
      try {
        const empUser = await User.findOne({
          $or: [
            { employeeId: clearance.employeeCode },
            { email: clearance.email }
          ]
        });

        // Employee Portal Notification
        if (empUser) {
          await Notification.create({
            recipient: empUser._id,
            title: "IT Asset Clearance Completed",
            message: `Dear ${clearance.employeeName},\n\nYour IT Asset Clearance has been completed successfully.\n\nAll assigned company assets have been verified and accepted by the IT Department.\n\nYour exit process will now continue with the remaining clearance stages.\n\nThank you.`,
            type: "EXIT_CLEARANCE_COMPLETED"
          });
        }

        // Employee Email Notification
        if (clearance.email) {
          await sendZohoMail({
            to: clearance.email,
            subject: "IT Asset Clearance Completed",
            text: `Dear ${clearance.employeeName},\n\nThis is to inform you that your IT Asset Clearance has been completed successfully.\n\nAll company assets assigned to you have been verified and accepted by the IT Department.\n\nYou can now continue tracking your exit process through the Employee Portal.\n\nThank you.\n\nRegards,\nIT Department\nCALDIM Engineering Private Limited`
          });
        }

        // HR & Admin Notifications & Emails
        const hrAdminUsers = await User.find({ role: { $in: ["admin", "hr", "hr_admin"] } }).select("_id email");
        const hrMessage = `Employee Name : ${clearance.employeeName}\nEmployee ID : ${clearance.employeeCode}\nDepartment : ${clearance.department}\nExit Request No : ${clearance.exitRequestNumber}\n\nIT Asset Clearance has been completed successfully.\n\nThe employee is now ready for the next exit clearance process.`;

        for (const admin of hrAdminUsers) {
          await Notification.create({
            recipient: admin._id,
            title: "Employee IT Asset Clearance Completed",
            message: hrMessage,
            type: "EXIT_CLEARANCE_COMPLETED"
          });

          if (admin.email) {
            await sendZohoMail({
              to: admin.email,
              subject: "Employee IT Asset Clearance Completed",
              text: hrMessage
            });
          }
        }
      } catch (errNotif) {
        console.error("Error sending exit clearance notifications/emails:", errNotif);
      }
    }

    await clearance.save();
    res.json({ message: "Exit Clearance updated and workflow completed successfully", clearance });
  } catch (err) {
    console.error("Error updating exit clearance:", err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
