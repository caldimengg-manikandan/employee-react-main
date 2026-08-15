import React, { useState, useMemo, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import confetti from "canvas-confetti";
import {
  Coins,
  FileCheck,
  Clock,
  CheckCircle,
  Filter,
  Search,
  Download,
  Plus,
  Trash2,
  Edit,
  Eye,
  Check,
  X,
  Send,
  History,
  FileText,
  Building,
  User,
  AlertCircle
} from "lucide-react";
import { performancePayAPI, employeeAPI, payrollAPI } from "../../services/api";

const getCurrentFinancialYearShort = () => {
  return "2025-26";
};

const getFinancialYearOptions = () => {
  const current = getCurrentFinancialYearShort();
  const start = parseInt(current.split("-")[0], 10);
  return [
    current,
    `${start - 1}-${String(start).slice(2)}`,
    `${start - 2}-${String(start - 1).slice(2)}`,
  ];
};

const PerformancePay = () => {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const userRole = (user.role || "").toLowerCase();
  const hasAccess = ["admin", "hr", "director", "manager"].includes(userRole);
  const isAdmin = userRole === "admin";

  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Tabs for history / management
  const [activeTab, setActiveTab] = useState("current"); // "current" or "history"

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    financialYear: "All",
    department: "All",
    location: "All",
    status: "All",
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isViewLetterOpen, setIsViewLetterOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  // Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [downloadRecord, setDownloadRecord] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    department: "",
    designation: "",
    location: "",
    financialYear: getCurrentFinancialYearShort(),
    currentSalary: 0,
    performancePayAmount: "",
    reason: "Outstanding Performance",
    remarks: "",
    releaseDate: "2026-08-18",
    tdsAmount: 0,
  });

  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);

  const reasons = [
    "Outstanding Performance",
    "Project Completion Bonus",
    "Annual Bonus",
    "Client Appreciation",
    "Team Achievement",
    "Special Contribution",
    "Retention Bonus",
    "Performance Payouts"
  ];

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // Admin/HR sees all records
      const [recordsRes, empRes] = await Promise.all([
        performancePayAPI.getAll(),
        employeeAPI.getAllEmployees()
      ]);
      setRecords(recordsRes.data?.data || []);
      setEmployees(empRes.data || []);
    } catch (err) {
      console.error("Error loading performance pay data", err);
      setError("Failed to load records. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
          <p className="text-gray-500 mt-2">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // Derived filter options
  const departments = useMemo(() => {
    const list = records.map(r => r.department).filter(Boolean);
    return ["All", ...new Set(list)];
  }, [records]);

  const locations = useMemo(() => {
    const list = records.map(r => r.location).filter(Boolean);
    return ["All", ...new Set(list)];
  }, [records]);

  const financialYears = useMemo(() => {
    const list = getFinancialYearOptions();
    const existing = records.map(r => r.financialYear).filter(Boolean);
    return [...new Set([...list, ...existing])].sort().reverse();
  }, [records]);

  // Filters logic
  const filteredRecords = useMemo(() => {
    return records
      .filter(item => {
        const matchYear = filters.financialYear === "All" || item.financialYear === filters.financialYear;
        const matchDept = filters.department === "All" || item.department === filters.department;
        const matchLoc = filters.location === "All" || item.location === filters.location;
        const matchStatus = filters.status === "All" || 
          (filters.status === "DRAFT" ? item.status === "DRAFT" : item.status !== "DRAFT");
        const name = (item.employeeName || "").toLowerCase();
        const empId = (item.employeeId || "").toLowerCase();
        const term = searchTerm.toLowerCase();
        const matchSearch = name.includes(term) || empId.includes(term);
        return matchYear && matchDept && matchLoc && matchStatus && matchSearch;
      })
      .sort((a, b) => (a.employeeName || "").localeCompare(b.employeeName || ""));
  }, [records, filters, searchTerm]);

  // Table Totals
  const totals = useMemo(() => {
    return filteredRecords.reduce((acc, curr) => {
      acc.currentSalary += curr.currentSalary || 0;
      acc.performancePayAmount += curr.performancePayAmount || 0;
      return acc;
    }, { currentSalary: 0, performancePayAmount: 0 });
  }, [filteredRecords]);

  // Handle employee dropdown selection and fetch current salary
  const handleEmployeeSelect = async (emp) => {
    setEmployeeSearchTerm(emp.name);
    setIsEmployeeDropdownOpen(false);
    
    let currentSalary = 0;
    try {
      const payrollRes = await payrollAPI.getByEmployeeId(emp.employeeId);
      currentSalary = payrollRes.data ? (payrollRes.data.totalEarnings || 0) : (emp.gross || 0);
    } catch (e) {
      console.error("Error fetching employee payroll details", e);
      currentSalary = emp.gross || 0;
    }

    setFormData(prev => ({
      ...prev,
      employeeId: emp.employeeId,
      employeeName: emp.name,
      department: emp.department || emp.division || "",
      designation: emp.designation || "",
      location: emp.location || "Chennai",
      currentSalary
    }));
  };

  // Add / Edit submission
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!formData.employeeId) {
      setError("Please select an employee.");
      return;
    }
    if (!formData.performancePayAmount || parseFloat(formData.performancePayAmount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    try {
      if (selectedRecord) {
        if (selectedRecord.status === "DRAFT") {
          await performancePayAPI.update(selectedRecord._id, formData);
          setSuccessMsg("Performance Pay award updated successfully!");
        } else {
          // If already approved, update TDS & Release date provision
          await performancePayAPI.updateTds(selectedRecord._id, {
            tdsAmount: formData.tdsAmount,
            releaseDate: formData.releaseDate
          });
          setSuccessMsg("TDS and Release Date updated successfully!");
        }
      } else {
        await performancePayAPI.create(formData);
        setSuccessMsg("Performance Pay award created successfully!");
      }
      setIsAddEditOpen(false);
      fetchData();
      resetForm();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Operation failed.");
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: "",
      employeeName: "",
      department: "",
      designation: "",
      location: "",
      financialYear: getCurrentFinancialYearShort(),
      currentSalary: 0,
      performancePayAmount: "",
      reason: "Outstanding Performance",
      remarks: "",
      releaseDate: "2026-08-18",
      tdsAmount: 0,
    });
    setEmployeeSearchTerm("");
    setSelectedRecord(null);
  };

  const handleEdit = (record) => {
    setSelectedRecord(record);
    const rDate = record.releaseDate ? new Date(record.releaseDate).toISOString().split('T')[0] : "2026-08-18";
    setFormData({
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      department: record.department,
      designation: record.designation,
      location: record.location,
      financialYear: record.financialYear,
      currentSalary: record.currentSalary,
      performancePayAmount: record.performancePayAmount,
      reason: record.reason,
      remarks: record.remarks || "",
      releaseDate: rDate,
      tdsAmount: record.tdsAmount || 0,
    });
    setEmployeeSearchTerm(record.employeeName);
    setIsAddEditOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await performancePayAPI.remove(id);
      setSuccessMsg("Record deleted successfully.");
      fetchData();
    } catch (err) {
      setError("Failed to delete record.");
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      await performancePayAPI.approve(selectedIds);
      setSuccessMsg("Selected awards approved successfully!");
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      setError("Bulk approve failed.");
    }
  };

  const handleApproveSingle = async (id) => {
    try {
      await performancePayAPI.approve([id]);
      setSuccessMsg("Award approved successfully!");
      fetchData();
    } catch (err) {
      setError("Approve failed.");
    }
  };

  const handleBulkGenerateLetter = async () => {
    if (selectedIds.length === 0) return;
    try {
      await performancePayAPI.generateLetter(selectedIds);
      setSuccessMsg("Letters generated successfully!");
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      setError("Letter generation failed.");
    }
  };

  const handleBulkCredit = async () => {
    if (selectedIds.length === 0) return;
    try {
      await performancePayAPI.credit(selectedIds);
      setSuccessMsg("Marked selected awards as credited.");
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      setError("Bulk credit failed.");
    }
  };

  // Selection toggle
  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map(r => r._id));
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    const dataToExport = filteredRecords.map((r, i) => ({
      "S.No": i + 1,
      "Employee ID": r.employeeId,
      "Employee Name": r.employeeName,
      "Department": r.department,
      "Designation": r.designation,
      "Location": r.location,
      "Financial Year": r.financialYear,
      "Current Salary": r.currentSalary,
      "Performance Pay Amount": r.performancePayAmount,
      "Reason": r.reason,
      "Remarks": r.remarks || "",
      "Status": r.status === "DRAFT" ? "Draft" : "Approved",
      "Letter Gen Date": r.letterGeneratedDate ? new Date(r.letterGeneratedDate).toLocaleDateString() : "",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Performance Pay");
    XLSX.writeFile(wb, `Performance_Pay_${getCurrentFinancialYearShort()}.xlsx`);
  };

  // PDF Export for Table
  const handleExportPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFontSize(16);
    doc.text("Performance Pay Summary Report", 14, 14);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 20);

    // Total Performance Pay Card
    doc.setFillColor(243, 244, 246); // gray-100 background
    doc.setDrawColor(229, 231, 235); // gray-200 border
    doc.roundedRect(14, 24, 75, 18, 2, 2, "FD");
    
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text("TOTAL PERFORMANCE PAY", 18, 29);
    
    doc.setFontSize(11);
    doc.setTextColor(38, 39, 96); // primary color
    doc.text(`INR ${totals.performancePayAmount.toLocaleString("en-IN")}`, 18, 36);

    const headers = [
      ["S.No", "Emp ID", "Name", "Dept", "Location", "FY", "Salary", "PP Amount", "Status"]
    ];

    const data = filteredRecords.map((r, i) => [
      i + 1,
      r.employeeId,
      r.employeeName,
      r.department,
      r.location,
      r.financialYear,
      r.currentSalary.toLocaleString(),
      r.performancePayAmount.toLocaleString(),
      r.status === "DRAFT" ? "DRAFT" : "APPROVED"
    ]);

    autoTable(doc, {
      head: headers,
      body: data,
      foot: [
        [
          "Total",
          "",
          "",
          "",
          "",
          "",
          totals.currentSalary.toLocaleString("en-IN"),
          totals.performancePayAmount.toLocaleString("en-IN"),
          ""
        ]
      ],
      startY: 46,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [38, 39, 96] },
      footStyles: { fillColor: [229, 231, 235], textColor: [17, 24, 39], fontStyle: "bold" }
    });

    doc.save("Performance_Pay_Report.pdf");
  };

  // PDF Award Letter Download
  const downloadAwardLetter = async (row, isDirect = false) => {
    let elementId = "award-letter-p1";
    if (isDirect) {
      setDownloadRecord(row);
      elementId = "award-letter-p1-hidden";
    }

    setTimeout(async () => {
      const element = document.getElementById(elementId);
      if (!element) {
        if (isDirect) setDownloadRecord(null);
        return;
      }

      try {
        const pdf = new jsPDF("p", "mm", "a4");
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.9);
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const finalHeight = Math.min(imgHeight, 297);

        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, finalHeight);
        pdf.save(`Performance_Pay_Letter_${row.employeeId}.pdf`);
      } catch (error) {
        console.error("Error generating award letter PDF", error);
        alert("Failed to download award letter.");
      } finally {
        if (isDirect) setDownloadRecord(null);
      }
    }, isDirect ? 150 : 0);
  };

  return (
    <div className="min-h-screen pb-20 font-sans relative overflow-hidden bg-gray-50 text-gray-800">
      {/* Header Panel */}
      <div className="sticky top-0 z-20 shadow-sm bg-white border-b border-gray-200 text-gray-800">
        <div className="max-w-[98%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Coins className="h-6 w-6 text-[#262760]" />
              <h1 className="text-xl font-bold text-gray-850">
                Performance Pay
              </h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                  isFilterOpen
                    ? "bg-indigo-50 border-[#262760] text-[#262760]"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </button>
              
              <button
                onClick={handleExportExcel}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50 font-medium"
              >
                Export Excel
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50 font-medium"
              >
                Export PDF
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setIsAddEditOpen(true);
                }}
                className="flex items-center px-4 py-2 rounded-md text-sm font-medium bg-[#262760] text-white hover:bg-[#1e2050] transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Performance Pay
              </button>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employee..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#262760] w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[98%] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 relative z-10">
        {/* Error / Success Notifications */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm flex items-center space-x-3 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-sm flex items-center space-x-3 text-green-700 animate-bounce">
            <CheckCircle className="h-5 w-5" />
            <span>{successMsg}</span>
          </div>
        )}        {/* Filters Panel */}
        {isFilterOpen && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Filter Records</h3>
              <button
                onClick={() => {
                  setFilters({
                    financialYear: "All",
                    department: "All",
                    location: "All",
                    status: "All",
                  });
                  setSearchTerm("");
                }}
                className="text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Financial Year</label>
                <select
                  value={filters.financialYear}
                  onChange={(e) => setFilters(prev => ({ ...prev, financialYear: e.target.value }))}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-[#262760] focus:border-[#262760]"
                >
                  <option value="All">All Years</option>
                  {financialYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
                </select>
              </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                    <select
                      value={filters.department}
                      onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-[#262760] focus:border-[#262760]"
                    >
                      {departments.map(dept => <option key={dept} value={dept}>{dept === "All" ? "All Departments" : dept}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                    <select
                      value={filters.location}
                      onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-[#262760] focus:border-[#262760]"
                    >
                      {locations.map(loc => <option key={loc} value={loc}>{loc === "All" ? "All Locations" : loc}</option>)}
                    </select>
                  </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-[#262760] focus:border-[#262760]"
                >
                  <option value="All">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="APPROVED">Approved</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Records Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">

              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#262760] text-white">
                  {/* Summary Row */}
                  <tr className="bg-indigo-50 text-gray-800 font-bold border-b border-indigo-150">
                    <th colSpan={7} className="px-6 py-2.5 text-right text-indigo-900 uppercase tracking-wider text-[10px]">
                      Total Current Salary:
                    </th>
                    <th className="px-6 py-2.5 text-right text-indigo-900 text-sm font-black tabular-nums border-r border-indigo-100">
                      ₹{totals.currentSalary.toLocaleString("en-IN")}
                    </th>
                    <th className="px-6 py-2.5 text-right text-emerald-700 text-sm font-black tabular-nums bg-emerald-100/50 shadow-sm border-x border-emerald-200/30">
                      ₹{totals.performancePayAmount.toLocaleString("en-IN")}
                    </th>
                    <th colSpan={4} className="bg-indigo-50"></th>
                  </tr>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">S.No</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Employee ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Employee Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Designation</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">FY</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">Current Salary</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">PP Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">TDS</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider">Release Date</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((row, idx) => (
                      <tr key={row._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{idx + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{row.employeeId}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800">{row.employeeName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{row.department}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{row.designation}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{row.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{row.financialYear}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600">₹{row.currentSalary.toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-[#262760]">₹{row.performancePayAmount.toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-red-600">
                          {row.tdsAmount > 0 ? `₹${row.tdsAmount.toLocaleString("en-IN")}` : "₹0"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600 font-medium">
                          {row.releaseDate ? new Date(row.releaseDate).toLocaleDateString("en-GB") : "18/08/2026"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2.5 py-1 text-xs rounded-full font-bold ${
                            row.status === "DRAFT" ? "bg-gray-100 text-gray-700" : "bg-blue-100 text-blue-800"
                          }`}>
                            {row.status === "DRAFT" ? "DRAFT" : "APPROVED"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleEdit(row)}
                              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded"
                              title={row.status === "DRAFT" ? "Edit Record" : "Update TDS / Release Date"}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {row.status === "DRAFT" && (
                              <>
                                <button
                                  onClick={() => handleDelete(row._id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleApproveSingle(row._id)}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                                  title="Approve Award"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={16} className="px-6 py-10 text-center text-gray-500">
                        No Performance Pay records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      {/* Add / Edit Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#262760] text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold">
                {selectedRecord ? (selectedRecord.status === "DRAFT" ? "Edit Performance Pay Award" : "Update TDS / Release Date") : "Add Performance Pay Award"}
              </h2>
              <button onClick={() => setIsAddEditOpen(false)} className="text-white hover:opacity-75">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Employee Search Component */}
                <div className="relative col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    disabled={!!selectedRecord}
                    value={employeeSearchTerm}
                    onChange={(e) => {
                      setEmployeeSearchTerm(e.target.value);
                      setIsEmployeeDropdownOpen(true);
                    }}
                    onFocus={() => !selectedRecord && setIsEmployeeDropdownOpen(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 disabled:bg-gray-150 disabled:cursor-not-allowed"
                    placeholder="Search employee by name or ID..."
                  />

                  {isEmployeeDropdownOpen && employees.length > 0 && (
                    <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {employees
                        .filter(
                          emp =>
                            emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                            emp.employeeId.toLowerCase().includes(employeeSearchTerm.toLowerCase())
                        )
                        .map(emp => (
                          <button
                            key={emp._id}
                            type="button"
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex flex-col border-b last:border-0"
                            onClick={() => handleEmployeeSelect(emp)}
                          >
                            <span className="font-semibold text-gray-800">{emp.name}</span>
                            <span className="text-xs text-gray-500">
                              {emp.employeeId} • {emp.designation} • {emp.department}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Employee ID</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.employeeId}
                    className="w-full px-3 py-2 border border-gray-250 bg-gray-100 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Department</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.department}
                    className="w-full px-3 py-2 border border-gray-250 bg-gray-100 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Designation</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.designation}
                    className="w-full px-3 py-2 border border-gray-250 bg-gray-100 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Location</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.location}
                    className="w-full px-3 py-2 border border-gray-250 bg-gray-100 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Current Salary</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.currentSalary ? `₹${formData.currentSalary.toLocaleString()}` : "-"}
                    className="w-full px-3 py-2 border border-gray-250 bg-gray-100 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Financial Year</label>
                  <select
                    disabled={selectedRecord && selectedRecord.status !== "DRAFT"}
                    value={formData.financialYear}
                    onChange={(e) => setFormData(p => ({ ...p, financialYear: e.target.value }))}
                    className="w-full border-gray-305 rounded-lg text-sm focus:ring-[#262760]"
                  >
                    {financialYears.filter(yr => yr !== "All").map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Performance Pay Amount *</label>
                  <input
                    type="number"
                    disabled={selectedRecord && selectedRecord.status !== "DRAFT"}
                    value={formData.performancePayAmount}
                    onChange={(e) => setFormData(p => ({ ...p, performancePayAmount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-900 disabled:bg-gray-100"
                    placeholder="Enter Award Amount"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">TDS Amount (₹)</label>
                  <input
                    type="number"
                    value={formData.tdsAmount}
                    onChange={(e) => setFormData(p => ({ ...p, tdsAmount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                    placeholder="Actual confirmed TDS (₹0 if none)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Release Date</label>
                  <input
                    type="date"
                    value={formData.releaseDate}
                    onChange={(e) => setFormData(p => ({ ...p, releaseDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea
                    disabled={selectedRecord && selectedRecord.status !== "DRAFT"}
                    value={formData.remarks}
                    onChange={(e) => setFormData(p => ({ ...p, remarks: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100"
                    placeholder="Provide additional details or achievements context..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#262760] text-white hover:bg-[#1e2050] font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-red-600 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold">Reject Performance Pay</h2>
              <button onClick={() => setIsRejectOpen(false)} className="text-white hover:opacity-75">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <label className="block text-sm font-medium text-gray-700">Rejection Reason</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                placeholder="Please state why you are rejecting this award..."
              />
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRejectOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectSubmit}
                  className="px-5 py-2 rounded-lg bg-red-600 text-white hover:bg-red-750 font-semibold"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PerformancePay;
