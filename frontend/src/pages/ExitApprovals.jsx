import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  TrashIcon,
  UserCircleIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  PaperClipIcon,
  BuildingOfficeIcon,
  CheckIcon,
  XMarkIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { exitFormalityAPI, employeeAPI, monthlyPayrollAPI } from '../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Modal, message, Input } from 'antd';

import { getAbsoluteSignatureUrl } from '../utils/signatureUtils';
import caldimLetterheadImg from '../assets/caldim_letterhead.png';
import caldimSealImg from '../assets/caldim_seal.png';


const ExitApproval = () => {
  const [loading, setLoading] = useState(true);
  const [exitForms, setExitForms] = useState([]);
  const [filteredForms, setFilteredForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [showRelievingLetter, setShowRelievingLetter] = useState(false);
  const [letterData, setLetterData] = useState(null);
  const [showExperienceLetter, setShowExperienceLetter] = useState(false);
  const [experienceLetterData, setExperienceLetterData] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({ 
    employeeName: '',
    employeeId: '',
    division: '',
    status: 'all',
    location: ''
  });
  const [employees, setEmployees] = useState([]);
  const [rejectModal, setRejectModal] = useState({ visible: false, formId: null, reason: '' });
  const [clearanceModal, setClearanceModal] = useState({ visible: false, formId: null, department: '', status: '', remarks: '' });
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState(null);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [viewingPhotoModal, setViewingPhotoModal] = useState({ open: false, url: '', name: '', id: '' });

  const getEmployeePhotoUrl = (form) => {
    if (!form) return null;
    const empObj = form.employeeId;
    if (typeof empObj === 'object' && empObj) {
      if (empObj.profilePicture) return empObj.profilePicture;
      if (empObj.photo) return empObj.photo;
    }
    const empCode = typeof empObj === 'object' ? empObj?.employeeId : (empObj || '');
    const emp = employees.find(e => (empCode && e.employeeId === empCode) || e.name === form.employeeName);
    return emp?.profilePicture || emp?.photo || null;
  };

  // Get current user role
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const userRole = user.role || '';
  const companyName = sessionStorage.getItem('companyName') || 'Caldim Engineering Private.Ltd';
  const companyAddress = sessionStorage.getItem('companyAddress') || 'Your Company Address';
  const hrManager = sessionStorage.getItem('hrManager') || "DIRECTOR";

  // Divisions list
  const divisions = ['Engineering', 'HR', 'Sales', 'Marketing', 'Finance', 'Operations'];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'clearance_in_progress', label: 'Clearance In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' }
  ];

  // Derive unique filter options from exitForms
  const uniqueEmployeeNames = React.useMemo(() => 
    [...new Set(exitForms.map(form => form.employeeName).filter(Boolean))].sort(),
  [exitForms]);

  const uniqueEmployeeIds = React.useMemo(() => 
    [...new Set(exitForms.map(form => form.employeeId?.employeeId).filter(Boolean))].sort(),
  [exitForms]);

  const uniqueDivisions = React.useMemo(() => 
    [...new Set(exitForms.map(form => form.department || form.division).filter(Boolean))].sort(),
  [exitForms]);

  const uniqueLocations = React.useMemo(() => {
    const locs = exitForms.map(form => {
      if (form.location) return form.location;
      const emp = employees.find(e => e.employeeId === form.employeeId?.employeeId);
      return emp?.location;
    }).filter(Boolean);
    
    // Normalize and unique
    const uniqueMap = new Map();
    locs.forEach(l => {
      if(l) uniqueMap.set(l.toLowerCase(), l);
    });
    return Array.from(uniqueMap.values()).sort();
  }, [exitForms, employees]);

  useEffect(() => {
    fetchExitForms();
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterForms();
  }, [exitForms, filters]);

  const fetchExitForms = async () => {
    setLoading(true);
    try {
      const res = await exitFormalityAPI.getAll();
      setExitForms(res.data.data || []);
    } catch (error) {
      console.error('Error fetching exit forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.getAllEmployees('all');
      setEmployees(res.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const formatLongDateWithSuffix = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '-';
    const day = date.getDate();
    const j = day % 10;
    const k = day % 100;
    let suffix = 'th';
    if (j === 1 && k !== 11) suffix = 'st';
    else if (j === 2 && k !== 12) suffix = 'nd';
    else if (j === 3 && k !== 13) suffix = 'rd';
    const month = date.toLocaleString('en-GB', { month: 'long' });
    const year = date.getFullYear();
    return `${day}${suffix} ${month} ${year}`;
  };

  const formatSalaryMonth = (salaryMonth) => {
    if (!salaryMonth) return '-';
    const parts = String(salaryMonth).split('-');
    if (parts.length < 2) return salaryMonth;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    if (isNaN(year) || isNaN(month)) return salaryMonth;
    const date = new Date(year, month, 1);
    return date.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
  };

  const salarySummary = React.useMemo(() => {
    if (!salaryHistory || salaryHistory.length === 0) {
      return { totalMonths: 0, totalNet: 0, totalCtc: 0 };
    }
    const totalNet = salaryHistory.reduce((sum, r) => sum + (Number(r.netSalary) || 0), 0);
    const totalCtc = salaryHistory.reduce((sum, r) => sum + (Number(r.ctc) || 0), 0);
    return {
      totalMonths: salaryHistory.length,
      totalNet,
      totalCtc
    };
  }, [salaryHistory]);

  const filterForms = () => {
    let result = [...exitForms];
    
    if (filters.status !== 'all') {
      result = result.filter(form => form.status === filters.status);
    }

    if (filters.employeeName) {
      result = result.filter(form => form.employeeName === filters.employeeName);
    }

    if (filters.employeeId) {
      result = result.filter(form => (form.employeeId?.employeeId || '') === filters.employeeId);
    }

    if (filters.division) {
      result = result.filter(form => form.department === filters.division || form.division === filters.division);
    }

    if (filters.location) {
      const loc = filters.location.toLowerCase();
      result = result.filter(form => {
        const formLoc = (form.location || '').toLowerCase();
        if (formLoc) return formLoc === loc;
        const empCode = form.employeeId?.employeeId;
        const emp = employees.find(e => e.employeeId === empCode);
        const empLoc = (emp?.location || '').toLowerCase();
        return empLoc === loc;
      });
    }

    setFilteredForms(result);
  };

  const safeFormatRelievingDate = (dateVal, formatOptions = { day: '2-digit', month: 'long', year: 'numeric' }) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      if (typeof dateVal === 'string') {
        const parts = dateVal.split(/[-/]/);
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          let year = parseInt(parts[2], 10);
          if (year < 100) year += 2000;
          const parsedD = new Date(year, month, day);
          if (!isNaN(parsedD.getTime())) {
            return parsedD.toLocaleDateString('en-GB', formatOptions);
          }
        }
      }
      return dateVal; // If all fails, just return the raw string rather than Invalid Date
    }
    return d.toLocaleDateString('en-GB', formatOptions);
  };

  const handleGenerateRelievingLetter = (form) => {
    if (form.status !== 'completed') {
      message.warning("Relieving letter can only be generated for completed exit requests.");
      return;
    }

    const empId = form.employeeId?.employeeId;
    const emp = employees.find(e => e.employeeId === empId);

    const joinDateRaw =
      emp?.dateOfJoining ||
      form.employeeDetails?.dateOfJoining ||
      form.joinDate;
      
    const lastWorkingRaw =
      form.proposedLastWorkingDay ||
      form.lastWorkingDay ||
      form.relievingDate;

    // To calculate years of service safely
    const calculateService = (startRaw, endRaw) => {
      if (!startRaw || !endRaw) return { years: 0, months: 0 };
      const start = new Date(startRaw);
      const end = new Date(endRaw);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return { years: 0, months: 0 };
      let years = end.getFullYear() - start.getFullYear();
      let months = end.getMonth() - start.getMonth();
      let days = end.getDate() - start.getDate();
      if (days < 0) months -= 1;
      if (months < 0) {
        years -= 1;
        months += 12;
      }
      return { years: Math.max(0, years), months: Math.max(0, months) };
    };

    const { years, months } = calculateService(joinDateRaw, lastWorkingRaw);

    const location = (form.location || emp?.location || '').toLowerCase().trim();
    
    let signatory = hrManager;
    const signatureImage = getAbsoluteSignatureUrl(location);
    
    if (location.includes('hosur')) {
      signatory = 'BALA';
    } else if (location.includes('chennai')) {
      signatory = 'UVARAJ';
    }

    const letterData = {
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      employeeName: form.employeeName,
      employeeAddress: form.employeeDetails?.address || 'Not specified',
      employeePhone: form.employeeDetails?.phone || 'Not specified',
      employeeId: form.employeeId?.employeeId || form.employeeDetails?.employeeId,
      designation: form.employeeDetails?.position || form.position,
      department: form.employeeDetails?.department || form.department,
      joinDate: safeFormatRelievingDate(joinDateRaw),
      lastWorkingDate: safeFormatRelievingDate(lastWorkingRaw),
      yearsOfService: years,
      monthsOfService: months,
      companyName: companyName,
      companyAddress: companyAddress,
      hrManager: signatory,
      signatureImage: signatureImage,
      resignationDate: safeFormatRelievingDate(form.createdAt || form.resignationDate || Date.now(), { day: '2-digit', month: '2-digit', year: 'numeric' }),
      finalSettlement: 'Full and final settlement has been processed.',
      assetsReturned: 'All company assets have been returned.',
      formalityCompleted: 'All exit formalities have been completed.'
    };

    setLetterData(letterData);
    setShowRelievingLetter(true);
  };

  const handleGenerateExperienceLetter = (form) => {
    if (form.status !== 'completed') {
      message.warning("Experience letter can only be generated for completed exit requests.");
      return;
    }

    const employeeId = form.employeeId?.employeeId;
    const empRecord = form.employeeDetails || employees.find(e => e.employeeId === employeeId);

    const joinDateRaw =
      empRecord?.dateOfJoining ||
      form.employeeDetails?.dateOfJoining ||
      form.joinDate;
    const lastWorkingRaw =
      form.proposedLastWorkingDay ||
      form.lastWorkingDay ||
      form.relievingDate;

    const joinDateObj = joinDateRaw ? new Date(joinDateRaw) : null;
    const lastWorkingObj = lastWorkingRaw ? new Date(lastWorkingRaw) : null;

    let experienceText = '';
    if (joinDateObj && lastWorkingObj && !isNaN(joinDateObj.getTime()) && !isNaN(lastWorkingObj.getTime())) {
      let years = lastWorkingObj.getFullYear() - joinDateObj.getFullYear();
      let months = lastWorkingObj.getMonth() - joinDateObj.getMonth();
      let days = lastWorkingObj.getDate() - joinDateObj.getDate();

      if (days < 0) {
        months -= 1;
      }
      if (months < 0) {
        years -= 1;
        months += 12;
      }

      const parts = [];
      if (years > 0) {
        parts.push(`${years} year${years > 1 ? 's' : ''}`);
      }
      if (months > 0) {
        parts.push(`${months} month${months > 1 ? 's' : ''}`);
      }
      if (parts.length === 0) {
        parts.push('less than one year');
      }
      experienceText = parts.join(' ');
    }

    const gender = (empRecord?.gender || '').toLowerCase();

    let prefix = '';
    let pronounSubject = 'their';
    let pronounPossessive = 'their';

    if (gender === 'male' || gender === 'm') {
      prefix = 'Mr. ';
      pronounSubject = 'his';
      pronounPossessive = 'his';
    } else if (gender === 'female' || gender === 'f') {
      prefix = 'Ms. ';
      pronounSubject = 'her';
      pronounPossessive = 'her';
    }

    const location = (form.location || empRecord?.location || '').toLowerCase().trim();
    
    let signatory = hrManager;
    const signatureImage = getAbsoluteSignatureUrl(location);

    if (location.includes('hosur')) {
      signatory = 'BALA';
    } else if (location.includes('chennai')) {
      signatory = 'UVARAJ';
    }

    const data = {
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      employeeName: form.employeeName,
      designation: form.employeeDetails?.position || form.position || '',
      joinDate: formatLongDateWithSuffix(joinDateRaw),
      lastWorkingDate: formatLongDateWithSuffix(lastWorkingRaw),
      prefix,
      pronounSubject,
      pronounPossessive,
      experienceText,
      companyName,
      hrManager: signatory,
      signatureImage: signatureImage
    };

    setExperienceLetterData(data);
    setShowExperienceLetter(true);
  };

  const downloadRelievingLetter = async () => {
    try {
      const element = document.getElementById('relieving-letter-template');
      if (!element) {
        message.error("Error generating letter. Please try again.");
        return;
      }
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let renderWidth = imgWidth;
      let renderHeight = imgHeight;

      if (imgHeight > pageHeight) {
        const ratio = pageHeight / imgHeight;
        renderWidth = imgWidth * ratio;
        renderHeight = imgHeight * ratio;
      }

      const x = (pageWidth - renderWidth) / 2;
      pdf.addImage(imgData, 'PNG', x, 0, renderWidth, renderHeight);
      const filename = `Relieving_Letter_${letterData.employeeId}_${letterData.employeeName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      message.error('Failed to generate PDF. Please try again.');
    }
  };

  const downloadExperienceLetter = async () => {
    try {
      const element = document.getElementById('experience-letter-template');
      if (!element) {
        message.error("Error generating letter. Please try again.");
        return;
      }
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let renderWidth = imgWidth;
      let renderHeight = imgHeight;

      if (imgHeight > pageHeight) {
        const ratio = pageHeight / imgHeight;
        renderWidth = imgWidth * ratio;
        renderHeight = imgHeight * ratio;
      }

      const x = (pageWidth - renderWidth) / 2;
      pdf.addImage(imgData, 'PNG', x, 0, renderWidth, renderHeight);
      const filename = `Experience_Letter_${experienceLetterData.employeeName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      message.error('Failed to generate PDF. Please try again.');
    }
  };

  const handleManagerApprove = (formId) => {
    Modal.confirm({
      title: 'Manager Approval',
      content: 'Are you sure you want to approve this exit request?',
      okText: 'Approve',
      cancelText: 'Cancel',
      onOk: async () => {
        setActionLoading(true);
        try {
          await exitFormalityAPI.managerApprove(formId);
          message.success("Manager approval recorded.");
          fetchExitForms();
          setSelectedForm(null);
        } catch (error) {
          console.error("Manager approval failed:", error);
          message.error("Failed to approve: " + (error.response?.data?.error || error.message));
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleHRApprove = (formId) => {
    Modal.confirm({
      title: 'Final Approval',
      content: 'Confirm FINAL approval and completion of exit?',
      okText: 'Approve & Complete',
      okType: 'primary',
      cancelText: 'Cancel',
      onOk: async () => {
        setActionLoading(true);
        try {
          await exitFormalityAPI.approve(formId);
          message.success("Exit process completed successfully.");
          fetchExitForms();
          setSelectedForm(null);
        } catch (error) {
          console.error("HR approval failed:", error);
          message.error("Failed to complete: " + (error.response?.data?.error || error.message));
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleDelete = (formId) => {
    Modal.confirm({
      title: 'Delete Exit Request',
      content: 'Are you sure you want to delete this exit request? This cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setActionLoading(true);
        try {
          await exitFormalityAPI.remove(formId);
          message.success("Exit request deleted.");
          fetchExitForms();
          if (selectedForm?._id === formId) setSelectedForm(null);
        } catch (error) {
          console.error("Delete failed:", error);
          message.error("Failed to delete: " + (error.response?.data?.error || error.message));
        } finally {
          setActionLoading(false);
        }
      }
    });
  };
  const handleReject = (formId) => {
    setRejectModal({ visible: true, formId, reason: '' });
  };

  const submitRejection = async () => {
    if (!rejectModal.reason) {
      message.error("Please enter a reason for rejection");
      return;
    }
    
    setActionLoading(true);
    try {
      await exitFormalityAPI.reject(rejectModal.formId, rejectModal.reason);
      message.success("Exit request rejected/cancelled.");
      fetchExitForms();
      setSelectedForm(null);
      setRejectModal({ visible: false, formId: null, reason: '' });
    } catch (error) {
      console.error("Rejection failed:", error);
      message.error("Failed to reject: " + (error.response?.data?.error || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearanceUpdate = (formId, department, status) => {
    setClearanceModal({ visible: true, formId, department, status, remarks: '' });
  };

  const submitClearanceUpdate = async () => {
    setActionLoading(true);
    try {
      await exitFormalityAPI.updateClearance(clearanceModal.formId, clearanceModal.department, clearanceModal.status, clearanceModal.remarks);
      const updatedForm = await exitFormalityAPI.getExitById(clearanceModal.formId);
      setSelectedForm(updatedForm.data.data);
      fetchExitForms();
      setClearanceModal({ visible: false, formId: null, department: '', status: '', remarks: '' });
      message.success(`Clearance updated for ${clearanceModal.department}`);
    } catch (error) {
      console.error("Clearance update failed:", error);
      message.error("Failed to update clearance");
    } finally {
      setActionLoading(false);
    }
  };

  const getClearanceStatusClass = (status) => {
    const value = (status || '').toLowerCase();
    if (value === 'pending') return 'bg-red-100 text-red-700';
    if (value === 'completed' || value === 'cleared' || value === 'approved') return 'bg-green-100 text-green-700';
    if (value === 'in_progress' || value === 'in progress') return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  const handleViewHistory = async (form) => {
    const empId = form.employeeId?.employeeId || form.employeeDetails?.employeeId || '';
    if (!empId) {
      message.error('Employee ID not available for history.');
      return;
    }
    const employeeName = form.employeeName || form.employeeDetails?.name || '';
    const division = form.department || form.division || form.employeeDetails?.department || '';
    const position = form.position || form.employeeDetails?.position || '';
    const location = (() => {
      if (form.location) return form.location;
      const emp = employees.find(e => e.employeeId === empId);
      return emp?.location || emp?.address || '';
    })();
    const photoUrl = getEmployeePhotoUrl(form);
    setHistoryEmployee({
      employeeId: empId,
      employeeName,
      division,
      position,
      location,
      profilePicture: photoUrl
    });
    setSalaryHistory([]);
    setHistoryVisible(true);
    setHistoryLoading(true);
    try {
      let salaryRecords = [];
      try {
        const response = await monthlyPayrollAPI.getEmployeeHistory(empId);
        salaryRecords = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : [];
      } catch (err) {
        if (err.response && (err.response.status === 404 || err.response.status === 500)) {
          const response = await monthlyPayrollAPI.list({});
          const allRecords = Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
            ? response
            : [];
          salaryRecords = allRecords.filter(r => String(r.employeeId) === String(empId));
        } else {
          throw err;
        }
      }
      salaryRecords.sort((a, b) => {
        const am = a.salaryMonth || '';
        const bm = b.salaryMonth || '';
        return String(am).localeCompare(String(bm));
      });
      setSalaryHistory(salaryRecords);
    } catch (error) {
      console.error('Error fetching salary history:', error);
      message.error('Failed to load salary history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': 
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'clearance_in_progress': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
          <div className="w-full">
             <label className="block text-sm font-medium text-gray-600 mb-2">Employee Name</label>
             <select
               value={filters.employeeName}
               onChange={(e) => setFilters(prev => ({ ...prev, employeeName: e.target.value }))}
               className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4"
             >
               <option value="">All</option>
               {uniqueEmployeeNames.map(name => (
                 <option key={name} value={name}>{name}</option>
               ))}
             </select>
          </div>
          <div className="w-full">
             <label className="block text-sm font-medium text-gray-600 mb-2">Employee ID</label>
             <select
               value={filters.employeeId}
               onChange={(e) => setFilters(prev => ({ ...prev, employeeId: e.target.value }))}
               className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4"
             >
               <option value="">All</option>
               {uniqueEmployeeIds.map(id => (
                 <option key={id} value={id}>{id}</option>
               ))}
             </select>
          </div>
          <div className="w-full">
             <label className="block text-sm font-medium text-gray-600 mb-2">Division</label>
             <select
               value={filters.division}
               onChange={(e) => setFilters(prev => ({ ...prev, division: e.target.value }))}
               className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4"
             >
               <option value="">All Divisions</option>
               {uniqueDivisions.map(div => (
                 <option key={div} value={div}>{div}</option>
               ))}
             </select>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-600 mb-2">Location</label>
            <select
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4"
            >
              <option value="">All Locations</option>
              {uniqueLocations.map(loc => (
                <option key={loc} value={loc.toLowerCase()}>{loc}</option>
              ))}
            </select>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-600 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#1e2050]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">S.No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Employee ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Employee Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Division</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">LWD</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="8" className="px-6 py-4 text-center">Loading...</td></tr>
              ) : filteredForms.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-4 text-center text-gray-500">No requests found</td></tr>
              ) : (
                filteredForms.map((form, index) => (
                  <tr key={form._id} className="hover:bg-indigo-50 transition-colors">
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {form.employeeId?.employeeId || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center space-x-3">
                        {(() => {
                          const photoUrl = getEmployeePhotoUrl(form);
                          const empIdCode = typeof form.employeeId === 'object' ? form.employeeId?.employeeId : (form.employeeId || '-');
                          return (
                            <div
                              onClick={() => photoUrl && setViewingPhotoModal({ open: true, url: photoUrl, name: form.employeeName, id: empIdCode })}
                              className={`relative group flex-shrink-0 w-10 h-10 rounded-full border-2 border-indigo-200 overflow-hidden shadow-sm ${photoUrl ? 'cursor-pointer hover:border-indigo-500 hover:scale-105 transition-all' : ''}`}
                              title={photoUrl ? "Click to view full photo" : "No photo available"}
                            >
                              {photoUrl ? (
                                <>
                                  <img src={photoUrl} alt={form.employeeName} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <MagnifyingGlassIcon className="w-4 h-4 text-white" />
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-[#262760] text-white flex items-center justify-center font-bold text-xs">
                                  {form.employeeName ? form.employeeName.charAt(0).toUpperCase() : 'E'}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        <span className="font-semibold text-gray-900">{form.employeeName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {form.department || form.division || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {form.proposedLastWorkingDay ? new Date(form.proposedLastWorkingDay).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs" title={form.reasonForLeaving}>
                      {form.reasonForLeaving?.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(form.status)}`}>
                        {form.status?.toUpperCase().replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedForm(form)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-indigo-50"
                          title="View Details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleViewHistory(form)}
                          className="text-amber-600 hover:text-amber-900 p-1 rounded-full hover:bg-amber-50"
                          title="View History"
                        >
                          <ClockIcon className="h-5 w-5" />
                        </button>
                        
                        {/* Inline Approve Action */}
                        {(['projectmanager', 'teamlead', 'admin'].includes(userRole) && !form.approvedByManager && form.status !== 'completed' && form.status !== 'rejected') && (
                          <button
                            onClick={() => handleManagerApprove(form._id)}
                            className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50"
                            title="Manager Approve"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                        )}
                        {(['hr', 'admin'].includes(userRole) && form.status !== 'completed' && form.status !== 'rejected') && (
                           <button
                             onClick={() => handleHRApprove(form._id)}
                             className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50"
                             title="HR Approve / Complete"
                           >
                             <CheckIcon className="h-5 w-5" />
                           </button>
                        )}

                        {/* Inline Reject Action */}
                        {(form.status !== 'completed' && form.status !== 'rejected' && form.status !== 'cancelled') && (
                          <button
                            onClick={() => handleReject(form._id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                            title="Reject"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        )}

                        {/* Delete */}
                        {(['admin','hr'].includes(userRole)) && (
                          <button
                            onClick={() => handleDelete(form._id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}

                        {form.status === 'completed' && (
                          <>
                            <button
                              onClick={() => handleGenerateRelievingLetter(form)}
                              className="text-purple-600 hover:text-purple-900 p-1 rounded-full hover:bg-purple-50"
                              title="Generate Relieving Letter"
                            >
                              <DocumentTextIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleGenerateExperienceLetter(form)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                              title="Generate Experience Letter"
                            >
                              <DocumentArrowDownIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Relieving Letter Modal */}
      {showRelievingLetter && letterData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Relieving Letter</h2>
                <p className="text-sm text-gray-500">Preview and download</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadRelievingLetter}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  Download PDF
                </button>
                <button 
                  onClick={() => setShowRelievingLetter(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-8 w-8" />
                </button>
              </div>
            </div>
            
            <div
              id="relieving-letter-template"
              className="bg-white relative w-[210mm] min-h-[297mm] h-[297mm] mx-auto shadow-2xl overflow-hidden flex flex-col justify-between p-0"
              style={{
                fontFamily: "'Trebuchet MS', 'Arial', sans-serif",
                backgroundImage: `url(${caldimLetterheadImg})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              {/* Top Spacing to clear Caldim Letterhead Header (165px) */}
              <div className="h-[165px] w-full shrink-0" />

              {/* Letter Body Area */}
              <main className="relative z-10 px-14 py-2 flex-1 flex flex-col justify-between">
                <div>
                  {/* Date Row */}
                  <div className="flex justify-end items-center mb-6 text-sm text-gray-700">
                    <div>
                      <span className="font-bold text-gray-700">Date: </span>
                      <span className="font-bold text-gray-900">{letterData.date}</span>
                    </div>
                  </div>

                  {/* To Block */}
                  <div className="mb-6 text-base">
                    <div className="font-bold text-gray-800">To:</div>
                    <div className="mt-1 font-bold text-lg text-gray-900">{letterData.employeeName}</div>
                    <div className="text-gray-700 font-medium">{letterData.designation}</div>
                  </div>

                  {/* Subject Block */}
                  <div className="mb-6">
                    <div className="font-bold text-base text-gray-900">
                      SUBJECT: <span className="font-normal underline decoration-gray-400 underline-offset-4">RELIEVING ORDER</span>
                    </div>
                  </div>

                  {/* Salutation */}
                  <div className="mb-5 text-base">
                    <div>Dear <span className="font-semibold text-gray-900">{letterData.employeeName}</span>,</div>
                  </div>

                  {/* Letter Content */}
                  <div className="space-y-5 text-justify text-base text-gray-800 leading-relaxed">
                    <p>This is to acknowledge the receipt of your resignation letter dated <span className="font-semibold text-gray-900">{letterData.resignationDate}</span>.</p>
                    <p>While accepting the same, we thank you very much for the close association you had with us during your tenure from <span className="font-semibold text-gray-900">{letterData.joinDate}</span> to <span className="font-semibold text-gray-900">{letterData.lastWorkingDate}</span> as a <span className="font-semibold text-gray-900">{letterData.designation}</span>. You have been relieved from your service with effect from the closing working hours of <span className="font-semibold text-gray-900">{letterData.lastWorkingDate}</span> and your work with us was found to be satisfactory.</p>
                    <p>We wish you all the best in your future career endeavors.</p>
                  </div>
                </div>

                {/* Authorized Signatory Block (Left Aligned matching LetterheadPreview) */}
                <div className="flex flex-col items-start mt-8 pb-4">
                  <p className="text-xs text-gray-600 italic mb-1">
                    For <strong>{companyName}</strong>
                  </p>

                  <div className="relative text-left min-w-[220px]">
                    <div className="h-20 flex items-center relative my-1">
                      {letterData.signatureImage && (
                        <img 
                          src={letterData.signatureImage} 
                          alt="Authorized Signatory Signature" 
                          className="h-14 object-contain max-w-[160px] relative z-10"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <img
                        src={caldimSealImg}
                        alt="CALDIM Official Seal"
                        className="h-20 w-20 object-contain absolute -top-1 left-24 z-20 pointer-events-none drop-shadow-sm"
                        onError={(e) => {
                          e.target.src = '/caldim_seal.png';
                        }}
                      />
                    </div>
                    <div className="border-b border-gray-900 mb-1 w-52" />
                    <p className="text-sm font-bold text-gray-900">Authorized Signatory</p>
                  </div>
                </div>
              </main>

              {/* Bottom Spacing to clear Caldim Letterhead Footer (75px) */}
              <div className="h-[75px] w-full shrink-0" />
            </div>
          </div>
        </div>
      )}

      {/* Experience Letter Modal */}
      {showExperienceLetter && experienceLetterData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Experience Letter</h2>
                <p className="text-sm text-gray-500">Preview and download</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadExperienceLetter}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  Download PDF
                </button>
                <button 
                  onClick={() => setShowExperienceLetter(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-8 w-8" />
                </button>
              </div>
            </div>
            
            <div
              id="experience-letter-template"
              className="bg-white relative w-[210mm] min-h-[297mm] h-[297mm] mx-auto shadow-2xl overflow-hidden flex flex-col justify-between p-0"
              style={{
                fontFamily: "'Trebuchet MS', 'Arial', sans-serif",
                backgroundImage: `url(${caldimLetterheadImg})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              {/* Top Spacing to clear Caldim Letterhead Header (165px) */}
              <div className="h-[165px] w-full shrink-0" />

              {/* Letter Body Area */}
              <main className="relative z-10 px-14 py-2 flex-1 flex flex-col justify-between">
                <div>
                  {/* Date Row */}
                  <div className="flex justify-end items-center mb-8 text-sm text-gray-700">
                    <div>
                      <span className="font-bold text-gray-700">Date: </span>
                      <span className="font-bold text-gray-900">{experienceLetterData.date}</span>
                    </div>
                  </div>

                  {/* Document Title */}
                  <div className="text-center mb-8">
                    <h2 className="text-lg font-bold text-[#1b2752] uppercase tracking-wide border-b-2 border-[#1b2752] inline-block pb-1">
                      TO WHOMSOEVER IT MAY CONCERN
                    </h2>
                  </div>

                  {/* Body Paragraphs */}
                  <div className="space-y-6 text-justify text-base text-gray-800 leading-relaxed">
                    <p>
                      This is to certify that <span className="font-bold text-gray-900">{experienceLetterData.prefix}{experienceLetterData.employeeName}</span> has worked as a <span className="font-bold text-gray-900">{experienceLetterData.designation}</span> in our organization from <span className="font-bold text-gray-900">{experienceLetterData.joinDate}</span> to <span className="font-bold text-gray-900">{experienceLetterData.lastWorkingDate}</span>. During {experienceLetterData.pronounPossessive} tenure, {experienceLetterData.pronounSubject} performance and conduct were found to be satisfactory.
                    </p>
                    {experienceLetterData.experienceText && (
                      <p>
                        The total period of employment with our organization is{' '}
                        <span className="font-bold text-gray-900">{experienceLetterData.experienceText}</span>.
                      </p>
                    )}
                    <p>We wish {experienceLetterData.pronounPossessive === 'his' ? 'him' : experienceLetterData.pronounPossessive === 'her' ? 'her' : 'them'} all success in {experienceLetterData.pronounPossessive} future endeavors.</p>
                    <p className="pt-2">Thanking you,</p>
                  </div>
                </div>

                {/* Authorized Signatory Block (Left Aligned matching LetterheadPreview) */}
                <div className="flex flex-col items-start mt-8 pb-4">
                  <p className="text-xs text-gray-600 italic mb-1">
                    For <strong>{experienceLetterData.companyName || companyName}</strong>
                  </p>

                  <div className="relative text-left min-w-[220px]">
                    <div className="h-20 flex items-center relative my-1">
                      {experienceLetterData.signatureImage && (
                        <img 
                          src={experienceLetterData.signatureImage} 
                          alt="Authorized Signatory Signature" 
                          className="h-14 object-contain max-w-[160px] relative z-10"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <img
                        src={caldimSealImg}
                        alt="CALDIM Official Seal"
                        className="h-20 w-20 object-contain absolute -top-1 left-24 z-20 pointer-events-none drop-shadow-sm"
                        onError={(e) => {
                          e.target.src = '/caldim_seal.png';
                        }}
                      />
                    </div>
                    <div className="border-b border-gray-900 mb-1 w-52" />
                    <p className="text-sm font-bold text-gray-900">Authorized Signatory</p>
                  </div>
                </div>
              </main>

              {/* Bottom Spacing to clear Caldim Letterhead Footer (75px) */}
              <div className="h-[75px] w-full shrink-0" />
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedForm && !showRelievingLetter && !showExperienceLetter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-indigo-100">
            {/* Modal Header */}
            <div className="p-6 border-b border-indigo-200 flex justify-between items-center sticky top-0 bg-gradient-to-r from-[#262760] via-indigo-600 to-[#f37021] text-white z-10">
              <div className="flex items-center space-x-4">
                {(() => {
                  const photoUrl = getEmployeePhotoUrl(selectedForm);
                  const empIdCode = typeof selectedForm.employeeId === 'object' ? selectedForm.employeeId?.employeeId : (selectedForm.employeeId || '-');
                  return (
                    <div
                      onClick={() => photoUrl && setViewingPhotoModal({ open: true, url: photoUrl, name: selectedForm.employeeName, id: empIdCode })}
                      className={`relative group flex-shrink-0 w-12 h-12 rounded-full border-2 border-white/80 overflow-hidden shadow-md ${photoUrl ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
                      title={photoUrl ? "Click to view full photo" : "No photo"}
                    >
                      {photoUrl ? (
                        <>
                          <img src={photoUrl} alt={selectedForm.employeeName} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <MagnifyingGlassIcon className="w-4 h-4 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-indigo-800 text-white flex items-center justify-center font-bold text-base">
                          {selectedForm.employeeName ? selectedForm.employeeName.charAt(0).toUpperCase() : 'E'}
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div>
                  <h2 className="text-xl font-bold">{selectedForm.employeeName}</h2>
                  <p className="text-sm opacity-90">
                    Exit Request Details • ID: {typeof selectedForm.employeeId === 'object' ? selectedForm.employeeId?.employeeId : (selectedForm.employeeId || '-')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedForm(null)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <XCircleIcon className="h-8 w-8" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 bg-gradient-to-b from-indigo-50/40 via-white to-orange-50/40">
              
              {/* 1. Employee Information Box */}
              <div className="bg-white rounded-2xl p-6 border border-indigo-100 shadow-sm">
                <h3 className="text-sm font-bold text-[#262760] uppercase tracking-wider mb-4 flex items-center">
                  <UserCircleIcon className="w-5 h-5 mr-2 text-indigo-600" />
                  Employee Profile Information
                </h3>
                
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                  {/* Passport Photo Frame */}
                  {(() => {
                    const photoUrl = getEmployeePhotoUrl(selectedForm);
                    const empIdCode = typeof selectedForm.employeeId === 'object' ? selectedForm.employeeId?.employeeId : (selectedForm.employeeId || '-');
                    return (
                      <div className="flex-shrink-0 flex flex-col items-center">
                        <div
                          onClick={() => photoUrl && setViewingPhotoModal({ open: true, url: photoUrl, name: selectedForm.employeeName, id: empIdCode })}
                          className={`relative group w-28 h-36 rounded-xl border-4 border-indigo-100 shadow-md overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center ${photoUrl ? 'cursor-pointer hover:border-indigo-400 hover:shadow-xl hover:scale-105 transition-all' : ''}`}
                          title={photoUrl ? "Click to view full photo" : "No photo"}
                        >
                          {photoUrl ? (
                            <>
                              <img src={photoUrl} alt={selectedForm.employeeName} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <MagnifyingGlassIcon className="w-6 h-6 text-white drop-shadow-md" />
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-indigo-400 p-2 text-center">
                              <UserCircleIcon className="w-10 h-10 mb-1" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">No Photo</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-gray-500 mt-1.5">Employee Photo</span>
                      </div>
                    );
                  })()}
                  
                  {/* Grid of Details */}
                  <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
                    <div className="border border-indigo-50 rounded-xl p-3.5 bg-indigo-50/30">
                      <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Employee ID</p>
                      <p className="font-bold text-sm mt-1 text-gray-900">{typeof selectedForm.employeeId === 'object' ? selectedForm.employeeId?.employeeId : (selectedForm.employeeId || '-')}</p>
                    </div>
                    <div className="border border-indigo-50 rounded-xl p-3.5 bg-indigo-50/30">
                      <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Employee Name</p>
                      <p className="font-bold text-sm mt-1 text-gray-900">{selectedForm.employeeName}</p>
                    </div>
                    <div className="border border-indigo-50 rounded-xl p-3.5 bg-indigo-50/30">
                      <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Email</p>
                      <p className="font-semibold text-sm mt-1 text-gray-900 truncate" title={selectedForm.employeeEmail || selectedForm.employeeId?.officialEmail || selectedForm.employeeId?.email}>
                        {selectedForm.employeeEmail || selectedForm.employeeId?.officialEmail || selectedForm.employeeId?.email || '-'}
                      </p>
                    </div>
                    <div className="border border-indigo-50 rounded-xl p-3.5 bg-indigo-50/30">
                      <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Division / Dept</p>
                      <p className="font-semibold text-sm mt-1 text-gray-900">{selectedForm.division || selectedForm.department || '-'}</p>
                    </div>
                    <div className="border border-indigo-50 rounded-xl p-3.5 bg-indigo-50/30">
                      <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Position / Role</p>
                      <p className="font-semibold text-sm mt-1 text-gray-900">{selectedForm.position || selectedForm.employeeId?.position || selectedForm.employeeId?.designation || '-'}</p>
                    </div>
                    <div className="border border-indigo-50 rounded-xl p-3.5 bg-indigo-50/30">
                      <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Date of Joining</p>
                      <p className="font-semibold text-sm mt-1 text-gray-900">
                        {selectedForm.dateOfJoining || selectedForm.employeeId?.dateOfJoining ? new Date(selectedForm.dateOfJoining || selectedForm.employeeId?.dateOfJoining).toLocaleDateString() : '-'}
                      </p>
                    </div>
                    <div className="border border-indigo-50 rounded-xl p-3.5 bg-indigo-50/30">
                      <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Location</p>
                      <p className="font-semibold text-sm mt-1 text-gray-900">
                        {(() => {
                          if (selectedForm.location) return selectedForm.location;
                          const empCode = typeof selectedForm.employeeId === 'object' ? selectedForm.employeeId?.employeeId : selectedForm.employeeId;
                          const emp = employees.find(e => e.employeeId === empCode);
                          return emp?.location || emp?.address || '-';
                        })()}
                      </p>
                    </div>
                    <div className="border border-indigo-50 rounded-xl p-3.5 bg-indigo-50/30">
                      <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Status / Stage</p>
                      <div className="mt-1 flex flex-wrap gap-1 items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(selectedForm.status)}`}>
                          {selectedForm.status?.toUpperCase().replace(/_/g, ' ')}
                        </span>
                        {selectedForm.currentStage && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-medium">
                            {selectedForm.currentStage.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Separation & Exit Details */}
              <div className="bg-white rounded-2xl p-6 border border-indigo-100 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#262760] uppercase tracking-wider flex items-center">
                  <DocumentTextIcon className="w-5 h-5 mr-2 text-indigo-600" />
                  Separation Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-gray-100 rounded-xl p-3.5 bg-gray-50/50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Proposed Last Working Day</p>
                    <p className="font-bold text-sm mt-1 text-gray-900">
                      {selectedForm.proposedLastWorkingDay ? new Date(selectedForm.proposedLastWorkingDay).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                    </p>
                  </div>
                  <div className="border border-gray-100 rounded-xl p-3.5 bg-gray-50/50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason for Exit</p>
                    <p className="font-bold text-sm mt-1 text-indigo-700">
                      {selectedForm.reasonForLeaving ? selectedForm.reasonForLeaving.replace(/_/g, ' ').toUpperCase() : '-'}
                    </p>
                  </div>
                  <div className="border border-gray-100 rounded-xl p-3.5 bg-gray-50/50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted Date</p>
                    <p className="font-semibold text-sm mt-1 text-gray-900">
                      {selectedForm.submittedDate || selectedForm.createdAt ? new Date(selectedForm.submittedDate || selectedForm.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </p>
                  </div>
                </div>

                {selectedForm.reasonDetails && (
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/70">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Detailed Comments / Reason</p>
                    <p className="text-sm text-gray-800 leading-relaxed">{selectedForm.reasonDetails}</p>
                  </div>
                )}

                {selectedForm.rejectionReason && (
                  <div className="border border-red-200 rounded-xl p-4 bg-red-50">
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-800 font-medium">{selectedForm.rejectionReason}</p>
                  </div>
                )}
              </div>

              {/* 3. Company Assets to Return */}
              <div className="bg-white rounded-2xl p-6 border border-indigo-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#262760] uppercase tracking-wider flex items-center">
                    <CheckBadgeIcon className="w-5 h-5 mr-2 text-indigo-600" />
                    Company Assets Return List
                  </h3>
                  {selectedForm.assetsToReturn && selectedForm.assetsToReturn.length > 0 && (
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-semibold border border-indigo-100">
                      Total Assets: {selectedForm.assetsToReturn.length}
                    </span>
                  )}
                </div>

                {selectedForm.assetsToReturn && selectedForm.assetsToReturn.length > 0 ? (
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">S.No</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Asset Type / Item</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Details / Serial No</th>
                          <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Return Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {selectedForm.assetsToReturn.map((ast, idx) => {
                          const parts = (ast.assetDetails || '').split(' || ');
                          const itemName = parts[0] || ast.assetType || 'Asset';
                          const serialNo = parts[2] || parts[1] || ast.assetDetails || '-';
                          return (
                            <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                              <td className="px-4 py-3 text-gray-500 font-medium">{idx + 1}</td>
                              <td className="px-4 py-3 font-semibold text-gray-900 capitalize">{itemName.replace(/_/g, ' ')}</td>
                              <td className="px-4 py-3 text-gray-600 font-mono text-xs">{serialNo}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${ast.returned ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                                  {ast.returned ? 'Returned' : 'Pending'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500">
                                {ast.returnDate ? new Date(ast.returnDate).toLocaleDateString() : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-xl text-center">
                    No custom assets listed. Standard ID Card and assigned hardware required upon departure.
                  </p>
                )}

                {selectedForm.itAssetClearanceInfo && (
                  <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/40 mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="font-bold text-emerald-800">IT Clearance Status:</span>
                      <span className="ml-2 font-bold text-emerald-700">{selectedForm.itAssetClearanceInfo.status || 'Completed'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-600">Cleared By:</span>
                      <span className="ml-2 font-semibold text-gray-800">{selectedForm.itAssetClearanceInfo.completedBy || 'IT Admin'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-600">Cleared Date:</span>
                      <span className="ml-2 font-mono text-gray-800">{selectedForm.itAssetClearanceInfo.completedDate || '-'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Department Clearances Section */}
              <div className="bg-white rounded-2xl p-6 border border-indigo-100 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#262760] uppercase tracking-wider flex items-center">
                  <CheckCircleIcon className="w-5 h-5 mr-2 text-indigo-600" />
                  Department Clearances Status
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {(selectedForm.clearanceDepartments || []).map((c, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">{c.department} Clearance</span>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${getClearanceStatusClass(c.status)}`}>
                            {c.status}
                          </span>
                        </div>
                        {c.approvedBy && (
                          <p className="text-xs text-gray-500 mt-1">
                            Approved by: <span className="font-semibold text-gray-800">{c.approvedBy}</span>
                          </p>
                        )}
                        {c.approvedDate && (
                          <p className="text-xs text-gray-400 font-mono mt-0.5">
                            {new Date(c.approvedDate).toLocaleDateString()}
                          </p>
                        )}
                        {c.remarks && (
                          <p className="text-xs text-gray-600 italic mt-2 bg-gray-50 p-2 rounded">
                            "{c.remarks}"
                          </p>
                        )}
                      </div>
                      
                      {(['admin', 'hr'].includes(userRole) || userRole === c.department) && (
                        <div className="mt-3 pt-2 border-t border-gray-100 flex gap-2 justify-end">
                          <button
                            onClick={() => handleClearanceUpdate(selectedForm._id, c.department, 'approved')}
                            className="text-xs px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-md font-semibold transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleClearanceUpdate(selectedForm._id, c.department, 'pending')}
                            className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-md font-semibold transition-colors"
                          >
                            Set Pending
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Feedback & Suggestions */}
              {(selectedForm.feedback || selectedForm.suggestions) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedForm.feedback && (
                    <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm">
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2">Experience Feedback</p>
                      <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-xl leading-relaxed">{selectedForm.feedback}</p>
                    </div>
                  )}
                  {selectedForm.suggestions && (
                    <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm">
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2">Company Suggestions</p>
                      <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-xl leading-relaxed">{selectedForm.suggestions}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 6. Handover & Knowledge Transfer Details */}
              {(selectedForm.handoverNotes || selectedForm.knowledgeTransfer?.details) && (
                <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm space-y-2">
                  <p className="text-xs font-bold text-[#262760] uppercase tracking-wide">Knowledge Transfer & Handover</p>
                  {selectedForm.knowledgeTransfer?.handoverTo && (
                    <p className="text-xs text-gray-600">Handover To: <span className="font-semibold text-gray-900">{selectedForm.knowledgeTransfer.handoverTo}</span></p>
                  )}
                  {selectedForm.knowledgeTransfer?.details && (
                    <p className="text-sm text-gray-800 bg-indigo-50/50 p-3 rounded-xl">{selectedForm.knowledgeTransfer.details}</p>
                  )}
                </div>
              )}

              {/* Modal Action Buttons Bar */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-200">
                {(['projectmanager','teamlead','admin'].includes(userRole) && !selectedForm.approvedByManager && selectedForm.status !== 'completed' && selectedForm.status !== 'rejected') && (
                  <button
                    onClick={() => handleManagerApprove(selectedForm._id)}
                    className="px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-sm transition-all"
                    disabled={actionLoading}
                  >
                    Manager Approve
                  </button>
                )}
                {(['hr','admin'].includes(userRole) && selectedForm.status !== 'completed' && selectedForm.status !== 'rejected') && (
                  <button
                    onClick={() => handleHRApprove(selectedForm._id)}
                    className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-all"
                    disabled={actionLoading}
                  >
                    HR Approve & Complete Exit
                  </button>
                )}
                {(selectedForm.status !== 'completed' && selectedForm.status !== 'rejected' && selectedForm.status !== 'cancelled') && (
                  <button
                    onClick={() => handleReject(selectedForm._id)}
                    className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-sm transition-all"
                    disabled={actionLoading}
                  >
                    Reject Exit Request
                  </button>
                )}
                {(['admin','hr'].includes(userRole)) && (
                  <button
                    onClick={() => handleDelete(selectedForm._id)}
                    className="px-4 py-2.5 bg-red-50 text-red-700 font-semibold border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
                    disabled={actionLoading}
                  >
                    Delete Request
                  </button>
                )}
                {selectedForm.status === 'completed' && (
                  <>
                    <button
                      onClick={() => handleGenerateRelievingLetter(selectedForm)}
                      className="px-4 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <DocumentTextIcon className="w-4 h-4" />
                      Relieving Letter
                    </button>
                    <button
                      onClick={() => handleGenerateExperienceLetter(selectedForm)}
                      className="px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <DocumentArrowDownIcon className="w-4 h-4" />
                      Experience Letter
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {historyVisible && historyEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-indigo-100">
            <div className="p-6 border-b border-indigo-200 flex justify-between items-center sticky top-0 bg-gradient-to-r from-[#262760] via-indigo-600 to-[#f37021] text-white z-10">
              <div className="flex items-center space-x-4">
                <div
                  onClick={() => historyEmployee.profilePicture && setViewingPhotoModal({ open: true, url: historyEmployee.profilePicture, name: historyEmployee.employeeName, id: historyEmployee.employeeId })}
                  className={`relative group flex-shrink-0 w-12 h-12 rounded-full border-2 border-white/80 overflow-hidden shadow-md ${historyEmployee.profilePicture ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
                  title={historyEmployee.profilePicture ? "Click to view full photo" : "No photo"}
                >
                  {historyEmployee.profilePicture ? (
                    <>
                      <img src={historyEmployee.profilePicture} alt={historyEmployee.employeeName} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <MagnifyingGlassIcon className="w-4 h-4 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-indigo-800 text-white flex items-center justify-center font-bold text-base">
                      {historyEmployee.employeeName ? historyEmployee.employeeName.charAt(0).toUpperCase() : 'E'}
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold">Employee Departure Records</h2>
                  <p className="text-sm opacity-90">
                    {historyEmployee.employeeName} • {historyEmployee.employeeId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setHistoryVisible(false);
                  setHistoryEmployee(null);
                  setSalaryHistory([]);
                }}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
              >
                <XCircleIcon className="h-7 w-7" />
              </button>
            </div>
            <div className="p-6 space-y-6 bg-gradient-to-b from-indigo-50/60 via-white to-orange-50/60">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="border border-indigo-100 rounded-xl p-4 bg-white/80 shadow-sm">
                  <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Employee ID</p>
                  <p className="font-semibold text-sm mt-1 text-gray-900">{historyEmployee.employeeId}</p>
                </div>
                <div className="border border-indigo-100 rounded-xl p-4 bg-white/80 shadow-sm">
                  <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Name</p>
                  <p className="font-semibold text-sm mt-1 text-gray-900">{historyEmployee.employeeName}</p>
                </div>
                <div className="border border-indigo-100 rounded-xl p-4 bg-white/80 shadow-sm">
                  <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Division</p>
                  <p className="font-semibold text-sm mt-1 text-gray-900">{historyEmployee.division || '-'}</p>
                </div>
                <div className="border border-indigo-100 rounded-xl p-4 bg-white/80 shadow-sm">
                  <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Position</p>
                  <p className="font-semibold text-sm mt-1 text-gray-900">{historyEmployee.position || '-'}</p>
                </div>
                <div className="border border-indigo-100 rounded-xl p-4 bg-white/80 shadow-sm">
                  <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Location</p>
                  <p className="font-semibold text-sm mt-1 text-gray-900">{historyEmployee.location || '-'}</p>
                </div>
                <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50 shadow-sm">
                  <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide">Salary Months</p>
                  <p className="font-bold text-lg mt-1 text-indigo-900">{salarySummary.totalMonths}</p>
                </div>
                <div className="border border-green-100 rounded-xl p-4 bg-green-50 shadow-sm">
                  <p className="text-[11px] font-semibold text-green-700 uppercase tracking-wide">Total Net Salary</p>
                  <p className="font-bold text-lg mt-1 text-green-700">
                    ₹{salarySummary.totalNet.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="border border-orange-100 rounded-xl p-4 bg-orange-50 shadow-sm">
                  <p className="text-[11px] font-semibold text-orange-700 uppercase tracking-wide">Total CTC</p>
                  <p className="font-bold text-lg mt-1 text-orange-700">
                    ₹{salarySummary.totalCtc.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>

              {historyLoading ? (
                <div className="py-10 flex items-center justify-center text-gray-600">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#262760]"></div>
                    <span className="text-sm font-medium">Loading salary history...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#262760]">Salary History</h3>
                    {salaryHistory.length > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Latest Month:&nbsp;
                        {formatSalaryMonth(salaryHistory[salaryHistory.length - 1].salaryMonth)}
                      </span>
                    )}
                  </div>
                  <div className="border border-indigo-100 rounded-xl overflow-hidden shadow-sm bg-white/90">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-[#262760]">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Month</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-white uppercase tracking-wider">Basic+DA</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-white uppercase tracking-wider">Total Earnings</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-white uppercase tracking-wider">Total Deductions</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-white uppercase tracking-wider">Net Salary</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-white uppercase tracking-wider">CTC</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {salaryHistory.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="px-4 py-6 text-center text-gray-500 text-sm">
                              No salary history found.
                            </td>
                          </tr>
                        ) : (
                          <>
                            {salaryHistory.map((record, index) => (
                              <tr
                                key={record.id || record._id || record.salaryMonth}
                                className={index % 2 === 0 ? 'bg-white' : 'bg-indigo-50/40'}
                              >
                                <td className="px-4 py-2 text-sm text-gray-800">
                                  {formatSalaryMonth(record.salaryMonth)}
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-gray-700">
                                  {Number(record.basicDA || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-gray-700">
                                  {Number(record.totalEarnings || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-gray-700">
                                  {Number(record.totalDeductions || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </td>
                                <td className="px-4 py-2 text-sm text-right font-semibold text-green-700">
                                  {Number(record.netSalary || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </td>
                                <td className="px-4 py-2 text-sm text-right font-semibold text-orange-700">
                                  {Number(record.ctc || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-indigo-50/80 font-semibold">
                              <td className="px-4 py-3 text-sm text-[#262760]">Total</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-800"></td>
                              <td className="px-4 py-3 text-sm text-right text-gray-800"></td>
                              <td className="px-4 py-3 text-sm text-right text-gray-800"></td>
                              <td className="px-4 py-3 text-sm text-right text-green-700">
                                ₹{salarySummary.totalNet.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-orange-700">
                                ₹{salarySummary.totalCtc.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Rejection Modal */}
      <Modal
        title="Reject Exit Request"
        open={rejectModal.visible}
        onOk={submitRejection}
        onCancel={() => setRejectModal({ visible: false, formId: null, reason: '' })}
        okText="Reject"
        okType="danger"
        confirmLoading={actionLoading}
      >
        <p className="mb-2 text-gray-600">Please provide a reason for rejection:</p>
        <Input.TextArea
          rows={4}
          value={rejectModal.reason}
          onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
          placeholder="Enter rejection reason..."
        />
      </Modal>

      {/* Clearance Modal */}
      <Modal
        title={`Update ${clearanceModal.department?.toUpperCase()} Clearance`}
        open={clearanceModal.visible}
        onOk={submitClearanceUpdate}
        onCancel={() => setClearanceModal({ visible: false, formId: null, department: '', status: '', remarks: '' })}
        okText="Update"
        confirmLoading={actionLoading}
      >
        <p className="mb-2 text-gray-600">Status: <span className="font-semibold capitalize">{clearanceModal.status}</span></p>
        <p className="mb-2 text-gray-600">Remarks:</p>
        <Input.TextArea
          rows={3}
          value={clearanceModal.remarks}
          onChange={(e) => setClearanceModal({ ...clearanceModal, remarks: e.target.value })}
          placeholder="Enter remarks (optional)..."
        />
      </Modal>

      {/* High-Resolution Employee Photo Preview Modal */}
      {viewingPhotoModal.open && (
        <div 
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setViewingPhotoModal({ open: false, url: '', name: '', id: '' })}
        >
          <div 
            className="relative bg-white rounded-2xl p-4 shadow-2xl max-w-lg w-full flex flex-col items-center border border-indigo-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-between items-center pb-3 border-b border-gray-100 mb-4 px-2">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{viewingPhotoModal.name}</h3>
                <p className="text-xs text-indigo-600 font-mono font-medium">ID: {viewingPhotoModal.id || 'N/A'}</p>
              </div>
              <button
                onClick={() => setViewingPhotoModal({ open: false, url: '', name: '', id: '' })}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircleIcon className="w-7 h-7" />
              </button>
            </div>
            <div className="relative w-full max-h-[70vh] flex items-center justify-center bg-gray-900 rounded-xl overflow-hidden shadow-inner">
              <img
                src={viewingPhotoModal.url}
                alt={viewingPhotoModal.name}
                className="max-h-[68vh] w-auto object-contain transition-transform duration-300 hover:scale-105"
              />
            </div>
            <p className="text-xs text-gray-400 mt-3 italic">Tap/click anywhere outside to close preview</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExitApproval;
