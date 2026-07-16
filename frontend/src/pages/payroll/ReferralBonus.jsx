import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Download,
  Filter,
  X,
  Calendar,
  User,
  Building2,
  Briefcase,
  CreditCard,
  Award,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
  DollarSign
} from "lucide-react";
import { employeeAPI, referralBonusAPI, BASE_URL } from "../../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import useNotification from "../../hooks/useNotification";
import Notification from "../../components/Notifications/Notification";
import Modal from "../../components/Modals/Modal";
const CANDIDATE_DESIGNATIONS = [
  "Trainee",
  "Managing Director (MD)",
  "General Manager (GM)",
  "Branch Manager",
  "Admin Manager",
  "Sr.Admin Manager",
  "Office Assistant",
  "IT Admin",
  "System Engineer",
  "Asst System Engineer",
  "Sr.Engineer",
  "Jr.Engineer",
  "Project Manager",
  "Sr Project Manager",
  "Asst Project Manager",
  "Delivery Manager",
  "Sr Team Lead",
  "Team Lead",
  "Jr Team Lead",
  "Software Developer",
  "HR Executive",
  "Accountant",
  "Sales Executive",
  "Marketing Manager",
  "Operations Manager",
  "Technical Support",
  "Network Engineer",
  "Sr. Modeler",
  "Jr. Modeler",
  "Sr. Checker",
  "Jr. Checker",
  "Detailer",
  "Sr. Detailer",
  "Jr. Detailer",
  "Modeler",
  "Quality Analyst",
  "Database Administrator",
  "Business Analyst",
  "Consultant"
].sort();

const calculateReferralBonus = (designation) => {
  if (!designation) {
    return {
      amount: 0,
      eligible: false,
      category: "None",
      remarks: "Designation is not eligible for Referral Bonus."
    };
  }

  const d = designation.trim().toLowerCase().replace(/\s+/g, ' ');

  const hasKeyword = (keywords) => keywords.some(k => d === k || d.includes(k));

  if (hasKeyword([
    'managing director', 'md', 'general manager', 'gm', 'branch manager', 
    'admin manager', 'sr.admin manager', 'sr. admin manager', 'project manager', 
    'sr project manager', 'senior project manager', 'asst project manager', 
    'assistant project manager', 'delivery manager', 'operations manager', 
    'marketing manager', 'consultant', 'director', 'manager'
  ])) {
    return { amount: 10000, eligible: true, category: "Project Manager & Above", remarks: "" };
  }

  if (hasKeyword([
    'team lead', 'teamlead', 'sr team lead', 'senior team lead', 'project co-ordinator', 'project coordinator'
  ])) {
    return { amount: 7500, eligible: true, category: "Team Lead & Above", remarks: "" };
  }

  if (hasKeyword([
    'sr. detailer', 'senior detailer', 'sr. checker', 'senior checker', 
    'sr. modeler', 'senior modeler', 'sr.engineer', 'senior engineer', 'sr. engineer',
    'system engineer', 'database administrator', 'dba', 'business analyst', 
    'software developer', 'quality analyst', 'qa engineer', 'qa analyst'
  ])) {
    return { amount: 5000, eligible: true, category: "Sr. Detailer, Sr. Checker & Above", remarks: "" };
  }

  if (hasKeyword([
    'jr. detailer', 'junior detailer', 'jr. checker', 'junior checker', 
    'jr. modeler', 'junior modeler', 'jr.engineer', 'junior engineer', 'jr. engineer',
    'asst system engineer', 'assistant system engineer', 'modeler', 'detailer', 
    'checker', 'technical support', 'network engineer', 'hr executive', 
    'accountant', 'sales executive', 'office assistant', 'it admin'
  ])) {
    return { amount: 2500, eligible: true, category: "Jr. Detailer, Jr. Checker & Above", remarks: "" };
  }

  return {
    amount: 0,
    eligible: false,
    category: "None",
    remarks: "Designation is not eligible for Referral Bonus."
  };
};

const parsePreviousExperienceToYears = (text) => {
  if (!text) return 0;
  const normalized = text.toLowerCase().trim();
  
  if (!isNaN(Number(normalized)) && normalized !== "") {
    return parseFloat(normalized);
  }
  
  let years = 0;
  const yearsMatch = normalized.match(/(\d+)\s*year/);
  if (yearsMatch) {
    years = parseFloat(yearsMatch[1]);
  }
  
  let months = 0;
  const monthsMatch = normalized.match(/(\d+)\s*month/);
  if (monthsMatch) {
    months = parseFloat(monthsMatch[1]);
  }
  
  const totalYears = years + (months / 12);
  return parseFloat(totalYears.toFixed(1));
};

const ReferralBonus = () => {
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  
  // Navigation tabs: 'dashboard' | 'referrals' | 'reports'
  const [activeTab, setActiveTab] = useState("dashboard");

  // Data States
  const [employees, setEmployees] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pendingProbation: 0,
    eligible: 0,
    approved: 0,
    paid: 0,
    rejected: 0,
    totalPaidAmount: 0
  });
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    referringEmployeeId: "",
    division: "",
    status: "",
    dateReferredStart: "",
    dateReferredEnd: "",
    dateOfJoiningStart: "",
    dateOfJoiningEnd: "",
    paymentDateStart: "",
    paymentDateEnd: ""
  });

  // Modal Controllers
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Report Specific States
  const [selectedReportType, setSelectedReportType] = useState("history");
  const [selectedReportEmployeeId, setSelectedReportEmployeeId] = useState("");
  const [selectedReportDivision, setSelectedReportDivision] = useState("");

  // Create/Edit Form State
  const [form, setForm] = useState({
    referringEmployeeId: "",
    referringEmployeeName: "",
    division: "",
    designation: "",
    candidateName: "",
    candidateEmployeeId: "",
    candidateDesignation: "",
    candidateExperience: "",
    dateReferred: new Date().toISOString().slice(0, 10),
    dateOfJoining: "",
    bonusAmount: 0,
    remarks: "",
    status: "Pending Probation",
    paymentDate: ""
  });

  const user = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  }, []);

  const isAdminSession = ["admin", "hr", "finance", "director", "manager"].includes(
    String(user.role || "").toLowerCase()
  );

  // Initial Data Fetch
  useEffect(() => {
    fetchEmployees();
    fetchReferrals();
    fetchStats();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.getAllEmployees();
      setEmployees(res.data || []);
    } catch (e) {
      console.error("Failed to load employees for dropdown", e);
    }
  };

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const res = await referralBonusAPI.list({});
      setReferrals(res.data?.data || []);
    } catch (e) {
      showError("Failed to load referral bonus records");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await referralBonusAPI.stats();
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.error("Failed to load statistics", e);
    }
  };

  // Memoized unique select lists for filters
  const divisionOptions = useMemo(() => {
    const divs = referrals.map((r) => r.division).filter(Boolean);
    return Array.from(new Set(divs)).sort();
  }, [referrals]);

  const referringEmployeesList = useMemo(() => {
    const list = referrals.map((r) => ({
      id: r.referringEmployeeId,
      name: r.referringEmployeeName
    }));
    const uniqueIds = Array.from(new Set(list.map((item) => item.id)));
    return uniqueIds.map((id) => list.find((item) => item.id === id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [referrals]);

  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      const idA = (a.employeeId || "").toString();
      const idB = (b.employeeId || "").toString();
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [employees]);

  // Handle Form Referring Employee Change Auto-Fill
  const onEmployeeChange = (employeeId) => {
    setForm((prev) => ({ ...prev, referringEmployeeId: employeeId }));
    const emp = employees.find(
      (e) => e.employeeId === employeeId || e.displayId === employeeId || e._id === employeeId
    );
    if (emp) {
      setForm((prev) => ({
        ...prev,
        referringEmployeeId: emp.employeeId || emp.displayId || emp._id,
        referringEmployeeName: emp.name || emp.employeename || "",
        division: emp.division || "",
        designation: emp.designation || emp.position || ""
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        referringEmployeeName: "",
        division: "",
        designation: ""
      }));
    }
  };

  const onCandidateDesignationChange = (designation) => {
    const calc = calculateReferralBonus(designation);
    setForm((prev) => {
      const nextForm = {
        ...prev,
        candidateDesignation: designation,
        bonusAmount: calc.amount
      };
      if (!calc.eligible) {
        nextForm.status = "Not Eligible";
        nextForm.remarks = calc.remarks;
      } else {
        if (prev.status === "Not Eligible") {
          nextForm.status = "Pending Probation";
          nextForm.remarks = "";
        }
      }
      return nextForm;
    });
  };

  const onCandidateEmployeeChange = (employeeId) => {
    const emp = employees.find(
      (e) => e.employeeId === employeeId || e.displayId === employeeId || e._id === employeeId
    );
    if (emp) {
      const designation = emp.designation || emp.position || "";
      const calc = calculateReferralBonus(designation);
      const experienceNum = parsePreviousExperienceToYears(emp.previousExperience || emp.experience || "");
      setForm((prev) => {
        const nextForm = {
          ...prev,
          candidateEmployeeId: emp.employeeId || emp.displayId || emp._id,
          candidateName: emp.name || emp.employeename || "",
          candidateDesignation: designation,
          candidateExperience: experienceNum,
          dateOfJoining: emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().slice(0, 10) : "",
          bonusAmount: calc.amount
        };
        if (!calc.eligible) {
          nextForm.status = "Not Eligible";
          nextForm.remarks = calc.remarks;
        } else {
          if (prev.status === "Not Eligible") {
            nextForm.status = "Pending Probation";
            nextForm.remarks = "";
          }
        }
        return nextForm;
      });
    } else {
      setForm((prev) => ({
        ...prev,
        candidateEmployeeId: ""
      }));
    }
  };

  // Reset Form fields
  const resetForm = () => {
    setEditingId(null);
    setForm({
      referringEmployeeId: "",
      referringEmployeeName: "",
      division: "",
      designation: "",
      candidateName: "",
      candidateEmployeeId: "",
      candidateDesignation: "",
      candidateExperience: "",
      dateReferred: new Date().toISOString().slice(0, 10),
      dateOfJoining: "",
      bonusAmount: 0,
      remarks: "",
      status: "Pending Probation",
      paymentDate: ""
    });
  };

  // Submit Create or Edit referral record
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.referringEmployeeId) {
      showError("Please select a referring employee");
      return;
    }
    if (!form.candidateName) {
      showError("Please enter the candidate name");
      return;
    }
    if (!form.candidateDesignation) {
      showError("Please enter candidate designation");
      return;
    }
    if (form.candidateExperience === "" || isNaN(Number(form.candidateExperience))) {
      showError("Please enter candidate experience in years");
      return;
    }
    if (!form.dateReferred) {
      showError("Please select the date referred");
      return;
    }
    if (Number(form.bonusAmount) > 10000) {
      showError("The maximum referral bonus amount is ₹10,000");
      return;
    }

    try {
      const dataPayload = {
        ...form,
        candidateExperience: Number(form.candidateExperience),
        bonusAmount: Number(form.bonusAmount)
      };

      if (editingId) {
        await referralBonusAPI.update(editingId, dataPayload);
        showSuccess("Referral bonus record updated successfully");
      } else {
        await referralBonusAPI.create(dataPayload);
        showSuccess("Referral bonus record created successfully");
      }
      setShowForm(false);
      resetForm();
      fetchReferrals();
      fetchStats();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to save referral bonus record");
    }
  };

  // Populate form for editing
  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({
      referringEmployeeId: item.referringEmployeeId || "",
      referringEmployeeName: item.referringEmployeeName || "",
      division: item.division || "",
      designation: item.designation || "",
      candidateName: item.candidateName || "",
      candidateEmployeeId: item.candidateEmployeeId || "",
      candidateDesignation: item.candidateDesignation || "",
      candidateExperience: item.candidateExperience ?? "",
      dateReferred: item.dateReferred ? String(item.dateReferred).slice(0, 10) : "",
      dateOfJoining: item.dateOfJoining ? String(item.dateOfJoining).slice(0, 10) : "",
      bonusAmount: item.bonusAmount ?? 10000,
      remarks: item.remarks || "",
      status: item.status || "Pending Probation",
      paymentDate: item.paymentDate ? String(item.paymentDate).slice(0, 10) : ""
    });
    setShowForm(true);
  };

  // Open Delete confirmation dialog
  const handleDelete = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  // Perform backend deletion
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await referralBonusAPI.delete(itemToDelete._id);
      showSuccess("Referral record deleted successfully");
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      fetchReferrals();
      fetchStats();
    } catch (err) {
      showError("Failed to delete record");
    }
  };

  // Filter local referral records based on Search + Filters UI
  const filteredReferrals = useMemo(() => {
    const searchVal = filters.search.trim().toLowerCase();
    
    return referrals.filter((item) => {
      // Search logic (Candidate Name, Referral ID, Referring Employee Name)
      const matchesSearch =
        !searchVal ||
        [item.referralId, item.candidateName, item.referringEmployeeName]
          .some((v) => (v || "").toLowerCase().includes(searchVal));

      const matchesEmployee =
        !filters.referringEmployeeId || item.referringEmployeeId === filters.referringEmployeeId;

      const matchesDiv = !filters.division || item.division === filters.division;
      
      const matchesStatus = !filters.status || item.status === filters.status;

      // Date Referred validation
      let matchesReferredDate = true;
      if (filters.dateReferredStart) {
        matchesReferredDate =
          matchesReferredDate &&
          item.dateReferred &&
          new Date(item.dateReferred) >= new Date(filters.dateReferredStart);
      }
      if (filters.dateReferredEnd) {
        matchesReferredDate =
          matchesReferredDate &&
          item.dateReferred &&
          new Date(item.dateReferred) <= new Date(filters.dateReferredEnd);
      }

      // Date of Joining validation
      let matchesJdDate = true;
      if (filters.dateOfJoiningStart) {
        matchesJdDate =
          matchesJdDate &&
          item.dateOfJoining &&
          new Date(item.dateOfJoining) >= new Date(filters.dateOfJoiningStart);
      }
      if (filters.dateOfJoiningEnd) {
        matchesJdDate =
          matchesJdDate &&
          item.dateOfJoining &&
          new Date(item.dateOfJoining) <= new Date(filters.dateOfJoiningEnd);
      }

      // Payment Date validation
      let matchesPayDate = true;
      if (filters.paymentDateStart) {
        matchesPayDate =
          matchesPayDate &&
          item.paymentDate &&
          new Date(item.paymentDate) >= new Date(filters.paymentDateStart);
      }
      if (filters.paymentDateEnd) {
        matchesPayDate =
          matchesPayDate &&
          item.paymentDate &&
          new Date(item.paymentDate) <= new Date(filters.paymentDateEnd);
      }

      return (
        matchesSearch &&
        matchesEmployee &&
        matchesDiv &&
        matchesStatus &&
        matchesReferredDate &&
        matchesJdDate &&
        matchesPayDate
      );
    });
  }, [referrals, filters]);

  // Filter list specifically for Reports tab
  const reportReferralsList = useMemo(() => {
    return referrals.filter((item) => {
      if (selectedReportType === "pending_probation") {
        return item.status === "Pending Probation";
      }
      if (selectedReportType === "eligible") {
        return item.status === "Eligible";
      }
      if (selectedReportType === "paid") {
        return item.status === "Paid";
      }
      if (selectedReportType === "employee_wise") {
        return !selectedReportEmployeeId || item.referringEmployeeId === selectedReportEmployeeId;
      }
      if (selectedReportType === "department_wise") {
        return !selectedReportDivision || item.division === selectedReportDivision;
      }
      // "history" report type returns all
      return true;
    });
  }, [referrals, selectedReportType, selectedReportEmployeeId, selectedReportDivision]);

  // Export Report to Excel
  const handleExportExcel = () => {
    const rows = reportReferralsList.map((c, idx) => ({
      "S.No": idx + 1,
      "Referral ID": c.referralId,
      "Referring Employee ID": c.referringEmployeeId,
      "Referring Employee Name": c.referringEmployeeName,
      Division: c.division,
      "Candidate Name": c.candidateName,
      "Candidate ID": c.candidateEmployeeId || "—",
      "Candidate Designation": c.candidateDesignation,
      "Experience (Years)": c.candidateExperience,
      "Date Referred": c.dateReferred ? new Date(c.dateReferred).toLocaleDateString() : "—",
      "Date of Joining": c.dateOfJoining ? new Date(c.dateOfJoining).toLocaleDateString() : "—",
      "Probation Completion": c.probationCompletionDate ? new Date(c.probationCompletionDate).toLocaleDateString() : "—",
      Eligibility: c.eligibility,
      "Bonus Amount (₹)": c.bonusAmount,
      Status: c.status,
      "Payment Date": c.paymentDate ? new Date(c.paymentDate).toLocaleDateString() : "—",
      Remarks: c.remarks || ""
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-fit column widths
    const max_widths = [];
    rows.forEach(row => {
      Object.keys(row).forEach((key, col_idx) => {
        const val = row[key] ? row[key].toString() : "";
        const cell_len = Math.max(val.length, key.toString().length);
        max_widths[col_idx] = Math.max(max_widths[col_idx] || 10, cell_len + 3);
      });
    });
    ws['!cols'] = max_widths.map(w => ({ wch: w }));

    const wb = XLSX.utils.book_new();
    
    let sheetName = "Referral Report";
    if (selectedReportType === "pending_probation") sheetName = "Pending Probation";
    else if (selectedReportType === "eligible") sheetName = "Eligible Referrals";
    else if (selectedReportType === "paid") sheetName = "Paid Referrals";
    else if (selectedReportType === "employee_wise") sheetName = "Employee Wise";
    else if (selectedReportType === "department_wise") sheetName = "Division Wise";

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    let filename = `Referral_Report_${selectedReportType}.xlsx`;
    XLSX.writeFile(wb, filename);
    showSuccess("Excel report downloaded");
  };

  const handleExportListExcel = () => {
    const rows = filteredReferrals.map((c, idx) => ({
      "S.No": idx + 1,
      "Referring Employee ID": c.referringEmployeeId,
      "Referring Employee Name": c.referringEmployeeName,
      Division: c.division,
      "Candidate Name": c.candidateName,
      "Candidate ID": c.candidateEmployeeId || "—",
      "Candidate Designation": c.candidateDesignation,
      "Experience (Years)": c.candidateExperience,
      "Date of Joining": c.dateOfJoining ? new Date(c.dateOfJoining).toLocaleDateString() : "—",
      "Probation Completion": c.probationCompletionDate ? new Date(c.probationCompletionDate).toLocaleDateString() : "—",
      Eligibility: c.eligibility,
      "Bonus Amount (₹)": c.bonusAmount,
      Status: c.status,
      "Payment Date": c.paymentDate ? new Date(c.paymentDate).toLocaleDateString() : "—",
      Remarks: c.remarks || ""
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-fit column widths
    const max_widths = [];
    rows.forEach(row => {
      Object.keys(row).forEach((key, col_idx) => {
        const val = row[key] ? row[key].toString() : "";
        const cell_len = Math.max(val.length, key.toString().length);
        max_widths[col_idx] = Math.max(max_widths[col_idx] || 10, cell_len + 3);
      });
    });
    ws['!cols'] = max_widths.map(w => ({ wch: w }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Referrals");
    XLSX.writeFile(wb, "Referrals_List.xlsx");
    showSuccess("Excel list downloaded");
  };

  const handleExportListPDF = async () => {
    const doc = new jsPDF("landscape");
    const reportTitle = "Referral List Report";
    const head = [
      [
        "S.No",
        "Referring ID",
        "Referring Name",
        "Division",
        "Candidate Name",
        "Designation",
        "Exp",
        "DOJ",
        "Probation End",
        "Eligibility",
        "Amount",
        "Status",
        "Payment Date"
      ]
    ];

    const body = filteredReferrals.map((c, idx) => [
      idx + 1,
      c.referringEmployeeId || "",
      c.referringEmployeeName || "",
      c.division || "",
      c.candidateName || "",
      c.candidateDesignation || "",
      c.candidateExperience ?? "",
      c.dateOfJoining ? new Date(c.dateOfJoining).toLocaleDateString() : "—",
      c.probationCompletionDate ? new Date(c.probationCompletionDate).toLocaleDateString() : "—",
      c.eligibility || "",
      `Rs. ${(c.bonusAmount || 0).toLocaleString()}`,
      c.status || "",
      c.paymentDate ? new Date(c.paymentDate).toLocaleDateString() : "—"
    ]);

    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(14);
    
    try {
      const res = await fetch("/images/steel-logo.png");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        doc.addImage(url, "PNG", 14, 8, 24, 10);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.warn("Logo loading failed for PDF generator", e.message);
    }

    doc.setTextColor("#262760");
    doc.text(reportTitle, pageWidth / 2, 15, { align: "center" });
    
    autoTable(doc, {
      head,
      body,
      startY: 24,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [38, 39, 96] }
    });

    doc.save("Referrals_List.pdf");
    showSuccess("PDF list downloaded");
  };

  // Export Report to PDF
  const handleExportPDF = async () => {
    const doc = new jsPDF("landscape");
    
    let reportTitle = "Referral History Report";
    if (selectedReportType === "pending_probation") reportTitle = "Pending Probation Referral Report";
    else if (selectedReportType === "eligible") reportTitle = "Eligible Referrals Report";
    else if (selectedReportType === "paid") reportTitle = "Paid Referrals Report";
    else if (selectedReportType === "employee_wise") {
      const emp = referringEmployeesList.find((e) => e.id === selectedReportEmployeeId);
      reportTitle = `Employee Referral Report - ${emp ? emp.name : "All Employees"}`;
    } else if (selectedReportType === "department_wise") {
      reportTitle = `Division Referral Report - ${selectedReportDivision || "All Divisions"}`;
    }

    const head = [
      [
        "S.No",
        "Referral ID",
        "Referring Employee",
        "Candidate Name",
        "Designation",
        "Exp",
        "DOJ",
        "Probation End",
        "Eligibility",
        "Amount",
        "Status"
      ]
    ];

    const body = reportReferralsList.map((c, idx) => [
      idx + 1,
      c.referralId || "",
      `${c.referringEmployeeName} (${c.referringEmployeeId})`,
      c.candidateName || "",
      c.candidateDesignation || "",
      c.candidateExperience ?? "",
      c.dateOfJoining ? new Date(c.dateOfJoining).toLocaleDateString() : "—",
      c.probationCompletionDate ? new Date(c.probationCompletionDate).toLocaleDateString() : "—",
      c.eligibility || "",
      `Rs. ${(c.bonusAmount || 0).toLocaleString()}`,
      c.status || ""
    ]);

    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(14);
    
    // Attempt to load Steel Logo in Header (Mirroring existing portal reports styling)
    try {
      const res = await fetch("/images/steel-logo.png");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const img = await new Promise((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = url;
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = "#262760";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const tinted = canvas.toDataURL("image/png");
        doc.addImage(tinted, "PNG", 10, 8, 24, 12);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.warn("Logo loading failed for PDF generator", e.message);
    }

    doc.setTextColor("#262760");
    doc.text(reportTitle, pageWidth / 2, 15, { align: "center" });
    
    autoTable(doc, {
      head,
      body,
      startY: 24,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [38, 39, 96] }
    });

    doc.save(`Referral_Report_${selectedReportType}.pdf`);
    showSuccess("PDF report downloaded");
  };

  // Helper colors for status pills
  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending Probation":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "Eligible":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Approved":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Paid":
        return "bg-green-50 text-green-700 border-green-200";
      case "Rejected":
        return "bg-red-50 text-red-700 border-red-200";
      case "Not Eligible":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getEligibilityBadge = (elig) => {
    switch (elig) {
      case "Yes":
        return "bg-green-50 text-green-700 border-green-200";
      case "No":
        return "bg-red-50 text-red-700 border-red-200";
      case "Pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // --- RENDER FUNCTIONS ---

  // Form rendering for Creation / Update
  const renderForm = () => (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#262760] to-indigo-700 text-white p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {editingId ? "Edit Referral Bonus Record" : "Create New Referral"}
          </h3>
          <button
            onClick={() => {
              setShowForm(false);
              resetForm();
            }}
            className="rounded-lg border border-white/30 px-3 py-1 hover:bg-white hover:text-[#262760] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
          {/* Referring Employee section */}
          <div className="rounded-2xl border border-gray-200 shadow-sm">
            <div className="px-6 pt-6 flex items-center gap-2 text-[#262760] font-semibold">
              <User className="h-5 w-5" /> Referring Employee
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Referring Employee ID</label>
                <select
                  required
                  className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#262760] transition"
                  value={form.referringEmployeeId}
                  onChange={(e) => onEmployeeChange(e.target.value)}
                >
                  <option value="">Select Employee</option>
                  {sortedEmployees.map((emp) => (
                    <option key={emp._id} value={emp.employeeId || emp._id}>
                      {`${emp.employeeId || emp._id} - ${emp.name}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee Name</label>
                <input
                  readOnly
                  className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 bg-gray-50 text-gray-600 focus:outline-none"
                  value={form.referringEmployeeName}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Division</label>
                <input
                  readOnly
                  className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 bg-gray-50 text-gray-600 focus:outline-none"
                  value={form.division}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Designation</label>
                <input
                  readOnly
                  className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 bg-gray-50 text-gray-600 focus:outline-none"
                  value={form.designation}
                />
              </div>
            </div>
          </div>

          {/* Candidate details section */}
          <div className="rounded-2xl border border-gray-200 shadow-sm">
            <div className="px-6 pt-6 flex items-center gap-2 text-[#262760] font-semibold">
              <Briefcase className="h-5 w-5" /> Candidate Details
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Candidate Employee ID</label>
                <select
                  required
                  className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#262760] transition bg-white text-sm"
                  value={form.candidateEmployeeId}
                  onChange={(e) => onCandidateEmployeeChange(e.target.value)}
                >
                  <option value="">Select Candidate Employee ID</option>
                  {sortedEmployees.map((emp) => (
                    <option key={emp._id} value={emp.employeeId || emp._id}>
                      {`${emp.employeeId || emp._id} - ${emp.name}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Candidate Name</label>
                <input
                  required
                  type="text"
                  placeholder="Enter full name"
                  className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#262760] transition bg-white text-sm"
                  value={form.candidateName}
                  onChange={(e) => setForm((prev) => ({ ...prev, candidateName: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Candidate Designation</label>
                <select
                  required
                  className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#262760] transition bg-white text-sm"
                  value={form.candidateDesignation}
                  onChange={(e) => onCandidateDesignationChange(e.target.value)}
                >
                  <option value="">Select Designation</option>
                  {CANDIDATE_DESIGNATIONS.map((desig) => (
                    <option key={desig} value={desig}>
                      {desig}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Experience (Years)</label>
                <input
                  required
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Years of experience"
                  className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#262760] transition bg-white text-sm"
                  value={form.candidateExperience}
                  onChange={(e) => setForm((prev) => ({ ...prev, candidateExperience: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Joining</label>
                <input
                  required
                  type="date"
                  className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#262760] transition bg-white text-sm"
                  value={form.dateOfJoining}
                  onChange={(e) => setForm((prev) => ({ ...prev, dateOfJoining: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Referral Bonus section */}
          <div className="rounded-2xl border border-gray-200 shadow-sm">
            <div className="px-6 pt-6 flex items-center gap-2 text-[#262760] font-semibold">
              <CreditCard className="h-5 w-5" /> Referral Bonus Details
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Bonus Amount (₹)</label>
                <input
                  readOnly
                  type="text"
                  className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 bg-gray-50 text-gray-600 focus:outline-none"
                  value={`₹${(form.bonusAmount || 0).toLocaleString()}`}
                />
              </div>

              {editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Workflow Status</label>
                  <select
                    className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#262760] transition bg-white text-sm"
                    value={form.status}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option>Pending Probation</option>
                    <option>Eligible</option>
                    <option>Approved</option>
                    <option>Paid</option>
                    <option>Rejected</option>
                    <option>Not Eligible</option>
                  </select>
                </div>
              )}

              {form.status === "Paid" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                  <input
                    type="date"
                    required
                    className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#262760] transition"
                    value={form.paymentDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Remarks</label>
                <textarea
                  placeholder="Internal remarks..."
                  rows={3}
                  className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#262760] transition"
                  value={form.remarks}
                  onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#262760] text-white px-5 py-2.5 rounded-xl shadow-lg hover:opacity-90 flex items-center gap-2 transition"
            >
              <Plus className="h-4 w-4" /> {editingId ? "Update Record" : "Save Referral"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Tab: Dashboard (Displays Summary Cards)
  const renderDashboardTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* Total Referrals Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-5 rounded-2xl shadow-sm border border-indigo-200/50 flex flex-col justify-between transition-all hover:scale-[1.02] duration-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-indigo-700">Total Referrals</span>
            <Award className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-indigo-900">{stats.total}</span>
          </div>
        </div>

        {/* Pending Probation Card */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-5 rounded-2xl shadow-sm border border-amber-200/50 flex flex-col justify-between transition-all hover:scale-[1.02] duration-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-amber-700">Pending Probation</span>
            <Calendar className="h-5 w-5 text-amber-600" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-amber-900">{stats.pendingProbation}</span>
          </div>
        </div>

        {/* Eligible Referrals Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-5 rounded-2xl shadow-sm border border-blue-200/50 flex flex-col justify-between transition-all hover:scale-[1.02] duration-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-blue-700">Eligible Referrals</span>
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-blue-900">{stats.eligible}</span>
          </div>
        </div>

        {/* Approved Referrals Card */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-5 rounded-2xl shadow-sm border border-purple-200/50 flex flex-col justify-between transition-all hover:scale-[1.02] duration-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-purple-700">Approved Referrals</span>
            <Briefcase className="h-5 w-5 text-purple-600" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-purple-900">{stats.approved}</span>
          </div>
        </div>

        {/* Paid Referrals Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 rounded-2xl shadow-sm border border-emerald-200/50 flex flex-col justify-between transition-all hover:scale-[1.02] duration-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-700">Paid Referrals</span>
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-emerald-900">{stats.paid}</span>
          </div>
        </div>

        {/* Rejected Referrals Card */}
        <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 p-5 rounded-2xl shadow-sm border border-rose-200/50 flex flex-col justify-between transition-all hover:scale-[1.02] duration-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-rose-700">Rejected Referrals</span>
            <XCircle className="h-5 w-5 text-rose-600" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-rose-900">{stats.rejected}</span>
          </div>
        </div>

        {/* Total Referral Bonus Paid Card */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-5 rounded-2xl shadow-md border-none flex flex-col justify-between transition-all hover:scale-[1.02] duration-200 text-white">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-violet-100/80">Total Bonus Paid</span>
            <DollarSign className="h-5 w-5 text-violet-200" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-white">₹{(stats.totalPaidAmount || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-left space-y-4">
        <div>
          <h4 className="text-base font-bold text-[#262760] mb-2">Referral Bonus Criteria</h4>
          <ul className="space-y-1 text-sm text-gray-600 list-disc pl-5">
            <li>Jr. Detailer / Jr. Checker & Above – <strong>₹2,500</strong></li>
            <li>Sr. Detailer / Sr. Checker & Above – <strong>₹5,000</strong></li>
            <li>Team Lead & Above – <strong>₹7,500</strong></li>
            <li>Project Manager & Above – <strong>₹10,000</strong></li>
          </ul>
        </div>
        <div>
          <h4 className="text-base font-bold text-[#262760] mb-2">Eligibility Criteria</h4>
          <ul className="space-y-1 text-sm text-gray-600 list-disc pl-5">
            <li>The referred candidate must meet the job requirements.</li>
            <li>The referred candidate must successfully complete the recruitment process.</li>
            <li>The referral bonus will be paid only after the referred employee completes the probation period and fulfils all company eligibility requirements.</li>
          </ul>
        </div>
      </div>
    </div>
  );

  // Tab: Referral List (Displays Filters, Tables, CRUD Controls)
  const renderReferralListTab = () => (
    <div className="bg-white rounded-2xl shadow p-6">
      {/* Search and Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className={`border px-3 py-2 rounded-lg flex items-center gap-2 transition ${
              showFilters ? "bg-gray-100 text-[#262760] border-indigo-300" : "hover:bg-gray-50"
            }`}
          >
            <Filter className="h-4 w-4" /> Filters
          </button>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              className="pl-9 w-64 border rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#262760]"
              placeholder="Search candidate, referrer..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportListPDF}
            className="border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 font-semibold text-gray-700 text-sm"
            title="Export List to PDF"
          >
            <Download className="h-4 w-4" /> PDF
          </button>
          <button
            onClick={handleExportListExcel}
            className="border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 font-semibold text-gray-700 text-sm"
            title="Export List to Excel"
          >
            <Download className="h-4 w-4" /> Excel
          </button>
          {isAdminSession && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="bg-[#262760] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition text-sm"
            >
              <Plus className="h-4 w-4" /> New Referral
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Panel */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 mb-4 bg-gray-50 rounded-xl text-left border border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Referring Employee</label>
            <select
              className="w-full border rounded-lg p-2 bg-white text-sm"
              value={filters.referringEmployeeId}
              onChange={(e) => setFilters((prev) => ({ ...prev, referringEmployeeId: e.target.value }))}
            >
              <option value="">All Employees</option>
              {referringEmployeesList.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Division</label>
            <select
              className="w-full border rounded-lg p-2 bg-white text-sm"
              value={filters.division}
              onChange={(e) => setFilters((prev) => ({ ...prev, division: e.target.value }))}
            >
              <option value="">All Divisions</option>
              {divisionOptions.map((div) => (
                <option key={div} value={div}>
                  {div}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
            <select
              className="w-full border rounded-lg p-2 bg-white text-sm"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option>Pending Probation</option>
              <option>Eligible</option>
              <option>Approved</option>
              <option>Paid</option>
              <option>Rejected</option>
            </select>
          </div>



          <div className="flex items-end">
            <button
              onClick={() =>
                setFilters({
                  search: "",
                  referringEmployeeId: "",
                  division: "",
                  status: "",
                  dateReferredStart: "",
                  dateReferredEnd: "",
                  dateOfJoiningStart: "",
                  dateOfJoiningEnd: "",
                  paymentDateStart: "",
                  paymentDateEnd: ""
                })
              }
              className="text-xs font-semibold text-red-600 hover:underline mb-2"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Main Table Grid */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left bg-[#262760] text-white">
              <th className="p-3 font-semibold">S.No</th>
              <th className="p-3 font-semibold">Referring Employee ID</th>
              <th className="p-3 font-semibold">Referring Employee Name</th>
              <th className="p-3 font-semibold">Division</th>
              <th className="p-3 font-semibold">Candidate Name</th>
              <th className="p-3 font-semibold">Designation</th>
              <th className="p-3 font-semibold">Exp</th>
              <th className="p-3 font-semibold">Probation End</th>
              <th className="p-3 font-semibold">Eligibility</th>
              <th className="p-3 font-semibold">Amount</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold">Payment Date</th>
              <th className="p-3 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReferrals.map((c, idx) => (
              <tr key={c._id} className="border-t hover:bg-gray-50/50 transition">
                <td className="p-3 font-medium text-gray-900">{idx + 1}</td>
                <td className="p-3 text-gray-600">{c.referringEmployeeId}</td>
                <td className="p-3 font-medium text-gray-800">{c.referringEmployeeName}</td>
                <td className="p-3 text-gray-600">{c.division}</td>
                <td className="p-3 text-gray-800 font-medium">{c.candidateName}</td>
                <td className="p-3 text-gray-600">{c.candidateDesignation}</td>
                <td className="p-3 text-gray-600">{c.candidateExperience} Yrs</td>
                <td className="p-3 text-gray-600">
                  {c.probationCompletionDate
                    ? new Date(c.probationCompletionDate).toLocaleDateString()
                    : "—"}
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs border ${getEligibilityBadge(c.eligibility)}`}>
                    {c.eligibility}
                  </span>
                </td>
                <td className="p-3 font-semibold text-gray-900">₹{(c.bonusAmount || 0).toLocaleString()}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs border font-medium ${getStatusBadge(c.status)}`}>
                    {c.status}
                  </span>
                </td>
                <td className="p-3 text-gray-600">
                  {c.paymentDate ? new Date(c.paymentDate).toLocaleDateString() : "—"}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      className="border border-gray-200 p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/20 transition"
                      onClick={() => setViewingItem(c)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {isAdminSession && c.status !== "Paid" && (
                      <>
                        <button
                          className="border border-gray-200 p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/20 transition"
                          onClick={() => handleEdit(c)}
                          title="Edit / Progression"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          className="border border-gray-200 p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50/20 transition"
                          onClick={() => handleDelete(c)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredReferrals.length === 0 && !loading && (
              <tr>
                <td className="p-8 text-center text-gray-500" colSpan={11}>
                  No referrals found matching the select criteria.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td className="p-8 text-center text-gray-500" colSpan={11}>
                  Loading referral records...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );



  // Detail Modal popup when viewing an item
  const renderViewModal = () => {
    if (!viewingItem) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl text-left">
          <div className="bg-gradient-to-r from-[#262760] to-indigo-700 text-white p-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Referral Bonus Detail ({viewingItem.referralId})</h3>
            <button
              className="rounded-lg border border-white/30 px-3 py-1 hover:bg-white hover:text-[#262760] transition"
              onClick={() => setViewingItem(null)}
            >
              Close
            </button>
          </div>
          <div className="p-6 space-y-5">
            {/* Employee Block */}
            <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100">
              <h4 className="font-bold text-[#262760] text-sm mb-3 flex items-center gap-2">
                <User className="h-4 w-4" /> Referring Employee Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Referring Employee</div>
                  <div className="font-semibold text-gray-900">
                    {viewingItem.referringEmployeeName} ({viewingItem.referringEmployeeId})
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Division</div>
                  <div className="font-semibold text-gray-900">{viewingItem.division}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Designation</div>
                  <div className="font-semibold text-gray-900">{viewingItem.designation}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Date Referred</div>
                  <div className="font-semibold text-gray-900">
                    {viewingItem.dateReferred ? new Date(viewingItem.dateReferred).toLocaleDateString() : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Candidate Block */}
            <div className="bg-emerald-50/30 rounded-2xl p-5 border border-emerald-100">
              <h4 className="font-bold text-[#262760] text-sm mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> Candidate Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Candidate Name</div>
                  <div className="font-semibold text-gray-900">{viewingItem.candidateName}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Candidate ID</div>
                  <div className="font-semibold text-gray-900">{viewingItem.candidateEmployeeId || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Candidate Designation</div>
                  <div className="font-semibold text-gray-900">{viewingItem.candidateDesignation}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Experience (Years)</div>
                  <div className="font-semibold text-gray-900">{viewingItem.candidateExperience} Years</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Date of Joining</div>
                  <div className="font-semibold text-gray-900">
                    {viewingItem.dateOfJoining ? new Date(viewingItem.dateOfJoining).toLocaleDateString() : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Probation Completion</div>
                  <div className="font-semibold text-gray-900">
                    {viewingItem.probationCompletionDate
                      ? new Date(viewingItem.probationCompletionDate).toLocaleDateString()
                      : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Referral Bonus Criteria Block */}
            <div className="bg-indigo-50/30 rounded-2xl p-5 border border-indigo-100">
              <h4 className="font-bold text-[#262760] text-sm mb-3 flex items-center gap-2">
                <Award className="h-4 w-4" /> Referral Bonus Criteria
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Position Category</div>
                  <div className="font-semibold text-gray-900">
                    {calculateReferralBonus(viewingItem.candidateDesignation).category}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Bonus Amount</div>
                  <div className="font-bold text-[#262760] text-lg">
                    ₹{(viewingItem.bonusAmount || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Eligibility Status</div>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-xs border ${getEligibilityBadge(viewingItem.eligibility)}`}>
                    {viewingItem.eligibility}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Payment Status</div>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-xs border font-medium ${getStatusBadge(viewingItem.status)}`}>
                    {viewingItem.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Bonus Details Block */}
            <div className="bg-amber-50/30 rounded-2xl p-5 border border-amber-100">
              <h4 className="font-bold text-[#262760] text-sm mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Bonus Payment details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Bonus Amount</div>
                  <div className="font-bold text-[#262760] text-lg">
                    ₹{(viewingItem.bonusAmount || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Eligibility</div>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-xs border ${getEligibilityBadge(viewingItem.eligibility)}`}>
                    {viewingItem.eligibility}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Workflow Status</div>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-xs border font-medium ${getStatusBadge(viewingItem.status)}`}>
                    {viewingItem.status}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Payment Date</div>
                  <div className="font-semibold text-gray-900">
                    {viewingItem.paymentDate ? new Date(viewingItem.paymentDate).toLocaleDateString() : "—"}
                  </div>
                </div>
                {viewingItem.rejectionReason && (
                  <div className="md:col-span-2 bg-red-50 p-3 rounded-xl border border-red-100 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-red-600">Rejection Reason</div>
                      <div className="text-sm text-red-700 font-medium">{viewingItem.rejectionReason}</div>
                    </div>
                  </div>
                )}
                {viewingItem.remarks && (
                  <div className="md:col-span-2">
                    <div className="text-xs text-gray-400 font-semibold uppercase">Remarks</div>
                    <div className="text-sm text-gray-700 italic font-medium">{viewingItem.remarks}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Navigation Tabs Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-left border-b border-gray-100 pb-4">
        <div className="bg-slate-900 p-1.5 rounded-xl inline-flex gap-1.5 shadow-md">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "dashboard" ? "bg-[#1e2050] text-white shadow-sm" : "text-violet-100/70 hover:bg-[#1e2050]/50 hover:text-white"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("referrals")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "referrals" ? "bg-[#1e2050] text-white shadow-sm" : "text-violet-100/70 hover:bg-[#1e2050]/50 hover:text-white"
            }`}
          >
            Referral List
          </button>
        </div>
      </div>

      {/* Render Active Tab */}
      {activeTab === "dashboard" && renderDashboardTab()}
      {activeTab === "referrals" && renderReferralListTab()}

      {/* Create / Edit Overlay form */}
      {showForm && renderForm()}

      {/* Detail Overlay View */}
      {renderViewModal()}

      {/* Delete Confirmation Dialog Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion" size="sm">
        <div className="space-y-4 text-left">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="w-10 h-10 flex-shrink-0" />
            <p className="text-sm font-medium">
              Are you sure you want to delete the referral record for candidate{" "}
              <span className="font-bold">{itemToDelete?.candidateName}</span>? This action is permanent and cannot be
              undone.
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification helper */}
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />
    </div>
  );
};

export default ReferralBonus;
