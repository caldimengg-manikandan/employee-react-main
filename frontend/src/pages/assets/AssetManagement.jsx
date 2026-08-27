import React, { useState, useEffect, useMemo } from "react";
import {
  Briefcase,
  Layers,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Search,
  Download,
  LogOut,
  Bell,
  FileText,
  Eye,
  FileSpreadsheet,
  Paperclip,
  Check,
  X,
  Send,
  Filter,
  Phone,
  LayoutDashboard,
  Wrench,
  Upload,
  Coffee,
  Shield,
  Key,
  Building2,
  Package
} from "lucide-react";
import { employeeAPI, assetAPI, BASE_URL } from "../../services/api";
import ExtensionMaster from "./ExtensionMaster";
import XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import "jspdf-autotable";

const ASSET_CATEGORIES_CONFIG = {
  "Laptop": [
    { label: "Adapter", key: "adapter" },
    { label: "Charger", key: "charger" },
    { label: "Mouse (Wired / Non-Wired)", key: "mouse" },
    { label: "Headset", key: "headset" }
  ],
  "Desktop / CPU": [
    { label: "Keyboard", key: "keyboard" },
    { label: "Mouse", key: "mouse" },
    { label: "Single Monitor", key: "singleMonitor" },
    { label: "Double Monitor", key: "doubleMonitor" },
    { label: "Headset", key: "headset" }
  ]
};

const CATEGORY_FIELDS = {
  "Laptop": [
    { key: "processor", label: "Processor", type: "text" },
    { key: "ram", label: "RAM", type: "text" },
    { key: "hardDisk", label: "Hard Disk / SSD", type: "text" },
    { key: "screenSize", label: "Screen Size", type: "text" },
    { key: "operatingSystem", label: "Operating System", type: "text" },
    { key: "gpu", label: "GPU / Graphics Card", type: "text" },
    { key: "version", label: "Model Number / Version", type: "text" }
  ],
  "Desktop / CPU": [
    { key: "processor", label: "Processor", type: "text" },
    { key: "ram", label: "RAM", type: "text" },
    { key: "hardDisk", label: "Hard Disk / SSD", type: "text" },
    { key: "operatingSystem", label: "Operating System", type: "text" },
    { key: "gpu", label: "GPU / Graphics Card", type: "text" },
    { key: "version", label: "Model Number / Version", type: "text" }
  ],
  "Adapter": [
    { key: "chargerPower", label: "Charger Power (Watts)", type: "text" },
    { key: "version", label: "Model Number / Version", type: "text" }
  ],
  "Charger": [
    { key: "chargerPower", label: "Charger Power (Watts)", type: "text" },
    { key: "version", label: "Model Number / Version", type: "text" }
  ],
  "Mouse": [
    { key: "mouseType", label: "Mouse Type", type: "select", options: ["Wired", "Non-Wired"] }
  ],
  "Keyboard": [
    { key: "keyboardType", label: "Keyboard Type", type: "select", options: ["Wired", "Non-Wired"] }
  ],
  "Headset": [
    { key: "headsetType", label: "Headset Type", type: "text" },
    { key: "version", label: "Model Number / Version", type: "text" }
  ],
  "Monitor": [
    { key: "screenSize", label: "Screen Size", type: "text" },
    { key: "resolution", label: "Resolution / Refresh Rate", type: "text" },
    { key: "version", label: "Model Number / Version", type: "text" }
  ]
};

export default function AssetManagement() {
  const isRealAdmin = useMemo(() => {
    const loggedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
    const role = (loggedUser.role || "").trim().toLowerCase();
    const designation = (loggedUser.designation || "").trim().toLowerCase();
    return role === "admin" || role === "hr" || role === "director" || designation === "it admin";
  }, []);

  const isITOrSuperAdmin = useMemo(() => {
    const loggedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
    const role = (loggedUser.role || "").trim().toLowerCase();
    const designation = (loggedUser.designation || "").trim().toLowerCase();
    return role === "admin" || role === "super_admin" || role === "it_admin" || designation.includes("it admin") || designation.includes("super admin");
  }, []);

  // Access Control / User Roles state
  const [currentRole, setCurrentRole] = useState(() => {
    const loggedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
    const role = (loggedUser.role || "").trim().toLowerCase();
    const designation = (loggedUser.designation || "").trim().toLowerCase();
    if (role === "admin" || role === "hr" || role === "director" || designation === "it admin") {
      return "Admin/HR";
    }
    return "Employee";
  });

  const loggedUser = useMemo(() => {
    return JSON.parse(sessionStorage.getItem("user") || "{}");
  }, []);

  const [activeTab, setActiveTab] = useState(currentRole === "Admin/HR" ? "dashboard" : "requests");

  // Core Data States
  const [assets, setAssets] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [fieldConfig, setFieldConfig] = useState({ fields: [] });
  const [showFieldConfigPanel, setShowFieldConfigPanel] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");

  // Logged-in Employee detail for auto-filled forms
  const currentEmployeeDetail = useMemo(() => {
    const empCode = (loggedUser.employeeId || loggedUser.userCode || "").trim().toUpperCase();
    const userEmail = (loggedUser.email || loggedUser.officialEmail || "").trim().toLowerCase();

    // Find matching employee in loaded employee list
    const found = employees.find(e => {
      const codeStr = (e.employeeId || e.employeeCode || "").trim().toUpperCase();
      const codeMatch = empCode && codeStr && codeStr === empCode;
      const offEmail = (e.officialEmail || "").trim().toLowerCase();
      const pEmail = (e.email || "").trim().toLowerCase();
      const emailMatch = userEmail && (
        (offEmail && offEmail === userEmail) ||
        (pEmail && pEmail === userEmail)
      );
      return codeMatch || emailMatch;
    });

    const rawLoc = (found && (found.location || found.branch || found.currentCity)) || loggedUser.location || "";
    let finalLoc = rawLoc;
    if (rawLoc) {
      const u = rawLoc.toUpperCase();
      if (u.includes("BAGALUR") || u.includes("HOSUR")) finalLoc = "Hosur Office";
      else if (u.includes("CHENNAI")) finalLoc = "Chennai Office";
    } else {
      finalLoc = "Chennai Office";
    }

    return {
      name: (found && (found.name || found.employeename)) || loggedUser.name || "Employee",
      employeeId: (found && (found.employeeId || found.employeeCode)) || empCode || "CDE001",
      division: (found && (found.division || found.department)) || loggedUser.division || "SDS",
      designation: (found && (found.designation || found.position)) || loggedUser.designation || loggedUser.role || "Team Member",
      location: finalLoc
    };
  }, [employees, loggedUser]);

  // Dynamic divisions list state
  const [divisions, setDivisions] = useState([
    "SDS",
    "TEKLA",
    "DAS (Software)",
    "MD Cabin",
    "GM Cabin",
    "Reception",
    "HR Cabin",
    "Project Manager Cabin 1",
    "Project Manager Cabin 2",
    "PM Cabin 3",
    "PM Cabin 4",
    "Delivery Manager Cabin"
  ]);

  // Sync custom divisions from fetched assets
  useEffect(() => {
    if (assets && assets.length > 0) {
      const uniqueDivisions = new Set([
        "SDS",
        "TEKLA",
        "DAS (Software)",
        "MD Cabin",
        "GM Cabin",
        "Reception",
        "HR Cabin",
        "Project Manager Cabin 1",
        "Project Manager Cabin 2",
        "PM Cabin 3",
        "PM Cabin 4",
        "Delivery Manager Cabin"
      ]);
      assets.forEach(asset => {
        if (asset.division) {
          uniqueDivisions.add(asset.division);
        }
      });
      setDivisions(Array.from(uniqueDivisions));
    }
  }, [assets]);

  // Asset Master Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Asset Requests Search & Filters
  const [reqSearch, setReqSearch] = useState("");
  const [reqStatus, setReqStatus] = useState("All");
  const [reqCategory, setReqCategory] = useState("All");
  const [reqType, setReqType] = useState("All");
  const [reqDiv, setReqDiv] = useState("All");
  const [reqLoc, setReqLoc] = useState("All");
  const [showReqFilters, setShowReqFilters] = useState(true);

  const activeFilterCount = useMemo(() => {
    let cnt = 0;
    if (reqStatus !== "All") cnt++;
    if (reqCategory !== "All") cnt++;
    if (reqType !== "All") cnt++;
    if (reqDiv !== "All") cnt++;
    if (reqSearch.trim() !== "") cnt++;
    return cnt;
  }, [reqStatus, reqCategory, reqType, reqDiv, reqSearch]);

  const resetReqFilters = () => {
    setReqStatus("All");
    setReqCategory("All");
    setReqType("All");
    setReqDiv("All");
    setReqSearch("");
  };

  // Loading states
  const [loading, setLoading] = useState(false);

  // Asset Form/Modal states
  const [assetFormOpen, setAssetFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [newAsset, setNewAsset] = useState({
    assetId: "",
    category: "Laptop",
    brandName: "",
    processor: "",
    version: "",
    ram: "8 GB",
    hardDisk: "512 GB SSD",
    serialNumber: "",
    screenSize: "24 Inch",
    keyboardType: "Wired",
    mouseType: "Wired",
    headsetType: "Wired",
    purchaseDate: "",
    condition: "New",
    location: "Chennai Office",
    status: "Available"
  });

  // Allocation Modal state
  const [allocationFormOpen, setAllocationFormOpen] = useState(false);
  const [allocateAsset, setAllocateAsset] = useState(null);
  const [allocCategorySelected, setAllocCategorySelected] = useState("");
  const [allocAssetSetSelectedId, setAllocAssetSetSelectedId] = useState("");
  const [selectedComponents, setSelectedComponents] = useState({
    adapter: "",
    mouse: "",
    keyboard: "",
    headset: "",
    monitor: ""
  });
  const [allocationData, setAllocationData] = useState({
    assignedToId: "",
    allocatedDate: new Date().toISOString().split("T")[0],
    division: ""
  });

  // Allocation Tab Filters
  const [allocSearch, setAllocSearch] = useState("");
  const [allocStatus, setAllocStatus] = useState("All");
  const [allocCategory, setAllocCategory] = useState("All");
  const [allocDivision, setAllocDivision] = useState("All");
  const [viewAssetDetails, setViewAssetDetails] = useState(null);
  const [setComponents, setSetComponents] = useState({
    adapter: { checked: false, assetId: "", serialNumber: "" },
    charger: { checked: false, assetId: "", serialNumber: "" },
    mouse: { checked: false, assetId: "", serialNumber: "" },
    headset: { checked: false, assetId: "", serialNumber: "" },
    keyboard: { checked: false, assetId: "", serialNumber: "" },
    singleMonitor: { checked: false, assetId: "", serialNumber: "" },
    doubleMonitor: { checked: false, assetId: "", serialNumber: "" }
  });
  // Asset Request Modals & Form state
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    assetCategory: "Laptop",
    requestType: "New Asset Request",
    reason: "",
    attachment: null
  });

  const [viewRequestModal, setViewRequestModal] = useState(null);
  const [approveModal, setApproveModal] = useState(null); // { request, remarks }
  const [rejectModal, setRejectModal] = useState(null); // { request, remarks }
  const [allocateModal, setAllocateModal] = useState(null); // { request, selectedAssetId, allocatedDate }

  // Asset Handover states
  const [handoverHistory, setHandoverHistory] = useState([]);
  const [handoverModal, setHandoverModal] = useState(null);
  const [handoverData, setHandoverData] = useState({
    handoverDate: new Date().toISOString().split("T")[0],
    condition: "Good",
    remarks: ""
  });
  const [handoverSubTab, setHandoverSubTab] = useState("queue");
  const [handoverSearch, setHandoverSearch] = useState("");
  const [handoverConditionFilter, setHandoverConditionFilter] = useState("All");
  const [handoverDeptFilter, setHandoverDeptFilter] = useState("All");

  // Office Accessories states
  const [accessoryModalOpen, setAccessoryModalOpen] = useState(false);
  const [editingAccessory, setEditingAccessory] = useState(null);
  const [accessoryFormData, setAccessoryFormData] = useState({
    category: "Furniture",
    itemName: "",
    quantity: 1,
    location: "Chennai Office",
    remarks: ""
  });
  const [accessorySearchQuery, setAccessorySearchQuery] = useState("");
  const [accessoryCategoryFilter, setAccessoryCategoryFilter] = useState("All");

  const INITIAL_ACCESSORY_CATEGORIES = useMemo(() => [
    "Furniture",
    "Electrical / Utility",
    "Kitchen / Pantry",
    "Safety",
    "Security / Access",
    "Facility",
    "Waste Management",
    "Other"
  ], []);

  const [customAccessoryCategories, setCustomAccessoryCategories] = useState(() => {
    try {
      const saved = localStorage.getItem("customAccessoryCategories");
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const [deletedAccessoryCategories, setDeletedAccessoryCategories] = useState(() => {
    try {
      const saved = localStorage.getItem("deletedAccessoryCategories");
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const [showAddCustomAccCat, setShowAddCustomAccCat] = useState(false);
  const [newCustomAccCatName, setNewCustomAccCatName] = useState("");

  const accessoryCategories = useMemo(() => {
    const customFromAssets = (assets || [])
      .filter(a => a.trackingType === "Quantity" && a.category)
      .map(a => a.category);
    const combined = Array.from(new Set([
      ...INITIAL_ACCESSORY_CATEGORIES,
      ...customAccessoryCategories,
      ...customFromAssets
    ]));
    return combined.filter(cat => !deletedAccessoryCategories.includes(cat));
  }, [assets, customAccessoryCategories, INITIAL_ACCESSORY_CATEGORIES, deletedAccessoryCategories]);

  const handleAddCustomAccessoryCategory = () => {
    const trimmed = newCustomAccCatName.trim();
    if (!trimmed) return;
    if (accessoryCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      alert(`Category "${trimmed}" already exists.`);
      return;
    }

    const updatedDeleted = deletedAccessoryCategories.filter(c => c.toLowerCase() !== trimmed.toLowerCase());
    setDeletedAccessoryCategories(updatedDeleted);
    try {
      localStorage.setItem("deletedAccessoryCategories", JSON.stringify(updatedDeleted));
    } catch (_) {}

    const updatedCustom = [...customAccessoryCategories, trimmed];
    setCustomAccessoryCategories(updatedCustom);
    try {
      localStorage.setItem("customAccessoryCategories", JSON.stringify(updatedCustom));
    } catch (_) {}

    setAccessoryFormData(prev => ({ ...prev, category: trimmed }));
    setNewCustomAccCatName("");
    setShowAddCustomAccCat(false);
  };

  const handleDeleteAccessoryCategory = (catName) => {
    const inUseCount = (assets || []).filter(a => a.trackingType === "Quantity" && a.category === catName).length;
    let confirmMsg = `Are you sure you want to delete category "${catName}"?`;
    if (inUseCount > 0) {
      confirmMsg = `Category "${catName}" is currently used by ${inUseCount} item(s). Deleting this category will remove it from category options. Continue?`;
    }
    if (!window.confirm(confirmMsg)) return;

    const updatedCustom = customAccessoryCategories.filter(c => c !== catName);
    setCustomAccessoryCategories(updatedCustom);
    try {
      localStorage.setItem("customAccessoryCategories", JSON.stringify(updatedCustom));
    } catch (_) {}

    const updatedDeleted = Array.from(new Set([...deletedAccessoryCategories, catName]));
    setDeletedAccessoryCategories(updatedDeleted);
    try {
      localStorage.setItem("deletedAccessoryCategories", JSON.stringify(updatedDeleted));
    } catch (_) {}

    const remaining = accessoryCategories.filter(c => c !== catName);
    const fallbackCategory = remaining[0] || "";

    if (accessoryFormData.category === catName) {
      setAccessoryFormData(prev => ({ ...prev, category: fallbackCategory }));
    }
    if (accessoryCategoryFilter === catName) {
      setAccessoryCategoryFilter("All");
    }
  };

  const handleResetAccessoryCategories = () => {
    if (window.confirm("Do you want to restore all standard default accessory categories?")) {
      setDeletedAccessoryCategories([]);
      try {
        localStorage.removeItem("deletedAccessoryCategories");
      } catch (_) {}
    }
  };

  const individualCategories = useMemo(() => {
    const cats = (assets || [])
      .filter(a => a.trackingType !== "Quantity" && a.category)
      .map(a => a.category);
    return Array.from(new Set(cats));
  }, [assets]);

  // Add Accessory Modal states & helpers
  const [addAccModalOpen, setAddAccModalOpen] = useState(false);
  const [selectedAllocForAcc, setSelectedAllocForAcc] = useState(null);
  const [selectedAccCategory, setSelectedAccCategory] = useState("");
  const [selectedAccAssetId, setSelectedAccAssetId] = useState("");

  const getMissingAccessories = (al) => {
    if (al.status !== "Assigned") return [];
    const currentCats = (al.components || []).map(c => (c.category || "").trim().toLowerCase());
    
    if (al.category === "Laptop") {
      const expected = ["Adapter", "Mouse", "Headset"];
      return expected.filter(exp => !currentCats.some(cur => cur.includes(exp.toLowerCase())));
    }
    if (al.category === "Desktop / CPU") {
      const expected = ["Keyboard", "Mouse", "Monitor", "Headset"];
      return expected.filter(exp => !currentCats.some(cur => cur.includes(exp.toLowerCase())));
    }
    return [];
  };

  const handleOpenAddAccessoryModal = (al) => {
    const missing = getMissingAccessories(al);
    setSelectedAllocForAcc(al);
    setSelectedAccCategory(missing[0] || "");
    setSelectedAccAssetId("");
    setAddAccModalOpen(true);
  };

  const availableAccAssets = useMemo(() => {
    if (!selectedAccCategory) return [];
    return (assets || []).filter(a => a.category === selectedAccCategory && a.status === "Available");
  }, [assets, selectedAccCategory]);

  const handleAddAccessorySubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedAccAssetId) {
      alert("Please select an available accessory.");
      return;
    }
    try {
      setLoading(true);
      await assetAPI.addComponentToAllocation(selectedAllocForAcc._id, {
        componentId: selectedAccAssetId
      });
      alert("Accessory added to allocation successfully!");
      setAddAccModalOpen(false);
      setSelectedAllocForAcc(null);
      setSelectedAccCategory("");
      setSelectedAccAssetId("");
      loadAssets();
      loadAllocations();
    } catch (err) {
      console.error("Error adding component to allocation:", err);
      alert(err.response?.data?.error || "Error adding accessory.");
    } finally {
      setLoading(false);
    }
  };

  // Quantity tracking and Excel Import states
  const [trackingTypeFilter, setTrackingTypeFilter] = useState("All");
  const [trackingType, setTrackingType] = useState("Individual");
  const [itemType, setItemType] = useState("");
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [individualTracking, setIndividualTracking] = useState(false);

  // Maintenance states
  const [maintenanceList, setMaintenanceList] = useState([]);
  const [maintenanceFormOpen, setMaintenanceFormOpen] = useState(false);
  const [maintenanceData, setMaintenanceData] = useState({
    assetId: "",
    maintenanceType: "Repair",
    cost: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    vendorName: "",
    description: "",
    quantity: 1
  });
  const [completeMntModalOpen, setCompleteMntModalOpen] = useState(false);
  const [selectedMntRecord, setSelectedMntRecord] = useState(null);
  const [completeReturnCondition, setCompleteReturnCondition] = useState("Good");

  // Excel Import states
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [excelPreviewData, setExcelPreviewData] = useState([]);
  const [excelFileName, setExcelFileName] = useState("");
  const [excelParsingError, setExcelParsingError] = useState("");

  // Allocation modifications
  const [allocTrackingType, setAllocTrackingType] = useState("Individual");
  const [allocAssignmentType, setAllocAssignmentType] = useState("Employee");
  const [allocDepartment, setAllocDepartment] = useState("");
  const [allocTeam, setAllocTeam] = useState("");
  const [allocLocation, setAllocLocation] = useState("");
  const [allocQuantity, setAllocQuantity] = useState(1);

  // Load functions
  const loadAssets = async () => {
    try {
      const res = await assetAPI.getAll();
      setAssets(res.data || []);
    } catch (err) {
      console.error("Error loading assets:", err);
    }
  };

  const loadAllocations = async () => {
    try {
      const res = await assetAPI.getAllAllocations();
      setAllocations(res.data || []);
    } catch (err) {
      console.error("Error loading allocations:", err);
    }
  };

  const loadRequests = async () => {
    try {
      const res = await assetAPI.getAllRequests();
      setRequests(res.data || []);
    } catch (err) {
      console.error("Error loading requests:", err);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await employeeAPI.getAllEmployees();
      if (res && res.data) {
        setEmployees(res.data);
      }
    } catch (err) {
      console.error("Error loading employees:", err);
    }
  };

  const loadHandoverHistory = async () => {
    try {
      const res = await assetAPI.getHandoverHistory();
      setHandoverHistory(res.data || []);
    } catch (err) {
      console.error("Error loading handover history:", err);
    }
  };

  // Exit Clearance states
  const [exitClearances, setExitClearances] = useState([]);
  const [clearanceModal, setClearanceModal] = useState(null); // Selected clearance record for verification modal
  const [clearanceSearch, setClearanceSearch] = useState("");
  const [clearanceStatusFilter, setClearanceStatusFilter] = useState("All");
  const [clearanceDeptFilter, setClearanceDeptFilter] = useState("All");
  const [clearanceConditionFilter, setClearanceConditionFilter] = useState("All");

  const loadExitClearances = async () => {
    try {
      const res = await assetAPI.getExitClearances();
      setExitClearances(res.data || []);
    } catch (err) {
      console.error("Error loading exit clearances:", err);
    }
  };

  const loadFieldConfig = async () => {
    try {
      const res = await assetAPI.getFieldConfig();
      if (res && res.data) {
        setFieldConfig(res.data);
      }
    } catch (err) {
      console.error("Error loading field config:", err);
    }
  };

  const handleToggleFieldConfig = async (fieldKey, enabledValue) => {
    try {
      const updatedFields = fieldConfig.fields.map(f => {
        if (f.key === fieldKey) {
          return { ...f, enabled: enabledValue };
        }
        return f;
      });
      const updatedConfig = { ...fieldConfig, fields: updatedFields };
      setFieldConfig(updatedConfig);
      await assetAPI.updateFieldConfig(updatedConfig);
    } catch (err) {
      console.error("Error updating field config:", err);
    }
  };

  const handleAddNewField = async (e) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;
    const labelName = newFieldName.trim();

    // Generate camelCase key
    const keyName = labelName
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .split(" ")
      .map((word, index) => {
        if (index === 0) return word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join("");

    if (!keyName) return;

    // Check if field already exists
    const exists = (fieldConfig.fields || []).some(f => f.key.toLowerCase() === keyName.toLowerCase());
    if (exists) {
      alert("This specification field already exists!");
      return;
    }

    try {
      const newFieldItem = { key: keyName, label: labelName, enabled: true, type: "text" };
      const updatedConfig = { ...fieldConfig, fields: [...(fieldConfig.fields || []), newFieldItem] };
      setFieldConfig(updatedConfig);
      await assetAPI.updateFieldConfig(updatedConfig);
      setNewFieldName("");
      alert("Specification field added successfully!");
    } catch (err) {
      console.error("Error adding new custom field:", err);
      alert("Error adding specification field.");
    }
  };

  const handleDeleteField = async (fieldKey) => {
    if (window.confirm("Are you sure you want to delete this specification field? Any data stored in this field across your assets will no longer be visible in table columns and CSV export.")) {
      try {
        const updatedFields = fieldConfig.fields.filter(f => f.key !== fieldKey);
        const updatedConfig = { ...fieldConfig, fields: updatedFields };
        setFieldConfig(updatedConfig);
        await assetAPI.updateFieldConfig(updatedConfig);
        alert("Specification field deleted successfully!");
      } catch (err) {
        console.error("Error deleting field config:", err);
        alert("Error deleting specification field.");
      }
    }
  };

  const loadMaintenance = async () => {
    try {
      const res = await assetAPI.getAllMaintenance();
      setMaintenanceList(res.data || []);
    } catch (err) {
      console.error("Error loading maintenance list:", err);
    }
  };

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadAssets(),
      loadAllocations(),
      loadRequests(),
      loadEmployees(),
      loadHandoverHistory(),
      loadExitClearances(),
      loadCategories(),
      loadFieldConfig(),
      loadMaintenance()
    ]).finally(() => setLoading(false));
  }, []);

  const loadCategories = async () => {
    try {
      const res = await assetAPI.getCategories();
      setCategories(res.data || []);
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };



  const handleCategoryChangeInForm = (selectedCat) => {
    setNewAsset(prev => {
      const updated = { ...prev, category: selectedCat };
      (fieldConfig.fields || []).forEach(f => {
        if (!f.enabled) {
          updated[f.key] = "";
        }
      });
      return updated;
    });
  };

  const rams = ["4 GB", "8 GB", "16 GB", "32 GB", "64 GB"];
  const hardDisks = ["256 GB SSD", "512 GB SSD", "1 TB SSD", "1 TB HDD", "2 TB HDD"];
  const conditions = ["New", "Excellent", "Good", "Average", "Needs Repair", "Damaged"];
  const locations = ["Chennai Office", "Hosur Office"];

  // Unique divisions and locations for request filters
  const uniqueDivisionsForFilter = useMemo(() => {
    const divs = (employees || []).map(e => e.division || e.department).filter(Boolean);
    const reqDivs = (requests || []).map(r => r.division || r.department).filter(Boolean);
    return Array.from(new Set(["All", ...divs, ...reqDivs]));
  }, [employees, requests]);

  const uniqueLocations = useMemo(() => {
    const locs = (employees || []).map(e => e.location || e.branch || e.currentCity).filter(Boolean);
    const reqLocs = (requests || []).map(r => r.location).filter(Boolean);
    return Array.from(new Set(["All", "Chennai Office", "Hosur Office", ...locs, ...reqLocs]));
  }, [employees, requests]);

  // Sorted Employees by Employee ID series number (e.g. CDE001, CDE002, ...)
  const sortedEmployees = useMemo(() => {
    return [...(employees || [])].sort((a, b) => {
      const idA = (a.employeeId || a.employeeCode || "").trim().toUpperCase();
      const idB = (b.employeeId || b.employeeCode || "").trim().toUpperCase();

      const numA = parseInt(idA.replace(/\D/g, ""), 10);
      const numB = parseInt(idB.replace(/\D/g, ""), 10);

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [employees]);

  // Dashboard Stats Calculations (Exit Clearance Integrated)
  const stats = useMemo(() => {
    const pendingExitClearances = (exitClearances || []).filter(c => c.status === "Pending" || c.status === "In Progress").length;
    const completedExitClearances = (exitClearances || []).filter(c => c.status === "Completed").length;

    let returnedCount = 0;
    let damagedCount = 0;
    let lostCount = 0;

    (exitClearances || []).forEach(c => {
      (c.assignedAssets || []).forEach(a => {
        if (a.returned) returnedCount++;
        if (a.condition === "Damaged" || a.condition === "Minor Damage") damagedCount++;
        if (a.condition === "Lost") lostCount++;
      });
    });

    // Helper to group assets
    const getAssetGroup = (asset) => {
      const cat = (asset.category || "").trim();
      const tracking = asset.trackingType || "Individual";
      
      if (tracking === "Individual") {
        const itCats = ["Laptop", "Desktop / CPU", "Adapter", "Charger", "Mouse", "Keyboard", "Headset", "Monitor"];
        if (itCats.includes(cat)) return "IT Assets";
      }
      
      if (cat === "Furniture") return "Furniture";
      if (cat === "Electrical / Utility" || cat === "Electrical") return "Electrical";
      if (cat === "Kitchen / Pantry" || cat === "Kitchen") return "Kitchen / Pantry";
      if (cat === "Safety") return "Safety";
      if (cat === "Security / Access" || cat === "Security") return "Security / Access";
      if (cat === "Facility Equipment" || cat === "Facility") return "Facility Equipment";
      if (cat === "Waste Management" || cat === "Waste") return "Waste Management";
      
      return "Other";
    };

    let totalIndiv = 0;
    let totalQtyUnique = 0;
    let totalQtySum = 0;
    
    let availableSum = 0;
    let inUseSum = 0;
    let maintenanceSum = 0;
    let damagedSum = 0;
    let retiredSum = 0;
    
    const groups = {
      "IT Assets": { label: "IT Assets", total: 0, available: 0, inUse: 0, maintenance: 0, damaged: 0, retired: 0 },
      "Furniture": { label: "Furniture", total: 0, available: 0, inUse: 0, maintenance: 0, damaged: 0, retired: 0 },
      "Electrical": { label: "Electrical / Utility", total: 0, available: 0, inUse: 0, maintenance: 0, damaged: 0, retired: 0 },
      "Kitchen / Pantry": { label: "Kitchen / Pantry", total: 0, available: 0, inUse: 0, maintenance: 0, damaged: 0, retired: 0 },
      "Safety": { label: "Safety", total: 0, available: 0, inUse: 0, maintenance: 0, damaged: 0, retired: 0 },
      "Security / Access": { label: "Security / Access", total: 0, available: 0, inUse: 0, maintenance: 0, damaged: 0, retired: 0 },
      "Facility Equipment": { label: "Facility Equipment", total: 0, available: 0, inUse: 0, maintenance: 0, damaged: 0, retired: 0 },
      "Waste Management": { label: "Waste Management", total: 0, available: 0, inUse: 0, maintenance: 0, damaged: 0, retired: 0 },
      "Other": { label: "Other", total: 0, available: 0, inUse: 0, maintenance: 0, damaged: 0, retired: 0 }
    };
    
    assets.forEach(a => {
      const groupName = getAssetGroup(a);
      const targetGroup = groups[groupName] || groups["Other"];
      
      if (a.trackingType === "Quantity") {
        totalQtyUnique++;
        const qd = a.quantityDetails || {};
        const total = qd.total || 0;
        const available = qd.available || 0;
        const inUse = qd.inUse || 0;
        const maint = qd.maintenance || 0;
        const dmg = qd.damaged || 0;
        const ret = qd.retired || 0;
        
        totalQtySum += total;
        availableSum += available;
        inUseSum += inUse;
        maintenanceSum += maint;
        damagedSum += dmg;
        retiredSum += ret;
        
        targetGroup.total += total;
        targetGroup.available += available;
        targetGroup.inUse += inUse;
        targetGroup.maintenance += maint;
        targetGroup.damaged += dmg;
        targetGroup.retired += ret;
      } else {
        totalIndiv++;
        const status = a.status || "Available";
        
        availableSum += (status === "Available" ? 1 : 0);
        inUseSum += (status === "Assigned" ? 1 : 0);
        maintenanceSum += (status === "Under Maintenance" ? 1 : 0);
        damagedSum += (status === "Damaged" ? 1 : 0);
        retiredSum += ((status === "Retired" || status === "Scrapped" || status === "Scrapped" || status === "Lost") ? 1 : 0);
        
        targetGroup.total += 1;
        targetGroup.available += (status === "Available" ? 1 : 0);
        targetGroup.inUse += (status === "Assigned" ? 1 : 0);
        targetGroup.maintenance += (status === "Under Maintenance" ? 1 : 0);
        targetGroup.damaged += (status === "Damaged" ? 1 : 0);
        targetGroup.retired += ((status === "Retired" || status === "Scrapped" || status === "Lost") ? 1 : 0);
      }
    });

    return {
      total: assets.length,
      assigned: inUseSum,
      available: availableSum,
      damaged: damagedSum || damagedCount,
      totalRequests: requests.length,
      pendingRequests: requests.filter(r => r.status === "Pending").length,
      approvedRequests: requests.filter(r => r.status === "Approved").length,
      completedRequests: requests.filter(r => r.status === "Completed" || r.status === "Asset Allocated").length,
      rejectedRequests: requests.filter(r => r.status === "Rejected").length,
      pendingExitClearances,
      completedExitClearances,
      assetsReturned: returnedCount,
      lostAssets: lostCount || retiredSum,
      
      // new stats
      totalIndividual: totalIndiv,
      totalQuantityUnique: totalQtyUnique,
      totalQuantitySum: totalQtySum,
      totalAssetsCount: totalIndiv + totalQtySum,
      availableSum,
      inUseSum,
      maintenanceSum,
      damagedSum,
      retiredSum,
      groups
    };
  }, [assets, allocations, exitClearances, requests]);

  // Filtered Exit Clearances
  const filteredExitClearances = useMemo(() => {
    return (exitClearances || []).filter(c => {
      const nameStr = (c.employeeName || "").toLowerCase();
      const codeStr = (c.employeeCode || c.employeeId || "").toLowerCase();
      const reqNoStr = (c.exitRequestNumber || "").toLowerCase();
      const assetIdsStr = (c.assignedAssets || []).map(a => a.assetId).join(" ").toLowerCase();
      const query = clearanceSearch.toLowerCase().trim();

      const matchSearch = !query || nameStr.includes(query) || codeStr.includes(query) || reqNoStr.includes(query) || assetIdsStr.includes(query);
      const matchStatus = clearanceStatusFilter === "All" || c.status === clearanceStatusFilter;
      const matchDept = clearanceDeptFilter === "All" || (c.department || c.division) === clearanceDeptFilter;

      let matchCond = true;
      if (clearanceConditionFilter !== "All") {
        matchCond = (c.assignedAssets || []).some(a => a.condition === clearanceConditionFilter);
      }

      return matchSearch && matchStatus && matchDept && matchCond;
    });
  }, [exitClearances, clearanceSearch, clearanceStatusFilter, clearanceDeptFilter, clearanceConditionFilter]);

  // Filtered Handover Queue (Pending Exit Form Handovers + Active Assigned Assets)
  const filteredHandoverQueue = useMemo(() => {
    const pendingExitHandovers = (handoverHistory || []).filter(ho => ho.status === "Pending");
    const assignedList = (allocations || []).filter(al => al.status === "Assigned");
    const mergedList = [...pendingExitHandovers];

    assignedList.forEach(al => {
      const alreadyAdded = mergedList.some(item => item.assetId === al.assetId);
      if (!alreadyAdded) {
        mergedList.push({
          ...al,
          exitRequestNumber: "-",
          proposedLastWorkingDay: "-",
          handoverStatus: "Pending"
        });
      }
    });

    return mergedList.filter(al => {
      const nameStr = (al.employeeName || "").toLowerCase();
      const codeStr = (al.employeeCode || al.employeeId || "").toLowerCase();
      const assetIdStr = (al.assetId || "").toLowerCase();
      const exitNoStr = (al.exitRequestNumber || "").toLowerCase();
      const query = handoverSearch.toLowerCase().trim();

      const matchSearch = !query || nameStr.includes(query) || codeStr.includes(query) || assetIdStr.includes(query) || exitNoStr.includes(query);
      const matchCond = handoverConditionFilter === "All" || ((al.asset && al.asset.condition) || al.condition || "Good") === handoverConditionFilter;
      const matchDept = handoverDeptFilter === "All" || (al.department || al.division) === handoverDeptFilter;

      return matchSearch && matchCond && matchDept;
    });
  }, [allocations, handoverHistory, handoverSearch, handoverConditionFilter, handoverDeptFilter]);

  // Filtered Handover History (Completed Handovers)
  const filteredHandoverHistory = useMemo(() => {
    return (handoverHistory || []).filter(ho => ho.status === "Completed").filter(ho => {
      const nameStr = (ho.employeeName || "").toLowerCase();
      const codeStr = (ho.employeeCode || ho.employeeId || "").toLowerCase();
      const assetIdStr = (ho.assetId || "").toLowerCase();
      const query = handoverSearch.toLowerCase().trim();

      const matchSearch = !query || nameStr.includes(query) || codeStr.includes(query) || assetIdStr.includes(query);
      const matchCond = handoverConditionFilter === "All" || ho.condition === handoverConditionFilter;
      const matchDept = handoverDeptFilter === "All" || (ho.department || ho.division) === handoverDeptFilter;

      return matchSearch && matchCond && matchDept;
    });
  }, [handoverHistory, handoverSearch, handoverConditionFilter, handoverDeptFilter]);

  const handleCompleteHandover = async (e) => {
    e.preventDefault();
    if (!handoverModal) return;
    try {
      await assetAPI.processHandover({
        allocationId: handoverModal._id,
        assetId: handoverModal.assetId,
        employeeCode: handoverModal.employeeCode || handoverModal.employeeId,
        employeeName: handoverModal.employeeName,
        department: handoverModal.department || handoverModal.division,
        division: handoverModal.division || handoverModal.department,
        handoverDate: handoverData.handoverDate,
        condition: handoverData.condition,
        remarks: handoverData.remarks
      });
      alert("Asset handover completed successfully!");
      setHandoverModal(null);
      setHandoverData({
        handoverDate: new Date().toISOString().split("T")[0],
        condition: "Good",
        remarks: ""
      });
      loadAssets();
      loadAllocations();
      loadHandoverHistory();
    } catch (err) {
      console.error("Error processing handover:", err);
      alert(err.response?.data?.error || "Error processing asset handover.");
    }
  };

  const employeeStats = useMemo(() => {
    const myEmpCode = loggedUser.employeeId || "CDE001";
    const myAllocations = allocations.filter(al => al.employeeCode === myEmpCode && al.status === "Assigned");
    myAllocations.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
    const myRequests = requests.filter(r => r.employeeCode === myEmpCode || r.employeeId === loggedUser._id);
    return {
      assigned: myAllocations.length,
      totalRequests: myRequests.length,
      pendingRequests: myRequests.filter(r => r.status === "Pending").length,
      approvedRequests: myRequests.filter(r => r.status === "Approved").length,
      completedRequests: myRequests.filter(r => r.status === "Completed" || r.status === "Asset Allocated").length,
      rejectedRequests: myRequests.filter(r => r.status === "Rejected").length,
      assetsList: myAllocations
    };
  }, [allocations, requests, loggedUser]);

  // Filtered Asset Requests
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const q = reqSearch.toLowerCase().trim();
      const numStr = req.requestNumber || req.requestId || "";
      const empName = req.employeeName || "";
      const empCode = req.employeeCode || "";

      const matchSearch = !q ||
        numStr.toLowerCase().includes(q) ||
        empName.toLowerCase().includes(q) ||
        empCode.toLowerCase().includes(q);

      const matchStatus = reqStatus === "All" || req.status === reqStatus;
      const matchCat = reqCategory === "All" || (req.assetCategory || req.category) === reqCategory;
      const matchType = reqType === "All" || req.requestType === reqType;
      const matchDiv = reqDiv === "All" || (req.division || req.department) === reqDiv;
      const matchLoc = reqLoc === "All" || req.location === reqLoc;

      return matchSearch && matchStatus && matchCat && matchType && matchDiv && matchLoc;
    });
  }, [requests, reqSearch, reqStatus, reqCategory, reqType, reqDiv, reqLoc]);

  // Unique divisions in allocations
  const uniqueAllocDivisions = useMemo(() => {
    const divs = (allocations || []).map(al => al.division).filter(Boolean);
    return Array.from(new Set(["All", ...divs]));
  }, [allocations]);

  // Filtered Allocations
  const filteredAllocations = useMemo(() => {
    return (allocations || []).filter(al => {
      const q = allocSearch.toLowerCase().trim();
      const assetId = (al.assetId || "").toLowerCase();
      const category = (al.category || "").toLowerCase();
      const brand = (al.brandName || "").toLowerCase();
      const empName = (al.employeeName || "").toLowerCase();
      const empCode = (al.employeeCode || "").toLowerCase();
      const division = (al.division || "").toLowerCase();

      const matchSearch = !q ||
        assetId.includes(q) ||
        category.includes(q) ||
        brand.includes(q) ||
        empName.includes(q) ||
        empCode.includes(q);

      const matchStatus = allocStatus === "All" || al.status === allocStatus;
      const matchCat = allocCategory === "All" || al.category === allocCategory;
      const matchDiv = allocDivision === "All" || division === allocDivision.toLowerCase();

      return matchSearch && matchStatus && matchCat && matchDiv;
    });
  }, [allocations, allocSearch, allocStatus, allocCategory, allocDivision]);

  // Filtered Assets (Individual tracking only for Asset Master)
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      if (asset.trackingType === "Quantity") return false;

      const idStr = asset.assetId || "";
      const catStr = asset.category || "";
      const brandStr = asset.brandName || "";
      const procStr = asset.processor || "";
      const modelStr = asset.version || "";
      const seatStr = asset.seatNo || "";
      const divStr = asset.division || "";
      const locStr = asset.location || "";

      const matchSearch =
        idStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        catStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brandStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        procStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        modelStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seatStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        divStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        locStr.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat = categoryFilter === "All" || asset.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [assets, searchQuery, categoryFilter]);

  // Filtered Accessories (Quantity tracking only)
  const filteredAccessories = useMemo(() => {
    return assets.filter(asset => {
      if (asset.trackingType !== "Quantity") return false;

      const catStr = asset.category || "";
      const itemStr = asset.itemType || "";
      const locStr = asset.location || "";
      const remarksStr = asset.remarks || "";

      const matchSearch =
        catStr.toLowerCase().includes(accessorySearchQuery.toLowerCase()) ||
        itemStr.toLowerCase().includes(accessorySearchQuery.toLowerCase()) ||
        locStr.toLowerCase().includes(accessorySearchQuery.toLowerCase()) ||
        remarksStr.toLowerCase().includes(accessorySearchQuery.toLowerCase());

      const matchCat = accessoryCategoryFilter === "All" || asset.category === accessoryCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [assets, accessorySearchQuery, accessoryCategoryFilter]);

  // Compute stats for each Office Accessories category
  const accessoryStats = useMemo(() => {
    const stats = {};
    accessoryCategories.forEach(cat => {
      stats[cat] = 0;
    });
    assets.forEach(a => {
      if (a.trackingType === "Quantity" && a.category) {
        if (stats[a.category] === undefined) stats[a.category] = 0;
        stats[a.category] += Number(a.quantityDetails?.total ?? a.totalQuantity ?? a.quantity ?? 0);
      }
    });
    return stats;
  }, [assets, accessoryCategories]);

  // Active specification fields that have at least one entered value in the filtered list
  const activeEnteredFields = useMemo(() => {
    const enabledFields = (fieldConfig.fields || []).filter(f => f.enabled);
    return enabledFields.filter(f => {
      return filteredAssets.some(asset => {
        const val = asset[f.key];
        return val !== undefined && val !== null && String(val).trim() !== "";
      });
    });
  }, [fieldConfig.fields, filteredAssets]);

  const showBiosDate = useMemo(() => {
    return !["Adapter", "Keyboard", "Mouse"].includes(categoryFilter);
  }, [categoryFilter]);

  const activeColumns = useMemo(() => {
    const cols = {
      sNo: true,
      assetId: true,
      category: true,
      brandName: true,
      version: true
    };
    activeEnteredFields.forEach(f => {
      cols[f.key] = true;
    });
    if (showBiosDate) {
      cols.purchaseDate = true;
    }
    cols.condition = true;
    cols.location = true;
    cols.status = true;
    cols.actions = true;
    return cols;
  }, [activeEnteredFields, showBiosDate]);

  const colSpanCount = useMemo(() => {
    return Object.values(activeColumns).filter(Boolean).length;
  }, [activeColumns]);

  // Handlers
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await assetAPI.createCategory({ name: newCategoryName.trim() });
      alert("Category added successfully!");
      setNewCategoryName("");
      loadCategories();
    } catch (err) {
      console.error("Error adding category:", err);
      alert(err.response?.data?.error || "Error adding category.");
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    if (window.confirm(`Are you sure you want to delete category "${catName}"?`)) {
      try {
        await assetAPI.deleteCategory(catId);
        alert("Category deleted successfully!");
        loadCategories();
      } catch (err) {
        console.error("Error deleting category:", err);
        alert(err.response?.data?.error || "Error deleting category.");
      }
    }
  };

  const handleSaveAsset = async (e) => {
    e.preventDefault();
    try {
      // Build subcomponents payload
      const compsToSend = Object.keys(setComponents)
        .filter(k => setComponents[k].checked)
        .map(k => {
          let categoryLabel = "";
          if (k === "adapter") categoryLabel = "Adapter";
          else if (k === "charger") categoryLabel = "Charger";
          else if (k === "mouse") categoryLabel = newAsset.category === "Laptop" ? "Mouse (Wired / Non-Wired)" : "Mouse";
          else if (k === "headset") categoryLabel = "Headset";
          else if (k === "keyboard") categoryLabel = "Keyboard";
          else if (k === "singleMonitor") categoryLabel = "Single Monitor";
          else if (k === "doubleMonitor") categoryLabel = "Double Monitor";

          return {
            _id: setComponents[k]._id,
            category: categoryLabel,
            assetId: (setComponents[k].assetId || "").trim(),
            serialNumber: (setComponents[k].serialNumber || "").trim()
          };
        });

      // Validate subcomponents have assetIds if checked
      for (const comp of compsToSend) {
        if (!comp.assetId) {
          alert(`Asset ID is required for component "${comp.category}".`);
          return;
        }
      }

      // Build payload based on tracking type
      let payload = {};
      if (trackingType === "Quantity") {
        payload = {
          trackingType: "Quantity",
          category: newAsset.category,
          brandName: newAsset.brandName || "",
          itemType: itemType || "",
          individualTracking: individualTracking,
          quantityDetails: {
            total: parseInt(totalQuantity) || 0,
            available: parseInt(totalQuantity) || 0,
            inUse: selectedAsset?.quantityDetails?.inUse || 0,
            maintenance: selectedAsset?.quantityDetails?.maintenance || 0,
            damaged: selectedAsset?.quantityDetails?.damaged || 0,
            retired: selectedAsset?.quantityDetails?.retired || 0
          },
          location: newAsset.location || "Chennai Office",
          status: newAsset.status || "Available",
          purchaseDate: newAsset.purchaseDate || ""
        };
        
        if (selectedAsset) {
          const inUse = selectedAsset.quantityDetails?.inUse || 0;
          const maint = selectedAsset.quantityDetails?.maintenance || 0;
          const dmg = selectedAsset.quantityDetails?.damaged || 0;
          const ret = selectedAsset.quantityDetails?.retired || 0;
          const total = parseInt(totalQuantity) || 0;
          
          const avail = total - (inUse + maint + dmg + ret);
          if (avail < 0) {
            alert(`New total quantity (${total}) is less than current in-use, maintenance, damaged, and retired counts combined (${inUse + maint + dmg + ret}).`);
            return;
          }
          payload.quantityDetails.available = avail;
        }
      } else {
        payload = {
          trackingType: "Individual",
          category: newAsset.category,
          brandName: newAsset.brandName,
          version: newAsset.version,
          serialNumber: newAsset.serialNumber || "",
          purchaseDate: newAsset.purchaseDate,
          condition: newAsset.condition,
          location: newAsset.location,
          status: newAsset.status || "Available",
          components: compsToSend
        };

        // Dynamically copy enabled fields from newAsset
        (fieldConfig.fields || []).forEach(f => {
          if (f.enabled && newAsset[f.key] !== undefined) {
            payload[f.key] = newAsset[f.key];
          }
        });
      }

      if (selectedAsset) {
        // Edit mode - Asset ID is read-only
        payload.assetId = selectedAsset.assetId;
        await assetAPI.update(selectedAsset._id, payload);
        alert("Asset updated successfully!");
      } else {
        // Create mode
        const inputAssetId = (newAsset.assetId || "").trim();
        
        if (trackingType === "Quantity") {
          if (inputAssetId) {
            payload.assetId = inputAssetId;
          }
        } else {
          if (!inputAssetId) {
            alert("Asset ID is mandatory.");
            return;
          }

          // Check for duplicate Asset ID (only for main parent assets in list)
          const exists = assets.some(a => (a.assetId || "").toUpperCase() === inputAssetId.toUpperCase());
          if (exists) {
            alert("This Asset ID already exists.");
            return;
          }
          payload.assetId = inputAssetId;
        }

        await assetAPI.create(payload);
        alert("Asset created successfully!");
      }
      setAssetFormOpen(false);
      setSelectedAsset(null);

      // Reset components state
      setSetComponents({
        adapter: { checked: false, assetId: "", serialNumber: "" },
        charger: { checked: false, assetId: "", serialNumber: "" },
        mouse: { checked: false, assetId: "", serialNumber: "" },
        headset: { checked: false, assetId: "", serialNumber: "" },
        keyboard: { checked: false, assetId: "", serialNumber: "" },
        singleMonitor: { checked: false, assetId: "", serialNumber: "" },
        doubleMonitor: { checked: false, assetId: "", serialNumber: "" }
      });

      // Dynamically reset all fields
      const baseAssetDefaults = {
        assetId: "",
        category: "Laptop",
        brandName: "",
        version: "",
        serialNumber: "",
        purchaseDate: "",
        condition: "New",
        location: "Chennai Office",
        status: "Available"
      };
      (fieldConfig.fields || []).forEach(f => {
        baseAssetDefaults[f.key] = "";
      });
      setNewAsset(baseAssetDefaults);

      loadAssets();
    } catch (err) {
      console.error("Error saving asset:", err);
      alert(err.response?.data?.error || "Error saving asset. Please try again.");
    }
  };

  const handleOpenEditAsset = (asset) => {
    setSelectedAsset(asset);
    const tType = asset.trackingType || "Individual";
    setTrackingType(tType);
    setItemType(asset.itemType || "");
    setTotalQuantity(asset.quantityDetails?.total || 0);
    setIndividualTracking(asset.individualTracking || false);

    const baseEditFields = {
      assetId: asset.assetId,
      category: asset.category || "Laptop",
      brandName: asset.brandName || "",
      version: asset.version || "",
      serialNumber: asset.serialNumber || "",
      purchaseDate: asset.purchaseDate || "",
      condition: asset.condition || "New",
      location: asset.location || "Chennai Office",
      status: asset.status || "Available"
    };
    (fieldConfig.fields || []).forEach(f => {
      baseEditFields[f.key] = asset[f.key] || "";
    });
    setNewAsset(baseEditFields);

    // Populate components state
    const initialComps = {
      adapter: { checked: false, assetId: "", serialNumber: "" },
      charger: { checked: false, assetId: "", serialNumber: "" },
      mouse: { checked: false, assetId: "", serialNumber: "" },
      headset: { checked: false, assetId: "", serialNumber: "" },
      keyboard: { checked: false, assetId: "", serialNumber: "" },
      singleMonitor: { checked: false, assetId: "", serialNumber: "" },
      doubleMonitor: { checked: false, assetId: "", serialNumber: "" }
    };
    if (asset.components && Array.isArray(asset.components)) {
      asset.components.forEach(comp => {
        let key = "";
        const catLower = (comp.category || "").toLowerCase();
        if (catLower.includes("adapter")) key = "adapter";
        else if (catLower.includes("charger")) key = "charger";
        else if (catLower.includes("keyboard")) key = "keyboard";
        else if (catLower.includes("single monitor")) key = "singleMonitor";
        else if (catLower.includes("double monitor")) key = "doubleMonitor";
        else if (catLower.includes("headset")) key = "headset";
        else if (catLower.includes("mouse")) key = "mouse";

        if (key) {
          initialComps[key] = {
            _id: comp._id,
            checked: true,
            assetId: comp.assetId || "",
            serialNumber: comp.serialNumber || ""
          };
        }
      });
    }
    setSetComponents(initialComps);

    setAssetFormOpen(true);
  };

  const handleDeleteAsset = async (id) => {
    if (window.confirm("Are you sure you want to delete this asset?")) {
      try {
        await assetAPI.delete(id);
        alert("Asset deleted successfully!");
        loadAssets();
      } catch (err) {
        console.error("Error deleting asset:", err);
        alert(err.response?.data?.error || "Error deleting asset.");
      }
    }
  };

  const handleAllocate = async (e) => {
    e.preventDefault();

    if (allocTrackingType === "Quantity") {
      if (!allocAssetSetSelectedId) {
        alert("Please select a quantity asset.");
        return;
      }
      
      const targetAsset = assets.find(a => a._id === allocAssetSetSelectedId);
      if (!targetAsset) return;
      
      const payload = {
        assetId: targetAsset.assetId,
        trackingType: "Quantity",
        assignmentType: allocAssignmentType,
        quantity: parseInt(allocQuantity) || 1,
        allocatedDate: allocationData.allocatedDate
      };
      
      if (allocAssignmentType === "Employee") {
        if (!allocationData.assignedToId) {
          alert("Please select an employee.");
          return;
        }
        payload.assignedToId = allocationData.assignedToId;
        payload.division = allocationData.division;
      } else if (allocAssignmentType === "Department") {
        if (!allocDepartment) {
          alert("Please select/enter a department.");
          return;
        }
        payload.department = allocDepartment;
      } else if (allocAssignmentType === "Team") {
        if (!allocTeam) {
          alert("Please enter a team name.");
          return;
        }
        payload.team = allocTeam;
      } else if (allocAssignmentType === "Location") {
        if (!allocLocation) {
          alert("Please select a location.");
          return;
        }
        payload.location = allocLocation;
      }
      
      try {
        setLoading(true);
        await assetAPI.allocate(payload);
        alert("Quantity asset allocated successfully!");
        setAllocationFormOpen(false);
        setAllocateAsset(null);
        setAllocAssetSetSelectedId("");
        loadAssets();
        loadAllocations();
      } catch (err) {
        console.error("Error allocating quantity asset:", err);
        alert(err.response?.data?.error || "Error allocating quantity asset.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!allocAssetSetSelectedId) {
      alert("Please select an Asset Set to allocate.");
      return;
    }
    try {
      const compIds = Object.values(selectedComponents).filter(id => id !== "");
      await assetAPI.allocate({
        assetId: allocAssetSetSelectedId,
        assignedToId: allocationData.assignedToId,
        allocatedDate: allocationData.allocatedDate,
        division: allocationData.division,
        componentIds: compIds
      });
      alert("Asset allocated successfully!");
      setAllocationFormOpen(false);
      setAllocateAsset(null);
      setAllocAssetSetSelectedId("");
      setAllocCategorySelected("");
      setSelectedComponents({
        adapter: "",
        mouse: "",
        keyboard: "",
        headset: "",
        monitor: ""
      });
      setAllocationData({
        assignedToId: "",
        allocatedDate: new Date().toISOString().split("T")[0],
        division: ""
      });
      loadAssets();
      loadAllocations();
    } catch (err) {
      console.error("Error allocating asset:", err);
      alert(err.response?.data?.error || "Error allocating asset.");
    }
  };

  const handleDeallocate = async (allocationId) => {
    if (window.confirm("Are you sure you want to return this asset?")) {
      try {
        await assetAPI.returnAsset(allocationId, {
          returnDate: new Date().toISOString().split("T")[0]
        });
        alert("Asset returned successfully!");
        loadAssets();
        loadAllocations();
      } catch (err) {
        console.error("Error returning asset:", err);
        alert(err.response?.data?.error || "Error returning asset.");
      }
    }
  };

  const handleViewAssetFromAllocation = (al) => {
    const found = assets.find(ast => ast.assetId === al.assetId);
    if (found) {
      setViewAssetDetails(found);
    } else {
      setViewAssetDetails({
        assetId: al.assetId,
        category: al.category,
        brandName: al.brandName || "Unknown",
        version: al.version || "",
        serialNumber: al.serialNumber || (al.components?.[0]?.serialNumber) || "—",
        purchaseDate: al.allocatedDate || "—",
        condition: al.conditionOnAllocation || "Good",
        location: al.division || "Chennai Office",
        status: al.status,
        components: al.components || []
      });
    }
  };

  const handleDeallocateByAsset = async (assetDbId) => {
    const activeAlloc = allocations.find(al => al.asset?._id === assetDbId && al.status === "Assigned");
    if (activeAlloc) {
      await handleDeallocate(activeAlloc._id);
    } else {
      // Fallback
      const activeAllocById = allocations.find(al => al.asset === assetDbId && al.status === "Assigned");
      if (activeAllocById) {
        await handleDeallocate(activeAllocById._id);
      } else {
        alert("Active allocation record not found for this asset.");
      }
    }
  };

  const handleSaveAccessory = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        category: accessoryFormData.category,
        itemType: accessoryFormData.itemName.trim(),
        brandName: accessoryFormData.itemName.trim(),
        trackingType: "Quantity",
        totalQuantity: parseInt(accessoryFormData.quantity) || 1,
        location: accessoryFormData.location,
        remarks: accessoryFormData.remarks,
        status: "Available"
      };

      if (editingAccessory) {
        await assetAPI.update(editingAccessory._id, payload);
        alert("Office Accessory updated successfully!");
      } else {
        await assetAPI.create(payload);
        alert("Office Accessory added successfully!");
      }
      setAccessoryModalOpen(false);
      setEditingAccessory(null);
      setAccessoryFormData({
        category: "Furniture",
        itemName: "",
        quantity: 1,
        location: "Chennai Office",
        remarks: ""
      });
      loadAssets();
    } catch (err) {
      console.error("Error saving accessory:", err);
      alert(err.response?.data?.error || "Error saving Office Accessory.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditAccessoryClick = (acc) => {
    setEditingAccessory(acc);
    setAccessoryFormData({
      category: acc.category || "Furniture",
      itemName: acc.itemType || acc.brandName || "",
      quantity: acc.quantityDetails?.total || acc.totalQuantity || 1,
      location: acc.location || "Chennai Office",
      remarks: acc.remarks || ""
    });
    setAccessoryModalOpen(true);
  };



  const handleCreateRequestSubmit = async (e) => {
    e.preventDefault();
    const cat = newRequest.assetCategory || newRequest.category;
    const reqT = newRequest.requestType;
    const rsn = newRequest.reason;

    if (!cat || !reqT || !rsn || !rsn.trim()) {
      alert("All fields except Attachment are mandatory!");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("assetCategory", cat);
      formData.append("requestType", reqT);
      formData.append("reason", rsn.trim());
      if (newRequest.attachment) {
        formData.append("attachment", newRequest.attachment);
      }

      await assetAPI.createRequest(formData);
      alert("Asset Request submitted successfully!");
      setRequestFormOpen(false);
      setNewRequest({
        assetCategory: "Laptop",
        requestType: "New Asset Request",
        reason: "",
        attachment: null
      });
      loadRequests();
    } catch (err) {
      console.error("Error creating asset request:", err);
      alert(err.response?.data?.error || "Error submitting asset request.");
    }
  };

  const handleConfirmApprove = async (e) => {
    if (e) e.preventDefault();
    if (!approveModal) return;
    try {
      await assetAPI.approveRequest(approveModal.request._id, approveModal.remarks);
      alert(`Asset Request ${approveModal.request.requestNumber || approveModal.request.requestId} approved successfully!`);
      setApproveModal(null);
      loadRequests();
    } catch (err) {
      console.error("Error approving request:", err);
      alert(err.response?.data?.error || "Error approving request.");
    }
  };

  const handleConfirmReject = async (e) => {
    if (e) e.preventDefault();
    if (!rejectModal) return;
    try {
      await assetAPI.rejectRequest(rejectModal.request._id, rejectModal.remarks);
      alert(`Asset Request ${rejectModal.request.requestNumber || rejectModal.request.requestId} rejected.`);
      setRejectModal(null);
      loadRequests();
    } catch (err) {
      console.error("Error rejecting request:", err);
      alert(err.response?.data?.error || "Error rejecting request.");
    }
  };

  const handleConfirmAllocate = async (e) => {
    if (e) e.preventDefault();
    if (!allocateModal || !allocateModal.selectedAssetId) {
      alert("Please select an available asset to allocate!");
      return;
    }
    try {
      const compIds = Object.values(selectedComponents).filter(id => id !== "");
      await assetAPI.allocateAssetForRequest(allocateModal.request._id, {
        assetId: allocateModal.selectedAssetId,
        allocatedDate: allocateModal.allocatedDate,
        componentIds: compIds
      });
      alert(`Asset allocated successfully! Request updated to Completed.`);
      setAllocateModal(null);
      setSelectedComponents({
        adapter: "",
        mouse: "",
        keyboard: "",
        headset: "",
        monitor: ""
      });
      loadAssets();
      loadAllocations();
      loadRequests();
    } catch (err) {
      console.error("Error allocating asset for request:", err);
      alert(err.response?.data?.error || "Error allocating asset.");
    }
  };

  const handleCancelRequest = async (reqId, reqNum) => {
    if (window.confirm(`Are you sure you want to cancel request ${reqNum}?`)) {
      try {
        await assetAPI.cancelRequest(reqId);
        alert(`Request ${reqNum} has been cancelled.`);
        loadRequests();
      } catch (err) {
        console.error("Error cancelling request:", err);
        alert(err.response?.data?.error || "Error cancelling request.");
      }
    }
  };

  const handleSaveMaintenance = async (e) => {
    e.preventDefault();
    if (!maintenanceData.assetId) {
      alert("Please select an asset.");
      return;
    }
    
    // If quantity asset, validate quantity count
    const targetAsset = assets.find(a => a.assetId === maintenanceData.assetId);
    if (targetAsset && targetAsset.trackingType === "Quantity") {
      const available = targetAsset.quantityDetails?.available || 0;
      const mQty = parseInt(maintenanceData.quantity) || 1;
      if (mQty <= 0) {
        alert("Quantity must be greater than zero.");
        return;
      }
      if (mQty > available) {
        alert(`Cannot send ${mQty} units to maintenance. Only ${available} available.`);
        return;
      }
    }

    try {
      setLoading(true);
      await assetAPI.createMaintenance(maintenanceData);
      alert("Maintenance scheduled successfully!");
      setMaintenanceFormOpen(false);
      loadAssets();
      loadMaintenance();
    } catch (err) {
      console.error("Error creating maintenance log:", err);
      alert(err.response?.data?.error || "Error scheduling maintenance.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMaintenanceSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMntRecord) return;
    try {
      setLoading(true);
      await assetAPI.completeMaintenance(selectedMntRecord._id, {
        returnCondition: completeReturnCondition
      });
      alert("Maintenance record completed successfully!");
      setCompleteMntModalOpen(false);
      setSelectedMntRecord(null);
      loadAssets();
      loadMaintenance();
    } catch (err) {
      console.error("Error completing maintenance log:", err);
      alert(err.response?.data?.error || "Error completing maintenance.");
    } finally {
      setLoading(false);
    }
  };

  const handleExcelImportChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setExcelFileName(file.name);
    setExcelParsingError("");
    setExcelPreviewData([]);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        
        const validSheets = [
          { sheetName: "Laptop", category: "Laptop" },
          { sheetName: "Monitor", category: "Monitor" },
          { sheetName: "Desktop (CPU)", category: "Desktop / CPU" },
          { sheetName: "Adapter", category: "Adapter" },
          { sheetName: "Keyboard", category: "Keyboard" },
          { sheetName: "Mouse", category: "Mouse" },
          { sheetName: "Headset", category: "Headset" }
        ];
        
        const allParsedAssets = [];
        
        validSheets.forEach(({ sheetName, category }) => {
          const actualSheetName = workbook.SheetNames.find(
            name => name.trim().toLowerCase() === sheetName.toLowerCase()
          );
          
          if (!actualSheetName) return;
          
          const worksheet = workbook.Sheets[actualSheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          
          rawRows.forEach((row) => {
            const getVal = (colNames) => {
              const matchedKey = Object.keys(row).find(key => 
                colNames.some(cName => key.trim().toLowerCase() === cName.toLowerCase())
              );
              return matchedKey ? row[matchedKey].toString().trim() : "";
            };
            
            const assetId = getVal(["Asset ID", "AssetID"]);
            if (!assetId) return;
            
            const version = getVal(["Make/Model", "Make & Model", "Model", "Make / Model", "MakeModel"]);
            const brandName = getVal(["Brand Name", "Brand", "BrandName"]);
            const connectionType = getVal(["Connection Type", "Connection", "Type"]);
            
            const payloadRow = {
              assetId,
              category,
              brandName: brandName || (category === "Desktop / CPU" ? "HP" : "Caldim"),
              version: version || "Standard",
              serialNumber: getVal(["Serial Number", "Serial No", "SerialNumber", "Serial"]),
              purchaseDate: getVal(["Bio's Date", "Bios Date", "Purchase Date", "Date"]),
              status: getVal(["Status"]) || "Available",
              condition: getVal(["Condition"]) || "Good"
            };
            
            const ram = getVal(["RAM", "Memory"]);
            if (ram) payloadRow.ram = ram;
            
            const storage = getVal(["Storage", "Hard Disk", "Hard Drive", "HDD", "SSD"]);
            if (storage) payloadRow.hardDisk = storage;
            
            const processor = getVal(["Processor", "CPU Type", "CPU"]);
            if (processor) payloadRow.processor = processor;
            
            const os = getVal(["OS", "Operating System", "Platform"]);
            if (os) payloadRow.operatingSystem = os;
            
            const screenSize = getVal(["Screen Size", "ScreenSize", "Size"]);
            if (screenSize) payloadRow.screenSize = screenSize;
            
            const chargerPower = getVal(["Charger Power", "Power", "Watts"]);
            if (chargerPower) payloadRow.chargerPower = chargerPower;
            
            if (category === "Keyboard") payloadRow.keyboardType = connectionType || "Wired";
            if (category === "Mouse") payloadRow.mouseType = connectionType || "Wired";
            if (category === "Headset") payloadRow.headsetType = connectionType || "Wired";
            
            allParsedAssets.push(payloadRow);
          });
        });
        
        if (allParsedAssets.length === 0) {
          setExcelParsingError("No valid assets found in the matching sheets. Please verify the sheets and column headers.");
        } else {
          setExcelPreviewData(allParsedAssets);
        }
      } catch (err) {
        console.error("Excel parse error:", err);
        setExcelParsingError("Failed to parse workbook: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExcelImportSubmit = async (e) => {
    e.preventDefault();
    if (excelPreviewData.length === 0) return;
    try {
      setLoading(true);
      const res = await assetAPI.bulkImport(excelPreviewData);
      alert(res.data?.message || "Excel import completed successfully!");
      setExcelImportOpen(false);
      setExcelPreviewData([]);
      setExcelFileName("");
      loadAssets();
    } catch (err) {
      console.error("Error bulk importing assets:", err);
      alert(err.response?.data?.error || "Error importing assets.");
    } finally {
      setLoading(false);
    }
  };

  // Export functions
  const exportCSV = () => {
    const specHeaders = (fieldConfig.fields || []).filter(f => f.enabled).map(f => f.label);
    const headers = [
      "Asset ID", "Category", "Brand Name",
      ...specHeaders, "Seat No", "BIO's Date", "Condition", "Location", "Status"
    ];
    const rows = assets.map(a => {
      const specVals = (fieldConfig.fields || []).filter(f => f.enabled).map(f => a[f.key] || "");
      return [
        a.assetId, a.category, a.brandName,
        ...specVals, a.seatNo || "",
        a.purchaseDate, a.condition, a.location, a.status
      ];
    });
    const csvContent = [headers.join(","), ...rows.map(e => e.map(val => `"${val || ""}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Caldim_Asset_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcel = () => {
    // Filter to only individual assets
    const individualAssets = assets.filter(a => a.trackingType !== "Quantity");

    // Group assets by category
    const grouped = {};
    individualAssets.forEach(a => {
      const cat = a.category || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(a);
    });

    const workbook = XLSX.utils.book_new();

    // If there are no individual assets, create a single empty sheet
    if (individualAssets.length === 0) {
      const emptyWS = XLSX.utils.aoa_to_sheet([["No assets found"]]);
      XLSX.utils.book_append_sheet(workbook, emptyWS, "Empty");
      XLSX.writeFile(workbook, `Caldim_Asset_Report_${Date.now()}.xlsx`);
      return;
    }

    // Configured fields for specific categories as requested by the user
    const categoryConfig = {
      "Adapter": [
        { label: "Asset ID", key: "assetId" },
        { label: "Category", key: "category" },
        { label: "Brand Name", key: "brandName" },
        { label: "RAM", key: "ram" },
        { label: "Hard Disk / SSD", key: "hardDisk" },
        { label: "Charger / Power Adapter", key: "chargerPower" },
        { label: "Model Number / Version", key: "version" },
        { label: "Condition", key: "condition" },
        { label: "Location", key: "location" }
      ],
      "Mouse": [
        { label: "Asset ID", key: "assetId" },
        { label: "Category", key: "category" },
        { label: "Brand Name", key: "brandName" },
        { label: "RAM", key: "ram" },
        { label: "Hard Disk / SSD", key: "hardDisk" },
        { label: "Mouse Type", key: "mouseType" },
        { label: "Condition", key: "condition" },
        { label: "Location", key: "location" }
      ],
      "Laptop": [
        { label: "Asset ID", key: "assetId" },
        { label: "Category", key: "category" },
        { label: "Brand Name", key: "brandName" },
        { label: "Processor", key: "processor" },
        { label: "RAM", key: "ram" },
        { label: "Hard Disk / SSD", key: "hardDisk" },
        { label: "Screen Size", key: "screenSize" },
        { label: "Operating System", key: "operatingSystem" },
        { label: "BIO's Date", key: "purchaseDate" },
        { label: "Condition", key: "condition" },
        { label: "Location", key: "location" }
      ],
      "Desktop / CPU": [
        { label: "Asset ID", key: "assetId" },
        { label: "Category", key: "category" },
        { label: "Brand Name", key: "brandName" },
        { label: "Processor", key: "processor" },
        { label: "RAM", key: "ram" },
        { label: "Hard Disk / SSD", key: "hardDisk" },
        { label: "Operating System", key: "operatingSystem" },
        { label: "GPU / Graphics Card", key: "gpu" },
        { label: "Model Number / Version", key: "version" },
        { label: "Serial Number", key: "serialNumber" },
        { label: "BIO's Date", key: "purchaseDate" },
        { label: "Condition", key: "condition" },
        { label: "Location", key: "location" }
      ],
      "Keyboard": [
        { label: "Asset ID", key: "assetId" },
        { label: "Category", key: "category" },
        { label: "Brand Name", key: "brandName" },
        { label: "Keyboard Type", key: "keyboardType" },
        { label: "Serial Number", key: "serialNumber" },
        { label: "Condition", key: "condition" },
        { label: "Location", key: "location" }
      ]
    };

    // Build worksheets for each category
    Object.keys(grouped).forEach(catName => {
      const catAssets = grouped[catName];
      
      // Determine fields for this category based on configuration or fallback
      let fields = [];
      if (categoryConfig[catName]) {
        fields = categoryConfig[catName];
      } else {
        // Fallback fields configuration for other categories
        const catSpecFields = CATEGORY_FIELDS[catName] || (fieldConfig.fields || []).filter(f => f.enabled);
        fields = [
          { label: "Asset ID", key: "assetId" },
          { label: "Category", key: "category" },
          { label: "Brand Name", key: "brandName" },
          ...catSpecFields,
          { label: "Serial Number", key: "serialNumber" },
          { label: "BIO's Date", key: "purchaseDate" },
          { label: "Condition", key: "condition" },
          { label: "Location", key: "location" },
          { label: "Status", key: "status" }
        ];
      }

      // Headers
      const headers = fields.map(f => f.label);

      // Rows
      const rows = catAssets.map(a => {
        return fields.map(f => {
          // Special fallback mappings
          if (f.key === "chargerPower") {
            return a.chargerPower || a.charger || a.adapter || "";
          }
          return a[f.key] || "";
        });
      });

      // Construct Sheet
      const wsData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(wsData);

      // Header style: dark blue background, bold white text with a border
      const headerStyle = {
        fill: {
          fgColor: { rgb: "262760" }
        },
        font: {
          name: "Segoe UI",
          sz: 10,
          bold: true,
          color: { rgb: "FFFFFF" }
        },
        alignment: {
          vertical: "center",
          horizontal: "left"
        },
        border: {
          bottom: { style: "medium", color: { rgb: "F37021" } }
        }
      };

      // General data row style
      const dataStyle = {
        font: {
          name: "Segoe UI",
          sz: 9,
          color: { rgb: "333333" }
        },
        alignment: {
          vertical: "center",
          horizontal: "left"
        },
        border: {
          bottom: { style: "thin", color: { rgb: "E2E8F0" } }
        }
      };

      // Set widths for columns
      const colWidths = headers.map(() => ({ wch: 18 }));
      worksheet["!cols"] = colWidths;

      // Apply styles to cells
      const range = XLSX.utils.decode_range(worksheet["!ref"]);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cellRef]) continue;

          if (R === 0) {
            worksheet[cellRef].s = headerStyle;
          } else {
            worksheet[cellRef].s = dataStyle;
            
            // Color code the status text
            const cellValue = worksheet[cellRef].v;
            if (cellValue === "Available") {
              worksheet[cellRef].s = {
                ...dataStyle,
                font: { ...dataStyle.font, bold: true, color: { rgb: "059669" } }
              };
            } else if (cellValue === "Assigned") {
              worksheet[cellRef].s = {
                ...dataStyle,
                font: { ...dataStyle.font, bold: true, color: { rgb: "2563EB" } }
              };
            } else if (cellValue === "Under Maintenance") {
              worksheet[cellRef].s = {
                ...dataStyle,
                font: { ...dataStyle.font, bold: true, color: { rgb: "D97706" } }
              };
            }
          }
        }
      }

      // Add sheet name limited to 30 characters
      const sheetName = catName.substring(0, 30);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    XLSX.writeFile(workbook, `Caldim_Asset_Report_${Date.now()}.xlsx`);
  };

  const exportAccessoriesExcel = () => {
    // Array of arrays format for worksheet construction
    const aoa = [
      ["CALDIM OFFICE ACCESSORIES SUMMARY REPORT", "", "", "", "", ""],
      ["", "", "", "", "", ""],
      ["CATEGORY WISE QUANTITIES SUMMARY", "", "", "", "", ""],
      ["Category", "Total Quantity", "", "", "", ""],
      ...accessoryCategories.map(cat => [cat, accessoryStats[cat] || 0, "", "", "", ""]),
      ["", "", "", "", "", ""],
      ["DETAILED ACCESSORIES INVENTORY LIST", "", "", "", "", ""],
      ["S.No", "Category", "Item Name", "Quantity", "Location", "Remarks"]
    ];

    // Append detail records to the aoa list
    filteredAccessories.forEach((a, idx) => {
      aoa.push([
        idx + 1,
        a.category || "",
        a.itemType || a.itemName || "",
        a.quantityDetails?.total ?? a.totalQuantity ?? a.quantity ?? 0,
        a.location || "",
        a.remarks || ""
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();

    // Set merges for title cells
    worksheet["!merges"] = [
      // Merge main title: row 0, col 0 to col 5 (A1 to F1)
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      // Merge category summary title: row 2, col 0 to col 5 (A3 to F3)
      { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
      // Merge detail inventory title: row 13, col 0 to col 5 (A14 to F14)
      { s: { r: 13, c: 0 }, e: { r: 13, c: 5 } }
    ];

    // Set column widths
    const colWidths = [
      { wch: 10 }, // S.No
      { wch: 22 }, // Category
      { wch: 25 }, // Item Name
      { wch: 15 }, // Quantity
      { wch: 20 }, // Location
      { wch: 30 }  // Remarks
    ];
    worksheet["!cols"] = colWidths;

    // Apply styles to cell ranges
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellRef]) continue;

        if (R === 0) {
          // Main Title row: Dark Blue background, bold white text
          worksheet[cellRef].s = {
            fill: { fgColor: { rgb: "262760" } },
            font: { name: "Segoe UI", sz: 12, bold: true, color: { rgb: "FFFFFF" } },
            alignment: { vertical: "center", horizontal: "center" }
          };
        } else if (R === 2 || R === 13) {
          // Section header rows: Orange background, bold white text
          worksheet[cellRef].s = {
            fill: { fgColor: { rgb: "F37021" } },
            font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
            alignment: { vertical: "center", horizontal: "center" }
          };
        } else if (R === 3) {
          // Summary table headers
          worksheet[cellRef].s = {
            fill: { fgColor: { rgb: "F1F5F9" } },
            font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "334155" } },
            alignment: { vertical: "center", horizontal: C === 1 ? "right" : "left" },
            border: { bottom: { style: "medium", color: { rgb: "E2E8F0" } } }
          };
        } else if (R >= 4 && R <= 11) {
          // Summary data rows
          worksheet[cellRef].s = {
            font: { name: "Segoe UI", sz: 9, color: { rgb: "333333" } },
            alignment: { vertical: "center", horizontal: C === 1 ? "right" : "left" },
            border: { bottom: { style: "thin", color: { rgb: "F1F5F9" } } }
          };
          if (C === 1 && Number(worksheet[cellRef].v) > 0) {
            worksheet[cellRef].s.font = { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "262760" } };
          }
        } else if (R === 14) {
          // Detail table headers: Dark Blue background, bold white text
          worksheet[cellRef].s = {
            fill: { fgColor: { rgb: "262760" } },
            font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
            alignment: { vertical: "center", horizontal: C === 3 ? "right" : "left" },
            border: { bottom: { style: "medium", color: { rgb: "F37021" } } }
          };
        } else if (R >= 15) {
          // Detail data rows
          worksheet[cellRef].s = {
            font: { name: "Segoe UI", sz: 9, color: { rgb: "333333" } },
            alignment: { vertical: "center", horizontal: C === 3 ? "right" : "left" },
            border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } }
          };
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, "Office Accessories");
    XLSX.writeFile(workbook, `Caldim_Accessories_Report_${Date.now()}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");
    doc.text("Caldim Engineering Private Limited - Asset Report", 14, 15);
    const specHeaders = (fieldConfig.fields || []).filter(f => f.enabled).map(f => f.label);
    const headers = [[
      "Asset ID", "Category", "Brand Name",
      ...specHeaders, "Seat No", "BIO's Date", "Condition", "Location", "Status"
    ]];
    const rows = assets.map(a => {
      const specVals = (fieldConfig.fields || []).filter(f => f.enabled).map(f => a[f.key] || "");
      return [
        a.assetId, a.category, a.brandName,
        ...specVals, a.seatNo || "",
        a.purchaseDate, a.condition, a.location, a.status
      ];
    });
    doc.autoTable({
      head: headers,
      body: rows,
      startY: 22,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [38, 39, 96] }
    });
    doc.save(`Caldim_Asset_Report_${Date.now()}.pdf`);
  };

  return (
    <div className="p-6 relative z-10 min-h-screen text-slate-800 font-sans">
      {/* Tabs navigation */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-thin">


        {currentRole !== "Employee" && (
          <>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === "dashboard"
                ? "border-[#f37021] text-[#262760]"
                : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab("master")}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === "master"
                ? "border-[#f37021] text-[#262760]"
                : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              <Briefcase className="h-4 w-4" />
              Asset Master
            </button>

            <button
              onClick={() => setActiveTab("allocation")}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === "allocation"
                ? "border-[#f37021] text-[#262760]"
                : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              <UserCheck className="h-4 w-4" />
              Allocations
            </button>

            <button
              onClick={() => setActiveTab("accessories")}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === "accessories"
                ? "border-[#f37021] text-[#262760]"
                : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              <Layers className="h-4 w-4" />
              Office Accessories
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab("requests")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === "requests"
            ? "border-[#f37021] text-[#262760]"
            : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
        >
          <Bell className="h-4 w-4" />
          Asset Requests
        </button>

        {currentRole !== "Employee" && (
          <button
            onClick={() => setActiveTab("exit")}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === "exit"
              ? "border-[#f37021] text-[#262760]"
              : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            <LogOut className="h-4 w-4" />
            Exit Clearance
          </button>
        )}

        {isITOrSuperAdmin && (
          <button
            onClick={() => setActiveTab("extensionMaster")}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === "extensionMaster"
              ? "border-[#f37021] text-[#262760]"
              : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            <Phone className="h-4 w-4 text-[#f37021]" />
            Extension Master
          </button>
        )}
      </div>

      {loading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-center text-sm font-semibold mb-6 animate-pulse">
          Syncing with MongoDB Server Database...
        </div>
      )}

      {/* ======================================================== TAB CONTENT ======================================================== */}

      {/* OFFICE ACCESSORIES TAB */}
      {activeTab === "accessories" && currentRole !== "Employee" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
          <div className="flex justify-end gap-2 mb-6">
              <button
                onClick={exportAccessoriesExcel}
                className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 text-sm hover:bg-slate-50 font-bold bg-white text-slate-700"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Excel
              </button>
              <button
                onClick={() => {
                  setEditingAccessory(null);
                  setAccessoryFormData({
                    category: "Furniture",
                    itemName: "",
                    quantity: 1,
                    location: "Chennai Office",
                    remarks: ""
                  });
                  setAccessoryModalOpen(true);
                }}
                className="flex items-center gap-2 bg-[#262760] text-white rounded-xl px-4 py-2.5 text-sm hover:bg-[#1a1c43] font-bold"
              >
                <Plus className="h-4 w-4" />
                Add Office Accessory
              </button>
            </div>

          {/* Category Dashboard Cards */}
          <div className="flex flex-wrap gap-4 mb-8">
            {accessoryCategories.map(catName => {
              const CAT_ICONS = {
                "Furniture": { icon: Package, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
                "Electrical / Utility": { icon: Wrench, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
                "Kitchen / Pantry": { icon: Coffee, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
                "Safety": { icon: Shield, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
                "Security / Access": { icon: Key, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
                "Facility": { icon: Building2, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
                "Waste Management": { icon: Trash2, color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-100" },
                "Other": { icon: Layers, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100" }
              };
              const catConfig = CAT_ICONS[catName] || { icon: Layers, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" };
              const IconComp = catConfig.icon;
              const count = accessoryStats[catName] || 0;

              return (
                <div
                  key={catName}
                  className={`relative group flex-1 min-w-[130px] flex flex-col items-center justify-center p-4 rounded-2xl border ${catConfig.border} ${catConfig.bg} transition-all duration-300 hover:shadow-md hover:scale-[1.03] text-center`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAccessoryCategory(catName);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:text-rose-700 bg-white rounded-full shadow transition-opacity"
                    title={`Delete category "${catName}"`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <div className={`p-2.5 rounded-xl bg-white shadow-sm mb-3 ${catConfig.color}`}>
                    <IconComp className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 line-clamp-1" title={catName}>
                    {catName}
                  </span>
                  <span className="text-lg font-bold text-slate-800 mt-1">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search accessories by item, location, remarks..."
                value={accessorySearchQuery}
                onChange={(e) => setAccessorySearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-xl w-full outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            
            <select
              value={accessoryCategoryFilter}
              onChange={(e) => setAccessoryCategoryFilter(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700"
            >
              <option value="All">All Categories</option>
              {accessoryCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Grid Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#262760] text-white font-sans uppercase text-[11px] tracking-wider font-extrabold">
                  <th className="px-6 py-4 text-white text-center w-16">S.No</th>
                  <th className="px-6 py-4 text-white">Category</th>
                  <th className="px-6 py-4 text-white">Item</th>
                  <th className="px-6 py-4 text-white">Quantity</th>
                  <th className="px-6 py-4 text-white">Location</th>
                  <th className="px-6 py-4 text-white text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans font-semibold text-slate-700">
                {filteredAccessories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic">
                      No office accessories found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredAccessories.map((item, idx) => (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-center font-medium text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-full font-bold">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#262760] font-bold text-sm">
                        {item.itemType || item.brandName || "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-900 font-black text-sm">
                        {item.quantityDetails?.total ?? item.totalQuantity ?? 0}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium text-xs">
                        {item.location || "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditAccessoryClick(item)}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(item._id)}
                            className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EXTENSION MASTER TAB */}
      {activeTab === "extensionMaster" && <ExtensionMaster />}



      {/* DASHBOARD TAB */}
      {activeTab === "dashboard" && currentRole !== "Employee" && (
        <div className="space-y-8 animate-fade-in font-sans mb-8">
          
          {/* Top Hero Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: IT Assets (Asset Master) */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-850 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                <Briefcase className="h-28 w-28 text-white" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-95">Total IT Assets</p>
              <p className="text-4xl font-black mt-2">{stats.totalIndividual}</p>
              <div className="mt-4 text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full inline-block backdrop-blur-sm">
                Asset Master Inventory
              </div>
            </div>

            {/* Card 2: Office Accessories */}
            <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                <Layers className="h-28 w-28 text-white" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-95">Total Office Accessories</p>
              <p className="text-4xl font-black mt-2">{stats.totalQuantitySum}</p>
              <div className="mt-4 text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full inline-block backdrop-blur-sm">
                Office Accessories Count
              </div>
            </div>

            {/* Card 3: Assigned / In Use */}
            <div className="bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                <UserCheck className="h-28 w-28 text-white" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-95">Currently Assigned / In Use</p>
              <p className="text-4xl font-black mt-2">{stats.inUseSum}</p>
              <div className="mt-4 text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full inline-block backdrop-blur-sm">
                Active asset allocations
              </div>
            </div>

            {/* Card 4: Available */}
            <div className="bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-700 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                <CheckCircle className="h-28 w-28 text-white" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-95">Available for Allocation</p>
              <p className="text-4xl font-black mt-2">{stats.availableSum}</p>
              <div className="mt-4 text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full inline-block backdrop-blur-sm">
                Ready for assignment
              </div>
            </div>
          </div>

          {/* Secondary Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exit clearance requests</p>
                <p className="text-lg font-extrabold text-slate-800 mt-0.5">{stats.pendingExitClearances}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-3">
              <div className="p-2.5 bg-violet-50 text-violet-600 rounded-lg">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Asset requests</p>
                <p className="text-lg font-extrabold text-slate-800 mt-0.5">{stats.pendingRequests}</p>
              </div>
            </div>
          </div>

          {/* Graphical Distributions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Asset Categories Distribution */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
              <h3 className="text-xs font-bold text-[#262760] uppercase tracking-wider mb-2">IT Hardware Distribution</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                {(() => {
                  const itCats = ["Laptop", "Desktop / CPU", "Adapter", "Charger", "Mouse", "Keyboard", "Headset", "Monitor"];
                  const totalIT = assets.filter(a => itCats.includes(a.category) && a.trackingType !== "Quantity").length;

                  return itCats.map(cat => {
                    const count = assets.filter(a => a.category === cat && a.trackingType !== "Quantity").length;
                    const percent = totalIT > 0 ? Math.round((count / totalIT) * 100) : 0;
                    
                    const barColors = {
                      "Laptop": "bg-indigo-600",
                      "Desktop / CPU": "bg-blue-600",
                      "Adapter": "bg-amber-500",
                      "Charger": "bg-orange-500",
                      "Mouse": "bg-emerald-500",
                      "Keyboard": "bg-teal-500",
                      "Headset": "bg-pink-500",
                      "Monitor": "bg-violet-500"
                    };
                    const colorClass = barColors[cat] || "bg-slate-500";

                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-600">{cat}</span>
                          <span className="font-mono font-bold text-slate-500">{count} units ({percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className={`h-full ${colorClass}`} style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Location & Status Cards Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-xs font-bold text-[#262760] uppercase tracking-wider mb-3">Asset Locations</h3>
                <div className="space-y-2.5 text-xs">
                  {(() => {
                    const locations = ["Chennai Office", "Hosur Office"];
                    return locations.map(loc => {
                      const count = assets.filter(a => a.location === loc).length;
                      return (
                        <div key={loc} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-150">
                          <span className="font-bold text-slate-700">{loc}</span>
                          <span className="font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg shadow-sm">{count} units</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-[#262760] uppercase tracking-wider mb-3">Accessories Quantities</h3>
                <div className="max-h-[175px] overflow-y-auto pr-1 space-y-2 text-xs scrollbar-thin">
                  {accessoryCategories.map(cat => {
                    const qty = accessoryStats[cat] || 0;
                    return (
                      <div key={cat} className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-100">
                        <span className="font-semibold text-slate-500">{cat}</span>
                        <span className="font-bold text-[#262760]">{qty} pcs</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}



      {/* ASSET MASTER TAB */}
      {activeTab === "master" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col gap-3 mb-6">
            {/* Search + Action row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-1 gap-2 w-full">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by ID, Category, Model, Division..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-xl w-full outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
              <button
                onClick={exportExcel}
                className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 text-sm hover:bg-slate-50 font-bold"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Excel
              </button>

              <button
                onClick={() => {
                  setSelectedAsset(null);
                  setNewAsset({
                    assetId: "",
                    category: "Laptop",
                    brandName: "",
                    processor: "",
                    version: "",
                    ram: "8 GB",
                    hardDisk: "512 GB SSD",
                    seatNo: "",
                    purchaseDate: "",
                    condition: "New",
                    location: "Chennai Office",
                    status: "Available"
                  });
                  setAssetFormOpen(true);
                }}
                className="flex items-center gap-2 bg-[#262760] text-white rounded-xl px-4 py-2 text-sm hover:bg-[#1c1d47] font-bold"
              >
                <Plus className="h-4 w-4" />
                Add Asset
              </button>
              <button
                type="button"
                onClick={() => {
                  setExcelFileName("");
                  setExcelParsingError("");
                  setExcelPreviewData([]);
                  setExcelImportOpen(true);
                }}
                className="flex items-center gap-2 border border-green-600 text-green-700 bg-green-50 rounded-xl px-4 py-2 text-sm hover:bg-green-100 font-bold"
              >
                <Upload className="h-4 w-4" />
                Import Excel
              </button>
              <button
                type="button"
                onClick={() => {
                  setAllocateAsset(null);
                  setAllocCategorySelected("");
                  setAllocAssetSetSelectedId("");
                  setSelectedComponents({
                    adapter: "",
                    mouse: "",
                    keyboard: "",
                    headset: "",
                    monitor: ""
                  });
                  setAllocationData({
                    assignedToId: "",
                    allocatedDate: new Date().toISOString().split("T")[0],
                    division: ""
                  });
                  setAllocationFormOpen(true);
                }}
                className="flex items-center gap-2 bg-green-700 text-white rounded-xl px-4 py-2 text-sm hover:bg-green-800 font-bold"
              >
                <UserCheck className="h-4 w-4" />
                Assign Set
              </button>
              </div>
            </div>
          </div>

          {/* ── Colorful Category Tab Bar ── */}
          {(() => {
            const TAB_COLORS = [
              { bg: "bg-[#262760]", activeBg: "bg-[#262760]", border: "border-[#262760]", text: "text-[#262760]", activeBadge: "bg-white/20 text-white" },
              { bg: "bg-blue-600",  activeBg: "bg-blue-600",  border: "border-blue-600",  text: "text-blue-600",  activeBadge: "bg-white/20 text-white" },
              { bg: "bg-emerald-600", activeBg: "bg-emerald-600", border: "border-emerald-600", text: "text-emerald-700", activeBadge: "bg-white/20 text-white" },
              { bg: "bg-violet-600", activeBg: "bg-violet-600", border: "border-violet-600", text: "text-violet-700", activeBadge: "bg-white/20 text-white" },
              { bg: "bg-orange-500", activeBg: "bg-orange-500", border: "border-orange-500", text: "text-orange-600", activeBadge: "bg-white/20 text-white" },
              { bg: "bg-rose-600",   activeBg: "bg-rose-600",   border: "border-rose-600",   text: "text-rose-600",   activeBadge: "bg-white/20 text-white" },
              { bg: "bg-teal-600",   activeBg: "bg-teal-600",   border: "border-teal-600",   text: "text-teal-700",   activeBadge: "bg-white/20 text-white" },
              { bg: "bg-pink-600",   activeBg: "bg-pink-600",   border: "border-pink-600",   text: "text-pink-600",   activeBadge: "bg-white/20 text-white" },
              { bg: "bg-amber-500",  activeBg: "bg-amber-500",  border: "border-amber-500",  text: "text-amber-600",  activeBadge: "bg-white/20 text-white" },
              { bg: "bg-cyan-600",   activeBg: "bg-cyan-600",   border: "border-cyan-600",   text: "text-cyan-700",   activeBadge: "bg-white/20 text-white" },
            ];
            const allCount = assets.length;
            const tabs = [
              { name: "All", count: allCount, color: TAB_COLORS[0] },
              ...categories.map((c, i) => ({
                name: c.name,
                count: (assets || []).filter(a => a.category === c.name).length,
                color: TAB_COLORS[(i + 1) % TAB_COLORS.length]
              }))
            ];
            return (
              <div className="overflow-x-auto pb-1 mb-4">
                <div className="flex gap-2 min-w-max">
                  {tabs.map(tab => {
                    const isActive = categoryFilter === tab.name;
                    return (
                      <button
                        key={tab.name}
                        type="button"
                        onClick={() => setCategoryFilter(tab.name)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all duration-200 whitespace-nowrap shadow-sm
                          ${isActive
                            ? `${tab.color.activeBg} text-white border-transparent shadow-md scale-[1.03]`
                            : `bg-white ${tab.color.text} ${tab.color.border} hover:opacity-80`
                          }`}
                      >
                        {tab.name}
                        <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black
                          ${isActive ? tab.color.activeBadge : `${tab.color.bg} text-white`}`}>
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[1300px]">
              <thead>
                <tr className="bg-[#262760] text-white">
                  <th className="p-4 font-bold text-white text-center w-12">S.No</th>
                  <th className="p-4 font-bold text-white">Asset ID</th>
                  <th className="p-4 font-bold text-white">Category</th>
                  <th className="p-4 font-bold text-white">Brand Name</th>
                  {activeEnteredFields.map(f => (
                    <th key={f.key} className="p-4 font-bold text-white">{f.label}</th>
                  ))}
                  {showBiosDate && <th className="p-4 font-bold text-white">BIO's Date</th>}
                  <th className="p-4 font-bold text-white">Condition</th>
                  <th className="p-4 font-bold text-white">Location</th>
                  <th className="p-4 font-bold text-white">Status</th>
                  <th className="p-4 font-bold text-white text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={colSpanCount} className="p-8 text-center text-slate-400 font-medium">No assets matching the filters.</td>
                  </tr>
                ) : filteredAssets.map((asset, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/55 transition-colors">
                    <td className="p-4 text-center font-medium text-slate-500">{idx + 1}</td>
                    <td className="p-4">
                      {asset.trackingType === "Quantity" ? (
                        <>
                          <span className="font-mono font-bold text-teal-700">{asset.assetId}</span>
                          <span className="ml-1.5 text-[9px] bg-teal-50 text-teal-700 px-1 py-0.5 rounded font-black uppercase">Quantity</span>
                        </>
                      ) : (
                        <>
                          <span className="font-mono font-bold text-[#262760]">{asset.assetId}</span>
                          {asset.components && asset.components.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {asset.components.map(comp => (
                                <span key={comp._id} className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 rounded px-1.5 py-0.5 font-sans whitespace-nowrap" title={`S/N: ${comp.serialNumber || 'N/A'}`}>
                                  {comp.category}: {comp.assetId}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="p-4">{asset.category}</td>
                    <td className="p-4">
                      {asset.trackingType === "Quantity" ? (
                        <div>
                          <span className="font-semibold text-slate-800">{asset.brandName || "—"}</span>
                          {asset.itemType && <div className="text-xs text-slate-400 font-medium mt-0.5">{asset.itemType}</div>}
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-800">{asset.brandName}</span>
                      )}
                    </td>
                    {activeEnteredFields.map(f => (
                      <td key={f.key} className="p-4">{asset[f.key] || "—"}</td>
                    ))}
                    {showBiosDate && (
                      <td className="p-4">{!["Adapter", "Keyboard", "Mouse"].includes(asset.category) ? (asset.purchaseDate || "—") : "—"}</td>
                    )}
                    <td className="p-4">
                      {asset.trackingType === "Quantity" ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800">
                          Bulk
                        </span>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${asset.condition === "New" || asset.condition === "Excellent" || asset.condition === "Good"
                          ? "bg-slate-100 text-slate-750"
                          : "bg-amber-100 text-amber-700"
                          }`}>
                          {asset.condition}
                        </span>
                      )}
                    </td>
                    <td className="p-4">{asset.location}</td>
                    <td className="p-4">
                      {asset.trackingType === "Quantity" ? (
                        <div className="flex flex-col gap-0.5 text-[11px] font-bold text-slate-600 bg-slate-50 border rounded-lg p-2 font-mono">
                          <div>Total: {asset.quantityDetails?.total || 0}</div>
                          <div className="text-emerald-600">Avail: {asset.quantityDetails?.available || 0}</div>
                          <div className="text-orange-650">In Use: {asset.quantityDetails?.inUse || 0}</div>
                          <div className="text-amber-600">Maint: {asset.quantityDetails?.maintenance || 0}</div>
                        </div>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${asset.status === "Assigned"
                          ? "bg-green-150 text-green-700"
                          : asset.status === "Available"
                            ? "bg-blue-150 text-blue-700"
                            : asset.status === "Under Maintenance"
                              ? "bg-amber-150 text-amber-700"
                              : "bg-red-150 text-red-700"
                          }`}>
                          {asset.status}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 justify-center">
                        {asset.trackingType === "Quantity" ? (
                          (asset.quantityDetails?.available || 0) > 0 && (
                            <button
                              onClick={() => {
                                setAllocateAsset(asset);
                                setAllocCategorySelected(asset.category);
                                setAllocAssetSetSelectedId(asset._id);
                                setAllocTrackingType("Quantity");
                                setAllocAssignmentType("Employee");
                                setAllocDepartment("");
                                setAllocTeam("");
                                setAllocLocation("");
                                setAllocQuantity(1);
                                setAllocationFormOpen(true);
                              }}
                              title="Assign Quantity Asset"
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg font-bold text-xs flex items-center gap-1 border border-green-200 shadow-sm"
                            >
                              Assign
                            </button>
                          )
                        ) : (
                          (asset.category === "Laptop" || asset.category === "Desktop / CPU") ? (
                            <>
                              {asset.status !== "Assigned" && (
                                <button
                                  onClick={() => {
                                    setAllocateAsset(asset);
                                    setAllocCategorySelected(asset.category);
                                    setAllocAssetSetSelectedId(asset._id);
                                    setAllocTrackingType("Individual");
                                    setAllocAssignmentType("Employee");
                                    setSelectedComponents({
                                      adapter: "",
                                      mouse: "",
                                      keyboard: "",
                                      headset: "",
                                      monitor: ""
                                    });
                                    setAllocationFormOpen(true);
                                  }}
                                  title="Assign to Employee"
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg font-bold text-xs flex items-center gap-1 border border-green-200"
                                >
                                  Assign
                                </button>
                              )}
                              {asset.status === "Assigned" && (
                                <button
                                  onClick={() => handleDeallocateByAsset(asset._id)}
                                  title="Deallocate Asset"
                                  className="p-1.5 text-red-600 hover:bg-red-55 rounded-lg font-bold text-xs flex items-center gap-1 border border-red-200"
                                >
                                  Return
                                </button>
                              )}
                            </>
                          ) : null
                        )}
                        <button
                          onClick={() => setViewAssetDetails(asset)}
                          title="View Details"
                          className="p-1.5 text-slate-600 hover:bg-slate-50 rounded-lg"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditAsset(asset)}
                          title="Edit"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAsset(asset._id)}
                          title="Delete"
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ALLOCATIONS TAB */}
      {activeTab === "allocation" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-[#262760] mb-4">Asset Allocation History</h2>

          {/* Allocation Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Asset ID, Category, Brand, Employee..."
                value={allocSearch}
                onChange={(e) => setAllocSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-xl w-full text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Category:</span>
              <select
                value={allocCategory}
                onChange={(e) => setAllocCategory(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Categories</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Division Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Division:</span>
              <select
                value={allocDivision}
                onChange={(e) => setAllocDivision(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                {uniqueAllocDivisions.map(div => (
                  <option key={div} value={div}>{div === "All" ? "All Divisions" : div}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Status:</span>
              <select
                value={allocStatus}
                onChange={(e) => setAllocStatus(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Statuses</option>
                <option value="Assigned">Assigned</option>
                <option value="Returned">Returned</option>
              </select>
            </div>

            {/* Reset Filters */}
            {(allocSearch !== "" || allocStatus !== "All" || allocCategory !== "All" || allocDivision !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setAllocSearch("");
                  setAllocStatus("All");
                  setAllocCategory("All");
                  setAllocDivision("All");
                }}
                className="px-4 py-2 text-xs font-bold text-[#262760] hover:text-white border border-[#262760] hover:bg-[#262760] rounded-xl transition-all"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#262760] text-white">
                  <th className="p-4 font-bold text-white text-center w-12">S.No</th>
                  <th className="p-4 font-bold text-white">Asset ID</th>
                  <th className="p-4 font-bold text-white">Asset Name</th>
                  <th className="p-4 font-bold text-white">Allocated To</th>
                  <th className="p-4 font-bold text-white">Division</th>
                  <th className="p-4 font-bold text-white">Allocation Date</th>
                  <th className="p-4 font-bold text-white">Return Date</th>
                  <th className="p-4 font-bold text-white">Status</th>
                  <th className="p-4 font-bold text-white text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAllocations.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-slate-400 font-medium">No allocation records match the filters.</td>
                  </tr>
                ) : filteredAllocations.map((al, idx) => (
                  <tr key={idx}>
                    <td className="p-4 text-center font-medium text-slate-500">{idx + 1}</td>
                    <td className="p-4">
                      <span className="font-mono font-bold text-slate-700">{al.assetId}</span>
                      {al.components && al.components.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1 font-sans">
                          {al.components.map((comp, cIdx) => (
                            <span key={cIdx} className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 rounded px-1.5 py-0.5 whitespace-nowrap" title={`S/N: ${comp.serialNumber || 'N/A'}`}>
                              {comp.category}: {comp.assetId}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-slate-805">{al.category} ({al.brandName})</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold">{al.employeeName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{al.employeeCode}</span>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-800">{al.division || "—"}</td>
                    <td className="p-4">{al.allocatedDate || "N/A"}</td>
                    <td className="p-4">{al.returnDate || "-"}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${al.status === "Assigned" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                        }`}>
                        {al.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {/* View Button — always visible */}
                        <button
                          onClick={() => handleViewAssetFromAllocation(al)}
                          title="View Asset Details"
                          className="p-1.5 border border-slate-200 bg-slate-50 text-slate-600 hover:bg-[#262760] hover:text-white hover:border-[#262760] rounded-lg transition-all"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Return button (only for Assigned) */}
                        {al.status === "Assigned" ? (
                          <>
                            <button
                              onClick={() => handleDeallocate(al._id)}
                              className="px-3 py-1.5 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold"
                            >
                              Return
                            </button>
                            {getMissingAccessories(al).length > 0 && (
                              <button
                                onClick={() => handleOpenAddAccessoryModal(al)}
                                className="px-3 py-1.5 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all"
                                title="Add missing accessories to this allocation"
                              >
                                + Add Accessory
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Returned</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* ASSET HANDOVER TAB */}
      {activeTab === "handover" && currentRole !== "Employee" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          {/* Sub Header & Sub Tabs Toggle */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-[#262760]">Asset Handover Management</h2>
              <p className="text-xs text-slate-500 font-medium">Verify & collect company assets from employees upon return or exit</p>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => setHandoverSubTab("queue")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${handoverSubTab === "queue"
                  ? "bg-[#262760] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Assigned Assets Queue ({allocations.filter(al => al.status === "Assigned").length})
              </button>
              <button
                type="button"
                onClick={() => setHandoverSubTab("history")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${handoverSubTab === "history"
                  ? "bg-[#262760] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Handover History ({handoverHistory.length})
              </button>
            </div>
          </div>

          {/* Search & Filters Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Employee Name, Employee ID, Asset ID..."
                  value={handoverSearch}
                  onChange={(e) => setHandoverSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-xl w-full text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Condition Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Condition:</span>
                <select
                  value={handoverConditionFilter}
                  onChange={(e) => setHandoverConditionFilter(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Conditions</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Minor Damage">Minor Damage</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              {/* Department/Division Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Department:</span>
                <select
                  value={handoverDeptFilter}
                  onChange={(e) => setHandoverDeptFilter(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {uniqueDivisionsForFilter.map(d => (
                    <option key={d} value={d}>{d === "All" ? "All Departments" : d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* VIEW 1: ASSIGNED ASSETS QUEUE */}
          {handoverSubTab === "queue" && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#262760] text-white">
                    <th className="p-4 font-bold text-white text-center w-12">S.No</th>
                    <th className="p-4 font-bold text-white">Exit Request No</th>
                    <th className="p-4 font-bold text-white">Employee ID</th>
                    <th className="p-4 font-bold text-white">Employee Name</th>
                    <th className="p-4 font-bold text-white">Department</th>
                    <th className="p-4 font-bold text-white">Asset ID</th>
                    <th className="p-4 font-bold text-white">Asset Category</th>
                    <th className="p-4 font-bold text-white">Brand Name</th>
                    <th className="p-4 font-bold text-white">Allocation Date</th>
                    <th className="p-4 font-bold text-white">Exit Date</th>
                    <th className="p-4 font-bold text-white">Handover Status</th>
                    <th className="p-4 font-bold text-white text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHandoverQueue.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="p-8 text-center text-slate-400 font-medium">
                        No assigned assets currently pending handover matching the filters.
                      </td>
                    </tr>
                  ) : filteredHandoverQueue.map((al, idx) => (
                    <tr key={al._id || idx} className="hover:bg-slate-50/55 transition-colors">
                      <td className="p-4 text-center font-medium text-slate-500">{idx + 1}</td>
                      <td className="p-4 font-mono font-bold text-indigo-700">{al.exitRequestNumber || "-"}</td>
                      <td className="p-4 font-mono font-semibold text-slate-600">{al.employeeCode || al.employeeId}</td>
                      <td className="p-4 font-bold text-slate-700">{al.employeeName}</td>
                      <td className="p-4">{al.department || al.division || "SDS"}</td>
                      <td className="p-4 font-mono font-bold text-[#262760]">{al.assetId}</td>
                      <td className="p-4 font-semibold text-slate-800">{al.category || (al.asset && al.asset.category) || "Asset"}</td>
                      <td className="p-4">{al.brandName || (al.asset && al.asset.brandName) || "N/A"}</td>
                      <td className="p-4 font-mono text-xs">{al.allocationDate || al.allocatedDate || "N/A"}</td>
                      <td className="p-4 font-mono text-xs text-slate-600">{al.proposedLastWorkingDay || "-"}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                          {al.status === "Pending" ? "Pending" : (al.handoverStatus || "Pending")}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => {
                            setHandoverModal(al);
                            setHandoverData({
                              handoverDate: new Date().toISOString().split("T")[0],
                              condition: (al.asset && al.asset.condition) || al.condition || "Good",
                              remarks: ""
                            });
                          }}
                          className="px-4 py-1.5 bg-[#262760] hover:bg-[#1a1c43] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1 mx-auto whitespace-nowrap"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Complete Handover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 2: HANDOVER HISTORY */}
          {handoverSubTab === "history" && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#262760] text-white">
                    <th className="p-4 font-bold text-white text-center w-12">S.No</th>
                    <th className="p-4 font-bold text-white">Asset ID</th>
                    <th className="p-4 font-bold text-white">Employee Name</th>
                    <th className="p-4 font-bold text-white">Employee ID</th>
                    <th className="p-4 font-bold text-white">Handover Date</th>
                    <th className="p-4 font-bold text-white">Condition</th>
                    <th className="p-4 font-bold text-white">Verified By</th>
                    <th className="p-4 font-bold text-white">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHandoverHistory.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400 font-medium">
                        No handover history records found matching the filters.
                      </td>
                    </tr>
                  ) : filteredHandoverHistory.map((ho, idx) => (
                    <tr key={ho._id || idx} className="hover:bg-slate-50/55 transition-colors">
                      <td className="p-4 text-center font-medium text-slate-500">{idx + 1}</td>
                      <td className="p-4 font-mono font-bold text-[#262760]">{ho.assetId}</td>
                      <td className="p-4 font-bold text-slate-700">{ho.employeeName}</td>
                      <td className="p-4 font-mono font-semibold text-slate-600">{ho.employeeCode || ho.employeeId}</td>
                      <td className="p-4 font-mono text-xs">{ho.handoverDate}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ho.condition === "Excellent" || ho.condition === "Good"
                          ? "bg-green-100 text-green-700"
                          : ho.condition === "Minor Damage"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                          }`}>
                          {ho.condition}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-slate-600">{ho.verifiedBy || "IT Admin"}</td>
                      <td className="p-4 text-slate-600 text-xs italic">{ho.remarks || "No remarks provided"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ASSET REQUESTS TAB */}
      {activeTab === "requests" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          {/* Top Bar with Request Asset Button (Employees Only) */}
          {currentRole === "Employee" && (
            <div className="flex justify-end items-center pb-2">
              <button
                onClick={() => {
                  setNewRequest({
                    assetCategory: "Laptop",
                    requestType: "New Asset Request",
                    reason: "",
                    attachment: null
                  });
                  setRequestFormOpen(true);
                }}
                className="flex items-center gap-2 bg-[#262760] text-white rounded-xl px-4 py-2.5 text-sm hover:bg-[#1a1c43] font-bold shadow-md transition-all"
              >
                <Plus className="h-4 w-4" />
                Request Asset
              </button>
            </div>
          )}

          {/* Admin Request Statistics (For Admins Only) */}
          {currentRole !== "Employee" && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: "Total Requests", val: stats.totalRequests, color: "border-blue-500 text-blue-600 bg-blue-50" },
                { label: "Pending Requests", val: stats.pendingRequests, color: "border-amber-500 text-amber-600 bg-amber-50" },
                { label: "Approved Requests", val: stats.approvedRequests, color: "border-indigo-500 text-indigo-600 bg-indigo-50" },
                { label: "Completed Requests", val: stats.completedRequests, color: "border-emerald-500 text-emerald-600 bg-emerald-50" },
                { label: "Rejected Requests", val: stats.rejectedRequests, color: "border-rose-500 text-rose-600 bg-rose-50" }
              ].map((stat, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border bg-white shadow-sm ${stat.color}`}>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{stat.label}</p>
                  <p className="text-2xl font-black mt-1">{stat.val}</p>
                </div>
              ))}
            </div>
          )}

          {/* Search & Filter Header Bar */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Employee Name, ID, or Request No (AR-...)..."
                value={reqSearch}
                onChange={(e) => setReqSearch(e.target.value)}
                className="pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-xl w-full bg-white outline-none focus:ring-2 focus:ring-[#262760] shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle Filters Button */}
              <button
                type="button"
                onClick={() => setShowReqFilters(!showReqFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${showReqFilters || activeFilterCount > 0
                  ? "bg-[#262760] text-white border-[#262760]"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-[#f37021] text-white rounded-full px-2 py-0.5 text-[10px] font-black">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Reset Filters Button */}
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={resetReqFilters}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-all"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Multi-Filter Controls */}
          {showReqFilters && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fadeIn">
              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Status</label>
                <select
                  value={reqStatus}
                  onChange={(e) => setReqStatus(e.target.value)}
                  className="w-full text-xs border rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-[#262760]"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Asset Allocated">Asset Allocated</option>
                  <option value="Completed">Completed</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Category</label>
                <select
                  value={reqCategory}
                  onChange={(e) => setReqCategory(e.target.value)}
                  className="w-full text-xs border rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-[#262760]"
                >
                  <option value="All">All Categories</option>
                  {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              {/* Request Type Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Request Type</label>
                <select
                  value={reqType}
                  onChange={(e) => setReqType(e.target.value)}
                  className="w-full text-xs border rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-[#262760]"
                >
                  <option value="All">All Request Types</option>
                  <option value="New Asset Request">New Asset Request</option>
                  <option value="Asset Replacement">Asset Replacement</option>
                  <option value="Temporary Asset">Temporary Asset</option>
                </select>
              </div>

              {/* Division Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Division</label>
                <select
                  value={reqDiv}
                  onChange={(e) => setReqDiv(e.target.value)}
                  className="w-full text-xs border rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-[#262760]"
                >
                  <option value="All">All Divisions</option>
                  {uniqueDivisionsForFilter.filter(d => d !== "All").map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Request Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#262760] text-white">
                  <th className="p-3.5 font-bold text-center w-10">S.No</th>
                  <th className="p-3.5 font-bold">Request Number</th>
                  <th className="p-3.5 font-bold">Employee Name</th>
                  <th className="p-3.5 font-bold">Employee ID</th>
                  <th className="p-3.5 font-bold">Division</th>
                  <th className="p-3.5 font-bold">Asset Category</th>
                  <th className="p-3.5 font-bold">Request Type</th>
                  <th className="p-3.5 font-bold">Request Date</th>
                  <th className="p-3.5 font-bold text-center">Status</th>
                  <th className="p-3.5 font-bold">Remarks</th>
                  <th className="p-3.5 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="p-8 text-center text-slate-400 font-medium">
                      No asset requests found matching your filter criteria.
                    </td>
                  </tr>
                ) : filteredRequests.map((req, idx) => (
                  <tr key={req._id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 text-center font-medium text-slate-400">{idx + 1}</td>
                    <td className="p-3.5 font-mono font-bold text-[#262760]">
                      {req.requestNumber || req.requestId}
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">
                      {req.employeeName}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">
                      {req.employeeCode}
                    </td>
                    <td className="p-3.5 text-slate-700">
                      {req.division || req.department || "N/A"}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      {req.assetCategory || req.category}
                    </td>
                    <td className="p-3.5">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium text-[11px]">
                        {req.requestType}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {req.requestDate}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block whitespace-nowrap ${req.status === "Pending"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : req.status === "Approved"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : req.status === "Asset Allocated"
                            ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                            : req.status === "Completed"
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : req.status === "Rejected"
                                ? "bg-red-100 text-red-800 border border-red-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 max-w-xs truncate" title={req.remarks}>
                      {req.remarks || "-"}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Details View Button */}
                        <button
                          onClick={() => setViewRequestModal(req)}
                          title="View Full Details"
                          className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-bold flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Admin Action Buttons */}
                        {currentRole !== "Employee" && (
                          <>
                            {req.status === "Pending" && (
                              <>
                                <button
                                  onClick={() => setApproveModal({ request: req, remarks: "Approved by IT Admin" })}
                                  title="Approve Request"
                                  className="px-2 py-1 bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 rounded-lg font-bold text-[11px]"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => setRejectModal({ request: req, remarks: "Rejected by IT Admin" })}
                                  title="Reject Request"
                                  className="px-2 py-1 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 rounded-lg font-bold text-[11px]"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {req.status === "Approved" && (
                              <button
                                onClick={() => {
                                  const matchingAvailableAssets = assets.filter(
                                    a => a.status === "Available" &&
                                      a.category === (req.assetCategory || req.category)
                                  );
                                  setSelectedComponents({
                                    adapter: "",
                                    mouse: "",
                                    keyboard: "",
                                    headset: "",
                                    monitor: ""
                                  });
                                  setAllocateModal({
                                    request: req,
                                    selectedAssetId: matchingAvailableAssets.length > 0 ? matchingAvailableAssets[0]._id : "",
                                    allocatedDate: new Date().toISOString().split("T")[0]
                                  });
                                }}
                                title="Allocate Asset"
                                className="px-2.5 py-1 bg-[#262760] text-white hover:bg-[#1a1c43] rounded-lg font-bold text-[11px] shadow-sm flex items-center gap-1"
                              >
                                Allocate Asset
                              </button>
                            )}
                          </>
                        )}

                        {/* Employee Cancel Button for Pending Request */}
                        {req.status === "Pending" && (req.employeeCode === currentEmployeeDetail.employeeId || req.employeeId === loggedUser._id) && (
                          <button
                            onClick={() => handleCancelRequest(req._id, req.requestNumber || req.requestId)}
                            title="Cancel Request"
                            className="px-2 py-1 bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 rounded-lg font-bold text-[11px]"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EXIT CLEARANCE MODULE */}
      {activeTab === "exit" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          {/* Header */}
          <div className="border-b pb-4">
            <h2 className="text-xl font-bold text-[#262760]">IT Asset Exit Clearance</h2>
            <p className="text-xs text-slate-500 font-medium">Verify & process IT asset returns for employees with pending Exit Forms</p>
          </div>

          {/* Search & Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Employee ID, Name, Exit Request No, Asset ID..."
                  value={clearanceSearch}
                  onChange={(e) => setClearanceSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-xl w-full text-xs outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Status:</span>
                <select
                  value={clearanceStatusFilter}
                  onChange={(e) => setClearanceStatusFilter(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Department Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Department:</span>
                <select
                  value={clearanceDeptFilter}
                  onChange={(e) => setClearanceDeptFilter(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {uniqueDivisionsForFilter.map(d => (
                    <option key={d} value={d}>{d === "All" ? "All Departments" : d}</option>
                  ))}
                </select>
              </div>

              {/* Asset Condition Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Asset Condition:</span>
                <select
                  value={clearanceConditionFilter}
                  onChange={(e) => setClearanceConditionFilter(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Conditions</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Minor Damage">Minor Damage</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
            </div>
          </div>

          {/* Exit Clearance List Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#262760] text-white">
                  <th className="p-4 font-bold text-white text-center w-12">S.No</th>
                  <th className="p-4 font-bold text-white">Exit Request No</th>
                  <th className="p-4 font-bold text-white">Employee ID</th>
                  <th className="p-4 font-bold text-white">Employee Name</th>
                  <th className="p-4 font-bold text-white">Department</th>
                  <th className="p-4 font-bold text-white">Proposed Last Working Day</th>
                  <th className="p-4 font-bold text-white text-center">Total Assigned Assets</th>
                  <th className="p-4 font-bold text-white text-center">Exit Clearance Status</th>
                  <th className="p-4 font-bold text-white text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExitClearances.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-slate-400 font-medium">
                      No exit clearance records matching your criteria.
                    </td>
                  </tr>
                ) : filteredExitClearances.map((cl, idx) => (
                  <tr key={cl._id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 text-center font-medium text-slate-500">{idx + 1}</td>
                    <td className="p-4 font-mono font-bold text-indigo-700">{cl.exitRequestNumber}</td>
                    <td className="p-4 font-mono font-semibold text-slate-600">{cl.employeeCode || cl.employeeId}</td>
                    <td className="p-4 font-bold text-slate-800">{cl.employeeName}</td>
                    <td className="p-4">{cl.department || cl.division || "SDS"}</td>
                    <td className="p-4 font-mono text-xs">{cl.proposedLastWorkingDay || "N/A"}</td>
                    <td className="p-4 text-center font-bold text-slate-700">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-full border text-xs">
                        {(cl.assignedAssets || []).length} Items
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${cl.status === "Pending"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : cl.status === "In Progress"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : "bg-green-100 text-green-800 border border-green-200"
                        }`}>
                        {cl.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setClearanceModal(cl)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1 mx-auto whitespace-nowrap ${cl.status === "Completed"
                          ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border"
                          : "bg-[#262760] text-white hover:bg-[#1a1c43]"
                          }`}
                      >
                        {cl.status === "Completed" ? (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            View Details
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3.5 w-3.5" />
                            Start Clearance
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== DIALOGS / MODALS ======================================================== */}

      {/* ASSET CREATION/EDIT MODAL */}
      {assetFormOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveAsset} className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center">
              <h3 className="text-lg font-bold">{selectedAsset ? "Edit Asset Master" : "Add Asset to Master"}</h3>
              <button type="button" onClick={() => setAssetFormOpen(false)} className="text-white hover:text-slate-200 font-bold">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
              {/* Individual Tracking fields */}
              {selectedAsset ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Asset ID (Read Only)</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedAsset.assetId}
                    className="w-full border rounded-xl px-3 py-2 bg-slate-100 outline-none text-sm text-slate-600 font-mono font-bold"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Asset ID *</label>
                  <input
                    type="text"
                    required
                    value={newAsset.assetId}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, assetId: e.target.value }))}
                    placeholder="Enter Full Asset ID (e.g. CDTKHSD001)"
                    className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Category</label>
                <div className="flex gap-2">
                  <select
                    value={newAsset.category}
                    onChange={(e) => handleCategoryChangeInForm(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setCategoryModalOpen(true)}
                    className="bg-[#262760] hover:bg-[#1a1c43] text-white rounded-xl px-3 flex items-center justify-center font-bold text-sm"
                    title="Manage Categories"
                  >
                    <Layers className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Brand Name</label>
                <input
                  type="text"
                  value={newAsset.brandName}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, brandName: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g. Dell, HP, Lenovo"
                />
              </div>

              {/* Dynamic / Category-Specific Specification Fields */}
              {(() => {
                const fieldsToRender = CATEGORY_FIELDS[newAsset.category] || (fieldConfig.fields || []).filter(f => f.enabled);
                return fieldsToRender.map(f => {
                  if (f.type === "select") {
                    return (
                      <div key={f.key}>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{f.label}</label>
                        <select
                          value={newAsset[f.key] || ""}
                          onChange={(e) => setNewAsset(prev => ({ ...prev, [f.key]: e.target.value }))}
                          className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white font-semibold"
                        >
                          <option value="">-- Choose {f.label} --</option>
                          {f.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    );
                  }
                  return (
                    <div key={f.key}>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{f.label}</label>
                      <input
                        type="text"
                        value={newAsset[f.key] || ""}
                        onChange={(e) => setNewAsset(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder={`Enter ${f.label.toLowerCase()}`}
                      />
                    </div>
                  );
                });
              })()}

              {/* Serial Number */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Serial Number</label>
                <input
                  type="text"
                  value={newAsset.serialNumber}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, serialNumber: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g. SN123456789"
                />
              </div>

              {/* BIO's Date */}
              {!["Adapter", "Keyboard", "Mouse"].includes(newAsset.category) && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">BIO's Date</label>
                  <input
                    type="date"
                    value={newAsset.purchaseDate}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, purchaseDate: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              )}

              {/* Condition */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Condition</label>
                <select
                  value={newAsset.condition}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, condition: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="">-- Choose Condition --</option>
                  {conditions.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Location</label>
                <select
                  value={newAsset.location}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="">-- Choose Location --</option>
                  {locations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                <select
                  value={newAsset.status || "Available"}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white font-semibold"
                >
                  <option value="Available">Available</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Scrapped">Scrapped</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>

            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setAssetFormOpen(false)} className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-100">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#262760] text-white rounded-xl text-sm font-semibold hover:bg-[#1a1c43]">Save Asset</button>
            </div>
          </form>
        </div>
      )}

      {/* CATEGORY MANAGEMENT MODAL */}
      {categoryModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center">
              <h3 className="text-lg font-bold">Manage Asset Categories</h3>
              <button type="button" onClick={() => setCategoryModalOpen(false)} className="text-white hover:text-slate-200 font-bold">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Add category form */}
              <form onSubmit={handleAddCategory} className="flex gap-2 pb-4 border-b">
                <input
                  type="text"
                  required
                  placeholder="New category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                />
                <button
                  type="submit"
                  className="bg-[#262760] hover:bg-[#1a1c43] text-white rounded-xl px-4 py-2 font-bold text-sm flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </form>

              {/* List of categories */}
              <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-150">
                {categories.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-sm">No categories configured.</div>
                ) : (
                  categories.map(cat => (
                    <div key={cat._id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                      <span className="text-sm font-semibold text-slate-700">{cat.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat._id, cat.name)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-1.5 transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALLOCATION DIALOG */}
      {allocationFormOpen && (() => {
        const selectedEmployeeAllocations = (allocations || []).filter(
          al => al.employeeCode === allocationData.assignedToId && al.status === "Assigned"
        );
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fadeIn">
            <form onSubmit={handleAllocate} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
              <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center font-sans shrink-0">
                <h3 className="text-lg font-bold">
                  {allocTrackingType === "Quantity" ? "Allocate Quantity Asset" : "Assign Asset Set"}
                </h3>
                <button type="button" onClick={() => setAllocationFormOpen(false)} className="text-white hover:text-slate-200 text-lg font-bold">✕</button>
              </div>

              {allocTrackingType === "Quantity" ? (
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Quantity Asset Selected</label>
                    <div className="bg-slate-50 p-3 rounded-xl border text-sm font-semibold text-slate-800">
                      {allocateAsset?.category} - {allocateAsset?.itemType} ({allocateAsset?.location})
                      <div className="text-xs text-slate-400 font-normal mt-0.5">Available: {allocateAsset?.quantityDetails?.available || 0}</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Assignment Target Type *</label>
                    <select
                      required
                      value={allocAssignmentType}
                      onChange={(e) => setAllocAssignmentType(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Employee">Employee</option>
                      <option value="Department">Department</option>
                      <option value="Team">Team</option>
                      <option value="Location">Location</option>
                    </select>
                  </div>

                  {allocAssignmentType === "Employee" && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Select Employee *</label>
                        <select
                          required
                          value={allocationData.assignedToId}
                          onChange={(e) => {
                            const empId = e.target.value;
                            const selectedEmp = employees.find(emp => (emp.employeeId || emp.employeeCode) === empId);
                            const empDiv = selectedEmp ? (selectedEmp.division || selectedEmp.department || "") : "";
                            setAllocationData(prev => ({
                              ...prev,
                              assignedToId: empId,
                              division: empDiv
                            }));
                          }}
                          className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Choose Employee --</option>
                          {sortedEmployees.map(emp => (
                            <option key={emp._id} value={emp.employeeId || emp.employeeCode}>
                              {emp.employeeId || emp.employeeCode} - {emp.name || emp.employeename} ({emp.division || emp.department || "SDS"})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Division / Department *</label>
                        <input
                          type="text" required
                          value={allocationData.division || ""}
                          onChange={(e) => setAllocationData(prev => ({ ...prev, division: e.target.value }))}
                          className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter Division (e.g. IT, HR, Sales)"
                        />
                      </div>
                    </>
                  )}

                  {allocAssignmentType === "Department" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Select/Enter Department *</label>
                      <input
                        type="text"
                        required
                        value={allocDepartment}
                        onChange={(e) => setAllocDepartment(e.target.value)}
                        placeholder="e.g. Finance, HR, Sales, Development"
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {allocAssignmentType === "Team" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Enter Team Name *</label>
                      <input
                        type="text"
                        required
                        value={allocTeam}
                        onChange={(e) => setAllocTeam(e.target.value)}
                        placeholder="e.g. React Developers Team, HR Ops"
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {allocAssignmentType === "Location" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Select Target Location *</label>
                      <select
                        required
                        value={allocLocation}
                        onChange={(e) => setAllocLocation(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Choose Location --</option>
                        {locations.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Quantity to Allocate * (Max: {allocateAsset?.quantityDetails?.available || 0})</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={allocateAsset?.quantityDetails?.available || 1}
                      value={allocQuantity}
                      onChange={(e) => setAllocQuantity(parseInt(e.target.value) || 1)}
                      className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Allocation Date *</label>
                    <input
                      type="date" required
                      value={allocationData.allocatedDate}
                      onChange={(e) => setAllocationData(prev => ({ ...prev, allocatedDate: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Select Employee *</label>
                    <select
                      required
                      value={allocationData.assignedToId}
                      onChange={(e) => {
                        const empId = e.target.value;
                        const selectedEmp = employees.find(emp => (emp.employeeId || emp.employeeCode) === empId);
                        const empDiv = selectedEmp ? (selectedEmp.division || selectedEmp.department || "") : "";
                        setAllocationData(prev => ({
                          ...prev,
                          assignedToId: empId,
                          division: empDiv
                        }));
                      }}
                      className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Choose Employee --</option>
                      {sortedEmployees.map(emp => (
                        <option key={emp._id} value={emp.employeeId || emp.employeeCode}>
                          {emp.employeeId || emp.employeeCode} - {emp.name || emp.employeename} ({emp.division || emp.department || "SDS"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Select Main Category *</label>
                    <select
                      required
                      value={allocCategorySelected}
                      onChange={(e) => {
                        setAllocCategorySelected(e.target.value);
                        setAllocAssetSetSelectedId("");
                        setSelectedComponents({
                          adapterCharger: "",
                          mouse: "",
                          keyboard: "",
                          headset: "",
                          monitor: ""
                        });
                      }}
                      className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    >
                      <option value="">-- Choose Category --</option>
                      {individualCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {allocCategorySelected && (() => {
                    const mainAssets = (assets || []).filter(
                      a => a.category === allocCategorySelected && (a.status === "Available" || a._id === allocAssetSetSelectedId)
                    );
                    const availableAdapters = (assets || []).filter(a => a.category === "Adapter" && a.status === "Available");
                    const availableChargers = (assets || []).filter(a => a.category === "Charger" && a.status === "Available");
                    const availableMice = (assets || []).filter(a => (a.category === "Mouse" || a.category === "Mouse (Wired / Non-Wired)") && a.status === "Available");
                    const availableKeyboards = (assets || []).filter(a => a.category === "Keyboard" && a.status === "Available");
                    const availableHeadsets = (assets || []).filter(a => a.category === "Headset" && a.status === "Available");
                    const availableMonitors = (assets || []).filter(a => a.category === "Monitor" && a.status === "Available");

                    return (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Select Available {allocCategorySelected} *</label>
                          <select
                            required
                            value={allocAssetSetSelectedId}
                            onChange={(e) => setAllocAssetSetSelectedId(e.target.value)}
                            className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">-- Choose {allocCategorySelected} --</option>
                            {mainAssets.map(set => (
                              <option key={set._id} value={set._id}>
                                {set.assetId} - {set.brandName} {set.version ? `(${set.version})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        {allocCategorySelected === "Laptop" && (
                          <>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Select Available Adapter</label>
                              <select
                                value={selectedComponents.adapter}
                                onChange={(e) => setSelectedComponents(prev => ({ ...prev, adapter: e.target.value }))}
                                className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                              >
                                <option value="">-- None / Not Required --</option>
                                {availableAdapters.map(ast => (
                                  <option key={ast._id} value={ast._id}>
                                    {ast.assetId} - {ast.brandName} {ast.version ? `(${ast.version})` : ""}
                                  </option>
                                ))}
                              </select>
                              {(() => {
                                const selAC = assets.find(a => a._id === selectedComponents.adapter);
                                if (!selAC) return null;
                                return (
                                  <div className="mt-2 p-3 rounded-xl border border-blue-100 bg-blue-50 text-xs animate-fadeIn">
                                    <div className="font-bold text-blue-700 mb-2">{selAC.category} Details</div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-700">
                                      <span className="font-semibold text-slate-500 font-normal">Asset ID:</span>
                                      <span>{selAC.assetId}</span>
                                      <span className="font-semibold text-slate-500 font-normal">Brand:</span>
                                      <span>{selAC.brandName}</span>
                                      {selAC.version && (
                                        <><span className="font-semibold text-slate-500 font-normal">Model / Version:</span><span>{selAC.version}</span></>
                                      )}
                                      {selAC.serialNumber && (
                                        <><span className="font-semibold text-slate-500 font-normal">Serial No:</span><span>{selAC.serialNumber}</span></>
                                      )}
                                      <span className="font-semibold text-slate-500 font-normal">Condition:</span>
                                      <span>{selAC.condition}</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>



                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Select Available Mouse</label>
                              <select
                                value={selectedComponents.mouse}
                                onChange={(e) => setSelectedComponents(prev => ({ ...prev, mouse: e.target.value }))}
                                className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">-- None / Not Required --</option>
                                {availableMice.map(ast => (
                                  <option key={ast._id} value={ast._id}>
                                    {ast.assetId} - {ast.brandName} {ast.version ? `(${ast.version})` : ""}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Select Available Headset</label>
                              <select
                                value={selectedComponents.headset}
                                onChange={(e) => setSelectedComponents(prev => ({ ...prev, headset: e.target.value }))}
                                className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">-- None / Not Required --</option>
                                {availableHeadsets.map(ast => (
                                  <option key={ast._id} value={ast._id}>
                                    {ast.assetId} - {ast.brandName} {ast.version ? `(${ast.version})` : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}

                        {allocCategorySelected === "Desktop / CPU" && (
                          <>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Select Available Keyboard</label>
                              <select
                                value={selectedComponents.keyboard}
                                onChange={(e) => setSelectedComponents(prev => ({ ...prev, keyboard: e.target.value }))}
                                className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">-- None / Not Required --</option>
                                {availableKeyboards.map(ast => (
                                  <option key={ast._id} value={ast._id}>
                                    {ast.assetId} - {ast.brandName} {ast.version ? `(${ast.version})` : ""}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Select Available Mouse</label>
                              <select
                                value={selectedComponents.mouse}
                                onChange={(e) => setSelectedComponents(prev => ({ ...prev, mouse: e.target.value }))}
                                className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">-- None / Not Required --</option>
                                {availableMice.map(ast => (
                                  <option key={ast._id} value={ast._id}>
                                    {ast.assetId} - {ast.brandName} {ast.version ? `(${ast.version})` : ""}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Select Available Monitor</label>
                              <select
                                value={selectedComponents.monitor}
                                onChange={(e) => setSelectedComponents(prev => ({ ...prev, monitor: e.target.value }))}
                                className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">-- None / Not Required --</option>
                                {availableMonitors.map(ast => (
                                  <option key={ast._id} value={ast._id}>
                                    {ast.assetId} - {ast.brandName} {ast.version ? `(${ast.version})` : ""}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Select Available Headset</label>
                              <select
                                value={selectedComponents.headset}
                                onChange={(e) => setSelectedComponents(prev => ({ ...prev, headset: e.target.value }))}
                                className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">-- None / Not Required --</option>
                                {availableHeadsets.map(ast => (
                                  <option key={ast._id} value={ast._id}>
                                    {ast.assetId} - {ast.brandName} {ast.version ? `(${ast.version})` : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}

                  {allocationData.assignedToId && (() => {
                    const selectedEmp = employees.find(emp => (emp.employeeId || emp.employeeCode) === allocationData.assignedToId);
                    const empName = selectedEmp ? selectedEmp.name : "";
                    return (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-sans mt-2 space-y-2.5 animate-fadeIn">
                        <div className="font-bold text-slate-700">
                          Employee: <span className="text-[#262760] font-black">{allocationData.assignedToId}</span> - {empName}
                        </div>
                        <div>
                          <div className="font-bold text-slate-500 mb-1">Currently Assigned:</div>
                          {selectedEmployeeAllocations.length === 0 ? (
                            <div className="text-slate-400 font-medium italic pl-1">No assets assigned.</div>
                          ) : (
                            <div className="space-y-1 pl-1 font-sans">
                              {selectedEmployeeAllocations.map(al => (
                                <div key={al._id} className="flex items-center gap-1.5 text-slate-700 font-semibold">
                                  <span className="text-green-600 font-bold">✓</span>
                                  <span>{al.category} - <span className="font-mono text-slate-500">{al.assetId}</span></span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Division *</label>
                    <input
                      type="text" required
                      value={allocationData.division || ""}
                      onChange={(e) => setAllocationData(prev => ({ ...prev, division: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter Division (e.g. IT, HR, Sales)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Allocation Date *</label>
                    <input
                      type="date" required
                      value={allocationData.allocatedDate}
                      onChange={(e) => setAllocationData(prev => ({ ...prev, allocatedDate: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2 shrink-0">
                <button type="button" onClick={() => setAllocationFormOpen(false)} className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-100">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#262760] text-white rounded-xl text-sm font-semibold hover:bg-[#1a1c43]">Allocate</button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* ADD / EDIT OFFICE ACCESSORY DIALOG */}
      {accessoryModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form onSubmit={handleSaveAccessory} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center font-sans shrink-0">
              <h3 className="text-lg font-bold">
                {editingAccessory ? "Edit Office Accessory" : "Add Office Accessory"}
              </h3>
              <button type="button" onClick={() => setAccessoryModalOpen(false)} className="text-white hover:text-slate-200 text-lg font-bold">✕</button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-sm font-sans">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-500">Category *</label>
                  <div className="flex items-center gap-2">
                    {deletedAccessoryCategories.length > 0 && (
                      <button
                        type="button"
                        onClick={handleResetAccessoryCategories}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 underline"
                        title="Restore standard default categories"
                      >
                        Restore Standard
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAddCustomAccCat(prev => !prev)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-200 transition-all"
                      title="Add custom category"
                    >
                      <Plus className="h-3 w-3" />
                      <span>+ Add Custom</span>
                    </button>
                  </div>
                </div>

                {showAddCustomAccCat && (
                  <div className="flex gap-2 mb-2.5 bg-blue-50/80 p-2.5 rounded-xl border border-blue-200 animate-fadeIn">
                    <input
                      type="text"
                      placeholder="Enter new category name..."
                      value={newCustomAccCatName}
                      onChange={(e) => setNewCustomAccCatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomAccessoryCategory();
                        }
                      }}
                      className="flex-1 border border-blue-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomAccessoryCategory}
                      className="bg-[#262760] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#1c1d47] shadow-sm"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCustomAccCat(false);
                        setNewCustomAccCatName("");
                      }}
                      className="bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <div className="flex gap-2 items-center">
                  <select
                    required
                    value={accessoryFormData.category}
                    onChange={(e) => setAccessoryFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    {accessoryCategories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {accessoryFormData.category && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAccessoryCategory(accessoryFormData.category)}
                      className="p-2 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shrink-0"
                      title={`Delete category "${accessoryFormData.category}"`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Item Name * (e.g. Rolling Chair, AC)</label>
                <input
                  type="text"
                  required
                  placeholder="Enter item name..."
                  value={accessoryFormData.itemName}
                  onChange={(e) => setAccessoryFormData(prev => ({ ...prev, itemName: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Quantity *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Enter quantity..."
                  value={accessoryFormData.quantity}
                  onChange={(e) => setAccessoryFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Location *</label>
                <select
                  required
                  value={accessoryFormData.location}
                  onChange={(e) => setAccessoryFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                >
                  <option value="Chennai Office">Chennai Office</option>
                  <option value="Hosur Office">Hosur Office</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Remarks</label>
                <textarea
                  placeholder="Enter remarks (if any)..."
                  rows="3"
                  value={accessoryFormData.remarks}
                  onChange={(e) => setAccessoryFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setAccessoryModalOpen(false)} className="px-4 py-2 border rounded-xl text-sm font-bold hover:bg-slate-100 transition-all">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-[#262760] text-white rounded-xl text-sm font-bold hover:bg-[#1a1c43] transition-all">
                {editingAccessory ? "Save Changes" : "Add Accessory"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW ASSET DETAILS DIALOG */}
      {viewAssetDetails && (() => {
        const activeAlloc = allocations.find(al => al.assetId === viewAssetDetails.assetId && al.status === "Assigned");
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center font-sans">
                <div>
                  <h3 className="text-lg font-bold">View Asset Details</h3>
                  <p className="text-xs text-slate-300 font-mono">ID: {viewAssetDetails.assetId}</p>
                </div>
                <button type="button" onClick={() => setViewAssetDetails(null)} className="text-white hover:text-slate-200 font-bold text-lg font-sans">✕</button>
              </div>

              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto font-sans">
                {/* General Details — only show fields with actual values */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#262760] mb-3">General Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      { label: "Category",    value: viewAssetDetails.category },
                      { label: "Brand Name",  value: viewAssetDetails.brandName },
                      { label: "Serial Number", value: viewAssetDetails.serialNumber, mono: true },
                      { label: "BIO's Date",  value: !["Adapter", "Keyboard", "Mouse"].includes(viewAssetDetails.category) ? viewAssetDetails.purchaseDate : null },
                      { label: "Seat No",     value: viewAssetDetails.seatNo },
                      { label: "Condition",   value: viewAssetDetails.condition },
                      { label: "Location",    value: viewAssetDetails.location },
                    ].filter(f => f.value && f.value.toString().trim() !== "").map(f => (
                      <div key={f.label}>
                        <span className="block text-slate-400 font-medium">{f.label}</span>
                        <span className={`font-bold text-slate-800 ${f.mono ? "font-mono" : ""}`}>{f.value}</span>
                      </div>
                    ))}
                    {/* Status always shown */}
                    <div className="col-span-2">
                      <span className="block text-slate-400 font-medium">Status</span>
                      <span className={`inline-block px-2.5 py-0.5 mt-0.5 rounded-full text-[10px] font-bold ${viewAssetDetails.status === "Assigned"
                        ? "bg-green-100 text-green-800"
                        : viewAssetDetails.status === "Available"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                        }`}>
                        {viewAssetDetails.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Set Components details section */}
                {viewAssetDetails.components && viewAssetDetails.components.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-fadeIn font-sans">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#262760] mb-3">Set Components List</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {viewAssetDetails.components.map(comp => (
                        <div key={comp._id} className="p-2 bg-white rounded-lg border border-slate-150 shadow-sm flex items-center justify-between">
                          <div>
                            <span className="block text-slate-400 font-medium">{comp.category}</span>
                            <span className="font-bold text-[#262760] font-mono">{comp.assetId}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-slate-400 font-medium">Serial No</span>
                            <span className="font-semibold text-slate-700 font-mono">{comp.serialNumber || "—"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Specs Details — only show fields that have a saved value */}
                {(() => {
                  const filledSpecs = (fieldConfig.fields || [])
                    .filter(f => f.enabled && viewAssetDetails[f.key] && viewAssetDetails[f.key].toString().trim() !== "");
                  if (filledSpecs.length === 0) return null;
                  return (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#262760] mb-3">Specification Details</h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {filledSpecs.map(f => (
                          <div key={f.key}>
                            <span className="block text-slate-400 font-medium">{f.label}</span>
                            <span className="font-bold text-slate-800">{viewAssetDetails[f.key]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Active Allocation details */}
                {viewAssetDetails.status === "Assigned" && activeAlloc && (
                  <div className="bg-green-50/50 p-4 rounded-xl border border-green-200 animate-fadeIn">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-green-800 mb-3 flex items-center gap-1">
                      <span className="text-green-600 font-black">✓</span> Active Allocation
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="block text-green-600/70 font-medium">Assigned To</span>
                        <span className="font-black text-slate-800">{activeAlloc.employeeName}</span>
                      </div>
                      <div>
                        <span className="block text-green-600/70 font-medium">Employee Code</span>
                        <span className="font-bold text-slate-800 font-mono">{activeAlloc.employeeCode}</span>
                      </div>
                      <div>
                        <span className="block text-green-600/70 font-medium">Division</span>
                        <span className="font-semibold text-slate-700">{activeAlloc.division || "—"}</span>
                      </div>
                      <div>
                        <span className="block text-green-600/70 font-medium">Allocation Date</span>
                        <span className="font-semibold text-slate-700">{activeAlloc.allocatedDate}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t flex justify-end font-sans">
                <button
                  type="button"
                  onClick={() => setViewAssetDetails(null)}
                  className="px-4 py-2 bg-[#262760] text-white rounded-xl text-sm font-semibold hover:bg-[#1c1d47]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CREATE ASSET REQUEST MODAL (POPUP) */}
      {requestFormOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form onSubmit={handleCreateRequestSubmit} className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Request IT Asset</h3>
                <p className="text-xs text-slate-300">Submit a new hardware asset request for IT Admin review</p>
              </div>
              <button type="button" onClick={() => setRequestFormOpen(false)} className="text-white hover:text-slate-200 font-bold text-lg">✕</button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Employee Info Section (Auto Filled) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-[#262760] uppercase tracking-wider">Employee Information (Auto Filled)</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block text-slate-400 font-medium">Employee Name</span>
                    <span className="font-bold text-slate-800">{currentEmployeeDetail.name}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium">Employee ID</span>
                    <span className="font-mono font-bold text-[#262760]">{currentEmployeeDetail.employeeId}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium">Division</span>
                    <span className="font-semibold text-slate-700">{currentEmployeeDetail.division}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium">Designation</span>
                    <span className="font-semibold text-slate-700">{currentEmployeeDetail.designation}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-slate-400 font-medium">Location</span>
                    <span className="font-semibold text-slate-700">{currentEmployeeDetail.location}</span>
                  </div>
                </div>
              </div>

              {/* Asset Info Section */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Asset Category *</label>
                  <select
                    required
                    value={newRequest.assetCategory}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, assetCategory: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-[#262760]"
                  >
                    {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Request Type *</label>
                  <select
                    required
                    value={newRequest.requestType}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, requestType: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-[#262760]"
                  >
                    <option value="New Asset Request">New Asset Request</option>
                    <option value="Asset Replacement">Asset Replacement</option>
                    <option value="Temporary Asset">Temporary Asset</option>
                  </select>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Justification Reason *</label>
                <textarea
                  required
                  rows={4}
                  value={newRequest.reason}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Current laptop is damaged and cannot be repaired. Need a temporary laptop until replacement is provided."
                  className="w-full border rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#262760]"
                />
              </div>

              {/* Attachment (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Supporting Attachment (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setNewRequest(prev => ({ ...prev, attachment: e.target.files[0] }))}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-[#262760] hover:file:bg-slate-200 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">Upload relevant proof, images, or approval documents if applicable.</p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRequestFormOpen(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#262760] text-white rounded-xl text-xs font-bold hover:bg-[#1a1c43] shadow-md flex items-center gap-1"
              >
                <Send className="h-3.5 w-3.5" />
                Submit Asset Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* APPROVE MODAL */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-green-700 text-white flex justify-between items-center">
              <h3 className="text-base font-bold">Approve Request: {approveModal.request.requestNumber || approveModal.request.requestId}</h3>
              <button type="button" onClick={() => setApproveModal(null)} className="text-white hover:text-slate-200 font-bold">✕</button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-xl">
                <p><strong>Employee:</strong> {approveModal.request.employeeName} ({approveModal.request.employeeCode})</p>
                <p><strong>Category:</strong> {approveModal.request.assetCategory || approveModal.request.category}</p>
                <p><strong>Request Type:</strong> {approveModal.request.requestType}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Approval Remarks</label>
                <textarea
                  rows={3}
                  value={approveModal.remarks}
                  onChange={(e) => setApproveModal(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Add approval notes or comments..."
                  className="w-full border rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2 text-xs">
              <button type="button" onClick={() => setApproveModal(null)} className="px-4 py-2 border rounded-xl font-semibold hover:bg-slate-100">Cancel</button>
              <button onClick={handleConfirmApprove} className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700">Confirm Approve</button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-red-700 text-white flex justify-between items-center">
              <h3 className="text-base font-bold">Reject Request: {rejectModal.request.requestNumber || rejectModal.request.requestId}</h3>
              <button type="button" onClick={() => setRejectModal(null)} className="text-white hover:text-slate-200 font-bold">✕</button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl">
                <p><strong>Employee:</strong> {rejectModal.request.employeeName} ({rejectModal.request.employeeCode})</p>
                <p><strong>Category:</strong> {rejectModal.request.assetCategory || rejectModal.request.category}</p>
                <p><strong>Request Type:</strong> {rejectModal.request.requestType}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Rejection Remarks *</label>
                <textarea
                  rows={3} required
                  value={rejectModal.remarks}
                  onChange={(e) => setRejectModal(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="State rejection reason..."
                  className="w-full border rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2 text-xs">
              <button type="button" onClick={() => setRejectModal(null)} className="px-4 py-2 border rounded-xl font-semibold hover:bg-slate-100">Cancel</button>
              <button onClick={handleConfirmReject} className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* ALLOCATE ASSET MODAL FOR APPROVED REQUEST */}
      {allocateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center shrink-0">
              <h3 className="text-base font-bold">Allocate Asset for Request</h3>
              <button type="button" onClick={() => setAllocateModal(null)} className="text-white hover:text-slate-200 font-bold text-lg">✕</button>
            </div>
            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1 font-sans">
              <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3 rounded-xl space-y-1">
                <p><strong>Request Number:</strong> {allocateModal.request.requestNumber || allocateModal.request.requestId}</p>
                <p><strong>Employee:</strong> {allocateModal.request.employeeName} ({allocateModal.request.employeeCode})</p>
                <p><strong>Category Requested:</strong> <span className="font-bold text-[#262760]">{allocateModal.request.assetCategory || allocateModal.request.category}</span></p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Select Available Asset *</label>
                <select
                  required
                  value={allocateModal.selectedAssetId}
                  onChange={(e) => setAllocateModal(prev => ({ ...prev, selectedAssetId: e.target.value }))}
                  className="w-full border rounded-xl p-2.5 text-xs bg-white outline-none focus:ring-2 focus:ring-[#262760]"
                >
                  <option value="">-- Choose Available Asset --</option>
                  {assets.filter(a => a.status === "Available" && a.category === (allocateModal.request.assetCategory || allocateModal.request.category)).map(ast => (
                    <option key={ast._id} value={ast._id}>
                      {ast.assetId} - {ast.brandName} {ast.version} (Seat: {ast.seatNo})
                    </option>
                  ))}
                </select>
                {assets.filter(a => a.status === "Available" && a.category === (allocateModal.request.assetCategory || allocateModal.request.category)).length === 0 && (
                  <p className="text-[11px] text-red-600 mt-1 font-semibold">No available assets found in Asset Master for category '{allocateModal.request.assetCategory || allocateModal.request.category}'. Please add one in Asset Master first.</p>
                )}
              </div>

              {allocateModal.selectedAssetId && (() => {
                const reqCategory = allocateModal.request.assetCategory || allocateModal.request.category;
                if (reqCategory !== "Laptop" && reqCategory !== "Desktop / CPU") return null;

                const availableAdapters = (assets || []).filter(a => a.category === "Adapter" && a.status === "Available");
                const availableChargers = (assets || []).filter(a => a.category === "Charger" && a.status === "Available");
                const availableMice = (assets || []).filter(a => (a.category === "Mouse" || a.category === "Mouse (Wired / Non-Wired)") && a.status === "Available");
                const availableKeyboards = (assets || []).filter(a => a.category === "Keyboard" && a.status === "Available");
                const availableHeadsets = (assets || []).filter(a => a.category === "Headset" && a.status === "Available");
                const availableMonitors = (assets || []).filter(a => a.category === "Monitor" && a.status === "Available");

                return (
                  <>
                    <div className="font-bold text-[#262760] text-[11px] uppercase tracking-wider mt-3">Select Accessories / Components:</div>

                    {reqCategory === "Laptop" && (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Select Available Adapter</label>
                          <select
                            value={selectedComponents.adapter}
                            onChange={(e) => setSelectedComponents(prev => ({ ...prev, adapter: e.target.value }))}
                            className="w-full border rounded-xl p-2.5 text-xs bg-white outline-none focus:ring-2 focus:ring-[#262760]"
                          >
                            <option value="">-- None / Not Required --</option>
                            {availableAdapters.map(ast => (
                              <option key={ast._id} value={ast._id}>
                                {ast.assetId} - {ast.brandName} {ast.version ? `(${ast.version})` : ""}
                              </option>
                            ))}
                          </select>
                          {(() => {
                            const selAC = assets.find(a => a._id === selectedComponents.adapter);
                            if (!selAC) return null;
                            return (
                              <div className="mt-2 p-3 rounded-xl border border-[#262760]/20 bg-[#f0f1ff] text-xs animate-fadeIn">
                                <div className="font-bold text-[#262760] mb-2">{selAC.category} Details</div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-700">
                                  <span className="font-semibold text-slate-500 font-normal">Asset ID:</span>
                                  <span>{selAC.assetId}</span>
                                  <span className="font-semibold text-slate-500 font-normal">Brand:</span>
                                  <span>{selAC.brandName}</span>
                                  {selAC.version && (
                                    <><span className="font-semibold text-slate-500 font-normal">Model / Version:</span><span>{selAC.version}</span></>
                                  )}
                                  {selAC.serialNumber && (
                                    <><span className="font-semibold text-slate-500 font-normal">Serial No:</span><span>{selAC.serialNumber}</span></>
                                  )}
                                  <span className="font-semibold text-slate-500 font-normal">Condition:</span>
                                  <span>{selAC.condition}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>



                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Select Available Mouse</label>
                          <select
                            value={selectedComponents.mouse}
                            onChange={(e) => setSelectedComponents(prev => ({ ...prev, mouse: e.target.value }))}
                            className="w-full border rounded-xl p-2.5 text-xs bg-white outline-none focus:ring-2 focus:ring-[#262760]"
                          >
                            <option value="">-- None / Not Required --</option>
                            {availableMice.map(ast => (
                              <option key={ast._id} value={ast._id}>
                                {ast.assetId} - {ast.brandName} {ast.version ? `(${ast.version})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Select Available Headset</label>
                          <select
                            value={selectedComponents.headset}
                            onChange={(e) => setSelectedComponents(prev => ({ ...prev, headset: e.target.value }))}
                            className="w-full border rounded-xl p-2.5 text-xs bg-white outline-none focus:ring-2 focus:ring-[#262760]"
                          >
                            <option value="">-- None / Not Required --</option>
                            {availableHeadsets.map(ast => (
                              <option key={ast._id} value={ast._id}>
                                {ast.assetId} - {ast.brandName} {ast.version ? `(${ast.version})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {reqCategory === "Desktop / CPU" && (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Select Available Keyboard</label>
                          <select
                            value={selectedComponents.keyboard}
                            onChange={(e) => setSelectedComponents(prev => ({ ...prev, keyboard: e.target.value }))}
                            className="w-full border rounded-xl p-2.5 text-xs bg-white outline-none focus:ring-2 focus:ring-[#262760]"
                          >
                            <option value="">-- None / Not Required --</option>
                            {availableKeyboards.map(ast => (
                              <option key={ast._id} value={ast._id}>
                                {ast.assetId} - {ast.brandName} {ast.version ? `(${ast.version})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Select Available Mouse</label>
                          <select
                            value={selectedComponents.mouse}
                            onChange={(e) => setSelectedComponents(prev => ({ ...prev, mouse: e.target.value }))}
                            className="w-full border rounded-xl p-2.5 text-xs bg-white outline-none focus:ring-2 focus:ring-[#262760]"
                          >
                            <option value="">-- None / Not Required --</option>
                            {availableMice.map(ast => (
                              <option key={ast._id} value={ast._id}>
                                {ast.assetId} - {ast.brandName} {ast.version ? `(${ast.version})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Select Available Monitor</label>
                          <select
                            value={selectedComponents.monitor}
                            onChange={(e) => setSelectedComponents(prev => ({ ...prev, monitor: e.target.value }))}
                            className="w-full border rounded-xl p-2.5 text-xs bg-white outline-none focus:ring-2 focus:ring-[#262760]"
                          >
                            <option value="">-- None / Not Required --</option>
                            {availableMonitors.map(ast => (
                              <option key={ast._id} value={ast._id}>
                                {ast.assetId} - {ast.brandName} {ast.version ? `(${ast.version})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Select Available Headset</label>
                          <select
                            value={selectedComponents.headset}
                            onChange={(e) => setSelectedComponents(prev => ({ ...prev, headset: e.target.value }))}
                            className="w-full border rounded-xl p-2.5 text-xs bg-white outline-none focus:ring-2 focus:ring-[#262760]"
                          >
                            <option value="">-- None / Not Required --</option>
                            {availableHeadsets.map(ast => (
                              <option key={ast._id} value={ast._id}>
                                {ast.assetId} - {ast.brandName} {ast.version ? `(${ast.version})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </>
                );
              })()}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Allocation Date *</label>
                <input
                  type="date"
                  required
                  value={allocateModal.allocatedDate}
                  onChange={(e) => setAllocateModal(prev => ({ ...prev, allocatedDate: e.target.value }))}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#262760]"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2 text-xs shrink-0">
              <button type="button" onClick={() => setAllocateModal(null)} className="px-4 py-2 border rounded-xl font-semibold hover:bg-slate-100">Cancel</button>
              <button
                onClick={handleConfirmAllocate}
                disabled={!allocateModal.selectedAssetId}
                className="px-4 py-2 bg-[#262760] text-white rounded-xl font-bold hover:bg-[#1a1c43] disabled:opacity-50"
              >
                Allocate & Complete Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW REQUEST DETAILS MODAL */}
      {viewRequestModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold">Request Details</h3>
                <p className="text-xs text-slate-300">{viewRequestModal.requestNumber || viewRequestModal.requestId}</p>
              </div>
              <button type="button" onClick={() => setViewRequestModal(null)} className="text-white hover:text-slate-200 font-bold">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
                <div>
                  <span className="text-slate-400 block font-medium">Request Number</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{viewRequestModal.requestNumber || viewRequestModal.requestId}</span>
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${viewRequestModal.status === "Pending"
                    ? "bg-amber-100 text-amber-800"
                    : viewRequestModal.status === "Approved"
                      ? "bg-blue-100 text-blue-800"
                      : viewRequestModal.status === "Asset Allocated"
                        ? "bg-indigo-100 text-indigo-800"
                        : viewRequestModal.status === "Completed"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                    }`}>
                    {viewRequestModal.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block">Employee Name</span>
                  <span className="font-bold text-slate-800">{viewRequestModal.employeeName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Employee ID</span>
                  <span className="font-mono font-bold text-[#262760]">{viewRequestModal.employeeCode}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Division</span>
                  <span className="font-semibold text-slate-700">{viewRequestModal.division || viewRequestModal.department || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Designation</span>
                  <span className="font-semibold text-slate-700">{viewRequestModal.designation || "N/A"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block">Location</span>
                  <span className="font-semibold text-slate-700">{viewRequestModal.location || "N/A"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block">Asset Category</span>
                  <span className="font-bold text-[#262760] text-sm">{viewRequestModal.assetCategory || viewRequestModal.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Request Type</span>
                  <span className="font-semibold text-slate-700">{viewRequestModal.requestType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Request Date</span>
                  <span className="font-medium text-slate-700">{viewRequestModal.requestDate}</span>
                </div>
                {viewRequestModal.approvedDate && (
                  <div>
                    <span className="text-slate-400 block">Approval Date</span>
                    <span className="font-medium text-slate-700">{viewRequestModal.approvedDate}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Justification Reason</span>
                <p className="bg-white p-3 rounded-xl border text-slate-700 whitespace-pre-wrap">{viewRequestModal.reason}</p>
              </div>

              {viewRequestModal.attachment && (
                <div>
                  <span className="text-slate-400 block mb-1">Attachment</span>
                  <a
                    href={viewRequestModal.attachment.startsWith("http") ? viewRequestModal.attachment : `${BASE_URL}${viewRequestModal.attachment}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl font-bold hover:bg-blue-100"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    {viewRequestModal.attachmentName || "View Attachment"}
                  </a>
                </div>
              )}

              {viewRequestModal.remarks && (
                <div>
                  <span className="text-slate-400 block mb-1">Workflow / Approval Remarks</span>
                  <p className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 font-medium">{viewRequestModal.remarks}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setViewRequestModal(null)}
                className="px-4 py-2 bg-[#262760] text-white rounded-xl text-xs font-bold hover:bg-[#1a1c43]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSET HANDOVER PROCESS MODAL */}
      {handoverModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCompleteHandover} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center">
              <h3 className="text-lg font-bold">Process Asset Handover</h3>
              <button type="button" onClick={() => setHandoverModal(null)} className="text-white hover:text-slate-200 font-bold">✕</button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Employee Information Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 border-b pb-1">Employee Information</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="font-semibold text-slate-500">Employee ID:</span> <span className="font-mono font-bold text-[#262760]">{handoverModal.employeeCode || handoverModal.employeeId}</span></div>
                  <div><span className="font-semibold text-slate-500">Employee Name:</span> <span className="font-bold text-slate-800">{handoverModal.employeeName}</span></div>
                  <div><span className="font-semibold text-slate-500">Department:</span> <span className="font-medium text-slate-700">{handoverModal.department || handoverModal.division || "SDS"}</span></div>
                  <div><span className="font-semibold text-slate-500">Designation:</span> <span className="font-medium text-slate-700">{handoverModal.designation || handoverModal.position || "N/A"}</span></div>
                </div>
              </div>

              {/* Asset Information Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 border-b pb-1">Asset Information</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="font-semibold text-slate-500">Asset ID:</span> <span className="font-mono font-bold text-[#262760]">{handoverModal.assetId}</span></div>
                  <div><span className="font-semibold text-slate-500">Category:</span> <span className="font-medium text-slate-700">{handoverModal.category || (handoverModal.asset && handoverModal.asset.category) || "Laptop"}</span></div>
                  <div><span className="font-semibold text-slate-500">Brand Name:</span> <span className="font-medium text-slate-700">{handoverModal.brandName || (handoverModal.asset && handoverModal.asset.brandName) || "N/A"}</span></div>
                  <div><span className="font-semibold text-slate-500">Model / Version:</span> <span className="font-medium text-slate-700">{handoverModal.version || (handoverModal.asset && handoverModal.asset.version) || "N/A"}</span></div>
                  <div><span className="font-semibold text-slate-500">Serial Number:</span> <span className="font-mono font-medium text-slate-700">{(handoverModal.asset && handoverModal.asset.serialNumber) || "N/A"}</span></div>
                  <div><span className="font-semibold text-slate-500">Allocation Date:</span> <span className="font-mono font-medium text-slate-700">{handoverModal.allocatedDate || "N/A"}</span></div>
                </div>
              </div>

              {/* Handover Input Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Handover Information</h4>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Handover Date *</label>
                  <input
                    type="date"
                    required
                    value={handoverData.handoverDate}
                    onChange={(e) => setHandoverData(prev => ({ ...prev, handoverDate: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Asset Condition *</label>
                  <select
                    required
                    value={handoverData.condition}
                    onChange={(e) => setHandoverData(prev => ({ ...prev, condition: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Minor Damage">Minor Damage</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Remarks</label>
                  <textarea
                    rows={3}
                    value={handoverData.remarks}
                    onChange={(e) => setHandoverData(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="e.g. Laptop returned in good condition. Keyboard key missing."
                    className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setHandoverModal(null)}
                className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#262760] hover:bg-[#1a1c43] text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle className="h-4 w-4" />
                Complete Handover
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EXIT CLEARANCE VERIFICATION MODAL */}
      {clearanceModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold">IT Asset Exit Clearance Verification</h3>
                <p className="text-xs text-slate-300">Request No: {clearanceModal.exitRequestNumber}</p>
              </div>
              <button type="button" onClick={() => setClearanceModal(null)} className="text-white hover:text-slate-200 font-bold">✕</button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Employee Details Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 border-b pb-1">Employee Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div><span className="font-semibold text-slate-500">Employee ID:</span> <span className="font-mono font-bold text-[#262760]">{clearanceModal.employeeCode || clearanceModal.employeeId}</span></div>
                  <div><span className="font-semibold text-slate-500">Employee Name:</span> <span className="font-bold text-slate-800">{clearanceModal.employeeName}</span></div>
                  <div><span className="font-semibold text-slate-500">Department:</span> <span className="font-medium text-slate-700">{clearanceModal.department || clearanceModal.division || "SDS"}</span></div>
                  <div><span className="font-semibold text-slate-500">Designation:</span> <span className="font-medium text-slate-700">{clearanceModal.designation || "N/A"}</span></div>
                  <div><span className="font-semibold text-slate-500">Exit Request No:</span> <span className="font-mono font-bold text-indigo-700">{clearanceModal.exitRequestNumber}</span></div>
                  <div><span className="font-semibold text-slate-500">Proposed Last Working Day:</span> <span className="font-mono font-medium text-slate-800">{clearanceModal.proposedLastWorkingDay || "N/A"}</span></div>
                </div>
              </div>

              {/* Asset Details Verification List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Assigned Assets Verification ({(clearanceModal.assignedAssets || []).length} Items)</h4>
                  <span className="text-xs text-slate-400 font-medium">Verify each asset returned & condition</span>
                </div>

                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b text-slate-700 font-bold">
                        <th className="p-3">Asset ID</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Brand & Model</th>
                        <th className="p-3">Serial No.</th>
                        <th className="p-3">Allocation Date</th>
                        <th className="p-3 text-center">Returned?</th>
                        <th className="p-3">Condition</th>
                        <th className="p-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(clearanceModal.assignedAssets || []).map((ast, aIdx) => (
                        <tr key={aIdx} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-[#262760]">{ast.assetId}</td>
                          <td className="p-3 font-semibold text-slate-800">{ast.category}</td>
                          <td className="p-3">{ast.brandName} {ast.version}</td>
                          <td className="p-3 font-mono">{ast.serialNumber || "N/A"}</td>
                          <td className="p-3 font-mono">{ast.allocationDate || "N/A"}</td>
                          <td className="p-3 text-center">
                            <select
                              disabled={clearanceModal.status === "Completed"}
                              value={ast.returned ? "Yes" : "No"}
                              onChange={(e) => {
                                const val = e.target.value === "Yes";
                                const updatedAssets = [...clearanceModal.assignedAssets];
                                updatedAssets[aIdx].returned = val;
                                setClearanceModal(prev => ({ ...prev, assignedAssets: updatedAssets }));
                              }}
                              className="border rounded-lg px-2 py-1 bg-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="No">No</option>
                              <option value="Yes">Yes</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <select
                              disabled={clearanceModal.status === "Completed"}
                              value={ast.condition || "Good"}
                              onChange={(e) => {
                                const updatedAssets = [...clearanceModal.assignedAssets];
                                updatedAssets[aIdx].condition = e.target.value;
                                setClearanceModal(prev => ({ ...prev, assignedAssets: updatedAssets }));
                              }}
                              className="border rounded-lg px-2 py-1 bg-white font-medium outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="Excellent">Excellent</option>
                              <option value="Good">Good</option>
                              <option value="Minor Damage">Minor Damage</option>
                              <option value="Damaged">Damaged</option>
                              <option value="Lost">Lost</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              disabled={clearanceModal.status === "Completed"}
                              value={ast.remarks || ""}
                              onChange={(e) => {
                                const updatedAssets = [...clearanceModal.assignedAssets];
                                updatedAssets[aIdx].remarks = e.target.value;
                                setClearanceModal(prev => ({ ...prev, assignedAssets: updatedAssets }));
                              }}
                              placeholder="Notes..."
                              className="border rounded-lg px-2 py-1 w-full text-xs outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* IT Clearance Overall Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">IT Admin Clearance Remarks</label>
                <textarea
                  rows={2}
                  disabled={clearanceModal.status === "Completed"}
                  value={clearanceModal.overallRemarks || ""}
                  onChange={(e) => setClearanceModal(prev => ({ ...prev, overallRemarks: e.target.value }))}
                  placeholder="Final clearance notes e.g. All IT hardware returned and verified."
                  className="w-full border rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {clearanceModal.status === "Completed" && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs space-y-1">
                  <p><strong>Status:</strong> Exit Clearance Completed</p>
                  <p><strong>Verified By:</strong> {clearanceModal.verifiedBy || "IT Admin"} on {clearanceModal.verificationDate}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setClearanceModal(null)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-100"
              >
                Close
              </button>

              {clearanceModal.status !== "Completed" && (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await assetAPI.updateExitClearance(clearanceModal._id, {
                          status: "In Progress",
                          assignedAssets: clearanceModal.assignedAssets,
                          overallRemarks: clearanceModal.overallRemarks
                        });
                        alert("Exit Clearance saved as In Progress!");
                        setClearanceModal(null);
                        loadExitClearances();
                      } catch (err) {
                        alert("Error saving progress.");
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-sm"
                  >
                    Save Progress
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await assetAPI.updateExitClearance(clearanceModal._id, {
                          status: "Completed",
                          assignedAssets: clearanceModal.assignedAssets,
                          overallRemarks: clearanceModal.overallRemarks
                        });
                        alert("Exit Clearance completed successfully!");
                        setClearanceModal(null);
                        loadExitClearances();
                        loadAssets();
                        loadAllocations();
                      } catch (err) {
                        console.error("Error completing exit clearance:", err);
                        alert(err.response?.data?.error || "Error completing exit clearance.");
                      }
                    }}
                    className="px-5 py-2 bg-[#262760] text-white rounded-xl text-xs font-bold hover:bg-[#1a1c43] shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Complete Exit Clearance
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LOG MAINTENANCE MODAL */}
      {maintenanceFormOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveMaintenance} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center">
              <h3 className="text-lg font-bold">Schedule Asset Maintenance</h3>
              <button type="button" onClick={() => setMaintenanceFormOpen(false)} className="text-white hover:text-slate-200 font-bold">✕</button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Select Asset *</label>
                <select
                  required
                  value={maintenanceData.assetId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMaintenanceData(prev => ({ 
                      ...prev, 
                      assetId: val,
                      quantity: 1
                    }));
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose Asset --</option>
                  <optgroup label="Individual Assets">
                    {assets.filter(a => a.trackingType !== "Quantity").map(a => (
                      <option key={a._id} value={a.assetId}>{a.assetId} - {a.category} ({a.brandName} {a.version}) [{a.status}]</option>
                    ))}
                  </optgroup>
                  <optgroup label="Quantity-Based Assets">
                    {assets.filter(a => a.trackingType === "Quantity").map(a => (
                      <option key={a._id} value={a.assetId}>{a.category} - {a.itemType} ({a.location}) [Avail: {a.quantityDetails?.available || 0}]</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Show Quantity if selected asset is Quantity tracking */}
              {(() => {
                const selected = assets.find(a => a.assetId === maintenanceData.assetId);
                if (selected && selected.trackingType === "Quantity") {
                  return (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Quantity to send * (Max: {selected.quantityDetails?.available || 0})</label>
                      <input
                        type="number"
                        min="1"
                        max={selected.quantityDetails?.available || 1}
                        required
                        value={maintenanceData.quantity}
                        onChange={(e) => setMaintenanceData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  );
                }
                return null;
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Service Type *</label>
                  <select
                    required
                    value={maintenanceData.maintenanceType}
                    onChange={(e) => setMaintenanceData(prev => ({ ...prev, maintenanceType: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Repair">Repair</option>
                    <option value="General Service">General Service</option>
                    <option value="Warranty Claim">Warranty Claim</option>
                    <option value="Replacement">Replacement</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Estimated Cost (₹)</label>
                  <input
                    type="number"
                    value={maintenanceData.cost}
                    onChange={(e) => setMaintenanceData(prev => ({ ...prev, cost: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={maintenanceData.startDate}
                    onChange={(e) => setMaintenanceData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={maintenanceData.endDate}
                    onChange={(e) => setMaintenanceData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={maintenanceData.vendorName}
                  onChange={(e) => setMaintenanceData(prev => ({ ...prev, vendorName: e.target.value }))}
                  placeholder="e.g. Dell Service Center, local vendor"
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Issue Description *</label>
                <textarea
                  rows={3}
                  required
                  value={maintenanceData.description}
                  onChange={(e) => setMaintenanceData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the issue or service details..."
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMaintenanceFormOpen(false)}
                className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#262760] hover:bg-[#1a1c43] text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle className="h-4 w-4" />
                Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* COMPLETE MAINTENANCE MODAL */}
      {completeMntModalOpen && selectedMntRecord && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCompleteMaintenanceSubmit} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center">
              <h3 className="text-lg font-bold">Complete Asset Maintenance</h3>
              <button type="button" onClick={() => setCompleteMntModalOpen(false)} className="text-white hover:text-slate-200 font-bold">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div><span className="font-bold text-slate-500">Asset ID:</span> <span className="font-mono font-bold text-slate-800">{selectedMntRecord.assetId}</span></div>
                <div><span className="font-bold text-slate-500">Asset Name:</span> <span className="font-bold text-slate-800">{selectedMntRecord.assetName}</span></div>
                <div><span className="font-bold text-slate-500">Service Type:</span> <span className="font-bold text-slate-800">{selectedMntRecord.maintenanceType}</span></div>
                <div><span className="font-bold text-slate-500">Quantity:</span> <span className="font-bold text-slate-800">{selectedMntRecord.quantity || 1}</span></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Return Asset Condition *</label>
                <select
                  required
                  value={completeReturnCondition}
                  onChange={(e) => setCompleteReturnCondition(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Good">Good / Working</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Damaged">Damaged / Needs Repair</option>
                  <option value="Retired">Retired / Scrapped</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompleteMntModalOpen(false)}
                className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow transition-all"
              >
                Complete
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EXCEL IMPORT MODAL */}
      {excelImportOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleExcelImportSubmit} className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold">Import Assets from Excel</h3>
              <button type="button" onClick={() => setExcelImportOpen(false)} className="text-white hover:text-slate-200 font-bold">✕</button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Upload Caldim Asset Management Excel Workbook *</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-3 bg-slate-50 text-slate-600 hover:bg-slate-100 cursor-pointer font-bold transition-all">
                    <Upload className="h-4 w-4 text-[#f37021]" />
                    <span>Select File</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleExcelImportChange}
                      className="hidden"
                    />
                  </label>
                  {excelFileName && (
                    <span className="text-sm font-semibold text-slate-700 font-mono">{excelFileName}</span>
                  )}
                </div>
              </div>

              {excelParsingError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs font-bold">
                  {excelParsingError}
                </div>
              )}

              {excelPreviewData.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Asset Preview (Detected {excelPreviewData.length} Items)</h4>
                    <span className="text-xs text-amber-600 font-bold">Duplicate Asset IDs present in system will be automatically skipped during import.</span>
                  </div>

                  <div className="overflow-x-auto border rounded-xl max-h-[40vh] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b text-slate-700 font-bold sticky top-0">
                          <th className="p-3 w-12">S.No</th>
                          <th className="p-3">Asset ID</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Brand & Model</th>
                          <th className="p-3">Serial No</th>
                          <th className="p-3">Bio's Date</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {excelPreviewData.map((ast, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="p-3 text-slate-500 font-medium">{index + 1}</td>
                            <td className="p-3 font-mono font-bold text-[#262760]">{ast.assetId}</td>
                            <td className="p-3 font-semibold text-slate-800">{ast.category}</td>
                            <td className="p-3">{ast.brandName} {ast.version}</td>
                            <td className="p-3 font-mono">{ast.serialNumber || "—"}</td>
                            <td className="p-3 font-mono">{!["Adapter", "Keyboard", "Mouse"].includes(ast.category) ? (ast.purchaseDate || "—") : "—"}</td>
                            <td className="p-3">
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                {ast.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setExcelImportOpen(false)}
                className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={excelPreviewData.length === 0}
                className={`px-5 py-2 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-1.5 ${
                  excelPreviewData.length === 0
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-[#262760] hover:bg-[#1a1c43] text-white"
                }`}
              >
                <CheckCircle className="h-4 w-4" />
                Confirm & Import
              </button>
            </div>
          </form>
        </div>
      )}
      {/* ADD ACCESSORY MODAL */}
      {addAccModalOpen && selectedAllocForAcc && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
          <form onSubmit={handleAddAccessorySubmit} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold">Add Accessory to Allocation</h3>
              <button
                type="button"
                onClick={() => {
                  setAddAccModalOpen(false);
                  setSelectedAllocForAcc(null);
                }}
                className="text-white hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
              {/* Allocation details info card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-500 uppercase tracking-wider mb-1">Target Allocation</div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Asset:</span>
                  <span className="font-bold text-[#262760]">{selectedAllocForAcc.category} ({selectedAllocForAcc.brandName})</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Asset ID:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedAllocForAcc.assetId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Employee:</span>
                  <span className="font-bold text-slate-700">{selectedAllocForAcc.employeeName} ({selectedAllocForAcc.employeeCode})</span>
                </div>
                {selectedAllocForAcc.components && selectedAllocForAcc.components.length > 0 && (
                  <div className="pt-2 border-t border-dashed border-slate-200">
                    <span className="font-semibold text-slate-500 block mb-1">Current Components:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedAllocForAcc.components.map((c, cIdx) => (
                        <span key={cIdx} className="bg-white border text-slate-600 px-2 py-0.5 rounded text-[10px] font-medium">
                          {c.category}: {c.assetId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Category selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Select Accessory Category *</label>
                <select
                  required
                  value={selectedAccCategory}
                  onChange={(e) => {
                    setSelectedAccCategory(e.target.value);
                    setSelectedAccAssetId("");
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                >
                  {getMissingAccessories(selectedAllocForAcc).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Asset list */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Select Available {selectedAccCategory} *</label>
                <select
                  required
                  value={selectedAccAssetId}
                  onChange={(e) => setSelectedAccAssetId(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                >
                  <option value="">-- Choose Available {selectedAccCategory} --</option>
                  {availableAccAssets.map(ast => (
                    <option key={ast._id} value={ast._id}>
                      {ast.assetId} - {ast.brandName} {ast.version ? `(${ast.version})` : ""}
                    </option>
                  ))}
                </select>
                {availableAccAssets.length === 0 && (
                  <p className="text-[11px] text-red-500 mt-1 font-semibold">No available {selectedAccCategory}s found in inventory.</p>
                )}
              </div>

              {/* Selected accessory info details card */}
              {selectedAccAssetId && (() => {
                const sel = assets.find(a => a._id === selectedAccAssetId);
                if (!sel) return null;
                return (
                  <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/50 text-xs animate-fadeIn space-y-1.5">
                    <div className="font-bold text-blue-700">{sel.category} Details</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-700">
                      <span className="font-semibold text-slate-500 font-normal">Asset ID:</span>
                      <span className="font-bold">{sel.assetId}</span>
                      <span className="font-semibold text-slate-500 font-normal">Brand Name:</span>
                      <span>{sel.brandName}</span>
                      {sel.version && (
                        <><span className="font-semibold text-slate-500 font-normal">Model / Version:</span><span>{sel.version}</span></>
                      )}
                      {sel.serialNumber && (
                        <><span className="font-semibold text-slate-500 font-normal">Serial Number:</span><span>{sel.serialNumber}</span></>
                      )}
                      <span className="font-semibold text-slate-500 font-normal">Condition:</span>
                      <span>{sel.condition}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAddAccModalOpen(false);
                  setSelectedAllocForAcc(null);
                }}
                className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedAccAssetId}
                className="px-4 py-2 bg-[#262760] text-white rounded-xl text-sm font-semibold hover:bg-[#1a1c43] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Allocation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
