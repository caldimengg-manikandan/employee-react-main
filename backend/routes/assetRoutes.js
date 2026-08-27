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
const AssetCategory = require("../models/AssetCategory");
const AssetFieldConfig = require("../models/AssetFieldConfig");

// Auto-seed default asset categories & field config
async function seedDefaultCategoriesAndConfig() {
  try {
    await AssetCategory.deleteMany({});
    const defaultCats = ["Laptop", "Desktop / CPU", "Adapter", "Charger", "Mouse", "Keyboard", "Headset", "Monitor"];
    await AssetCategory.insertMany(defaultCats.map(name => ({ name })));
    console.log("Default asset categories seeded successfully.");

    const countConfig = await AssetFieldConfig.countDocuments({});
    const defaultFields = [
      { key: "processor", label: "Processor", enabled: true, type: "text" },
      { key: "ram", label: "RAM", enabled: true, type: "text" },
      { key: "hardDisk", label: "Hard Disk / SSD", enabled: true, type: "text" },
      { key: "screenSize", label: "Screen Size", enabled: true, type: "text" },
      { key: "keyboardType", label: "Keyboard Type", enabled: true, type: "text" },
      { key: "mouseType", label: "Mouse Type", enabled: true, type: "text" },
      { key: "headsetType", label: "Headset Type", enabled: true, type: "text" },
      { key: "gpu", label: "GPU / Graphics Card", enabled: true, type: "text" },
      { key: "operatingSystem", label: "Operating System", enabled: true, type: "text" },
      { key: "warrantyExpiry", label: "Warranty / Expiry Date", enabled: true, type: "text" },
      { key: "simCardNo", label: "SIM Card Number", enabled: true, type: "text" },
      { key: "ipMacAddress", label: "IP / MAC Address", enabled: true, type: "text" },
      { key: "chargerPower", label: "Charger / Power Adapter", enabled: true, type: "text" },
      { key: "resolution", label: "Monitor Resolution", enabled: true, type: "text" },
      { key: "version", label: "Model Number / Version", enabled: true, type: "text" }
    ];

    if (countConfig === 0) {
      const defaultConfig = new AssetFieldConfig({ fields: defaultFields });
      await defaultConfig.save();
      console.log("Default asset field config seeded successfully.");
    } else {
      let config = await AssetFieldConfig.findOne({});
      if (config) {
        let modified = false;
        defaultFields.forEach(df => {
          const found = config.fields.some(f => f.key === df.key);
          if (!found) {
            config.fields.push(df);
            modified = true;
          }
        });
        if (modified) {
          await config.save();
          console.log("Merged missing default fields into existing asset field config.");
        }
      }
    }
  } catch (err) {
    console.error("Error seeding default asset categories/config:", err);
  }
}
seedDefaultCategoriesAndConfig();

// ==========================================
// ASSET CATEGORIES CRUD
// ==========================================

// Get all categories
router.get("/categories", auth, async (req, res) => {
  try {
    const categories = await AssetCategory.find({}).sort({ name: 1 }).lean();
    res.json(categories);
  } catch (err) {
    res.status(505).json({ error: err.message });
  }
});

// Create a new category
router.post("/categories", auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }
    const trimmedName = name.trim();

    // Check if category already exists
    const existing = await AssetCategory.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, "i") } });
    if (existing) {
      return res.status(400).json({ error: "Category already exists" });
    }

    const category = new AssetCategory({ name: trimmedName });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete category
router.delete("/categories/:id", auth, async (req, res) => {
  try {
    const category = await AssetCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Check if category is currently used by any assets
    const count = await Asset.countDocuments({ category: category.name });
    if (count > 0) {
      return res.status(400).json({ error: `Cannot delete category "${category.name}" as it is currently associated with ${count} asset(s).` });
    }

    await AssetCategory.findByIdAndDelete(req.params.id);
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// ==========================================
// ASSET FIELD VISIBILITY CONFIG CRUD
// ==========================================

// Get field visibility config
router.get("/field-config", auth, async (req, res) => {
  try {
    const defaultFields = [
      { key: "processor", label: "Processor", enabled: true, type: "text" },
      { key: "ram", label: "RAM", enabled: true, type: "text" },
      { key: "hardDisk", label: "Hard Disk / SSD", enabled: true, type: "text" },
      { key: "screenSize", label: "Screen Size", enabled: true, type: "text" },
      { key: "keyboardType", label: "Keyboard Type", enabled: true, type: "text" },
      { key: "mouseType", label: "Mouse Type", enabled: true, type: "text" },
      { key: "headsetType", label: "Headset Type", enabled: true, type: "text" },
      { key: "gpu", label: "GPU / Graphics Card", enabled: true, type: "text" },
      { key: "operatingSystem", label: "Operating System", enabled: true, type: "text" },
      { key: "warrantyExpiry", label: "Warranty / Expiry Date", enabled: true, type: "text" },
      { key: "simCardNo", label: "SIM Card Number", enabled: true, type: "text" },
      { key: "ipMacAddress", label: "IP / MAC Address", enabled: true, type: "text" },
      { key: "chargerPower", label: "Charger / Power Adapter", enabled: true, type: "text" }
    ];

    let config = await AssetFieldConfig.findOne({});
    if (!config) {
      config = new AssetFieldConfig({ fields: defaultFields });
      await config.save();
    } else {
      // Merge missing default fields
      let modified = false;
      defaultFields.forEach(df => {
        const found = config.fields.some(f => f.key === df.key);
        if (!found) {
          config.fields.push(df);
          modified = true;
        }
      });
      if (modified) {
        await config.save();
      }
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update field visibility config
router.put("/field-config", auth, async (req, res) => {
  try {
    const { fields } = req.body;
    if (!Array.isArray(fields)) {
      return res.status(400).json({ error: "Fields array is required" });
    }

    let config = await AssetFieldConfig.findOne({});
    if (!config) {
      config = new AssetFieldConfig();
    }

    config.fields = fields;
    await config.save();
    res.json(config);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});



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
    const assets = await Asset.find({ isComponent: { $ne: true } })
      .populate("components")
      .sort({ createdAt: -1 })
      .lean();
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new asset
router.post("/", auth, async (req, res) => {
  try {
    const {
      category, brandName, division, version,
      serialNumber, purchaseDate, condition, location, status,
      components, trackingType, itemType, individualTracking, quantityDetails
    } = req.body;

    let assetId = req.body.assetId;

    // Handle Quantity-Based Asset Initialization
    if (trackingType === "Quantity") {
      if (!assetId || !assetId.trim()) {
        const count = await Asset.countDocuments({ trackingType: "Quantity" });
        const cleanItemName = (itemType || "ITEM").trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        assetId = `QTY-${cleanItemName}-${count + 1}-${Date.now().toString().slice(-4)}`;
      }
    } else {
      if (!assetId || !assetId.trim()) {
        return res.status(400).json({ error: "Asset ID is required" });
      }
    }

    // Check duplicate Asset ID for parent
    const existingAsset = await Asset.findOne({ assetId: assetId.trim().toUpperCase() });
    if (existingAsset) {
      return res.status(400).json({ error: "This Asset ID already exists." });
    }

    let savedComponentIds = [];
    if (trackingType !== "Quantity" && components && Array.isArray(components) && components.length > 0) {
      const componentDocs = [];
      for (const comp of components) {
        if (!comp.assetId || !comp.assetId.trim()) {
          return res.status(400).json({ error: "Component Asset ID is required" });
        }
        const compIdClean = comp.assetId.trim().toUpperCase();
        const existingComp = await Asset.findOne({ assetId: compIdClean });
        if (existingComp) {
          return res.status(400).json({ error: `Component Asset ID "${compIdClean}" already exists.` });
        }
        if (compIdClean === assetId.trim().toUpperCase() || componentDocs.some(d => d.assetId === compIdClean)) {
          return res.status(400).json({ error: `Duplicate Asset ID "${compIdClean}" in payload.` });
        }

        const compPayload = {
          assetId: compIdClean,
          category: comp.category || "",
          brandName: brandName ? brandName.trim() : "",
          division: division || "",
          version: version ? version.trim() : "",
          serialNumber: comp.serialNumber ? comp.serialNumber.trim() : "",
          purchaseDate: purchaseDate || "",
          condition: comp.condition || condition || "New",
          location: location || "",
          status: comp.status || status || "Available",
          isComponent: true,
          trackingType: "Individual"
        };
        componentDocs.push(compPayload);
      }

      for (const compDoc of componentDocs) {
        const cAsset = new Asset(compDoc);
        await cAsset.save();
        savedComponentIds.push(cAsset._id);
      }
    }

    const payload = {
      assetId: assetId.trim().toUpperCase(),
      category: category || "",
      brandName: brandName ? brandName.trim() : "",
      division: division || "",
      version: version ? version.trim() : "",
      serialNumber: serialNumber ? serialNumber.trim() : "",
      purchaseDate: purchaseDate || "",
      condition: condition || "",
      location: location || "",
      status: status || "Available",
      isComponent: false,
      components: savedComponentIds,
      trackingType: trackingType || "Individual",
      itemType: itemType || "",
      individualTracking: !!individualTracking
    };

    if (trackingType === "Quantity") {
      let totalQty = parseInt(req.body.totalQuantity || req.body.quantity);
      if (isNaN(totalQty)) {
        totalQty = quantityDetails && !isNaN(parseInt(quantityDetails.total)) ? parseInt(quantityDetails.total) : 0;
      }
      payload.quantityDetails = {
        total: totalQty,
        available: totalQty,
        inUse: 0,
        maintenance: 0,
        damaged: 0,
        retired: 0
      };
      payload.itemType = itemType || req.body.itemName || "";
      payload.brandName = payload.itemType;
      payload.individualTracking = false;
    }

    // Load active field config keys
    const config = await AssetFieldConfig.findOne({});
    const activeKeys = config ? config.fields.map(f => f.key) : [];

    activeKeys.forEach(key => {
      if (req.body[key] !== undefined) {
        payload[key] = typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key];
      }
    });

    const asset = new Asset(payload);
    await asset.save();

    const populatedAsset = await Asset.findById(asset._id).populate("components").lean();
    res.status(201).json(populatedAsset);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update asset
router.put("/:id", auth, async (req, res) => {
  try {
    const {
      category, brandName, division, version,
      serialNumber, purchaseDate, condition, location, status,
      components, trackingType, itemType, individualTracking, quantityDetails
    } = req.body;

    let assetId = req.body.assetId;

    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    // Handle Quantity tracking assetId check
    if (asset.trackingType === "Quantity") {
      if (!assetId || !assetId.trim()) {
        assetId = asset.assetId; // Keep existing generated ID if omitted
      }
    } else {
      if (!assetId || !assetId.trim()) {
        return res.status(400).json({ error: "Asset ID is required" });
      }
    }

    // Check Asset ID uniqueness if changed
    if (assetId.trim().toUpperCase() !== asset.assetId) {
      const existingAsset = await Asset.findOne({ assetId: assetId.trim().toUpperCase() });
      if (existingAsset) {
        return res.status(400).json({ error: "This Asset ID already exists." });
      }
    }

    let finalComponentIds = [];
    if (asset.trackingType !== "Quantity") {
      const incomingComponentIds = [];

      if (components && Array.isArray(components)) {
        for (const comp of components) {
          if (!comp.assetId || !comp.assetId.trim()) {
            return res.status(400).json({ error: "Component Asset ID is required" });
          }
          const compIdClean = comp.assetId.trim().toUpperCase();

          if (comp._id) {
            const existingComp = await Asset.findById(comp._id);
            if (!existingComp) {
              return res.status(404).json({ error: `Component with ID ${comp._id} not found` });
            }

            if (compIdClean !== existingComp.assetId) {
              const dupCheck = await Asset.findOne({ assetId: compIdClean });
              if (dupCheck) {
                return res.status(400).json({ error: `Component Asset ID "${compIdClean}" already exists.` });
              }
            }

            existingComp.assetId = compIdClean;
            existingComp.category = comp.category || "";
            existingComp.brandName = brandName ? brandName.trim() : "";
            existingComp.division = division || "";
            existingComp.version = version ? version.trim() : "";
            existingComp.serialNumber = comp.serialNumber ? comp.serialNumber.trim() : "";
            existingComp.purchaseDate = purchaseDate || "";
            existingComp.condition = comp.condition || condition || "New";
            existingComp.location = location || "";
            if (status) existingComp.status = status;

            await existingComp.save();
            finalComponentIds.push(existingComp._id);
            incomingComponentIds.push(existingComp._id.toString());
          } else {
            const dupCheck = await Asset.findOne({ assetId: compIdClean });
            if (dupCheck) {
              return res.status(400).json({ error: `Component Asset ID "${compIdClean}" already exists.` });
            }

            const newComp = new Asset({
              assetId: compIdClean,
              category: comp.category || "",
              brandName: brandName ? brandName.trim() : "",
              division: division || "",
              version: version ? version.trim() : "",
              serialNumber: comp.serialNumber ? comp.serialNumber.trim() : "",
              purchaseDate: purchaseDate || "",
              condition: comp.condition || condition || "New",
              location: location || "",
              status: status || "Available",
              isComponent: true,
              parentAsset: asset._id,
              trackingType: "Individual"
            });

            await newComp.save();
            finalComponentIds.push(newComp._id);
            incomingComponentIds.push(newComp._id.toString());
          }
        }
      }

      // Delete orphaned components
      const oldComponentIds = asset.components || [];
      for (const oldId of oldComponentIds) {
        if (!incomingComponentIds.includes(oldId.toString())) {
          await Asset.findByIdAndDelete(oldId);
        }
      }
    }

    // Update parent asset properties
    asset.assetId = assetId.trim().toUpperCase();
    asset.category = category || "";
    asset.brandName = brandName ? brandName.trim() : "";
    asset.division = division || "";
    asset.version = version ? version.trim() : "";
    asset.serialNumber = serialNumber ? serialNumber.trim() : "";
    asset.purchaseDate = purchaseDate;
    asset.condition = condition;
    asset.location = location;
    if (status) asset.status = status;

    if (asset.trackingType !== "Quantity") {
      asset.components = finalComponentIds;
    } else {
      // Simple quantity/count management for Office Accessories
      const total = req.body.totalQuantity !== undefined 
        ? parseInt(req.body.totalQuantity) 
        : (req.body.quantity !== undefined 
            ? parseInt(req.body.quantity) 
            : (asset.quantityDetails?.total || 0));

      asset.quantityDetails = {
        total,
        available: total,
        inUse: 0,
        maintenance: 0,
        damaged: 0,
        retired: 0
      };
      asset.itemType = itemType || req.body.itemName || asset.itemType;
      asset.brandName = asset.itemType;
      asset.individualTracking = false;
    }

    // Load active field config keys
    const config = await AssetFieldConfig.findOne({});
    const activeKeys = config ? config.fields.map(f => f.key) : [];

    // Reset spec fields first, then set values from req.body
    const allKeys = new Set([
      'processor', 'ram', 'hardDisk', 'screenSize', 'keyboardType', 'mouseType', 'headsetType',
      ...activeKeys
    ]);
    allKeys.forEach(key => {
      if (req.body[key] !== undefined) {
        asset.set(key, typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key]);
      } else {
        asset.set(key, undefined);
      }
    });

    await asset.save();
    const populatedAsset = await Asset.findById(asset._id).populate("components").lean();
    res.json(populatedAsset);
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
    const {
      assetId, allocatedDate, division, componentIds,
      assignmentType, assignedToId, assignedDepartment, assignedTeam, assignedLocation, quantity
    } = req.body;

    if (!assetId || !allocatedDate) {
      return res.status(400).json({ error: "Asset and Allocation Date are required" });
    }

    // Find parent asset
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const finalType = assignmentType || "Employee";
    const allocQty = parseInt(quantity) || 1;

    let employeeDoc = null;
    if (finalType === "Employee") {
      if (!assignedToId) {
        return res.status(400).json({ error: "Employee is required for Employee assignment type" });
      }
      employeeDoc = await Employee.findOne({ employeeId: assignedToId });
      if (!employeeDoc) {
        return res.status(404).json({ error: "Employee not found" });
      }
    } else if (finalType === "Department") {
      if (!assignedDepartment) return res.status(400).json({ error: "Department is required" });
    } else if (finalType === "Team") {
      if (!assignedTeam) return res.status(400).json({ error: "Team is required" });
    } else if (finalType === "Location") {
      if (!assignedLocation) return res.status(400).json({ error: "Location is required" });
    }

    if (asset.trackingType === "Quantity") {
      const currentQty = asset.quantityDetails || {};
      if (allocQty <= 0) {
        return res.status(400).json({ error: "Quantity must be greater than zero." });
      }
      if ((currentQty.available || 0) < allocQty) {
        return res.status(400).json({ error: `Requested quantity (${allocQty}) exceeds available quantity (${currentQty.available || 0}).` });
      }

      // Create allocation record
      const allocation = new AssetAllocation({
        asset: asset._id,
        assetId: asset.assetId,
        category: asset.category,
        brandName: asset.brandName || asset.itemType || "",
        version: asset.version || "",
        division: division || (employeeDoc ? (employeeDoc.division || employeeDoc.department || "") : ""),
        employeeId: employeeDoc ? employeeDoc._id : null,
        employeeCode: employeeDoc ? employeeDoc.employeeId : "",
        employeeName: employeeDoc ? employeeDoc.name : "",
        allocatedDate,
        conditionOnAllocation: asset.condition || "New",
        status: "Assigned",
        quantity: allocQty,
        assignmentType: finalType,
        assignedDepartment: finalType === "Department" ? assignedDepartment : undefined,
        assignedTeam: finalType === "Team" ? assignedTeam : undefined,
        assignedLocation: finalType === "Location" ? assignedLocation : undefined,
        components: []
      });

      await allocation.save();

      // Deduct available, add to inUse
      asset.quantityDetails = {
        total: currentQty.total || 0,
        available: (currentQty.available || 0) - allocQty,
        inUse: (currentQty.inUse || 0) + allocQty,
        maintenance: currentQty.maintenance || 0,
        damaged: currentQty.damaged || 0,
        retired: currentQty.retired || 0
      };
      asset.status = asset.quantityDetails.available === 0 ? "Assigned" : "Available";
      await asset.save();

      return res.status(201).json(allocation);

    } else {
      // Individual Asset Allocation
      if (asset.status === "Assigned") {
        return res.status(400).json({ error: "Asset is already assigned" });
      }

      // Validate and fetch selected components from DB
      const componentsList = [];
      if (componentIds && Array.isArray(componentIds) && componentIds.length > 0) {
        for (const compId of componentIds) {
          const comp = await Asset.findById(compId);
          if (!comp) {
            return res.status(404).json({ error: `Component with ID ${compId} not found` });
          }
          if (comp.status === "Assigned") {
            return res.status(400).json({ error: `Component ${comp.assetId} (${comp.category}) is already assigned.` });
          }
          componentsList.push(comp);
        }
      }

      // Map components data to save in allocation
      const allocationComponents = componentsList.map(c => ({
        asset: c._id,
        assetId: c.assetId,
        category: c.category,
        serialNumber: c.serialNumber,
        condition: c.condition
      }));

      const allocation = new AssetAllocation({
        asset: asset._id,
        assetId: asset.assetId,
        category: asset.category,
        brandName: asset.brandName || "",
        version: asset.version || "",
        division: division || (employeeDoc ? (employeeDoc.division || employeeDoc.department || "") : ""),
        employeeId: employeeDoc ? employeeDoc._id : null,
        employeeCode: employeeDoc ? employeeDoc.employeeId : "",
        employeeName: employeeDoc ? employeeDoc.name : "",
        allocatedDate,
        conditionOnAllocation: asset.condition || "New",
        status: "Assigned",
        quantity: 1,
        assignmentType: finalType,
        assignedDepartment: finalType === "Department" ? assignedDepartment : undefined,
        assignedTeam: finalType === "Team" ? assignedTeam : undefined,
        assignedLocation: finalType === "Location" ? assignedLocation : undefined,
        components: allocationComponents
      });

      await allocation.save();

      // Link components array in the parent Asset document for consistency
      asset.components = componentsList.map(c => c._id);
      asset.status = "Assigned";
      await asset.save();

      // Update components status and link to parent
      for (const comp of componentsList) {
        comp.status = "Assigned";
        comp.parentAsset = asset._id;
        await comp.save();
      }

      return res.status(201).json(allocation);
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add a component to an active allocation
router.put("/allocations/:id/components", auth, async (req, res) => {
  try {
    const { componentId } = req.body;
    if (!componentId) {
      return res.status(400).json({ error: "Component ID is required" });
    }

    const allocation = await AssetAllocation.findById(req.params.id);
    if (!allocation) {
      return res.status(404).json({ error: "Allocation record not found" });
    }
    if (allocation.status !== "Assigned") {
      return res.status(400).json({ error: "Cannot add components to a returned allocation" });
    }

    const comp = await Asset.findById(componentId);
    if (!comp) {
      return res.status(404).json({ error: "Component asset not found" });
    }
    if (comp.status === "Assigned") {
      return res.status(400).json({ error: `Component ${comp.assetId} is already assigned.` });
    }

    allocation.components.push({
      asset: comp._id,
      assetId: comp.assetId,
      category: comp.category,
      serialNumber: comp.serialNumber || "",
      condition: comp.condition || "Good"
    });

    await allocation.save();

    comp.status = "Assigned";
    comp.parentAsset = allocation.asset;
    await comp.save();

    res.status(200).json(allocation);
  } catch (err) {
    console.error("Error adding component to allocation:", err);
    res.status(500).json({ error: "Server error adding component" });
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
      if (asset.trackingType === "Quantity") {
        const currentQty = asset.quantityDetails || {};
        const returnQty = allocation.quantity || 1;

        let availableChange = returnQty;
        let damagedChange = 0;
        let retiredChange = 0;

        if (conditionOnReturn === "Damaged") {
          damagedChange = returnQty;
          availableChange = 0;
        } else if (conditionOnReturn === "Retired" || conditionOnReturn === "Scrapped") {
          retiredChange = returnQty;
          availableChange = 0;
        }

        asset.quantityDetails = {
          total: currentQty.total || 0,
          available: (currentQty.available || 0) + availableChange,
          inUse: Math.max(0, (currentQty.inUse || 0) - returnQty),
          maintenance: currentQty.maintenance || 0,
          damaged: (currentQty.damaged || 0) + damagedChange,
          retired: (currentQty.retired || 0) + retiredChange
        };

        asset.status = asset.quantityDetails.available > 0 ? "Available" : "Assigned";
        await asset.save();
      } else {
        // Individual asset return
        asset.status = "Available";
        if (conditionOnReturn) {
          asset.condition = conditionOnReturn;
        }
        await asset.save();

        // Deallocate all components based on the allocation record
        if (allocation.components && allocation.components.length > 0) {
          for (const compItem of allocation.components) {
            if (compItem.asset) {
              const comp = await Asset.findById(compItem.asset);
              if (comp) {
                comp.status = "Available";
                comp.parentAsset = null;
                if (conditionOnReturn) {
                  comp.condition = conditionOnReturn;
                }
                await comp.save();
              }
            }
          }
        }
      }
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
    const { assetId, allocatedDate, componentIds } = req.body;
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

    if (asset.status === "Assigned") {
      return res.status(400).json({ error: "Asset is already assigned" });
    }

    // Validate and fetch selected components from DB
    const componentsList = [];
    if (componentIds && Array.isArray(componentIds) && componentIds.length > 0) {
      for (const compId of componentIds) {
        const comp = await Asset.findById(compId);
        if (!comp) {
          return res.status(404).json({ error: `Component with ID ${compId} not found` });
        }
        if (comp.status === "Assigned") {
          return res.status(400).json({ error: `Component ${comp.assetId} (${comp.category}) is already assigned.` });
        }
        componentsList.push(comp);
      }
    }

    // 1. Create Asset Allocation Record
    const dateStr = allocatedDate || new Date().toISOString().split("T")[0];
    const allocationComponents = componentsList.map(c => ({
      asset: c._id,
      assetId: c.assetId,
      category: c.category,
      serialNumber: c.serialNumber,
      condition: c.condition
    }));

    const allocation = new AssetAllocation({
      asset: asset._id,
      assetId: asset.assetId,
      category: asset.category,
      brandName: asset.brandName,
      version: asset.version,
      division: request.division || request.department || "",
      employeeId: request.employeeId,
      assignedTo: request.employeeId,
      employeeName: request.employeeName,
      employeeCode: request.employeeCode,
      allocatedDate: dateStr,
      status: "Assigned",
      components: allocationComponents
    });
    await allocation.save();

    // 2. Update Asset Status in Master to "Assigned" and link components
    asset.components = componentsList.map(c => c._id);
    asset.status = "Assigned";
    await asset.save();

    // Update components status and link to parent
    for (const comp of componentsList) {
      comp.status = "Assigned";
      comp.parentAsset = asset._id;
      await comp.save();
    }

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
    const { assetId, maintenanceType, cost, startDate, endDate, vendorName, description, quantity } = req.body;

    if (!assetId || !maintenanceType || !startDate || !endDate || !vendorName || !description) {
      return res.status(400).json({ error: "Asset, maintenance type, start/end dates, vendor, and description are required" });
    }

    const asset = await Asset.findOne({ assetId: assetId.trim().toUpperCase() });
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const mQty = parseInt(quantity) || 1;
    if (asset.trackingType === "Quantity") {
      const qd = asset.quantityDetails || {};
      if (mQty <= 0) {
        return res.status(400).json({ error: "Quantity must be greater than zero." });
      }
      if ((qd.available || 0) < mQty) {
        return res.status(400).json({ error: `Requested quantity (${mQty}) exceeds available quantity (${qd.available || 0}).` });
      }

      // Deduct available, add to maintenance
      asset.quantityDetails = {
        total: qd.total || 0,
        available: (qd.available || 0) - mQty,
        inUse: qd.inUse || 0,
        maintenance: (qd.maintenance || 0) + mQty,
        damaged: qd.damaged || 0,
        retired: qd.retired || 0
      };
      asset.status = asset.quantityDetails.available === 0 ? "Under Maintenance" : "Available";
      await asset.save();
    } else {
      asset.status = "Under Maintenance";
      await asset.save();
    }

    const maintenanceId = `MNT-${Date.now().toString().slice(-4)}`;

    const maintenance = new AssetMaintenance({
      maintenanceId,
      assetId: asset.assetId,
      assetName: asset.trackingType === "Quantity" ? asset.itemType : `${asset.brandName} ${asset.version}`,
      maintenanceType,
      cost: parseFloat(cost) || 0,
      startDate,
      endDate,
      vendorName,
      status: "Scheduled",
      description,
      quantity: asset.trackingType === "Quantity" ? mQty : 1,
      trackingType: asset.trackingType || "Individual"
    });

    await maintenance.save();
    res.status(201).json(maintenance);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Complete maintenance
router.put("/maintenance/:id/complete", auth, async (req, res) => {
  try {
    const { returnCondition } = req.body;
    const maintenance = await AssetMaintenance.findById(req.params.id);
    if (!maintenance) {
      return res.status(404).json({ error: "Maintenance record not found" });
    }

    if (maintenance.status === "Completed") {
      return res.status(400).json({ error: "Maintenance is already completed" });
    }

    const asset = await Asset.findOne({ assetId: maintenance.assetId });
    if (asset) {
      if (asset.trackingType === "Quantity") {
        const qd = asset.quantityDetails || {};
        const mQty = maintenance.quantity || 1;

        let availableChange = mQty;
        let damagedChange = 0;
        let retiredChange = 0;

        if (returnCondition === "Damaged") {
          damagedChange = mQty;
          availableChange = 0;
        } else if (returnCondition === "Retired" || returnCondition === "Scrapped" || returnCondition === "Lost") {
          retiredChange = mQty;
          availableChange = 0;
        }

        asset.quantityDetails = {
          total: qd.total || 0,
          available: (qd.available || 0) + availableChange,
          inUse: qd.inUse || 0,
          maintenance: Math.max(0, (qd.maintenance || 0) - mQty),
          damaged: (qd.damaged || 0) + damagedChange,
          retired: (qd.retired || 0) + retiredChange
        };

        asset.status = asset.quantityDetails.available > 0 ? "Available" : "Available";
        await asset.save();
      } else {
        if (returnCondition === "Damaged") {
          asset.status = "Damaged";
          asset.condition = "Damaged";
        } else if (returnCondition === "Retired" || returnCondition === "Scrapped" || returnCondition === "Lost") {
          asset.status = "Retired";
          asset.condition = "Retired";
        } else {
          asset.status = "Available";
          if (returnCondition) asset.condition = returnCondition;
        }
        await asset.save();
      }
    }

    maintenance.status = "Completed";
    await maintenance.save();

    res.json(maintenance);
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

// Bulk Import Assets
router.post("/bulk-import", auth, async (req, res) => {
  try {
    const assetsList = req.body;
    if (!Array.isArray(assetsList)) {
      return res.status(400).json({ error: "Invalid payload: Expected an array of assets." });
    }

    let importCount = 0;
    let skippedCount = 0;
    const errors = [];

    // Load active field config keys
    const config = await AssetFieldConfig.findOne({});
    const activeKeys = config ? config.fields.map(f => f.key) : [];
    const allKeys = new Set([
      'processor', 'ram', 'hardDisk', 'screenSize', 'keyboardType', 'mouseType', 'headsetType',
      ...activeKeys
    ]);

    for (const item of assetsList) {
      try {
        if (!item.assetId || !item.assetId.toString().trim()) {
          skippedCount++;
          continue;
        }

        const assetIdClean = item.assetId.toString().trim().toUpperCase();

        // Check if already exists in DB
        const existing = await Asset.findOne({ assetId: assetIdClean });
        if (existing) {
          skippedCount++;
          continue;
        }

        // Setup payload
        const payload = {
          assetId: assetIdClean,
          category: (item.category || "").toString().trim(),
          brandName: (item.brandName || item.brand || "").toString().trim(),
          version: (item.version || item.makeModel || item.model || "").toString().trim(),
          serialNumber: (item.serialNumber || item.serialNo || "").toString().trim(),
          purchaseDate: (item.purchaseDate || item.biosDate || "").toString().trim(),
          condition: (item.condition || "New").toString().trim(),
          location: (item.location || "").toString().trim(),
          status: (item.status || "Available").toString().trim(),
          isComponent: false,
          trackingType: "Individual",
          components: []
        };

        // Copy dynamic keys
        allKeys.forEach(key => {
          if (item[key] !== undefined) {
            payload[key] = typeof item[key] === 'string' ? item[key].trim() : item[key];
          }
        });

        // Specific fields from spreadsheet columns
        if (item.biosDate) payload.biosDate = item.biosDate;
        if (item.os && !payload.operatingSystem) payload.operatingSystem = item.os;
        if (item.storage && !payload.hardDisk) payload.hardDisk = item.storage;
        if (item.makeModel) payload.version = item.makeModel;

        const asset = new Asset(payload);
        await asset.save();
        importCount++;
      } catch (errItem) {
        errors.push({ assetId: item.assetId, error: errItem.message });
      }
    }

    res.json({
      message: `Bulk import completed. Successfully imported: ${importCount}, Skipped/Duplicates: ${skippedCount}`,
      imported: importCount,
      skipped: skippedCount,
      errors
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
