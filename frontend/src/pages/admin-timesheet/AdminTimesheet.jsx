import React, { useState, useEffect } from 'react';
import { adminTimesheetAPI, employeeAPI } from '../../services/api';
import * as XLSX from 'xlsx';
import { 
  BarChart3, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users, 
  Calendar,
  Filter,
  RefreshCw,
  Download,
  Search,
  Building,
  MapPin,
  FolderOpen,
  FileText,
  Eye,
  X,
  Loader2,
  Building2
} from 'lucide-react';

const toWeekString = (d) => {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayNum = date.getDay() || 7;
  date.setDate(date.getDate() + 4 - dayNum);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  const weekStr = String(weekNo).padStart(2, "0");
  return `${date.getFullYear()}-W${weekStr}`;
};

const getWeeksInRange = (fromDateStr, toDateStr) => {
  if (!fromDateStr || !toDateStr) return [];
  const start = new Date(fromDateStr + 'T00:00:00');
  const end = new Date(toDateStr + 'T23:59:59');
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  
  const weeks = new Set();
  const current = new Date(start.getTime());
  
  let safetyLimit = 0;
  while (current <= end && safetyLimit < 1000) {
    weeks.add(toWeekString(current));
    current.setDate(current.getDate() + 1);
    safetyLimit++;
  }
  return Array.from(weeks);
};

const AdminTimesheet = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [filters, setFilters] = useState({
    employeeId: '',
    division: 'All Division',
    location: 'All Locations',
    status: 'All Status',
    week: 'All Weeks',
    project: 'All Projects',
    year: 'All Years',
    fromDate: '',
    toDate: ''
  });

  const [stats, setStats] = useState({
    totalTimesheets: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalEmployees: 0,
    projectHours: 0
  });

  // Get user role
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = user.role || '';
  const isProjectManager = role === 'projectmanager' || role === 'project_manager';

  const [projectOptions, setProjectOptions] = useState(["All Projects"]);
  const [weekOptions, setWeekOptions] = useState(["All Weeks"]);
  const [yearOptions, setYearOptions] = useState(["All Years"]);
  const [employeeIdOptions, setEmployeeIdOptions] = useState(['']);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [rejectDialog, setRejectDialog] = useState({ isOpen: false, timesheetId: null, reason: '' });
  const [messageDialog, setMessageDialog] = useState({ isOpen: false, title: '', message: '', type: 'success' });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await employeeAPI.getTimesheetEmployees();
        if (Array.isArray(res.data)) {
          setAllEmployees(res.data);
        } else if (res.data?.success) {
          setAllEmployees(res.data.data || []);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    fetchEmployees();
  }, []);

  const formatDuration = (totalHours) => {
    if (!totalHours || Number.isNaN(totalHours)) return '00:00';
    const num = Number(totalHours);
    const hrs = Math.floor(num);
    const mins = Math.round((num - hrs) * 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const statConfigs = [
    { 
      title: 'Total Timesheets', 
      value: stats.totalTimesheets, 
      icon: FileText, 
      gradient: 'from-indigo-900 via-[#1e1b4b] to-[#262760]',
      border: 'border-indigo-500/20',
      iconBg: 'bg-indigo-500/20 text-indigo-300'
    },
    { 
      title: 'Pending Approval', 
      value: stats.pending, 
      icon: Clock, 
      gradient: 'from-amber-900 via-[#451a03] to-[#78350f]',
      border: 'border-amber-500/20',
      iconBg: 'bg-amber-500/20 text-amber-300'
    },
    { 
      title: 'Approved', 
      value: stats.approved, 
      icon: CheckCircle, 
      gradient: 'from-emerald-900 via-[#064e3b] to-[#047857]',
      border: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/20 text-emerald-300'
    },
    { 
      title: 'Rejected', 
      value: stats.rejected, 
      icon: XCircle, 
      gradient: 'from-rose-900 via-[#4c0519] to-[#881337]',
      border: 'border-rose-500/20',
      iconBg: 'bg-rose-500/20 text-rose-300'
    },
    { 
      title: 'Total Employees', 
      value: stats.totalEmployees, 
      icon: Users, 
      gradient: 'from-purple-900 via-[#3b0764] to-[#581c87]',
      border: 'border-purple-500/20',
      iconBg: 'bg-purple-500/20 text-purple-300'
    },
    { 
      title: 'Project Hours', 
      value: formatDuration(stats.projectHours), 
      icon: Calendar, 
      gradient: 'from-blue-900 via-[#172554] to-[#1e3a8a]',
      border: 'border-blue-500/20',
      iconBg: 'bg-blue-500/20 text-blue-300'
    }
  ];

  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      const params = { ...filters };
      
      if (filters.status === 'Not Submitted') {
        params.status = 'All Status';
      }

      const res = await adminTimesheetAPI.list(params);
      let data = res.data?.data || [];

      if (filters.year === 'All Years') {
        const uniqueYears = Array.from(new Set(data.map(r => {
          if (!r.submittedDate) return null;
          return new Date(r.submittedDate).getFullYear();
        }).filter(Boolean))).sort().reverse();
        setYearOptions(["All Years", ...uniqueYears]);
      }

      if (filters.year !== 'All Years') {
        data = data.filter(ts => {
          if (!ts.submittedDate) return false;
          return String(new Date(ts.submittedDate).getFullYear()) === String(filters.year);
        });
      }

      if (filters.status === 'Not Submitted') {
        const submittedEmployeeIds = new Set(data.map(r => r.employeeId));
        
        const missingEmployees = allEmployees.filter(emp => {
          if (filters.division !== 'All Division' && emp.division !== filters.division) return false;
          if (filters.location !== 'All Locations' && emp.location !== filters.location) return false;
          if (filters.employeeId !== '' && emp.employeeId !== filters.employeeId) return false;
          
          return !submittedEmployeeIds.has(emp.employeeId);
        });

        data = missingEmployees.map(emp => ({
          _id: `missing-${emp.employeeId}`,
          employeeId: emp.employeeId,
          employeeName: emp.name,
          division: emp.division,
          location: emp.location,
          week: filters.week === 'All Weeks' ? '-' : filters.week,
          status: 'Not Submitted',
          timeEntries: [],
          weeklyTotal: 0,
          submittedDate: null
        }));
      }

      if (filters.employeeId === '') {
        const uniqueIds = Array.from(new Set(data.map(r => r.employeeId).filter(Boolean))).sort();
        setEmployeeIdOptions(['', ...uniqueIds]);
      }

      setTimesheets(data);
      const setProjects = new Set();
      data.forEach(ts => {
        (ts.timeEntries || []).forEach(te => {
          const typeVal = (te.type || '').toLowerCase();
          const p = (te.project || '').trim();
          const taskVal = (te.task || '').toLowerCase();
          const looksLikeProject = typeVal === 'project' || (
            p && p.toLowerCase() !== 'leave' &&
            !taskVal.includes('leave') && !taskVal.includes('holiday')
          );
          if (looksLikeProject && p) setProjects.add(p);
        });
      });
      
      if (filters.project === 'All Projects') {
        setProjectOptions(["All Projects", ...Array.from(setProjects).sort()]);
      }

      if (filters.fromDate && filters.toDate) {
        const weeksInRange = getWeeksInRange(filters.fromDate, filters.toDate);
        setWeekOptions(["All Weeks", ...weeksInRange]);
        if (filters.week !== 'All Weeks' && !weeksInRange.includes(filters.week)) {
          setFilters(prev => ({ ...prev, week: 'All Weeks' }));
        }
      } else {
        if (filters.week === 'All Weeks') {
          if (filters.status !== 'Not Submitted') {
            const uniqueWeeks = Array.from(new Set(data.map(r => r.week).filter(Boolean))).sort().reverse();
            setWeekOptions(["All Weeks", ...uniqueWeeks]);
          }
        }
      }

      const totalTimesheets = data.length;
      const statusCounts = data.reduce((acc, r) => {
        const s = (r.status || '').toLowerCase();
        if (s === 'approved') acc.approved++;
        else if (s === 'rejected') acc.rejected++;
        else if (s === 'pending' || s === 'submitted') acc.pending++;
        else if (s === 'not submitted') acc.notSubmitted++;
        else acc.pending++;
        return acc;
      }, { approved: 0, rejected: 0, pending: 0, notSubmitted: 0 });
      
      const totalEmployees = (() => {
        if (allEmployees.length > 0) {
          return allEmployees.filter(emp => {
            if (filters.division !== 'All Division' && emp.division !== filters.division) return false;
            if (filters.location !== 'All Locations' && emp.location !== filters.location) return false;
            if (filters.employeeId !== '' && emp.employeeId !== filters.employeeId) return false;
            return true;
          }).length;
        }
        return new Set(data.map(r => r.employeeId).filter(Boolean)).size;
      })();

      const projectHours = data.reduce((sum, r) => {
        const s = (r.status || '').toLowerCase();
        const includeRow = s === 'approved' || s === 'submitted';
        if (!includeRow) return sum;
        const entries = r.timeEntries || [];
        const projSum = entries.reduce((eSum, te) => {
          const typeVal = (te.type || '').toLowerCase();
          const p = (te.project || '').trim();
          const taskVal = (te.task || '').toLowerCase();
          const isProject = typeVal === 'project' || (
            p && p.toLowerCase() !== 'leave' &&
            !taskVal.includes('leave') && !taskVal.includes('holiday')
          );
          return eSum + (isProject ? Number(te.total || 0) : 0);
        }, 0);
        return sum + projSum;
      }, 0);

      setStats({
        totalTimesheets,
        pending: statusCounts.pending,
        approved: statusCounts.approved,
        rejected: statusCounts.rejected,
        totalEmployees,
        projectHours
      });
    } catch (e) {
      setTimesheets([]);
      setStats({
        totalTimesheets: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        totalEmployees: 0,
        projectHours: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatsFromList = (list) => {
    const totalTimesheets = list.length;
    const statusCounts = list.reduce((acc, r) => {
      const s = (r.status || '').toLowerCase();
      if (s === 'approved') acc.approved++;
      else if (s === 'rejected') acc.rejected++;
      else acc.pending++;
      return acc;
    }, { approved: 0, rejected: 0, pending: 0 });
    const totalEmployees = stats.totalEmployees;
    const projectHours = list.reduce((sum, r) => {
      const s = (r.status || '').toLowerCase();
      const includeRow = s === 'approved' || s === 'submitted' || s === 'pending';
      if (!includeRow) return sum;
      const entries = r.timeEntries || [];
      const projSum = entries.reduce((eSum, te) => {
        const typeVal = (te.type || '').toLowerCase();
        const p = (te.project || '').trim();
        const taskVal = (te.task || '').toLowerCase();
        const isProject = typeVal === 'project' || (
          p && p.toLowerCase() !== 'leave' &&
          !taskVal.includes('leave') && !taskVal.includes('holiday')
        );
        return eSum + (isProject ? Number(te.total || 0) : 0);
      }, 0);
      return sum + projSum;
    }, 0);

    setStats({
      totalTimesheets,
      pending: statusCounts.pending,
      approved: statusCounts.approved,
      rejected: statusCounts.rejected,
      totalEmployees,
      projectHours
    });
  };

  useEffect(() => {
    fetchTimesheets();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      employeeId: '',
      division: 'All Division',
      location: 'All Locations',
      status: 'All Status',
      week: 'All Weeks',
      project: 'All Projects',
      year: 'All Years',
      fromDate: '',
      toDate: ''
    });
  };

  const isFilterApplied = () => {
    return (
      filters.employeeId !== '' ||
      filters.division !== 'All Division' ||
      filters.location !== 'All Locations' ||
      filters.status !== 'All Status' ||
      filters.week !== 'All Weeks' ||
      filters.project !== 'All Projects' ||
      filters.year !== 'All Years' ||
      filters.fromDate !== '' ||
      filters.toDate !== ''
    );
  };

  const handleExport = () => {
    if (timesheets.length === 0) {
      showMessage('Export Info', 'No timesheet data to export.', 'info');
      return;
    }

    const flattened = [];
    timesheets.forEach(ts => {
      const entries = ts.timeEntries || [];
      if (entries.length === 0) {
        flattened.push({
          'Employee ID': ts.employeeId || '',
          'Employee Name': ts.employeeName || '',
          'Division': ts.division || '',
          'Location': ts.location || '',
          'Week': ts.week || '',
          'Submitted Date': ts.submittedDate ? new Date(ts.submittedDate).toLocaleDateString() : '',
          'Status': ts.status === 'Submitted' ? 'Pending' : (ts.status || ''),
          'Rejection Reason': ts.rejectionReason || '',
          'Project': '',
          'Task': '',
          'Type': '',
          'Mon (hrs)': '',
          'Tue (hrs)': '',
          'Wed (hrs)': '',
          'Thu (hrs)': '',
          'Fri (hrs)': '',
          'Sat (hrs)': '',
          'Sun (hrs)': '',
          'Entry Total (hrs)': '',
          'Weekly Total (hrs)': formatDuration(ts.weeklyTotal || 0)
        });
      } else {
        entries.forEach(te => {
          flattened.push({
            'Employee ID': ts.employeeId || '',
            'Employee Name': ts.employeeName || '',
            'Division': ts.division || '',
            'Location': ts.location || '',
            'Week': ts.week || '',
            'Submitted Date': ts.submittedDate ? new Date(ts.submittedDate).toLocaleDateString() : '',
            'Status': ts.status === 'Submitted' ? 'Pending' : (ts.status || ''),
            'Rejection Reason': ts.rejectionReason || '',
            'Project': te.project || '',
            'Task': te.task || '',
            'Type': te.type || '',
            'Mon (hrs)': te.monday ? formatDuration(te.monday) : '00:00',
            'Tue (hrs)': te.tuesday ? formatDuration(te.tuesday) : '00:00',
            'Wed (hrs)': te.wednesday ? formatDuration(te.wednesday) : '00:00',
            'Thu (hrs)': te.thursday ? formatDuration(te.thursday) : '00:00',
            'Fri (hrs)': te.friday ? formatDuration(te.friday) : '00:00',
            'Sat (hrs)': te.saturday ? formatDuration(te.saturday) : '00:00',
            'Sun (hrs)': te.sunday ? formatDuration(te.sunday) : '00:00',
            'Entry Total (hrs)': te.total ? formatDuration(te.total) : '00:00',
            'Weekly Total (hrs)': formatDuration(ts.weeklyTotal || 0)
          });
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(flattened);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Timesheets');
    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Admin_Timesheets_${timestamp}.xlsx`);
  };

  const handleRefresh = () => {
    fetchTimesheets();
  };

  const showMessage = (title, message, type = 'success') => {
    setMessageDialog({ isOpen: true, title, message, type });
  };

  const closeMessage = () => {
    setMessageDialog({ isOpen: false, title: '', message: '', type: 'success' });
  };

  const openRejectDialog = (timesheetId) => {
    if (!timesheetId) return;
    setRejectDialog({ isOpen: true, timesheetId, reason: '' });
  };

  const closeRejectDialog = () => {
    setRejectDialog({ isOpen: false, timesheetId: null, reason: '' });
  };

  const handleApprove = async (timesheetId) => {
    setActionLoading(prev => ({ ...prev, [timesheetId]: true }));
    try {
      await adminTimesheetAPI.approve(timesheetId);
      setTimesheets(prev => {
        const next = prev.map(ts => ts._id === timesheetId ? { ...ts, status: 'Approved' } : ts);
        updateStatsFromList(next);
        return next;
      });
      window.dispatchEvent(new Event('refreshTimesheetHistory'));
      showMessage('Success', 'Timesheet approved successfully.', 'success');
    } catch (e) {
      showMessage('Error', 'Approve failed. Please try again.', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [timesheetId]: false }));
    }
  };

  const handleReject = (timesheetId) => {
    openRejectDialog(timesheetId);
  };

  const submitReject = async () => {
    const timesheetId = rejectDialog.timesheetId;
    const reason = (rejectDialog.reason || '').trim();

    if (!timesheetId) return;
    if (!reason) {
      showMessage('Validation', 'Please enter rejection reason.', 'warning');
      return;
    }

    setActionLoading(prev => ({ ...prev, [timesheetId]: true }));
    try {
      await adminTimesheetAPI.reject(timesheetId, reason);
      setTimesheets(prev => {
        const next = prev.map(ts => ts._id === timesheetId ? { ...ts, status: 'Rejected', rejectionReason: reason } : ts);
        updateStatsFromList(next);
        return next;
      });
      window.dispatchEvent(new Event('refreshTimesheetHistory'));
      closeRejectDialog();
      showMessage('Rejected', 'Timesheet rejected successfully.', 'success');
    } catch (e) {
      showMessage('Error', 'Reject failed. Please try again.', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [timesheetId]: false }));
    }
  };

  const getTimesheetId = (ts) => {
    if (!ts) return null;
    return ts._id || ts.id || (ts._doc && ts._doc._id) || null;
  };

  const handleView = (timesheetId) => {
    const timesheet = timesheets.find(ts => getTimesheetId(ts) === timesheetId);
    if (timesheet) {
      setSelectedTimesheet(timesheet);
      setShowViewModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowViewModal(false);
    setSelectedTimesheet(null);
  };

  const handleApproveFromModal = () => {
    if (selectedTimesheet) {
      handleApprove(selectedTimesheet._id);
      handleCloseModal();
    }
  };

  const handleRejectFromModal = () => {
    if (selectedTimesheet) {
      const id = selectedTimesheet._id;
      handleCloseModal();
      handleReject(id);
    }
  };

  const getStatusBadgeClass = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'rejected':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'pending':
      case 'submitted':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'not submitted':
        return 'bg-slate-100 text-slate-600 border border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-6 font-sans text-slate-800">
      
      {/* Top Header Card */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-950/5 border border-slate-200/80 p-5 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-[#262760] to-[#3a3c8c] text-white rounded-2xl shadow-md shadow-indigo-900/20">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-indigo-950 tracking-tight">Admin Timesheet Management</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-200/80"
          >
            <Filter size={15} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>

          <button 
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-100 text-indigo-950 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-200/80 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>

          <button 
            onClick={handleExport}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold hover:scale-[1.02] transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2"
          >
            <Download size={15} />
            Export to Excel
          </button>
        </div>
      </div>

      {/* KPI Statistics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {statConfigs.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div 
              key={stat.title}
              className={`bg-gradient-to-br ${stat.gradient} p-5 rounded-2xl text-white shadow-xl shadow-indigo-950/10 border ${stat.border} relative overflow-hidden group hover:scale-[1.01] transition-all`}
            >
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-200/80">{stat.title}</p>
                  <h3 className="text-2xl font-extrabold mt-1 text-white">{stat.value}</h3>
                </div>
                <div className={`p-2.5 rounded-xl border border-white/10 ${stat.iconBg}`}>
                  <IconComponent size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-950/5 border border-slate-200/80 p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
              <Filter size={16} className="text-indigo-600" />
              Timesheet Filters
            </div>
            {isFilterApplied() && (
              <button
                onClick={handleClearFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 transition-all flex items-center gap-1.5"
              >
                <X size={14} />
                Clear Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Search size={13} className="text-slate-400" /> Employee ID
              </label>
              <select
                value={filters.employeeId}
                onChange={(e) => handleFilterChange('employeeId', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                {employeeIdOptions.map(id => (
                  <option key={id} value={id}>
                    {id === '' ? 'All Employees' : id}
                  </option>
                ))}
              </select>
            </div>

            {!isProjectManager && (
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Building size={13} className="text-slate-400" /> Division
                </label>
                <select
                  value={filters.division}
                  onChange={(e) => handleFilterChange('division', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                >
                  <option>All Division</option>
                  <option>SDS</option>
                  <option>TEKLA</option>
                  <option>DAS(Software)</option>
                  <option>Electrical</option>
                  <option>HR/Admin</option>
                </select>
              </div>
            )}

            {!isProjectManager && (
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <MapPin size={13} className="text-slate-400" /> Location
                </label>
                <select
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                >
                  <option>All Locations</option>
                  <option>Chennai</option>
                  <option>Hosur</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <FileText size={13} className="text-slate-400" /> Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                <option>All Status</option>
                <option value="Submitted">Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
                <option>Not Submitted</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" /> Year
              </label>
              <select
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" /> Week
              </label>
              <select
                value={filters.week}
                onChange={(e) => handleFilterChange('week', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                {weekOptions.map(week => (
                  <option key={week} value={week}>{week}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <FolderOpen size={13} className="text-slate-400" /> Project
              </label>
              <select
                value={filters.project}
                onChange={(e) => handleFilterChange('project', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                {projectOptions.map(p => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" /> From Date
              </label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" /> To Date
              </label>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* Submitted Timesheets Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-950/5 border border-slate-200/80 overflow-hidden">
        <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-indigo-600" />
            <h2 className="text-sm font-bold text-indigo-950 uppercase tracking-wider">Submitted Timesheets</h2>
            <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-extrabold border border-indigo-200">
              {timesheets.length} records
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-[#1e1b4b] via-[#262760] to-[#2e3078] text-white text-xs font-bold uppercase tracking-wider">
                <th className="p-3.5 pl-5">Employee ID</th>
                <th className="p-3.5">Name</th>
                <th className="p-3.5">Division</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5">Week</th>
                <th className="p-3.5">Projects</th>
                <th className="p-3.5 text-center">Total Hours</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center pr-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-500">
                    <Loader2 className="animate-spin w-6 h-6 text-indigo-600 mx-auto mb-2" />
                    Loading timesheets...
                  </td>
                </tr>
              ) : timesheets.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-500 font-semibold">
                    No timesheets found for the selected filters.
                  </td>
                </tr>
              ) : (
                timesheets.map(timesheet => (
                  <tr 
                    key={getTimesheetId(timesheet) || `${timesheet.employeeId || 'UNKNOWN'}|${timesheet.week || 'UNKNOWN'}`}
                    className="hover:bg-indigo-50/40 transition-colors"
                  >
                    <td className="p-3.5 pl-5 font-bold text-indigo-700">{timesheet.employeeId || '—'}</td>
                    <td className="p-3.5 font-bold text-slate-900">{timesheet.employeeName}</td>
                    <td className="p-3.5 text-slate-600">{timesheet.division}</td>
                    <td className="p-3.5 text-slate-600">{timesheet.location}</td>
                    <td className="p-3.5 text-slate-600">{timesheet.week || '—'}</td>
                    <td className="p-3.5 text-slate-600 max-w-xs truncate">
                      {(() => {
                        const projects = (timesheet.timeEntries || []).map(entry => entry.project).filter(Boolean);
                        return projects.length ? projects.join(', ') : '—';
                      })()}
                    </td>
                    <td className="p-3.5 text-center font-bold font-mono text-slate-800">
                      {formatDuration(timesheet.weeklyTotal || 0)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide uppercase inline-block ${getStatusBadgeClass(timesheet.status)}`}>
                        {timesheet.status === 'Submitted' ? 'Pending' : (timesheet.status || '—')}
                      </span>
                    </td>
                    <td className="p-3.5 pr-5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => handleView(getTimesheetId(timesheet))}
                          className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                        {(!['approved','rejected', 'not submitted'].includes((timesheet.status || '').toLowerCase())) && (
                          <>
                            <button 
                              onClick={() => handleReject(getTimesheetId(timesheet))}
                              disabled={!!actionLoading[getTimesheetId(timesheet)]}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-50"
                              title="Reject"
                            >
                              {actionLoading[getTimesheetId(timesheet)] ? (
                                <Loader2 className="animate-spin" size={15} />
                              ) : (
                                <XCircle size={15} />
                              )}
                            </button>
                            <button 
                              onClick={() => handleApprove(getTimesheetId(timesheet))}
                              disabled={!!actionLoading[getTimesheetId(timesheet)]}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              {actionLoading[getTimesheetId(timesheet)] ? (
                                <Loader2 className="animate-spin" size={15} />
                              ) : (
                                <CheckCircle size={15} />
                              )}
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

      {/* View Timesheet Modal */}
      {showViewModal && selectedTimesheet && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <h2 className="text-lg font-extrabold text-indigo-950 flex items-center gap-2">
                <FileText className="text-indigo-600" size={20} />
                Timesheet Details - {selectedTimesheet.employeeName}
              </h2>
              <button 
                onClick={handleCloseModal}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Basic Info Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <p className="text-[11px] font-medium text-slate-500 uppercase">Employee ID</p>
                <p className="text-sm font-bold text-indigo-950 mt-0.5">{selectedTimesheet.employeeId}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <p className="text-[11px] font-medium text-slate-500 uppercase">Employee Name</p>
                <p className="text-sm font-bold text-indigo-950 mt-0.5">{selectedTimesheet.employeeName}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <p className="text-[11px] font-medium text-slate-500 uppercase">Division</p>
                <p className="text-sm font-bold text-indigo-950 mt-0.5">{selectedTimesheet.division}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <p className="text-[11px] font-medium text-slate-500 uppercase">Location</p>
                <p className="text-sm font-bold text-indigo-950 mt-0.5">{selectedTimesheet.location}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <p className="text-[11px] font-medium text-slate-500 uppercase">Week Range</p>
                <p className="text-sm font-bold text-indigo-950 mt-0.5">{selectedTimesheet.week}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <p className="text-[11px] font-medium text-slate-500 uppercase">Status</p>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold mt-1 inline-block ${getStatusBadgeClass(selectedTimesheet.status)}`}>
                  {selectedTimesheet.status}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 sm:col-span-2">
                <p className="text-[11px] font-medium text-slate-500 uppercase">Submitted Date</p>
                <p className="text-sm font-bold text-indigo-950 mt-0.5">
                  {selectedTimesheet.submittedDate ? new Date(selectedTimesheet.submittedDate).toLocaleString() : '—'}
                </p>
              </div>
            </div>

            {/* Time Entries Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">Time Entries Breakdown</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">Projects</th>
                      <th className="p-3">Task</th>
                      {shortDays.map(day => (
                        <th key={day} className="p-3 text-center">{day}</th>
                      ))}
                      <th className="p-3 text-center font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedTimesheet?.timeEntries || []).map((entry, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800">{entry.project}</td>
                        <td className="p-3 text-slate-600">{entry.task}</td>
                        <td className="p-3 text-center font-mono">{entry.monday > 0 ? formatDuration(entry.monday) : '-'}</td>
                        <td className="p-3 text-center font-mono">{entry.tuesday > 0 ? formatDuration(entry.tuesday) : '-'}</td>
                        <td className="p-3 text-center font-mono">{entry.wednesday > 0 ? formatDuration(entry.wednesday) : '-'}</td>
                        <td className="p-3 text-center font-mono">{entry.thursday > 0 ? formatDuration(entry.thursday) : '-'}</td>
                        <td className="p-3 text-center font-mono">{entry.friday > 0 ? formatDuration(entry.friday) : '-'}</td>
                        <td className="p-3 text-center font-mono">{entry.saturday > 0 ? formatDuration(entry.saturday) : '-'}</td>
                        <td className="p-3 text-center font-mono">{entry.sunday > 0 ? formatDuration(entry.sunday) : '-'}</td>
                        <td className="p-3 text-center font-bold font-mono text-emerald-700">
                          {formatDuration(entry.total)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-bold">
                      <td colSpan="9" className="p-3 text-right text-slate-800">Weekly Total:</td>
                      <td className="p-3 text-center font-mono text-indigo-950 font-extrabold text-sm">
                        {formatDuration(selectedTimesheet.weeklyTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rejection Reason */}
            {selectedTimesheet.status === 'Rejected' && selectedTimesheet.rejectionReason && (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-xs text-rose-800">
                <p className="font-bold uppercase tracking-wider mb-1">Rejection Reason</p>
                <p>{selectedTimesheet.rejectionReason}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-200">
              <button 
                onClick={handleCloseModal}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                Close
              </button>
              {(['submitted','pending'].includes((selectedTimesheet.status || '').toLowerCase())) && (
                <>
                  <button 
                    onClick={handleRejectFromModal}
                    disabled={!!actionLoading[selectedTimesheet._id]}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {actionLoading[selectedTimesheet._id] ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <XCircle size={14} />
                        Reject
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleApproveFromModal}
                    disabled={!!actionLoading[selectedTimesheet._id]}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {actionLoading[selectedTimesheet._id] ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} />
                        Approve
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Dialog */}
      {rejectDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h2 className="text-base font-extrabold text-rose-950 flex items-center gap-2">
                <XCircle className="text-rose-600" size={18} />
                Reject Timesheet
              </h2>
              <button onClick={closeRejectDialog} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600">Please specify the reason for rejecting this timesheet submission.</p>

            <textarea
              value={rejectDialog.reason}
              onChange={(e) => setRejectDialog(prev => ({ ...prev, reason: e.target.value }))}
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all outline-none"
              placeholder="Type rejection reason..."
            />

            <div className="flex justify-end items-center gap-2.5 pt-2">
              <button
                onClick={closeRejectDialog}
                disabled={!!actionLoading[rejectDialog.timesheetId]}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                disabled={!!actionLoading[rejectDialog.timesheetId] || !(rejectDialog.reason || '').trim()}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading[rejectDialog.timesheetId] ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    Processing...
                  </>
                ) : (
                  <>
                    <XCircle size={14} />
                    Confirm Reject
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {messageDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <CheckCircle size={24} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">{messageDialog.title}</h2>
              <p className="text-xs text-slate-600 mt-1">{messageDialog.message}</p>
            </div>
            <button
              onClick={closeMessage}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminTimesheet;
