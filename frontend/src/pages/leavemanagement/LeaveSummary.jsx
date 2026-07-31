import React, { useEffect, useState } from 'react';
import { leaveAPI } from '../../services/api';
import * as XLSX from 'xlsx';
import { 
  Eye, 
  Calendar, 
  Filter, 
  RefreshCw, 
  Download, 
  X, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  MapPin, 
  Search,
  Building2,
  Loader2,
  FileCheck
} from 'lucide-react';

const LeaveSummary = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  const getIsMobile = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  };

  const [isMobile, setIsMobile] = useState(getIsMobile);
  const [showFilters, setShowFilters] = useState(() => !getIsMobile());

  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedLeaveType, setSelectedLeaveType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' }
  ];

  const locations = ['Hosur', 'Chennai'];
  const leaveTypes = ['Casual Leave', 'Sick Leave', 'Privilege Leave', 'Bereavement Leave', 'Regional Holiday'];
  const statusOptions = ['Approved', 'Pending', 'Rejected'];

  const [leaveApplications, setLeaveApplications] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const [viewLeave, setViewLeave] = useState(null);

  const loadLeaves = async () => {
    try {
      const res = await leaveAPI.list();
      const items = Array.isArray(res.data) ? res.data : [];
      const mapped = items.map(l => ({
        id: l._id,
        employeeName: l.employeeName || l.name || '',
        employeeId: l.employeeId || '',
        leaveType: (() => {
          if (l.leaveType === 'REGIONAL_HOLIDAY') {
            return `Regional Holiday${l.regionalHolidayName ? ` - ${l.regionalHolidayName}` : ''}`;
          }
          if (['CL', 'SL', 'PL'].includes(l.leaveType) && (l.clUsed > 0 || l.slUsed > 0 || l.plUsed > 0 || l.negativePL > 0 || l.lopDays > 0)) {
            const parts = [];
            if (l.clUsed > 0) parts.push('Casual Leave');
            if (l.slUsed > 0) parts.push('Sick Leave');
            if (l.plUsed > 0 || l.negativePL > 0) parts.push('Privilege Leave');
            if (l.lopDays > 0) parts.push('Loss of Pay');
            return parts.join(', ');
          }
          return l.leaveType === 'CL' ? 'Casual Leave'
            : l.leaveType === 'SL' ? 'Sick Leave'
            : l.leaveType === 'PL' ? 'Privilege Leave'
            : l.leaveType === 'BEREAVEMENT' ? 'Bereavement Leave'
            : l.leaveType;
        })(),
        startDateRaw: l.startDate,
        endDateRaw: l.endDate,
        fromDate: new Date(l.startDate).toLocaleDateString('en-IN'),
        toDate: new Date(l.endDate).toLocaleDateString('en-IN'),
        fromMonth: new Date(l.startDate).getMonth() + 1,
        fromYear: new Date(l.startDate).getFullYear(),
        days: l.totalDays || 0,
        totalLeaveDays: l.totalDays || 0,
        dayType: l.dayType || 'Full Day',
        status: l.status || 'Pending',
        location: l.location || l.branch || '—',
        documentUrl: l.documentUrl || '',
        clUsed: l.clUsed || 0,
        slUsed: l.slUsed || 0,
        plUsed: l.plUsed || 0,
        negativePL: l.negativePL || 0,
        lopDays: l.lopDays || 0,
        bereavementRelation: l.bereavementRelation || '',
        regionalHolidayName: l.regionalHolidayName || '',
        reason: l.reason || ''
      }));
      setLeaveApplications(mapped);
    } catch {
      setLeaveApplications([]);
    }
  };

  useEffect(() => {
    loadLeaves();
    const timer = setInterval(loadLeaves, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = getIsMobile();
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const isApplied =
      selectedYear !== 'all' ||
      selectedMonth !== 'all' ||
      selectedEmployeeId.trim() !== '' ||
      selectedLeaveType !== 'all' ||
      selectedLocation !== 'all' ||
      selectedStatus !== 'all';

    setIsFilterApplied(isApplied);
  }, [selectedYear, selectedMonth, selectedEmployeeId, selectedLeaveType, selectedLocation, selectedStatus]);

  const handleFilterChange = (filterType, value) => {
    switch (filterType) {
      case 'year':
        setSelectedYear(value);
        break;
      case 'month':
        setSelectedMonth(value);
        break;
      case 'employeeId':
        setSelectedEmployeeId(value);
        break;
      case 'leaveType':
        setSelectedLeaveType(value);
        break;
      case 'location':
        setSelectedLocation(value);
        break;
      case 'status':
        setSelectedStatus(value);
        break;
      default:
        break;
    }
  };

  const handleClearAllFilters = () => {
    setSelectedYear('all');
    setSelectedMonth('all');
    setSelectedEmployeeId('');
    setSelectedLeaveType('all');
    setSelectedLocation('all');
    setSelectedStatus('all');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadLeaves();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const handleApprove = async (id) => {
    setActionLoading(prev => ({ ...prev, [id]: 'approve' }));
    try {
      await leaveAPI.approve(id);
      await loadLeaves();
    } catch {
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleReject = async (id) => {
    setActionLoading(prev => ({ ...prev, [id]: 'reject' }));
    try {
      await leaveAPI.reject(id);
      await loadLeaves();
    } catch {
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const filteredApplications = leaveApplications.filter(app => {
    if (selectedYear !== 'all') {
      const sYear = new Date(app.startDateRaw).getFullYear();
      const eYear = new Date(app.endDateRaw).getFullYear();
      if (selectedYear < sYear || selectedYear > eYear) return false;
    }

    if (selectedMonth !== 'all') {
      const sDate = new Date(app.startDateRaw);
      const eDate = new Date(app.endDateRaw);
      const selYear = selectedYear !== 'all' ? selectedYear : sDate.getFullYear();
      const targetStart = new Date(selYear, selectedMonth - 1, 1);
      const targetEnd = new Date(selYear, selectedMonth, 0, 23, 59, 59);
      if (eDate < targetStart || sDate > targetEnd) return false;
    }

    if (selectedEmployeeId.trim() !== '') {
      const filterId = selectedEmployeeId.trim().toLowerCase();
      const empId = app.employeeId.toLowerCase();
      if (!empId.includes(filterId)) return false;
    }

    if (selectedLeaveType !== 'all' && app.leaveType !== selectedLeaveType) return false;
    if (selectedLocation !== 'all' && app.location !== selectedLocation) return false;
    if (selectedStatus !== 'all' && app.status !== selectedStatus) return false;

    return true;
  });

  const totalLeaveDays = filteredApplications.reduce((sum, app) => sum + app.totalLeaveDays, 0);
  const approvedCount = filteredApplications.filter(a => a.status === 'Approved').length;
  const pendingCount = filteredApplications.filter(a => a.status === 'Pending').length;
  const rejectedCount = filteredApplications.filter(a => a.status === 'Rejected').length;

  const handleDownloadExcel = () => {
    if (filteredApplications.length === 0) {
      alert('No data available to export');
      return;
    }

    const reportData = filteredApplications.map((app, index) => ({
      'S.No': index + 1,
      'Employee ID': app.employeeId,
      'Employee Name': app.employeeName,
      'Leave Type': app.leaveType,
      'Location': app.location,
      'Start Date': app.fromDate,
      'End Date': app.toDate,
      'Total Days': app.totalLeaveDays,
      'Day Type': app.dayType,
      'Status': app.status,
      'Reason': app.reason || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leave Applications');

    const fileName = `Leave_Summary_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-6 font-sans text-slate-800">
      
      {/* Top Header Card */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-950/5 border border-slate-200/80 p-5 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-[#262760] to-[#3a3c8c] text-white rounded-2xl shadow-md shadow-indigo-900/20">
            <FileCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-indigo-950 tracking-tight">Leave Management Summary</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Track, filter, approve, and analyze leave application records</p>
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
            disabled={isRefreshing}
            className="px-4 py-2.5 bg-slate-100 text-indigo-950 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-200/80 disabled:opacity-50"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button 
            onClick={handleDownloadExcel}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold hover:scale-[1.02] transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2"
          >
            <Download size={15} />
            Download Excel Report
          </button>
        </div>
      </div>

      {/* KPI Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Applications */}
        <div className="bg-gradient-to-br from-indigo-900 via-[#1e1b4b] to-[#262760] p-5 rounded-2xl text-white shadow-xl shadow-indigo-950/10 border border-indigo-500/20 relative overflow-hidden group hover:scale-[1.01] transition-all">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-indigo-200/80">Applications</p>
              <h3 className="text-3xl font-extrabold mt-1 text-white">{filteredApplications.length}</h3>
            </div>
            <div className="p-2.5 rounded-xl border border-indigo-400/30 bg-indigo-500/20 text-indigo-300">
              <FileText size={22} />
            </div>
          </div>
        </div>

        {/* Total Leave Days */}
        <div className="bg-gradient-to-br from-purple-900 via-[#3b0764] to-[#581c87] p-5 rounded-2xl text-white shadow-xl shadow-purple-950/10 border border-purple-500/20 relative overflow-hidden group hover:scale-[1.01] transition-all">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-purple-200/80">Total Leave Days</p>
              <h3 className="text-3xl font-extrabold mt-1 text-white">{totalLeaveDays}</h3>
            </div>
            <div className="p-2.5 rounded-xl border border-purple-400/30 bg-purple-500/20 text-purple-300">
              <Calendar size={22} />
            </div>
          </div>
        </div>

        {/* Approved Count */}
        <div className="bg-gradient-to-br from-emerald-900 via-[#064e3b] to-[#047857] p-5 rounded-2xl text-white shadow-xl shadow-emerald-950/10 border border-emerald-500/20 relative overflow-hidden group hover:scale-[1.01] transition-all">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-200/80">Approved</p>
              <h3 className="text-3xl font-extrabold mt-1 text-white">{approvedCount}</h3>
            </div>
            <div className="p-2.5 rounded-xl border border-emerald-400/30 bg-emerald-500/20 text-emerald-300">
              <CheckCircle size={22} />
            </div>
          </div>
        </div>

        {/* Pending Count */}
        <div className="bg-gradient-to-br from-amber-900 via-[#451a03] to-[#78350f] p-5 rounded-2xl text-white shadow-xl shadow-amber-950/10 border border-amber-500/20 relative overflow-hidden group hover:scale-[1.01] transition-all">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-amber-200/80">Pending</p>
              <h3 className="text-3xl font-extrabold mt-1 text-white">{pendingCount}</h3>
            </div>
            <div className="p-2.5 rounded-xl border border-amber-400/30 bg-amber-500/20 text-amber-300">
              <Clock size={22} />
            </div>
          </div>
        </div>

        {/* Rejected Count */}
        <div className="bg-gradient-to-br from-rose-900 via-[#4c0519] to-[#881337] p-5 rounded-2xl text-white shadow-xl shadow-rose-950/10 border border-rose-500/20 relative overflow-hidden group hover:scale-[1.01] transition-all">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-rose-200/80">Rejected</p>
              <h3 className="text-3xl font-extrabold mt-1 text-white">{rejectedCount}</h3>
            </div>
            <div className="p-2.5 rounded-xl border border-rose-400/30 bg-rose-500/20 text-rose-300">
              <XCircle size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-950/5 border border-slate-200/80 p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
              <Filter size={16} className="text-indigo-600" />
              Leave Filters
            </div>
            {isFilterApplied && (
              <button
                onClick={handleClearAllFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 transition-all flex items-center gap-1.5"
              >
                <X size={14} />
                Clear Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" /> Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => handleFilterChange('year', e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                <option value="all">All Years</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" /> Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => handleFilterChange('month', e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                <option value="all">All Months</option>
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Search size={13} className="text-slate-400" /> Employee ID
              </label>
              <input
                type="text"
                placeholder="Enter employee ID..."
                value={selectedEmployeeId}
                onChange={(e) => handleFilterChange('employeeId', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <FileText size={13} className="text-slate-400" /> Leave Type
              </label>
              <select
                value={selectedLeaveType}
                onChange={(e) => handleFilterChange('leaveType', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                <option value="all">All Types</option>
                {leaveTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-400" /> Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                <option value="all">All Locations</option>
                {locations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400" /> Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                <option value="all">All Status</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Leave Applications Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-950/5 border border-slate-200/80 overflow-hidden">
        <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileCheck size={18} className="text-indigo-600" />
            <h2 className="text-sm font-bold text-indigo-950 uppercase tracking-wider">Leave Applications</h2>
            <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-extrabold border border-indigo-200">
              {filteredApplications.length} records
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-medium">
            <thead>
              <tr className="bg-gradient-to-r from-[#1e1b4b] via-[#262760] to-[#2e3078] text-white font-bold uppercase tracking-wider">
                <th className="p-3.5 pl-5">S.No</th>
                <th className="p-3.5">Employee ID</th>
                <th className="p-3.5">Employee Name</th>
                <th className="p-3.5">Leave Type</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5">Start Date</th>
                <th className="p-3.5">End Date</th>
                <th className="p-3.5 text-center">Total Days</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center pr-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApplications.length > 0 ? (
                filteredApplications.map((app, index) => (
                  <tr key={app.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="p-3.5 pl-5 text-slate-500 font-bold">{index + 1}</td>
                    <td className="p-3.5 font-bold font-mono text-indigo-700">{app.employeeId}</td>
                    <td className="p-3.5 font-bold text-slate-900">{app.employeeName}</td>
                    <td className="p-3.5 text-slate-700">{app.leaveType}</td>
                    <td className="p-3.5">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-slate-200">
                        {app.location}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600">{app.fromDate}</td>
                    <td className="p-3.5 text-slate-600">{app.toDate}</td>
                    <td className="p-3.5 text-center font-bold">
                      <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs border border-emerald-200 inline-block font-mono">
                        {app.totalLeaveDays} {app.totalLeaveDays === 1 ? 'day' : 'days'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide uppercase inline-block ${getStatusBadgeClass(app.status)}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="p-3.5 pr-5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewLeave(app)}
                          className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>

                        {app.status === 'Pending' && (
                          <>
                            <button
                              disabled={!!actionLoading[app.id]}
                              onClick={() => handleApprove(app.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-all shadow-xs disabled:opacity-50 flex items-center gap-1"
                            >
                              {actionLoading[app.id] === 'approve' ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                'Approve'
                              )}
                            </button>
                            <button
                              disabled={!!actionLoading[app.id]}
                              onClick={() => handleReject(app.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-all shadow-xs disabled:opacity-50 flex items-center gap-1"
                            >
                              {actionLoading[app.id] === 'reject' ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                'Reject'
                              )}
                            </button>
                          </>
                        )}
                      </div>

                      {app.documentUrl && (
                        <div className="mt-1 text-center">
                          <a
                            href={`${(typeof window !== 'undefined' ? (process.env.REACT_APP_API_BASE || 'http://localhost:5003/api').replace('/api','') : '')}${app.documentUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                          >
                            <span>📄</span> Certificate
                          </a>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="text-center py-12 text-slate-500 font-semibold">
                    No leave applications found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Total Summary */}
        {filteredApplications.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-700">
            <span>Showing {filteredApplications.length} applications</span>
            <span className="text-indigo-950 font-mono text-sm bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200">
              Total Leave Days: <span className="text-emerald-700 font-extrabold">{totalLeaveDays} days</span>
            </span>
          </div>
        )}
      </div>

      {/* View Leave Details Modal */}
      {viewLeave && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="text-base font-extrabold text-indigo-950 flex items-center gap-2">
                <FileText className="text-indigo-600" size={18} />
                Leave Application Details
              </h3>
              <button onClick={() => setViewLeave(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                <p className="text-[10px] font-medium text-slate-500 uppercase">Employee</p>
                <p className="font-bold text-indigo-950 mt-0.5">{viewLeave.employeeName} ({viewLeave.employeeId})</p>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                <p className="text-[10px] font-medium text-slate-500 uppercase">Leave Type</p>
                <p className="font-bold text-indigo-950 mt-0.5">{viewLeave.leaveType}</p>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                <p className="text-[10px] font-medium text-slate-500 uppercase">Dates</p>
                <p className="font-bold text-indigo-950 mt-0.5">{viewLeave.fromDate} - {viewLeave.toDate}</p>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                <p className="text-[10px] font-medium text-slate-500 uppercase">Total Days</p>
                <p className="font-bold text-indigo-950 mt-0.5">{viewLeave.totalLeaveDays} ({viewLeave.dayType})</p>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 sm:col-span-2">
                <p className="text-[10px] font-medium text-slate-500 uppercase">Status</p>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold mt-1 inline-block ${getStatusBadgeClass(viewLeave.status)}`}>
                  {viewLeave.status}
                </span>
              </div>

              {viewLeave.bereavementRelation && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 sm:col-span-2">
                  <p className="text-[10px] font-medium text-slate-500 uppercase">Bereavement Relation</p>
                  <p className="font-bold text-indigo-950 mt-0.5">{viewLeave.bereavementRelation}</p>
                </div>
              )}

              {viewLeave.regionalHolidayName && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 sm:col-span-2">
                  <p className="text-[10px] font-medium text-slate-500 uppercase">Regional Holiday</p>
                  <p className="font-bold text-indigo-950 mt-0.5">{viewLeave.regionalHolidayName}</p>
                </div>
              )}

              {viewLeave.reason && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 sm:col-span-2">
                  <p className="text-[10px] font-medium text-slate-500 uppercase">Reason</p>
                  <p className="font-medium text-slate-700 mt-0.5">{viewLeave.reason}</p>
                </div>
              )}
            </div>

            {/* Deduction Breakdown */}
            {(viewLeave.clUsed > 0 || viewLeave.slUsed > 0 || viewLeave.plUsed > 0 || viewLeave.negativePL > 0 || viewLeave.lopDays > 0) && (
              <div className="bg-indigo-50/60 border border-indigo-100 p-3 rounded-xl space-y-2 text-xs">
                <p className="font-bold text-indigo-950 uppercase text-[11px]">Deduction Breakdown</p>
                <div className="grid grid-cols-2 gap-2 text-slate-700 font-semibold">
                  {viewLeave.clUsed > 0 && <div>Casual Leave (CL): <span className="font-bold text-indigo-900">{viewLeave.clUsed} days</span></div>}
                  {viewLeave.slUsed > 0 && <div>Sick Leave (SL): <span className="font-bold text-indigo-900">{viewLeave.slUsed} days</span></div>}
                  {viewLeave.plUsed > 0 && <div>Privilege Leave (PL): <span className="font-bold text-indigo-900">{viewLeave.plUsed} days</span></div>}
                  {viewLeave.negativePL > 0 && <div className="text-rose-600 font-bold">Negative PL: {viewLeave.negativePL} days</div>}
                  {viewLeave.lopDays > 0 && <div className="text-amber-600 font-bold">Loss of Pay (LOP): {viewLeave.lopDays} days</div>}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={() => setViewLeave(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all"
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

export default LeaveSummary;
