import React, { useState, useEffect } from 'react';
import { adminTimesheetAPI } from '../../services/api';
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
  MoreHorizontal,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';

const AdminTimesheet = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const [filters, setFilters] = useState({
    employeeId: '',
    division: 'All Division',
    location: 'All Locations',
    status: 'All Status',
    week: 'All Weeks',
    project: 'All Projects',
    year: 'All Years'
  });

  // Get user role
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = user.role || '';
  const isProjectManager = role === 'projectmanager' || role === 'project_manager';

  const [hoverStates, setHoverStates] = useState({
    statCards: {},
    refreshButton: false,
    tableRows: {}
  });
  const [projectOptions, setProjectOptions] = useState(["All Projects"]);
  const [weekOptions, setWeekOptions] = useState(["All Weeks"]);
  const [yearOptions, setYearOptions] = useState(["All Years"]);
  const [employeeIdOptions, setEmployeeIdOptions] = useState(['']);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Define styles as constants
  const glassCard = {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    border: '1px solid #e2e8f0'
  };

  const styles = {
    adminTimesheet: {
      padding: '16px',
      backgroundColor: '#f8fafc',
      height: isMobile ? 'auto' : '100vh',
      minHeight: isMobile ? '100vh' : 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: isMobile ? 'visible' : 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    timesheetHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
      padding: '12px',
      ...glassCard,
      flexShrink: 0
    },
    headerTitle: {
      margin: 0,
      color: '#1a202c',
      fontSize: '20px',
      fontWeight: '700'
    },
    adminInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    adminBadge: {
      backgroundColor: '#4299e1',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '10px',
      marginBottom: '12px',
      flexShrink: 0
    },
    statCard: {
      padding: '12px',
      ...glassCard,
      transition: 'all 0.2s ease'
    },
    statCardHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    },
    statHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '8px'
    },
    statIconContainer: {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    statTitle: {
      margin: 0,
      color: '#718096',
      fontSize: '11px',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    statNumber: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#2d3748',
      margin: 0
    },
    filtersSection: {
      padding: '12px',
      marginBottom: '12px',
      ...glassCard,
      flexShrink: 0
    },
    sectionHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px'
    },
    sectionTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      margin: 0,
      color: '#2d3748',
      fontSize: '16px',
      fontWeight: '600'
    },
    filtersGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '12px',
      marginBottom: '12px'
    },
    filterGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    filterLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginBottom: '4px',
      fontWeight: '500',
      color: '#4a5568',
      fontSize: '13px'
    },
    filterInput: {
      padding: '8px 10px',
      border: '1px solid #cbd5e0',
      borderRadius: '6px',
      fontSize: '13px',
      transition: 'all 0.2s ease',
      backgroundColor: 'white'
    },
    filterInputFocus: {
      borderColor: '#4299e1',
      boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.1)'
    },
    actionButtons: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center'
    },
    primaryButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      backgroundColor: '#4299e1',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '14px',
      transition: 'all 0.2s ease'
    },
    primaryButtonHover: {
      backgroundColor: '#3182ce',
      transform: 'translateY(-1px)'
    },
    secondaryButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      backgroundColor: '#e2e8f0',
      color: '#4a5568',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '14px',
      transition: 'all 0.2s ease'
    },
    secondaryButtonHover: {
      backgroundColor: '#cbd5e0'
    },
    timesheetsTableSection: {
      padding: '16px',
      ...glassCard,
      flex: isMobile ? 'none' : 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: isMobile ? 'visible' : 'hidden',
      minHeight: 0
    },
    tableHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px',
      flexShrink: 0
    },
    tableContainer: {
      overflowX: 'auto',
      overflowY: isMobile ? 'visible' : 'auto',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      flex: isMobile ? 'none' : 1
    },
    timesheetsTable: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: 'white'
    },
    tableHeaderCell: {
      padding: '12px',
      textAlign: 'left',
      backgroundColor: '#1976d2',
      fontWeight: '600',
      color: 'white',
      fontSize: '14px',
      borderBottom: '1px solid #e2e8f0',
      borderRight: '1px solid #1565c0'
    },
    tableCell: {
      padding: '12px',
      textAlign: 'left',
      borderBottom: '1px solid #e2e8f0',
      fontSize: '14px'
    },
    tableRow: {
      transition: 'all 0.2s ease'
    },
    tableRowHover: {
      backgroundColor: '#f7fafc'
    },
    actions: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    },
    approveBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      backgroundColor: '#48bb78',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500',
      transition: 'all 0.2s ease'
    },
    rejectBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      backgroundColor: '#f56565',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500',
      transition: 'all 0.2s ease'
    },
    viewBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      backgroundColor: '#1976d2',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500',
      transition: 'all 0.2s ease'
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      textTransform: 'uppercase'
    },
    approvedBadge: {
      backgroundColor: '#c6f6d5',
      color: '#22543d'
    },
    rejectedBadge: {
      backgroundColor: '#fed7d7',
      color: '#742a2a'
    },
    pendingBadge: {
      backgroundColor: '#feebc8',
      color: '#744210'
    },
    // Modal Styles
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '1000px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '1px solid #e2e8f0'
    },
    modalTitle: {
      margin: 0,
      color: '#1a202c',
      fontSize: '20px',
      fontWeight: '600'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '6px',
      color: '#718096',
      transition: 'all 0.2s ease'
    },
    detailGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    detailCard: {
      padding: '16px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      backgroundColor: '#f7fafc'
    },
    detailLabel: {
      fontSize: '12px',
      fontWeight: '500',
      color: '#718096',
      textTransform: 'uppercase',
      marginBottom: '4px'
    },
    detailValue: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#2d3748'
    },
    timeEntriesTableSection: {
      marginBottom: '24px'
    },
    timeEntriesTitle: {
      margin: '0 0 16px 0',
      color: '#2d3748',
      fontSize: '18px',
      fontWeight: '600'
    },
    timeEntriesTable: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      overflow: 'hidden'
    },
    timeEntriesHeader: {
      backgroundColor: '#1976d2',
      fontWeight: '600',
      color: 'white',
      fontSize: '14px',
      textAlign: 'center',
      borderRight: '1px solid #1565c0'
    },
    timeEntriesHeaderCell: {
      padding: '12px',
      borderBottom: '1px solid #e2e8f0',
      borderRight: '1px solid #1565c0'
    },
    timeEntriesCell: {
      padding: '12px',
      textAlign: 'center',
      borderBottom: '1px solid #e2e8f0',
      borderRight: '1px solid #e2e8f0',
      fontSize: '14px'
    },
    totalHoursCell: {
      padding: '12px',
      textAlign: 'center',
      borderBottom: '1px solid #e2e8f0',
      fontSize: '14px',
      fontWeight: '600',
      backgroundColor: '#f7fafc'
    },
    modalActions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px',
      paddingTop: '16px',
      borderTop: '1px solid #e2e8f0'
    }
  };

  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({
    totalTimesheets: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalEmployees: 0,
    projectHours: 0
  });

  const formatDuration = (decimalHours) => {
    if (!decimalHours) return '00:00';
    let hours = Math.floor(decimalHours);
    let minutes = Math.round((decimalHours - hours) * 60);
    if (minutes === 60) {
      hours += 1;
      minutes = 0;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const statConfigs = [
    { 
      title: 'Total Timesheets', 
      value: stats.totalTimesheets, 
      icon: BarChart3, 
      color: '#4299e1'
    },
    { 
      title: 'Pending Review', 
      value: stats.pending, 
      icon: Clock, 
      color: '#ed8936'
    },
    { 
      title: 'Approved', 
      value: stats.approved, 
      icon: CheckCircle, 
      color: '#48bb78'
    },
    { 
      title: 'Rejected', 
      value: stats.rejected, 
      icon: XCircle, 
      color: '#f56565'
    },
    { 
      title: 'Total Employees', 
      value: stats.totalEmployees, 
      icon: Users, 
      color: '#9f7aea'
    },
    { 
      title: 'Project Hours', 
      value: formatDuration(stats.projectHours), 
      icon: Calendar, 
      color: '#ed64a6'
    }
  ];

  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      const params = { ...filters };
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

      if (filters.week === 'All Weeks') {
        const uniqueWeeks = Array.from(new Set(data.map(r => r.week).filter(Boolean))).sort().reverse();
        setWeekOptions(["All Weeks", ...uniqueWeeks]);
      }

      const totalTimesheets = data.length;
      const statusCounts = data.reduce((acc, r) => {
        const s = (r.status || '').toLowerCase();
        if (s === 'approved') acc.approved++;
        else if (s === 'rejected') acc.rejected++;
        else if (s === 'pending' || s === 'submitted') acc.pending++;
        else acc.pending++;
        return acc;
      }, { approved: 0, rejected: 0, pending: 0 });
      const totalEmployees = new Set(data.map(r => r.employeeId).filter(Boolean)).size;
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
      try {
        alert('Failed to load timesheets. Please ensure the server is running.');
      } catch (_) {}
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
    const totalEmployees = new Set(list.map(r => r.employeeId).filter(Boolean)).size;
    const projectHours = list.reduce((sum, r) => {
      const s = (r.status || '').toLowerCase();
      const includeRow = s === 'approved' || s === 'submitted' || s === 'pending';
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
  }, []);

  useEffect(() => {
    fetchTimesheets();
  }, [filters]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value,
      ...(['division', 'location', 'week', 'year', 'employeeId'].includes(filterName) ? { project: 'All Projects' } : {})
    }));
  };

  const isFilterApplied = () => {
    return (
      filters.employeeId !== '' ||
      filters.division !== 'All Division' ||
      filters.location !== 'All Locations' ||
      filters.status !== 'All Status' ||
      filters.week !== 'All Weeks' ||
      filters.project !== 'All Projects' ||
      filters.year !== 'All Years'
    );
  };

  const handleClearFilters = () => {
    setFilters({
      employeeId: '',
      division: 'All Division',
      location: 'All Locations',
      status: 'All Status',
      week: 'All Weeks',
      project: 'All Projects',
      year: 'All Years'
    });
  };

  const handleRefresh = () => {
    fetchTimesheets();
  };

  const handleExport = () => {
    if (!timesheets.length) {
      alert('No data to export');
      return;
    }

    // Define CSV headers
    const headers = [
      'Employee ID',
      'Name',
      'Division',
      'Location',
      'Week',
      'Projects',
      'Total Hours',
      'Status',
      'Submitted Date'
    ];

    // Format data rows
    const rows = timesheets.map(ts => {
      const projects = (ts.timeEntries || []).map(entry => entry.project).filter(Boolean).join('; ');
      return [
        ts.employeeId || '',
        ts.employeeName || '',
        ts.division || '',
        ts.location || '',
        ts.week || '',
        `"${projects}"`, // Wrap in quotes to handle commas/semicolons
        formatDuration(ts.weeklyTotal || 0),
        ts.status || '',
        ts.submittedDate || ''
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `timesheets_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    } catch (e) {
      try { alert('Approve failed. Please try again.'); } catch (_) {}
    } finally {
      setActionLoading(prev => ({ ...prev, [timesheetId]: false }));
    }
  };

  const handleReject = async (timesheetId) => {
    const reason = window.prompt('Enter rejection reason');
    if (reason === null) return;
    setActionLoading(prev => ({ ...prev, [timesheetId]: true }));
    try {
      await adminTimesheetAPI.reject(timesheetId, reason || '');
      setTimesheets(prev => {
        const next = prev.map(ts => ts._id === timesheetId ? { ...ts, status: 'Rejected', rejectionReason: reason || '' } : ts);
        updateStatsFromList(next);
        return next;
      });
      window.dispatchEvent(new Event('refreshTimesheetHistory'));
    } catch (e) {
      try { alert('Reject failed. Please try again.'); } catch (_) {}
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
      handleReject(selectedTimesheet._id);
      handleCloseModal();
    }
  };

  const handleMouseEnter = (type, id) => {
    setHoverStates(prev => ({
      ...prev,
      [type]: { ...prev[type], [id]: true }
    }));
  };

  const handleMouseLeave = (type, id) => {
    setHoverStates(prev => ({
      ...prev,
      [type]: { ...prev[type], [id]: false }
    }));
  };

  const getStatusBadge = (status) => {
    const baseStyle = styles.statusBadge;
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'approved':
        return { ...baseStyle, ...styles.approvedBadge };
      case 'rejected':
        return { ...baseStyle, ...styles.rejectedBadge };
      case 'pending':
      case 'submitted':
        return { ...baseStyle, ...styles.pendingBadge };
      default:
        return baseStyle;
    }
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div style={styles.adminTimesheet}>
      {/* Header */}
      {/* <div style={styles.timesheetHeader}>
        <h1 style={styles.headerTitle}>Timesheet Management</h1>
      </div> */}

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        {statConfigs.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div 
              key={stat.title}
              style={{
                ...styles.statCard,
                ...(hoverStates.statCards?.[stat.title] ? styles.statCardHover : {})
              }}
              onMouseEnter={() => handleMouseEnter('statCards', stat.title)}
              onMouseLeave={() => handleMouseLeave('statCards', stat.title)}
            >
              <div style={styles.statHeader}>
                <div style={{...styles.statIconContainer, backgroundColor: `${stat.color}20`}}>
                  <IconComponent size={20} color={stat.color} />
                </div>
              </div>
              <h3 style={styles.statTitle}>{stat.title}</h3>
              <p style={styles.statNumber}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Filters Section */}
      <div style={styles.filtersSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>
            <Filter size={20} />
            Timesheet Filters
          </h2>
          <div style={styles.actionButtons}>
            {isFilterApplied() && (
              <button
                style={{
                  ...styles.secondaryButton,
                  color: '#e53e3e',
                  borderColor: '#e53e3e',
                  backgroundColor: '#fff5f5'
                }}
                onClick={handleClearFilters}
              >
                <X size={16} />
                Clear Filters
              </button>
            )}
            <button 
              style={{
                ...styles.secondaryButton,
                ...(hoverStates.refreshButton?.refresh ? styles.secondaryButtonHover : {}),
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={() => handleMouseEnter('refreshButton', 'refresh')}
              onMouseLeave={() => handleMouseLeave('refreshButton', 'refresh')}
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button 
              style={styles.primaryButton}
              onClick={handleExport}
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        <div style={styles.filtersGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              <Search size={14} />
              Employee ID
            </label>
            <select
              style={styles.filterInput}
              value={filters.employeeId}
              onChange={(e) => handleFilterChange('employeeId', e.target.value)}
            >
              {employeeIdOptions.map(id => (
                <option key={id} value={id}>
                  {id === '' ? 'All Employees' : id}
                </option>
              ))}
            </select>
          </div>
          
          {!isProjectManager && (
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>
                <Building size={14} />
                Division
              </label>
              <select
                value={filters.division}
                onChange={(e) => handleFilterChange('division', e.target.value)}
                style={styles.filterInput}
              >
                <option>All Division</option>
                <option>SDS</option>
                <option>TEKLA</option>
                <option>DAS(Software)</option>
                <option>Mechanical</option>
              </select>
            </div>
          )}

          {!isProjectManager && (
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>
                <MapPin size={14} />
                Location
              </label>
              <select
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                style={styles.filterInput}
              >
                <option>All Locations</option>
                <option>Chennai</option>
                <option>Hosur</option>
              </select>
            </div>
          )}

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              <FileText size={14} />
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={styles.filterInput}
            >
              <option>All Status</option>
              <option>Submitted</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>
                  <Calendar size={14} />
                  Year
                </label>
                <select
                  style={styles.filterInput}
                  value={filters.year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                >
                  {yearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>
                  <Calendar size={14} />
                  Week
                </label>
            <select
              value={filters.week}
              onChange={(e) => handleFilterChange('week', e.target.value)}
              style={styles.filterInput}
            >
              {weekOptions.map(week => (
                <option key={week} value={week}>{week}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              <FolderOpen size={14} />
              Project
            </label>
            <select
              value={filters.project}
              onChange={(e) => handleFilterChange('project', e.target.value)}
              style={styles.filterInput}
            >
              {projectOptions.map(p => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Timesheets Table */}
      <div style={styles.timesheetsTableSection}>
        <div style={styles.tableHeader}>
          <h2 style={styles.sectionTitle}>
            <FileText size={20} />
            Submitted Timesheets
          </h2>
          <span style={{color: '#718096', fontSize: '14px'}}>
            {timesheets.length} records
          </span>
        </div>

        <div style={styles.tableContainer}>
          <table style={styles.timesheetsTable}>
            <thead>
              <tr>
                <th style={styles.tableHeaderCell}>Employee ID</th>
                <th style={styles.tableHeaderCell}>Name</th>
                <th style={styles.tableHeaderCell}>Division</th>
                <th style={styles.tableHeaderCell}>Location</th>
                <th style={styles.tableHeaderCell}>Week</th>
                <th style={styles.tableHeaderCell}>Projects</th>
                <th style={styles.tableHeaderCell}>Total Hours</th>
                <th style={styles.tableHeaderCell}>Status</th>
                <th style={styles.tableHeaderCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {timesheets.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{...styles.tableCell, textAlign: 'center', padding: '40px'}}>
                    <div style={{color: '#718096', fontSize: '16px'}}>
                      No timesheets found
                    </div>
                  </td>
                </tr>
              ) : (
                timesheets.map(timesheet => (
                      <tr 
                    key={getTimesheetId(timesheet) || `${timesheet.employeeId || 'UNKNOWN'}|${timesheet.week || 'UNKNOWN'}`}
                    style={{
                      ...styles.tableRow,
                      ...(hoverStates.tableRows?.[timesheet._id] ? styles.tableRowHover : {})
                    }}
                    onMouseEnter={() => handleMouseEnter('tableRows', timesheet._id)}
                    onMouseLeave={() => handleMouseLeave('tableRows', timesheet._id)}
                  >
                    <td style={styles.tableCell}>
                      <div style={{fontWeight: '500', color: '#4299e1'}}>
                        {timesheet.employeeId || '—'}
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{fontWeight: '500'}}>{timesheet.employeeName}</div>
                    </td>
                    <td style={styles.tableCell}>{timesheet.division}</td>
                    <td style={styles.tableCell}>{timesheet.location}</td>
                    <td style={styles.tableCell}>{timesheet.week || '—'}</td>
                    <td style={styles.tableCell}>
                      {(() => {
                        const projects = (timesheet.timeEntries || []).map(entry => entry.project).filter(Boolean);
                        return projects.length ? projects.join(', ') : '—';
                      })()}
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{fontWeight: '600'}}>{formatDuration(timesheet.weeklyTotal || 0)}</div>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={getStatusBadge(timesheet.status)}>
                        {timesheet.status || '—'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={styles.actions}>
                        <button 
                          style={styles.viewBtn}
                          onClick={() => handleView(getTimesheetId(timesheet))}
                          title="View Details"
                        >
                          <Eye size={12} />
                        </button>
                        {(!['approved','rejected'].includes((timesheet.status || '').toLowerCase())) && (
                          <>
                            <button 
                              style={styles.rejectBtn}
                              onClick={() => handleReject(getTimesheetId(timesheet))}
                              disabled={!!actionLoading[getTimesheetId(timesheet)]}
                              title="Reject"
                            >
                              {actionLoading[getTimesheetId(timesheet)] ? (
                                <Loader2 className="animate-spin" size={12} />
                              ) : (
                                <XCircle size={12} />
                              )}
                            </button>
                            <button 
                              style={styles.approveBtn}
                              onClick={() => handleApprove(getTimesheetId(timesheet))}
                              disabled={!!actionLoading[getTimesheetId(timesheet)]}
                              title="Approve"
                            >
                              {actionLoading[getTimesheetId(timesheet)] ? (
                                <Loader2 className="animate-spin" size={12} />
                              ) : (
                                <CheckCircle size={12} />
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
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                Timesheet Details - {selectedTimesheet.employeeName}
              </h2>
              <button 
                style={styles.closeButton}
                onClick={handleCloseModal}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Basic Information Grid */}
            <div style={styles.detailGrid}>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>Employee ID</div>
                <div style={styles.detailValue}>{selectedTimesheet.employeeId}</div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>Employee Name</div>
                <div style={styles.detailValue}>{selectedTimesheet.employeeName}</div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>Division</div>
                <div style={styles.detailValue}>{selectedTimesheet.division}</div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>Location</div>
                <div style={styles.detailValue}>{selectedTimesheet.location}</div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>Week</div>
                <div style={styles.detailValue}>{selectedTimesheet.week}</div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>Status</div>
                <div>
                  <span style={getStatusBadge(selectedTimesheet.status)}>
                    {selectedTimesheet.status}
                  </span>
                </div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>Submitted Date</div>
                <div style={styles.detailValue}>{selectedTimesheet.submittedDate}</div>
              </div>
            </div>

            {/* Time Entries Table */}
            <div style={styles.timeEntriesTableSection}>
              <h3 style={styles.timeEntriesTitle}>Time Entries</h3>
              <div style={styles.tableContainer}>
                <table style={styles.timeEntriesTable}>
                  <thead>
                    <tr>
                      <th style={{...styles.timeEntriesHeaderCell, textAlign: 'left'}}>Projects</th>
                      <th style={{...styles.timeEntriesHeaderCell, textAlign: 'left'}}>Task</th>
                      {shortDays.map(day => (
                        <th key={day} style={styles.timeEntriesHeaderCell}>{day}</th>
                      ))}
                      <th style={styles.timeEntriesHeaderCell}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedTimesheet?.timeEntries || []).map((entry, index) => (
                      <tr key={index}>
                        <td style={{...styles.timeEntriesCell, textAlign: 'left'}}>{entry.project}</td>
                        <td style={{...styles.timeEntriesCell, textAlign: 'left'}}>{entry.task}</td>
                        <td style={styles.timeEntriesCell}>{entry.monday > 0 ? formatDuration(entry.monday) : '-'}</td>
                        <td style={styles.timeEntriesCell}>{entry.tuesday > 0 ? formatDuration(entry.tuesday) : '-'}</td>
                        <td style={styles.timeEntriesCell}>{entry.wednesday > 0 ? formatDuration(entry.wednesday) : '-'}</td>
                        <td style={styles.timeEntriesCell}>{entry.thursday > 0 ? formatDuration(entry.thursday) : '-'}</td>
                        <td style={styles.timeEntriesCell}>{entry.friday > 0 ? formatDuration(entry.friday) : '-'}</td>
                        <td style={styles.timeEntriesCell}>{entry.saturday > 0 ? formatDuration(entry.saturday) : '-'}</td>
                        <td style={styles.timeEntriesCell}>{entry.sunday > 0 ? formatDuration(entry.sunday) : '-'}</td>
                        <td style={styles.timeEntriesCell}>
                          <div style={{fontWeight: '600'}}>{formatDuration(entry.total)}</div>
                        </td>
                      </tr>
                    ))}
                    {/* Weekly Total Row */}
                    <tr>
                      <td 
                        colSpan="9" 
                        style={{
                          ...styles.totalHoursCell, 
                          textAlign: 'right',
                          fontWeight: '600',
                          backgroundColor: '#f7fafc'
                        }}
                      >
                        Weekly Total:
                      </td>
                      <td style={styles.totalHoursCell}>
                        <div style={{fontWeight: '700', color: '#2d3748'}}>
                          {formatDuration(selectedTimesheet.weeklyTotal)}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rejection Reason */}
            {selectedTimesheet.status === 'Rejected' && selectedTimesheet.rejectionReason && (
              <div style={{...styles.detailCard, borderColor: '#f56565', backgroundColor: '#fed7d7'}}>
                <div style={{...styles.detailLabel, color: '#742a2a'}}>Rejection Reason</div>
                <div style={{color: '#742a2a', fontSize: '14px'}}>
                  {selectedTimesheet.rejectionReason}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={styles.modalActions}>
              <button 
                style={styles.secondaryButton}
                onClick={handleCloseModal}
              >
                Close
              </button>
              {(['submitted','pending'].includes((selectedTimesheet.status || '').toLowerCase())) && (
                <>
                  <button 
                    style={styles.rejectBtn}
                    onClick={() => handleReject(selectedTimesheet._id)}
                    disabled={!!actionLoading[selectedTimesheet._id]}
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
                    style={styles.approveBtn}
                    onClick={() => handleApprove(selectedTimesheet._id)}
                    disabled={!!actionLoading[selectedTimesheet._id]}
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
    </div>
  );
};

export default AdminTimesheet;
