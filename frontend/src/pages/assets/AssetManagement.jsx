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
  Filter
} from "lucide-react";
import { employeeAPI, assetAPI, BASE_URL } from "../../services/api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function AssetManagement() {
  const isRealAdmin = useMemo(() => {
    const loggedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
    const role = (loggedUser.role || "").trim().toLowerCase();
    const designation = (loggedUser.designation || "").trim().toLowerCase();
    return role === "admin" || role === "hr" || role === "director" || designation === "it admin";
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

  const [activeTab, setActiveTab] = useState("dashboard");

  // Core Data States
  const [assets, setAssets] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);

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
    division: "SDS",
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
  const [allocationData, setAllocationData] = useState({
    assignedToId: "",
    allocatedDate: new Date().toISOString().split("T")[0]
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

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadAssets(),
      loadAllocations(),
      loadRequests(),
      loadEmployees(),
      loadHandoverHistory(),
      loadExitClearances()
    ]).finally(() => setLoading(false));
  }, []);

  // Dropdown options & Dynamic Category Configuration
  const categories = useMemo(() => {
    const baseCats = ["Laptop", "Desktop 1", "Desktop 2", "Monitor", "Keyboard", "Mouse", "Headset"];
    const masterCats = (assets || []).map(a => a.category).filter(Boolean);
    return Array.from(new Set([...baseCats, ...masterCats]));
  }, [assets]);

  const CATEGORY_CONFIG = useMemo(() => ({
    "Laptop": { showProcessor: true, showRam: true, showHardDisk: true },
    "Desktop 1": { showProcessor: true, showRam: true, showHardDisk: true },
    "Desktop 2": { showProcessor: true, showRam: true, showHardDisk: true },
    "Monitor": { showScreenSize: true },
    "Keyboard": { showKeyboardType: true },
    "Mouse": { showMouseType: true },
    "Headset": { showHeadsetType: true }
  }), []);

  const currentCategoryConfig = useMemo(() => {
    return CATEGORY_CONFIG[newAsset.category] || { showProcessor: true, showRam: true, showHardDisk: true };
  }, [CATEGORY_CONFIG, newAsset.category]);

  const handleCategoryChangeInForm = (selectedCat) => {
    const cfg = CATEGORY_CONFIG[selectedCat] || { showProcessor: true, showRam: true, showHardDisk: true };
    setNewAsset(prev => ({
      ...prev,
      category: selectedCat,
      processor: cfg.showProcessor ? prev.processor : "",
      ram: cfg.showRam ? (prev.ram || "8 GB") : "",
      hardDisk: cfg.showHardDisk ? (prev.hardDisk || "512 GB SSD") : "",
      screenSize: cfg.showScreenSize ? (prev.screenSize || "24 Inch") : "",
      keyboardType: cfg.showKeyboardType ? (prev.keyboardType || "Wired") : "",
      mouseType: cfg.showMouseType ? (prev.mouseType || "Wired") : "",
      headsetType: cfg.showHeadsetType ? (prev.headsetType || "Wired") : ""
    }));
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
    let damagedCount = assets.filter(a => a.status === "Damaged" || a.condition === "Damaged").length;
    let lostCount = assets.filter(a => a.status === "Scrapped" || a.condition === "Lost").length;

    (exitClearances || []).forEach(c => {
      (c.assignedAssets || []).forEach(a => {
        if (a.returned) returnedCount++;
        if (a.condition === "Damaged" || a.condition === "Minor Damage") damagedCount++;
        if (a.condition === "Lost") lostCount++;
      });
    });

    return {
      total: assets.length,
      assigned: assets.filter(a => a.status === "Assigned").length,
      available: assets.filter(a => a.status === "Available").length,
      damaged: damagedCount,
      totalRequests: requests.length,
      pendingRequests: requests.filter(r => r.status === "Pending").length,
      approvedRequests: requests.filter(r => r.status === "Approved").length,
      completedRequests: requests.filter(r => r.status === "Completed" || r.status === "Asset Allocated").length,
      rejectedRequests: requests.filter(r => r.status === "Rejected").length,
      pendingExitClearances,
      completedExitClearances,
      assetsReturned: returnedCount,
      lostAssets: lostCount
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

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const idStr = asset.assetId || "";
      const catStr = asset.category || "";
      const brandStr = asset.brandName || "";
      const procStr = asset.processor || "";
      const modelStr = asset.version || "";
      const seatStr = asset.seatNo || "";
      const divStr = asset.division || "";
      
      const matchSearch =
        idStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        catStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brandStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        procStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        modelStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seatStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        divStr.toLowerCase().includes(searchQuery.toLowerCase());
        
      const matchCat = categoryFilter === "All" || asset.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [assets, searchQuery, categoryFilter]);

  // Handlers
  const handleSaveAsset = async (e) => {
    e.preventDefault();
    try {
      const cfg = CATEGORY_CONFIG[newAsset.category] || { showProcessor: true, showRam: true, showHardDisk: true };

      // Build payload containing ONLY applicable fields for selected category
      const payload = {
        category: newAsset.category,
        brandName: newAsset.brandName,
        division: newAsset.division,
        version: newAsset.version,
        serialNumber: newAsset.serialNumber || "",
        purchaseDate: newAsset.purchaseDate,
        condition: newAsset.condition,
        location: newAsset.location,
        status: newAsset.status || "Available"
      };

      if (cfg.showProcessor) payload.processor = newAsset.processor;
      if (cfg.showRam) payload.ram = newAsset.ram;
      if (cfg.showHardDisk) payload.hardDisk = newAsset.hardDisk;
      if (cfg.showScreenSize) payload.screenSize = newAsset.screenSize;
      if (cfg.showKeyboardType) payload.keyboardType = newAsset.keyboardType;
      if (cfg.showMouseType) payload.mouseType = newAsset.mouseType;
      if (cfg.showHeadsetType) payload.headsetType = newAsset.headsetType;

      if (selectedAsset) {
        // Edit mode - Asset ID is read-only
        payload.assetId = selectedAsset.assetId;
        await assetAPI.update(selectedAsset._id, payload);
        alert("Asset updated successfully!");
      } else {
        // Create mode
        const numSuffix = (newAsset.assetId || "").trim();
        if (!numSuffix) {
          alert("Asset ID is mandatory.");
          return;
        }

        const fullAssetId = numSuffix.startsWith("CDTKHSD") ? numSuffix : `CDTKHSD${numSuffix}`;

        // Check for duplicate Asset ID
        const exists = assets.some(a => (a.assetId || "").toUpperCase() === fullAssetId.toUpperCase());
        if (exists) {
          alert("This Asset ID already exists.");
          return;
        }

        payload.assetId = fullAssetId;
        await assetAPI.create(payload);
        alert("Asset created successfully!");
      }
      setAssetFormOpen(false);
      setSelectedAsset(null);
      setNewAsset({
        assetId: "",
        category: "Laptop",
        brandName: "",
        division: "SDS",
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
      loadAssets();
    } catch (err) {
      console.error("Error saving asset:", err);
      alert(err.response?.data?.error || "Error saving asset. Please try again.");
    }
  };

  const handleOpenEditAsset = (asset) => {
    setSelectedAsset(asset);
    setNewAsset({
      assetId: asset.assetId,
      category: asset.category || "Laptop",
      brandName: asset.brandName || "",
      division: asset.division || "SDS",
      processor: asset.processor || "",
      version: asset.version || "",
      ram: asset.ram || "8 GB",
      hardDisk: asset.hardDisk || "512 GB SSD",
      serialNumber: asset.serialNumber || "",
      screenSize: asset.screenSize || "24 Inch",
      keyboardType: asset.keyboardType || "Wired",
      mouseType: asset.mouseType || "Wired",
      headsetType: asset.headsetType || "Wired",
      purchaseDate: asset.purchaseDate || "",
      condition: asset.condition || "New",
      location: asset.location || "Chennai Office",
      status: asset.status || "Available"
    });
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
    try {
      await assetAPI.allocate({
        assetId: allocateAsset._id,
        assignedToId: allocationData.assignedToId,
        allocatedDate: allocationData.allocatedDate
      });
      alert("Asset allocated successfully!");
      setAllocationFormOpen(false);
      setAllocateAsset(null);
      setAllocationData({
        assignedToId: "",
        allocatedDate: new Date().toISOString().split("T")[0]
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
      await assetAPI.allocateAssetForRequest(allocateModal.request._id, {
        assetId: allocateModal.selectedAssetId,
        allocatedDate: allocateModal.allocatedDate
      });
      alert(`Asset allocated successfully! Request updated to Completed.`);
      setAllocateModal(null);
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

  // Export functions
  const exportCSV = () => {
    const headers = [
      "Asset ID", "Category", "Brand Name", "Division", "Processor",
      "OS Version/Model", "RAM", "Hard Disk", "Seat No",
      "BIO's Date", "Condition", "Location", "Status"
    ];
    const rows = assets.map(a => [
      a.assetId, a.category, a.brandName, a.division, a.processor,
      a.version, a.ram, a.hardDisk, a.seatNo,
      a.purchaseDate, a.condition, a.location, a.status
    ]);
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
    const headers = [
      "Asset ID", "Category", "Brand Name", "Division", "Processor",
      "OS Version/Model", "RAM", "Hard Disk", "Seat No",
      "BIO's Date", "Condition", "Location", "Status"
    ];
    const rows = assets.map(a => [
      a.assetId, a.category, a.brandName, a.division, a.processor,
      a.version, a.ram, a.hardDisk, a.seatNo,
      a.purchaseDate, a.condition, a.location, a.status
    ]);
    const wsData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Asset Report");
    XLSX.writeFile(workbook, `Caldim_Asset_Report_${Date.now()}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");
    doc.text("Caldim Engineering Private Limited - Asset Report", 14, 15);
    const headers = [[
      "Asset ID", "Category", "Brand Name", "Division", "Processor",
      "OS Version/Model", "RAM", "Hard Disk", "Seat No",
      "BIO's Date", "Condition", "Location", "Status"
    ]];
    const rows = assets.map(a => [
      a.assetId, a.category, a.brandName, a.division, a.processor,
      a.version, a.ram, a.hardDisk, a.seatNo,
      a.purchaseDate, a.condition, a.location, a.status
    ]);
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
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 font-sans">
      {/* Tabs navigation */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === "dashboard"
              ? "border-[#f37021] text-[#262760]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="h-4 w-4" />
          Dashboard
        </button>

        {currentRole !== "Employee" && (
          <>
            <button
              onClick={() => setActiveTab("master")}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === "master"
                  ? "border-[#f37021] text-[#262760]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Asset Master
            </button>

            <button
              onClick={() => setActiveTab("allocation")}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === "allocation"
                  ? "border-[#f37021] text-[#262760]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <UserCheck className="h-4 w-4" />
              Allocations
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab("requests")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === "requests"
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
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === "exit"
                ? "border-[#f37021] text-[#262760]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <LogOut className="h-4 w-4" />
            Exit Clearance
          </button>
        )}
      </div>

      {loading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-center text-sm font-semibold mb-6 animate-pulse">
          Syncing with MongoDB Server Database...
        </div>
      )}

      {/* ======================================================== TAB CONTENT ======================================================== */}

      {/* DASHBOARD TAB */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {currentRole === "Employee" ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: "My Assigned Assets", val: employeeStats.assigned, color: "border-green-500 text-green-600 bg-green-50" },
                  { label: "Total Requests", val: employeeStats.totalRequests, color: "border-blue-500 text-blue-600 bg-blue-50" },
                  { label: "Pending Requests", val: employeeStats.pendingRequests, color: "border-amber-500 text-amber-600 bg-amber-50" },
                  { label: "Approved Requests", val: employeeStats.approvedRequests, color: "border-indigo-500 text-indigo-600 bg-indigo-50" },
                  { label: "Completed Requests", val: employeeStats.completedRequests, color: "border-emerald-500 text-emerald-600 bg-emerald-50" }
                ].map((stat, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl border bg-white shadow-sm ${stat.color}`}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{stat.label}</p>
                    <p className="text-3xl font-black mt-2">{stat.val}</p>
                  </div>
                ))}
              </div>

              {/* Employee Assigned Assets list */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-[#262760] mb-4">My Assigned Assets</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#262760] text-white">
                        <th className="p-4 font-bold text-white text-center w-12">S.No</th>
                        <th className="p-4 font-bold text-white">Asset ID</th>
                        <th className="p-4 font-bold text-white">Category</th>
                        <th className="p-4 font-bold text-white">Brand & Model</th>
                        <th className="p-4 font-bold text-white">Allocation Date</th>
                        <th className="p-4 font-bold text-white">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employeeStats.assetsList.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-slate-400 font-medium">No assets assigned to you currently.</td>
                        </tr>
                      ) : employeeStats.assetsList.map((al, idx) => (
                        <tr key={idx}>
                          <td className="p-4 text-center font-medium text-slate-500">{idx + 1}</td>
                          <td className="p-4 font-mono font-bold text-[#262760]">{al.assetId}</td>
                          <td className="p-4 font-semibold text-slate-800">{al.category}</td>
                          <td className="p-4">{al.brandName} {al.version || (al.asset && al.asset.version) || ""}</td>
                          <td className="p-4">{al.allocatedDate || "N/A"}</td>
                          <td className="p-4">{(al.asset && al.asset.location) || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {[
                  { label: "Total Assets", val: stats.total, color: "border-blue-500 text-blue-600 bg-blue-50" },
                  { label: "Assigned Assets", val: stats.assigned, color: "border-green-500 text-green-600 bg-green-50" },
                  { label: "Available Assets", val: stats.available, color: "border-indigo-500 text-indigo-600 bg-indigo-50" },
                  { label: "Pending Exit Clearances", val: stats.pendingExitClearances, color: "border-amber-500 text-amber-600 bg-amber-50" },
                  { label: "Completed Exit Clearances", val: stats.completedExitClearances, color: "border-emerald-500 text-emerald-600 bg-emerald-50" },
                  { label: "Assets Returned", val: stats.assetsReturned, color: "border-cyan-500 text-cyan-600 bg-cyan-50" },
                  { label: "Damaged Assets", val: stats.damaged, color: "border-red-500 text-red-600 bg-red-50" },
                  { label: "Lost Assets", val: stats.lostAssets, color: "border-purple-500 text-purple-600 bg-purple-50" }
                ].map((stat, idx) => (
                  <div key={idx} className={`p-4 rounded-2xl border bg-white shadow-sm ${stat.color}`}>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">{stat.label}</p>
                    <p className="text-2xl font-black mt-1">{stat.val}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Asset Status SVG Chart Widget */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                  <h2 className="text-lg font-bold text-[#262760] mb-4">Asset Status Summary</h2>
                  <div className="flex justify-center items-center h-48 relative">
                    {/* SVG Pie/Donut Chart */}
                    <svg width="160" height="160" viewBox="0 0 36 36" className="transform -rotate-90">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                      <circle
                        cx="18" cy="18" r="15.915" fill="none"
                        stroke="#10b981" strokeWidth="4"
                        strokeDasharray={`${(stats.assigned / (stats.total || 1)) * 100} ${100 - (stats.assigned / (stats.total || 1)) * 100}`}
                        strokeDashoffset="0"
                      />
                      <circle
                        cx="18" cy="18" r="15.915" fill="none"
                        stroke="#6366f1" strokeWidth="4"
                        strokeDasharray={`${(stats.available / (stats.total || 1)) * 100} ${100 - (stats.available / (stats.total || 1)) * 100}`}
                        strokeDashoffset={`${-((stats.assigned / (stats.total || 1)) * 100)}`}
                      />
                      <circle
                        cx="18" cy="18" r="15.915" fill="none"
                        stroke="#ef4444" strokeWidth="4"
                        strokeDasharray={`${(stats.damaged / (stats.total || 1)) * 100} ${100 - (stats.damaged / (stats.total || 1)) * 100}`}
                        strokeDashoffset={`${-(((stats.assigned + stats.available) / (stats.total || 1)) * 100)}`}
                      />
                    </svg>
                    <div className="absolute text-center">
                      <p className="text-2xl font-black text-[#262760]">{stats.total}</p>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Total Items</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mt-4">
                    <div className="bg-green-50 p-2 rounded-lg border border-green-200">
                      <span className="block w-2.5 h-2.5 bg-green-500 rounded-full mx-auto mb-1"></span>
                      <span className="font-semibold text-slate-500">Assigned</span>
                      <span className="block font-bold text-green-700">{stats.assigned}</span>
                    </div>
                    <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-200">
                      <span className="block w-2.5 h-2.5 bg-indigo-500 rounded-full mx-auto mb-1"></span>
                      <span className="font-semibold text-slate-500">Available</span>
                      <span className="block font-bold text-indigo-700">{stats.available}</span>
                    </div>
                    <div className="bg-red-50 p-2 rounded-lg border border-red-200">
                      <span className="block w-2.5 h-2.5 bg-red-500 rounded-full mx-auto mb-1"></span>
                      <span className="font-semibold text-slate-500">Damaged</span>
                      <span className="block font-bold text-red-700">{stats.damaged}</span>
                    </div>
                  </div>
                </div>

                {/* Recent Asset Activities */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
                  <h2 className="text-lg font-bold text-[#262760] mb-4">Recent Asset Activities</h2>
                  <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                    {assets.slice(0, 10).map((asset, idx) => (
                      <div key={idx} className="flex gap-4 items-start pb-3 border-b border-slate-100 last:border-b-0">
                        <div className="bg-slate-100 p-2.5 rounded-xl border">
                          <Briefcase className="h-4 w-4 text-[#262760]" />
                        </div>
                        <div className="flex-1 text-sm">
                          <p className="font-bold text-slate-800">{asset.brandName} {asset.version}</p>
                          <p className="text-slate-500 text-xs">
                            ID: <span className="font-semibold font-mono text-[#262760]">{asset.assetId}</span> • Category: <span className="font-semibold">{asset.category}</span> • Seat No: <span className="font-semibold">{asset.seatNo}</span>
                          </p>
                        </div>
                        <div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            asset.status === "Assigned"
                              ? "bg-green-100 text-green-700"
                              : asset.status === "Available"
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {asset.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ASSET MASTER TAB */}
      {activeTab === "master" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
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
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border rounded-xl px-3 py-2 text-sm bg-white"
              >
                <option value="All">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 text-sm hover:bg-slate-50 font-bold"
              >
                <Download className="h-4 w-4" />
                CSV
              </button>
              <button
                onClick={exportExcel}
                className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 text-sm hover:bg-slate-50 font-bold"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Excel
              </button>
              <button
                onClick={exportPDF}
                className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 text-sm hover:bg-slate-50 font-bold"
              >
                <FileText className="h-4 w-4 text-red-600" />
                PDF
              </button>
              <button
                onClick={() => {
                  setSelectedAsset(null);
                  setNewAsset({
                    assetId: "",
                    category: "Laptop",
                    brandName: "",
                    division: "SDS",
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
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[1300px]">
              <thead>
                <tr className="bg-[#262760] text-white">
                  <th className="p-4 font-bold text-white text-center w-12">S.No</th>
                  <th className="p-4 font-bold text-white">Asset ID</th>
                  <th className="p-4 font-bold text-white">Category</th>
                  <th className="p-4 font-bold text-white">Brand Name</th>
                  <th className="p-4 font-bold text-white">Division</th>
                  <th className="p-4 font-bold text-white">Processor</th>
                  <th className="p-4 font-bold text-white">OS Version / Model</th>
                  <th className="p-4 font-bold text-white">RAM</th>
                  <th className="p-4 font-bold text-white">Hard Disk</th>
                  <th className="p-4 font-bold text-white">BIO's Date</th>
                  <th className="p-4 font-bold text-white">Condition</th>
                  <th className="p-4 font-bold text-white">Location</th>
                  <th className="p-4 font-bold text-white">Status</th>
                  <th className="p-4 font-bold text-white text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan="14" className="p-8 text-center text-slate-400 font-medium">No assets matching the filters.</td>
                  </tr>
                ) : filteredAssets.map((asset, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/55 transition-colors">
                    <td className="p-4 text-center font-medium text-slate-500">{idx + 1}</td>
                    <td className="p-4 font-mono font-bold text-[#262760]">{asset.assetId}</td>
                    <td className="p-4">{asset.category}</td>
                    <td className="p-4 font-semibold text-slate-800">{asset.brandName}</td>
                    <td className="p-4">{asset.division}</td>
                    <td className="p-4">{asset.processor}</td>
                    <td className="p-4">{asset.version}</td>
                    <td className="p-4">{asset.ram}</td>
                    <td className="p-4">{asset.hardDisk}</td>
                    <td className="p-4">{asset.purchaseDate}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        asset.condition === "New" || asset.condition === "Excellent" || asset.condition === "Good"
                          ? "bg-slate-100 text-slate-750"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {asset.condition}
                      </span>
                    </td>
                    <td className="p-4">{asset.location}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        asset.status === "Assigned"
                          ? "bg-green-150 text-green-700"
                          : asset.status === "Available"
                          ? "bg-blue-150 text-blue-700"
                          : asset.status === "Under Maintenance"
                          ? "bg-amber-150 text-amber-700"
                          : "bg-red-150 text-red-700"
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 justify-center">
                        {asset.status !== "Assigned" && (
                          <button
                            onClick={() => {
                              setAllocateAsset(asset);
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
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg font-bold text-xs flex items-center gap-1 border border-red-200"
                          >
                            Return
                          </button>
                        )}
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
          <h2 className="text-xl font-bold text-[#262760] mb-6">Asset Allocation History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#262760] text-white">
                  <th className="p-4 font-bold text-white text-center w-12">S.No</th>
                  <th className="p-4 font-bold text-white">Asset ID</th>
                  <th className="p-4 font-bold text-white">Asset Name</th>
                  <th className="p-4 font-bold text-white">Allocated To</th>
                  <th className="p-4 font-bold text-white">Allocation Date</th>
                  <th className="p-4 font-bold text-white">Return Date</th>
                  <th className="p-4 font-bold text-white">Status</th>
                  <th className="p-4 font-bold text-white text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocations.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-400 font-medium">No allocation records currently.</td>
                  </tr>
                ) : allocations.map((al, idx) => (
                  <tr key={idx}>
                    <td className="p-4 text-center font-medium text-slate-500">{idx + 1}</td>
                    <td className="p-4 font-mono font-bold text-slate-700">{al.assetId}</td>
                    <td className="p-4 font-semibold text-slate-805">{al.category} ({al.brandName})</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold">{al.employeeName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{al.employeeCode}</span>
                      </div>
                    </td>
                    <td className="p-4">{al.allocatedDate || "N/A"}</td>
                    <td className="p-4">{al.returnDate || "-"}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        al.status === "Assigned" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                      }`}>
                        {al.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {al.status === "Assigned" ? (
                        <button
                          onClick={() => handleDeallocate(al._id)}
                          className="px-3 py-1.5 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold"
                        >
                          Return Checklist / Clear
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Returned ({al.conditionOnReturn || "Good"})</span>
                      )}
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
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  handoverSubTab === "queue"
                    ? "bg-[#262760] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Assigned Assets Queue ({allocations.filter(al => al.status === "Assigned").length})
              </button>
              <button
                type="button"
                onClick={() => setHandoverSubTab("history")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  handoverSubTab === "history"
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
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          ho.condition === "Excellent" || ho.condition === "Good"
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
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                  showReqFilters || activeFilterCount > 0
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
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
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
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block whitespace-nowrap ${
                        req.status === "Pending"
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
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        cl.status === "Pending"
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
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1 mx-auto whitespace-nowrap ${
                          cl.status === "Completed"
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
              
              {selectedAsset ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Asset ID (Read Only)</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedAsset.assetId}
                    className="w-full border rounded-xl px-3 py-2 bg-slate-100 outline-none text-sm text-slate-655 font-mono font-bold"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Asset ID *</label>
                  <div className="flex rounded-xl border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                    <span className="bg-slate-100 px-3 py-2 text-sm text-slate-600 font-mono font-bold border-r border-slate-300 select-none">
                      CDTKHSD
                    </span>
                    <input
                      type="text"
                      required
                      value={newAsset.assetId}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, ""); // Allow digits only
                        setNewAsset(prev => ({ ...prev, assetId: val }));
                      }}
                      placeholder="Enter numbers (e.g. 001)"
                      className="w-full px-3 py-2 outline-none text-sm font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Category *</label>
                <select
                  required
                  value={newAsset.category}
                  onChange={(e) => handleCategoryChangeInForm(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Brand Name *</label>
                <input
                  type="text" required
                  value={newAsset.brandName}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, brandName: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g. Dell, HP, Lenovo"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Division *</label>
                <div className="flex gap-2">
                  <select
                    required
                    value={newAsset.division}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, division: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const newDiv = prompt("Enter new Division name:");
                      if (newDiv && newDiv.trim()) {
                        const trimmed = newDiv.trim();
                        if (!divisions.includes(trimmed)) {
                          setDivisions(prev => [...prev, trimmed]);
                        }
                        setNewAsset(prev => ({ ...prev, division: trimmed }));
                      }
                    }}
                    className="bg-[#262760] hover:bg-[#1a1c43] text-white rounded-xl px-3 flex items-center justify-center font-bold text-sm"
                    title="Add Custom Division"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Processor (Only for Laptop & Desktops) */}
              {currentCategoryConfig.showProcessor && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Processor *</label>
                  <input
                    type="text" required
                    value={newAsset.processor}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, processor: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Intel i7 12th Gen, Ryzen 5"
                  />
                </div>
              )}

              {/* Model Number / Version */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Model Number / Version *</label>
                <input
                  type="text" required
                  value={newAsset.version}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, version: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g. Latitude 5420, Windows 11 Pro"
                />
              </div>

              {/* RAM (Only for Laptop & Desktops) */}
              {currentCategoryConfig.showRam && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">RAM *</label>
                  <select
                    required
                    value={newAsset.ram}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, ram: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    {rams.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}

              {/* Hard Disk (Only for Laptop & Desktops) */}
              {currentCategoryConfig.showHardDisk && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Hard Disk / SSD *</label>
                  <select
                    required
                    value={newAsset.hardDisk}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, hardDisk: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    {hardDisks.map(hd => <option key={hd} value={hd}>{hd}</option>)}
                  </select>
                </div>
              )}

              {/* Screen Size (Only for Monitor) */}
              {currentCategoryConfig.showScreenSize && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Screen Size *</label>
                  <input
                    type="text" required
                    value={newAsset.screenSize}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, screenSize: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. 24 Inch, 27 Inch"
                  />
                </div>
              )}

              {/* Keyboard Type (Only for Keyboard) */}
              {currentCategoryConfig.showKeyboardType && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Keyboard Type *</label>
                  <select
                    required
                    value={newAsset.keyboardType}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, keyboardType: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="Wired">Wired</option>
                    <option value="Wireless">Wireless</option>
                  </select>
                </div>
              )}

              {/* Mouse Type (Only for Mouse) */}
              {currentCategoryConfig.showMouseType && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Mouse Type *</label>
                  <select
                    required
                    value={newAsset.mouseType}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, mouseType: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="Wired">Wired</option>
                    <option value="Wireless">Wireless</option>
                  </select>
                </div>
              )}

              {/* Headset Type (Only for Headset) */}
              {currentCategoryConfig.showHeadsetType && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Headset Type *</label>
                  <select
                    required
                    value={newAsset.headsetType}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, headsetType: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="Wired">Wired</option>
                    <option value="Wireless">Wireless</option>
                  </select>
                </div>
              )}

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
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">BIO's Date *</label>
                <input
                  type="date" required
                  value={newAsset.purchaseDate}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, purchaseDate: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Condition */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Condition *</label>
                <select
                  required
                  value={newAsset.condition}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, condition: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  {conditions.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Location *</label>
                <select
                  required
                  value={newAsset.location}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  {locations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Status (Auto)</label>
                <input
                  type="text"
                  readOnly
                  value={newAsset.status}
                  className="w-full border rounded-xl px-3 py-2 bg-slate-100 outline-none text-sm text-slate-600 font-semibold"
                />
              </div>

            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setAssetFormOpen(false)} className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-100">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#262760] text-white rounded-xl text-sm font-semibold hover:bg-[#1a1c43]">Save Asset</button>
            </div>
          </form>
        </div>
      )}

      {/* ALLOCATION DIALOG */}
      {allocationFormOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAllocate} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center">
              <h3 className="text-lg font-bold">Assign Asset: {allocateAsset?.brandName} {allocateAsset?.version}</h3>
              <button type="button" onClick={() => setAllocationFormOpen(false)} className="text-white hover:text-slate-200">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Select Employee *</label>
                <select
                  required
                  value={allocationData.assignedToId}
                  onChange={(e) => setAllocationData(prev => ({ ...prev, assignedToId: e.target.value }))}
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
                <label className="block text-xs font-bold text-slate-500 mb-1">Allocation Date *</label>
                <input
                  type="date" required
                  value={allocationData.allocatedDate}
                  onChange={(e) => setAllocationData(prev => ({ ...prev, allocatedDate: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setAllocationFormOpen(false)} className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-100">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#262760] text-white rounded-xl text-sm font-semibold hover:bg-[#1a1c43]">Allocate</button>
            </div>
          </form>
        </div>
      )}

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
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center">
              <h3 className="text-base font-bold">Allocate Asset for Request</h3>
              <button type="button" onClick={() => setAllocateModal(null)} className="text-white hover:text-slate-200 font-bold">✕</button>
            </div>
            <div className="p-6 space-y-4 text-xs">
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
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2 text-xs">
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
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    viewRequestModal.status === "Pending"
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
    </div>
  );
}
