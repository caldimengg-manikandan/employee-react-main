
import React, { useState, useEffect } from 'react';
import { timesheetAPI } from '../../services/api';
import { Eye, Filter, Calendar, FileText, X, Download, Edit, Trash2, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const TimesheetHistory = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [filteredTimesheets, setFilteredTimesheets] = useState([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({
    year: new Date().getFullYear().toString(),
    month: '',
    status: ''
  });
  const [downloadOption, setDownloadOption] = useState('weekly'); // 'weekly' or 'monthly'
  const [downloadFormat, setDownloadFormat] = useState('excel'); // 'excel' or 'pdf'

  // Function to get project code - use projectCode field if available, otherwise extract from name
  const getProjectCode = (entry) => {
    if (!entry) return '-';
    
    // If entry has projectCode field, use it directly
    if (entry.projectCode) return entry.projectCode;
    
    // Otherwise, try to extract from project name (fallback for old data)
    if (entry.project) {
      const codeMatch = entry.project.match(/^([A-Z0-9]+)/);
      return codeMatch ? codeMatch[1] : entry.project.substring(0, 8).toUpperCase();
    }
    
    return '-';
  };

  // Function to get unique project codes from entries
  const getProjectCodes = (entries) => {
    const projectCodes = Array.from(new Set((entries || []).map((e) => getProjectCode(e)))).filter(Boolean);
    return projectCodes.length > 0 ? projectCodes.join(', ') : '-';
  };

  // Fetch real timesheet history from backend including drafts
  const fetchTimesheets = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await timesheetAPI.getMyTimesheets();
      const data = Array.isArray(res.data) ? res.data : [];
      
      // Get session storage drafts and merge with backend data
      const sessionDrafts = getSessionStorageDrafts();
      const allTimesheets = [...data, ...sessionDrafts];
      
      setTimesheets(allTimesheets);
      setFilteredTimesheets(allTimesheets);
    } catch (err) {
      console.error('Failed to fetch timesheets:', err);
      setError(
        err.response?.data?.message || 'Unable to load timesheet history. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimesheets();
  }, []);

  // Listen for refresh events (for when admin approves/rejects timesheets)
  useEffect(() => {
    const handleRefreshTimesheets = () => {
      fetchTimesheets();
    };

    window.addEventListener('refreshTimesheetHistory', handleRefreshTimesheets);
    return () => {
      window.removeEventListener('refreshTimesheetHistory', handleRefreshTimesheets);
    };
  }, []);

  // Auto-refresh every 30 seconds to keep data current
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTimesheets();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Get drafts from sessionStorage
  const getSessionStorageDrafts = () => {
    const drafts = [];
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('timesheet_draft_')) {
          const draftData = JSON.parse(sessionStorage.getItem(key));
          if (draftData && draftData.rows) {
            drafts.push({
              _id: `session_${key}`, // Generate unique ID for session drafts
              weekStartDate: draftData.weekStart,
              weekEndDate: draftData.weekEnd,
              entries: draftData.rows.map(row => ({
                project: row.project,
                projectCode: row.projectCode || '',
                task: row.task,
                type: row.type,
                hours: row.hours
              })),
              totalHours: (() => {
                const workSum = draftData.rows.reduce((total, row) =>
                  total + row.hours.reduce((sum, hour) => sum + (Number(hour) || 0), 0), 0
                );
                let breakSum = 0;
                for (let i = 0; i < 7; i++) {
                  const hasProjectWork = draftData.rows.some(r => r.type === 'project' && ((r.hours?.[i] ?? 0) > 0));
                  const isFullDayLeaveOrHoliday = draftData.rows.some(r => (r.type === 'leave' || r.type === 'holiday') && ((r.hours?.[i] ?? 0) >= 8));
                  if (hasProjectWork && !isFullDayLeaveOrHoliday) {
                    breakSum += 1.25;
                  }
                }
                return Number((workSum + breakSum).toFixed(1));
              })(),
              status: 'Draft',
              updatedAt: draftData.savedAt,
              isSessionDraft: true, // Flag to identify session storage drafts
              sessionStorageKey: key // Store the key for deletion
            });
          }
        }
      }
    } catch (error) {
      console.error('Error reading drafts from sessionStorage:', error);
    }
    return drafts;
  };

  // Apply filters whenever filter criteria changes
  useEffect(() => {
    let filtered = timesheets;

    // Filter by year
    if (filter.year) {
      filtered = filtered.filter((t) => {
        const timesheetYear = new Date(t.weekStartDate).getFullYear().toString();
        return timesheetYear === filter.year;
      });
    }

    // Filter by month
    if (filter.month !== '') {
      filtered = filtered.filter((t) => {
        const timesheetMonth = new Date(t.weekStartDate).getMonth().toString();
        return timesheetMonth === filter.month;
      });
    }

    // Filter by status
    if (filter.status) {
      filtered = filtered.filter((t) =>
        (t.status || '').toLowerCase() === filter.status.toLowerCase()
      );
    }

    setFilteredTimesheets(filtered);
  }, [filter, timesheets]);

  const getStatusBadge = (status) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-semibold";
    
    switch ((status || '').toLowerCase()) {
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'submitted':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'draft':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatWeekRange = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const handleViewDetails = (timesheet) => {
    setSelectedTimesheet(timesheet);
    setShowDetailsModal(true);
  };

  const handleEdit = (timesheet) => {
    if (timesheet.isSessionDraft) {
      // For session drafts, redirect to timesheet page with draft data
      const draftData = JSON.parse(sessionStorage.getItem(timesheet.sessionStorageKey));
      if (draftData) {
        // Store the current draft key to load in timesheet component
        sessionStorage.setItem('load_draft_key', timesheet.sessionStorageKey);
        // Redirect to timesheet page - adjust the path as needed
        window.location.href = '/timesheet';
      }
    } else {
      // For backend drafts, you might need to implement an API to load the draft
      console.log('Edit backend draft:', timesheet._id);
      // Implement backend draft editing logic here
      alert('Editing backend drafts will be implemented soon');
    }
  };

  const handleDelete = (timesheet) => {
    if (window.confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      if (timesheet.isSessionDraft) {
        // Remove from sessionStorage
        sessionStorage.removeItem(timesheet.sessionStorageKey);
        
        // Update state to remove the deleted timesheet
        const updatedTimesheets = timesheets.filter(t => t._id !== timesheet._id);
        setTimesheets(updatedTimesheets);
        setFilteredTimesheets(updatedTimesheets);
        
        alert('Draft deleted successfully');
      } else {
        // For backend drafts, call delete API
        const deleteBackendDraft = async () => {
          try {
            await timesheetAPI.deleteTimesheet(timesheet._id);
            
            // Update state to remove the deleted timesheet
            const updatedTimesheets = timesheets.filter(t => t._id !== timesheet._id);
            setTimesheets(updatedTimesheets);
            setFilteredTimesheets(updatedTimesheets);
            
            alert('Draft deleted successfully');
          } catch (err) {
            console.error('Failed to delete draft:', err);
            alert('Failed to delete draft. Please try again.');
          }
        };
        deleteBackendDraft();
      }
    }
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedTimesheet(null);
  };

  const handleCloseDownloadModal = () => {
    setShowDownloadModal(false);
    setDownloadOption('weekly');
    setDownloadFormat('excel');
  };

  const clearFilters = () => {
    setFilter({
      year: new Date().getFullYear().toString(),
      month: '',
      status: ''
    });
  };

  // Check if timesheet is a draft
  const isDraft = (timesheet) => {
    return (timesheet.status || '').toLowerCase() === 'draft';
  };

  // Download Functions (keep the same as your original code)
  const generateWeeklyExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    filteredTimesheets.forEach((timesheet, index) => {
      const weekStart = new Date(timesheet.weekStartDate);
      const weekEnd = new Date(timesheet.weekEndDate);
      const sheetName = `Week_${index + 1}`;
      
      // Prepare data for the sheet
      const headers = ['Project', 'Project Code', 'Task', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Total'];
      const data = [headers];
      
      // Add each entry as a row
      timesheet.entries.forEach(entry => {
        const row = [
          entry.project,
          getProjectCode(entry.project),
          entry.task,
          entry.hours[0] || 0,
          entry.hours[1] || 0,
          entry.hours[2] || 0,
          entry.hours[3] || 0,
          entry.hours[4] || 0,
          entry.hours[5] || 0,
          entry.hours[6] || 0,
          entry.hours.reduce((sum, hour) => sum + (Number(hour) || 0), 0)
        ];
        data.push(row);
      });
      
      // Add summary row
      data.push([]);
      data.push(['', '', 'TOTAL HOURS', '', '', '', '', '', '', '', timesheet.totalHours]);
      data.push(['', '', 'STATUS', '', '', '', '', '', '', '', timesheet.status]);
      data.push(['', '', 'WEEK', '', '', '', '', '', '', '', `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`]);
      
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
    
    // Generate and download the file
    const fileName = `Timesheet_Weekly_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const generateMonthlyExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Group timesheets by month
    const monthlyData = {};
    filteredTimesheets.forEach(timesheet => {
      const monthYear = new Date(timesheet.weekStartDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = [];
      }
      monthlyData[monthYear].push(timesheet);
    });
    
    // Create a sheet for each month
    Object.keys(monthlyData).forEach(monthYear => {
      const monthTimesheets = monthlyData[monthYear];
      const worksheetData = [['Timesheet Monthly Summary - ' + monthYear]];
      worksheetData.push([]);
      
      // Header row
      worksheetData.push(['Week', 'Projects', 'Project Codes', 'Total Hours', 'Status', 'Submitted Date']);
      
      // Data rows
      monthTimesheets.forEach(timesheet => {
        const projects = Array.from(new Set(timesheet.entries.map(e => e.project))).join(', ');
        const projectCodes = getProjectCodes(timesheet.entries);
        const weekRange = formatWeekRange(timesheet.weekStartDate, timesheet.weekEndDate);
        const submittedDate = timesheet.submittedAt 
          ? new Date(timesheet.submittedAt).toLocaleDateString()
          : 'Draft';
        
        worksheetData.push([
          weekRange,
          projects,
          projectCodes,
          timesheet.totalHours,
          timesheet.status,
          submittedDate
        ]);
      });
      
      // Add monthly total
      const monthlyTotal = monthTimesheets.reduce((sum, t) => sum + t.totalHours, 0);
      worksheetData.push([]);
      worksheetData.push(['Monthly Total Hours:', '', '', monthlyTotal, '', '']);
      
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, monthYear.substring(0, 31)); // Sheet name limit
    });
    
    const fileName = `Timesheet_Monthly_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const generateWeeklyPDF = () => {
    const pdf = new jsPDF();
    
    filteredTimesheets.forEach((timesheet, index) => {
      if (index > 0) {
        pdf.addPage();
      }
      
      const weekStart = new Date(timesheet.weekStartDate);
      const weekEnd = new Date(timesheet.weekEndDate);
      
      // Title
      pdf.setFontSize(16);
      pdf.text(`Timesheet - ${formatWeekRange(timesheet.weekStartDate, timesheet.weekEndDate)}`, 14, 15);
      
      // Header info
      pdf.setFontSize(10);
      pdf.text(`Status: ${timesheet.status}`, 14, 25);
      pdf.text(`Total Hours: ${timesheet.totalHours}`, 14, 32);
      
      // Table data
      const tableData = timesheet.entries.map(entry => [
        entry.project,
        getProjectCode(entry.project),
        entry.task,
        entry.hours[0] || 0,
        entry.hours[1] || 0,
        entry.hours[2] || 0,
        entry.hours[3] || 0,
        entry.hours[4] || 0,
        entry.hours[5] || 0,
        entry.hours[6] || 0,
        entry.hours.reduce((sum, hour) => sum + (Number(hour) || 0), 0)
      ]);
      
      // Add table
      pdf.autoTable({
        startY: 40,
        head: [['Project', 'Project Code', 'Task', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Total']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });
    });
    
    pdf.save(`Timesheet_Weekly_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const generateMonthlyPDF = () => {
    const pdf = new jsPDF();
    
    // Group by month
    const monthlyData = {};
    filteredTimesheets.forEach(timesheet => {
      const monthYear = new Date(timesheet.weekStartDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = [];
      }
      monthlyData[monthYear].push(timesheet);
    });
    
    Object.keys(monthlyData).forEach((monthYear, monthIndex) => {
      if (monthIndex > 0) {
        pdf.addPage();
      }
      
      const monthTimesheets = monthlyData[monthYear];
      
      // Title
      pdf.setFontSize(16);
      pdf.text(`Timesheet Monthly Summary - ${monthYear}`, 14, 15);
      
      // Table data
      const tableData = monthTimesheets.map(timesheet => [
        formatWeekRange(timesheet.weekStartDate, timesheet.weekEndDate),
        Array.from(new Set(timesheet.entries.map(e => e.project))).join(', '),
        getProjectCodes(timesheet.entries),
        timesheet.totalHours,
        timesheet.status,
        timesheet.submittedAt ? new Date(timesheet.submittedAt).toLocaleDateString() : 'Draft'
      ]);
      
      // Monthly total
      const monthlyTotal = monthTimesheets.reduce((sum, t) => sum + t.totalHours, 0);
      
      pdf.autoTable({
        startY: 25,
        head: [['Week', 'Projects', 'Project Codes', 'Total Hours', 'Status', 'Submitted Date']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });
      
      // Add monthly total
      const finalY = pdf.lastAutoTable.finalY + 10;
      pdf.setFontSize(10);
      pdf.text(`Monthly Total Hours: ${monthlyTotal}`, 14, finalY);
    });
    
    pdf.save(`Timesheet_Monthly_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDownload = () => {
    if (filteredTimesheets.length === 0) {
      alert('No data available to download.');
      return;
    }

    if (downloadOption === 'weekly' && downloadFormat === 'excel') {
      generateWeeklyExcel();
    } else if (downloadOption === 'weekly' && downloadFormat === 'pdf') {
      generateWeeklyPDF();
    } else if (downloadOption === 'monthly' && downloadFormat === 'excel') {
      generateMonthlyExcel();
    } else if (downloadOption === 'monthly' && downloadFormat === 'pdf') {
      generateMonthlyPDF();
    }
    
    handleCloseDownloadModal();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Timesheet History</h1>
        <p className="text-gray-600">View your submitted timesheets and drafts</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Filter Timesheets</h3>
          </div>
          <div className="flex gap-3">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium flex items-center gap-2"
            >
              Clear Filters
            </button>
            <button
              onClick={() => setShowDownloadModal(true)}
              className="px-4 py-2 bg-blue-700 text-white rounded text-sm font-medium hover:bg-blue-800 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select 
              value={filter.year}
              onChange={(e) => setFilter({...filter, year: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select 
              value={filter.month}
              onChange={(e) => setFilter({...filter, month: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Months</option>
              <option value="0">January</option>
              <option value="1">February</option>
              <option value="2">March</option>
              <option value="3">April</option>
              <option value="4">May</option>
              <option value="5">June</option>
              <option value="6">July</option>
              <option value="7">August</option>
              <option value="8">September</option>
              <option value="9">October</option>
              <option value="10">November</option>
              <option value="11">December</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select 
              value={filter.status}
              onChange={(e) => setFilter({...filter, status: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        
        {/* Refresh button */}
        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={fetchTimesheets}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {/* Results count */}
          <div className="text-sm text-gray-600">
            Showing {filteredTimesheets.length} of {timesheets.length} timesheets
            {timesheets.some(t => t.isSessionDraft) && (
              <span className="ml-2 text-blue-600">
                • {timesheets.filter(t => t.isSessionDraft).length} draft(s) from current session
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Timesheet History Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-800">Timesheets & Drafts</h2>
          </div>
        </div>
        {isLoading && (
          <div className="p-6 text-sm text-gray-600">Loading timesheets…</div>
        )}
        {error && (
          <div className="p-6 text-sm text-red-600">{error}</div>
        )}
        
        {filteredTimesheets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Week</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Projects</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Project Code</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Total Hours</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Last Updated</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTimesheets.map((t) => {
                  const projectList = Array.from(new Set((t.entries || []).map((e) => e.project))).filter(Boolean);
                  const projectCodes = getProjectCodes(t.entries);
                  const isDraftTimesheet = isDraft(t);
                  const isSessionDraft = t.isSessionDraft;
                  
                  return (
                    <tr key={t._id} className="hover:bg-gray-50 border-b">
                      <td className="p-4 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatWeekRange(t.weekStartDate, t.weekEndDate)}
                          {isSessionDraft && (
                            <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              Session
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        <div className="space-y-1">
                          {projectList.length === 0 && <span className="text-gray-500">—</span>}
                          {projectList.map((project, index) => (
                            <div key={index} className="flex items-center">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              {project}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        <div className="space-y-1">
                          {projectCodes === '-' ? (
                            <span className="text-gray-500">—</span>
                          ) : (
                            projectCodes.split(', ').map((code, index) => (
                              <div key={index} className="flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                  {code}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm font-semibold text-gray-900">
                        {t.totalHours} hours
                      </td>
                      <td className="p-4">
                        <span className={getStatusBadge(t.status)}>
                          {t.status || '—'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {isDraftTimesheet 
                          ? (t.updatedAt 
                              ? new Date(t.updatedAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : '—')
                          : (t.submittedAt
                              ? new Date(t.submittedAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })
                              : '—')
                        }
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleViewDetails(t)}
                            className="text-blue-600 hover:text-blue-800 transition-colors duration-200 flex items-center gap-1"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {/* Show Edit and Delete only for drafts */}
                          {isDraftTimesheet && (
                            <>
                              <button 
                                onClick={() => handleEdit(t)}
                                className="text-green-600 hover:text-green-800 transition-colors duration-200 flex items-center gap-1"
                                title="Edit Draft"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(t)}
                                className="text-red-600 hover:text-red-800 transition-colors duration-200 flex items-center gap-1"
                                title="Delete Draft"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Timesheets Found</h3>
            <p className="text-gray-600 mb-4">No timesheets match your current filters.</p>
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear filters to see all timesheets
            </button>
          </div>
        )}
      </div>

      {/* Download Options Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Download Report</h2>
                <button
                  onClick={handleCloseDownloadModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  title="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Download Option Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Report Type:
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setDownloadOption('weekly')}
                    className={`p-4 border-2 rounded-lg text-center transition-colors duration-200 ${
                      downloadOption === 'weekly'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">Weekly Report</div>
                    <div className="text-sm text-gray-500 mt-1">Detailed weekly breakdown</div>
                  </button>
                  
                  <button
                    onClick={() => setDownloadOption('monthly')}
                    className={`p-4 border-2 rounded-lg text-center transition-colors duration-200 ${
                      downloadOption === 'monthly'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">Monthly Summary</div>
                    <div className="text-sm text-gray-500 mt-1">Monthly overview</div>
                  </button>
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Format:
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setDownloadFormat('excel')}
                    className={`p-4 border-2 rounded-lg text-center transition-colors duration-200 ${
                      downloadFormat === 'excel'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">Excel (.xlsx)</div>
                    <div className="text-sm text-gray-500 mt-1">Editable format</div>
                  </button>
                  
                  <button
                    onClick={() => setDownloadFormat('pdf')}
                    className={`p-4 border-2 rounded-lg text-center transition-colors duration-200 ${
                      downloadFormat === 'pdf'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">PDF (.pdf)</div>
                    <div className="text-sm text-gray-500 mt-1">Printable format</div>
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Download Summary:</h4>
                <p className="text-sm text-gray-600">
                  You are about to download a <span className="font-semibold">{downloadOption}</span> report in <span className="font-semibold">{downloadFormat.toUpperCase()}</span> format.
                  {filteredTimesheets.length > 0 && (
                    <span> This will include {filteredTimesheets.length} timesheet(s).</span>
                  )}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={handleCloseDownloadModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition-colors duration-200 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timesheet Details Modal */}
      {showDetailsModal && selectedTimesheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <h2 className="text-xl font-semibold text-gray-800">
                    Timesheet Details - {formatWeekRange(selectedTimesheet.weekStartDate, selectedTimesheet.weekEndDate)}
                    {selectedTimesheet.isSessionDraft && (
                      <span className="ml-2 text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        Session Draft
                      </span>
                    )}
                  </h2>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  title="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Status:</span>{' '}
                  <span className={getStatusBadge(selectedTimesheet.status)}>
                    {selectedTimesheet.status || '—'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Total Hours (Work + Break):</span>{' '}
                  {(() => {
                    const weeklyWork = (selectedTimesheet.entries || []).reduce(
                      (sum, e) => sum + (Array.isArray(e.hours) ? e.hours.reduce((s, h) => s + (Number(h) || 0), 0) : 0),
                      0
                    );
                    const weeklyBreak = Array.from({ length: 7 }, (_, i) => {
                      const hasWork = (selectedTimesheet.entries || []).some(
                        (e) => e.type === 'project' && ((e.hours?.[i] || 0) > 0)
                      );
                      return hasWork ? 1.25 : 0;
                    }).reduce((sum, b) => sum + b, 0);
                    return (weeklyWork + weeklyBreak).toFixed(2);
                  })()} hours
                </div>
                <div>
                  <span className="font-medium">
                    {selectedTimesheet.status === 'Draft' ? 'Last Updated:' : 'Submitted:'}
                  </span>{' '}
                  {selectedTimesheet.status === 'Draft' 
                    ? (selectedTimesheet.updatedAt 
                        ? new Date(selectedTimesheet.updatedAt).toLocaleDateString() 
                        : '—')
                    : (selectedTimesheet.submittedAt 
                        ? new Date(selectedTimesheet.submittedAt).toLocaleDateString() 
                        : '—')
                  }
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Time Entries (Project/Task with Mon–Sun hours) */}
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Time Entries</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Project</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Project Code</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Task</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Mon</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Tue</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Wed</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Thu</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Fri</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Sat</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Sun</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedTimesheet.entries || []).map((entry, index) => {
                      const hours = entry.hours || [0,0,0,0,0,0,0];
                      const rowTotal = hours.reduce((sum, h) => sum + (Number(h) || 0), 0);
                      return (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-sm font-medium text-gray-900">{entry.project}</td>
                          <td className="p-3 text-sm text-gray-700">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {getProjectCode(entry)}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-gray-700">{entry.task}</td>
                          {hours.map((h, i) => (
                            <td key={i} className="p-3 text-sm text-gray-700">{Number(h) || 0}</td>
                          ))}
                          <td className="p-3 text-sm font-semibold text-gray-900">{rowTotal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    {/* Break Time (Auto) */}
                    <tr>
                      <td colSpan="3" className="p-3 text-sm font-semibold text-gray-700">Break Time (Auto)</td>
                      {Array.from({ length: 7 }, (_, i) => {
                        const hasWork = (selectedTimesheet.entries || []).some(
                          (e) => e.type === 'project' && ((e.hours?.[i] || 0) > 0)
                        );
                        const breakHours = hasWork ? 1.25 : 0;
                        return (
                          <td key={i} className="p-3 text-sm text-blue-700 text-center">{breakHours}</td>
                        );
                      })}
                      <td className="p-3 text-sm font-semibold text-blue-700 text-center">
                        {Array.from({ length: 7 }, (_, i) => {
                          const hasWork = (selectedTimesheet.entries || []).some(
                            (e) => e.type === 'project' && ((e.hours?.[i] || 0) > 0)
                          );
                          return hasWork ? 1.25 : 0;
                        }).reduce((sum, b) => sum + b, 0).toFixed(2)}
                      </td>
                    </tr>
                    {/* Total Hours (Work + Break) */}
                    <tr>
                      <td colSpan="3" className="p-3 text-sm font-semibold text-gray-700">Total Hours (Work + Break)</td>
                      {Array.from({ length: 7 }, (_, i) => {
                        const dayWork = (selectedTimesheet.entries || []).reduce((sum, e) => sum + (Number(e.hours?.[i]) || 0), 0);
                        const hasWork = (selectedTimesheet.entries || []).some(
                          (e) => e.type === 'project' && ((e.hours?.[i] || 0) > 0)
                        );
                        const breakHours = hasWork ? 1.25 : 0;
                        return (
                          <td key={i} className={`p-3 text-sm text-center ${dayWork + breakHours >= 20 ? 'text-yellow-800 font-semibold' : 'text-blue-700 font-semibold'}`}>{(dayWork + breakHours).toFixed(2)}</td>
                        );
                      })}
                      <td className="p-3 text-sm font-bold text-blue-700 text-center">
                        {(() => {
                          const weeklyWork = (selectedTimesheet.entries || []).reduce((sum, e) => sum + (Array.isArray(e.hours) ? e.hours.reduce((s, h) => s + (Number(h) || 0), 0) : 0), 0);
                          const weeklyBreak = Array.from({ length: 7 }, (_, i) => {
                            const hasWork = (selectedTimesheet.entries || []).some(
                              (e) => e.type === 'project' && ((e.hours?.[i] || 0) > 0)
                            );
                            return hasWork ? 1.25 : 0;
                          }).reduce((sum, b) => sum + b, 0);
                          return (weeklyWork + weeklyBreak).toFixed(2);
                        })()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-800">Total Hours (Work + Break):</span>
                <span className="text-lg font-bold text-gray-900">
                  {(() => {
                    const weeklyWork = (selectedTimesheet.entries || []).reduce(
                      (sum, e) => sum + (Array.isArray(e.hours) ? e.hours.reduce((s, h) => s + (Number(h) || 0), 0) : 0),
                      0
                    );
                    const weeklyBreak = Array.from({ length: 7 }, (_, i) => {
                      const hasWork = (selectedTimesheet.entries || []).some(
                        (e) => e.type === 'project' && ((e.hours?.[i] || 0) > 0)
                      );
                      return hasWork ? 1.25 : 0;
                    }).reduce((sum, b) => sum + b, 0);
                    return (weeklyWork + weeklyBreak).toFixed(2);
                  })()} hours
                </span>
              </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetHistory;
