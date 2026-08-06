import React, { useState, useEffect } from 'react';
import { Popconfirm } from 'antd';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import UserForm from '../components/Forms/UserForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { authAPI, employeeAPI } from '../services/api';

const UserAccess = () => {
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // Store all users for export
  const [employees, setEmployees] = useState([]);
  const [employeeMap, setEmployeeMap] = useState({});
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [filters, setFilters] = useState({
    name: '',
    email: '',
    role: '',
    employeeId: '',
    division: '',
    location: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { notification, showSuccess, hideNotification } = useNotification();
  const [currentUser, setCurrentUser] = useState(null);
  const [hasemployeesAccess, setHasemployeesAccess] = useState(false);
  let sessionUser = {};
  try {
    sessionUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  } catch {
    sessionUser = {};
  }
  const isAdminSession = ['admin', 'hr', 'director', 'manager'].includes(String(sessionUser.role || '').toLowerCase());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [uniqueOptions, setUniqueOptions] = useState({
    names: [],
    employeeIds: [],
    divisions: [],
    locations: []
  });

  const normalizeEmployeeIdForSort = (value) => {
    const id = (value ?? '').toString().trim();
    if (!id || id === '—') return null;
    return id;
  };

  const compareEmployeeIdStrings = (a, b) => {
    const ia = normalizeEmployeeIdForSort(a);
    const ib = normalizeEmployeeIdForSort(b);
    if (!ia && !ib) return 0;
    if (!ia) return 1;
    if (!ib) return -1;
    return ia.localeCompare(ib, undefined, { numeric: true, sensitivity: 'base' });
  };

  useEffect(() => {
    // Extract unique values for dropdowns
    const names = new Set();
    const employeeIds = new Set();
    const divisions = new Set();
    const locations = new Set();

    users.forEach(user => {
      if (user.name) names.add(user.name);

      const emp = getEmployeeRecord(user);
      const empId = getDisplayEmployeeId(user);

      if (empId && empId !== '—') employeeIds.add(empId);
      if (emp && emp.division) divisions.add(emp.division);
      if (emp && (emp.location || emp.branch)) locations.add(emp.location || emp.branch);
    });

    setUniqueOptions({
      names: Array.from(names).sort(),
      employeeIds: Array.from(employeeIds).sort(compareEmployeeIdStrings),
      divisions: Array.from(divisions).sort(),
      locations: Array.from(locations).sort()
    });
  }, [users, employees]);

  useEffect(() => {
    if (!isAdminSession) {
      setUsers([]);
      setAllUsers([]);
      setFilteredUsers([]);
      setLoading(false);
      return;
    }
    checkCurrentUserPermissions();
    fetchUsers();
    fetchEmployees();
  }, [isAdminSession]);

  const checkCurrentUserPermissions = async () => {
    try {
      const response = await authAPI.verify();
      const user = response.data.user;
      setCurrentUser(user);
      // Check if user has employee access permission
      setHasemployeesAccess(user.permissions?.includes('employee_access') || false);
    } catch (error) {
      console.error('Error checking user permissions:', error);
      setCurrentUser(null);
      setHasemployeesAccess(false);
    }
  };

  useEffect(() => {
    filterUsers();
    setCurrentPage(1); // Reset to first page when filters change
  }, [users, filters, searchQuery]);

  const fetchUsers = async () => {
    try {
      const response = await authAPI.getAllUsers();
      setUsers(response.data);
      setAllUsers(response.data); // Store all users for export
      setFilteredUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);

      // Check if it's a permission error (403)
      if (error.response?.status === 403) {
        showSuccess('Access denied: You do not have permission to view user access. Please contact your administrator.');
        // Don't show mock data for permission errors, just show empty state
        setUsers([]);
        setAllUsers([]);
        setFilteredUsers([]);
      } else {
        // For other errors, show fallback mock data
        const mockUsers = [
          {
            _id: '1',
            name: 'Principal User',
            email: 'principal@example.com',
            role: 'principal',
            permissions: ['dashboard', 'employees_master', 'employees_access'],
            lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            _id: '2',
            name: 'Admin User',
            email: 'admin@example.com',
            role: 'admin',
            permissions: ['dashboard', 'project_master', 'milestone_management'],
            lastLogin: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
          },
          {
            _id: '3',
            name: 'employees User',
            email: 'employees@example.com',
            role: 'employees',
            permissions: ['dashboard', 'part_master'],
            lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          }
        ];
        setUsers(mockUsers);
        setAllUsers(mockUsers);
        setFilteredUsers(mockUsers);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      let res;

      // Use timesheet-specific endpoint if user has only timesheet access
      if (currentUser &&
        currentUser.permissions?.includes('timesheet_access') &&
        !currentUser.permissions?.includes('employee_access')) {
        res = await employeeAPI.getTimesheetEmployees();
      } else {
        // Use full employee endpoint for users with employee access
        res = await employeeAPI.getAllEmployees();
      }

      const list = Array.isArray(res.data) ? res.data : [];
      setEmployees(list);
      const map = {};
      list.forEach(e => {
        if (!e) return;
        const rawKeys = [e._id, e.employeeId, e.email];
        rawKeys.forEach(k => {
          if (!k) return;
          const key = String(k);
          map[key] = e;
          map[key.toLowerCase()] = e;
        });
      });
      setEmployeeMap(map);
    } catch (err) {
      setEmployees([]);
      setEmployeeMap({});
    }
  };

  const getDisplayEmployeeId = (user) => {
    if (!user) return '—';
    const emp = getEmployeeRecord(user);
    if (emp && emp.employeeId) return emp.employeeId;
    const candidates = [user.employeeId, user.employeeCode, user.empId, user.id];
    for (const c of candidates) {
      if (c) return c;
    }
    return '—';
  };

  const getDisplayEmployeeName = (user) => {
    if (!user) return '—';
    const emp = getEmployeeRecord(user);
    if (emp && emp.name) return emp.name;
    return user.name || '—';
  };

  const normalizeRole = (r) => {
    const role = String(r || '').toLowerCase();
    return role === 'project_manager' ? 'projectmanager' : role;
  };

  const getRoleLabel = (r) => {
    const role = normalizeRole(r);
    if (role === 'admin') return 'Admin';
    if (role === 'projectmanager') return 'Reporting Manager';
    if (role === 'employees') return 'Employees';
    if (role === 'director') return 'Director';
    if (role === 'manager') return 'General Manager';
    if (role === 'hr') return 'HR Manager';
    return String(r || '—').replace(/_/g, ' ');
  };

  const getEmployeeRecord = (user) => {
    if (!user) return null;
    const candidates = [user.employeeId, user.employeeCode, user.empId, user.id, user.email];
    for (const c of candidates) {
      if (!c) continue;
      const key = typeof c === 'string' ? c : String(c);
      const emp = employeeMap[key] || employeeMap[key.toLowerCase()];
      if (emp) return emp;
      const found = employees.find(e => {
        const idMatch = String(e._id) === key;
        const empIdMatch = String(e.employeeId || '').toLowerCase() === key.toLowerCase();
        const emailMatch = String(e.email || '').toLowerCase() === key.toLowerCase();
        return idMatch || empIdMatch || emailMatch;
      });
      if (found) return found;
    }
    return null;
  };

  const getPermissionLabel = (key) => {
    const labels = {
      'home': 'Home',
      'my_profile': 'My Profile',
      'timesheet_access': 'Timesheet',
      'timesheet_history': 'Timesheet History',
      'attendance_regularization': 'Attendance Regularization',
      'attendance_access': 'Employee Attendance',
      'attendance_approval': 'Attendance Approval',
      'edit_attendance': 'Edit In and Out Time',
      'admin_timesheet': 'Admin Timesheet',
      'timesheet_summary': 'Timesheet Summary',
      'special_permission': 'Special Permission',
      'self_appraisal': 'Self Appraisal',
      'team_appraisal': 'Team Appraisal',
      'reviewer_approval': 'Reviewer Approval',
      'director_approval': 'Director Approval',
      'appraisal_workflow': 'Appraisal Workflow',
      'appraisal_master': 'Appraisal Master',
      'increment_summary': 'Increment Summary',
      'attendance_summary': 'Attendance Summary',
      'promotion_history': 'Promotion History',
      'leave_access': 'Leave Applications',
      'leave_summary': 'Leave Summary',
      'regional_holidays': 'Regional Holidays',
      'office_holidays': 'Office Holidays',
      'leave_balance': 'Leave Balance',
      'leave_manage': 'Leave Ledger (Admin)',
      'payroll_details': 'Payroll Details',
      'payroll_history': 'Payroll History',
      'cost_to_company': 'Cost to the Company',
      'compensation_master': 'Compensation Master',
      'loan_summary': 'Loan Summary',
      'gratuity_summary': 'Gratuity Summary',
      'monthly_payroll': 'Monthly Payroll',
      'marriage_allowance': 'Marriage Allowance',
      'exit_form_access': 'Employee Exit Form',
      'exit_approval_access': 'Exit Approval',
      'employee_access': 'Employee Management',
      'team_access': 'Team Management',
      'user_access': 'User Access',
      'reward_access': 'Employee Reward Tracker',
      'raise_ticket_access': 'Raise Ticket',
      'support_dashboard_access': 'Support Dashboard',
      'project_access': 'Project Allocation',
      'insurance_access': 'Insurance',
      'policy_portal': 'Policy Portal',
      'document_templates': 'Document Templates',
      'induction_program': 'Induction Program',
      'induction_admin': 'Induction Admin',
      'salary_slips': 'Salary Slips',
      'holiday_allowance': 'Holiday Allowance',
      'holiday_working_request': 'Holiday Working Request',
      'expenditure_access': 'Expenditure Management',
      'announcement_manage': 'Announcements',
      'intern_reference': 'Intern Reference',
      'resume_access': 'Resume Repository',
      'unified_calendar': 'Unified Hub Calendar',
      'asset_management_access': 'Asset Management'
    };

    return labels[key] || key.replace(/_/g, ' ');
  };

  const getDisplayPermissions = (permissions) => {
    if (!permissions || !Array.isArray(permissions)) return [];

    // Keys that are purely for grouping and shouldn't be displayed if they have children
    const groupKeys = [
      'admin_timesheet_access',
      'performance_access',
      'leave_group_access',
      'payroll_access',
      'exit_access',
      'support_group_access'
    ];

    const displayLabels = new Set();
    permissions.forEach(key => {
      if (!groupKeys.includes(key)) {
        displayLabels.add(getPermissionLabel(key));
      }
    });

    return Array.from(displayLabels).sort();
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(user => {
        const emp = getEmployeeRecord(user);
        const empId = getDisplayEmployeeId(user);
        const name = user.name ? user.name.toLowerCase() : '';
        const email = user.email ? user.email.toLowerCase() : '';
        const role = user.role ? user.role.toLowerCase() : '';
        const displayRole = user.role ? user.role.replace('_', ' ').toLowerCase() : '';
        const division = emp && emp.division ? emp.division.toLowerCase() : '';
        const location = emp && (emp.location || emp.branch) ? (emp.location || emp.branch).toLowerCase() : '';
        const lastLogin = user.lastLogin ? formatLastLogin(user.lastLogin).toLowerCase() : '';

        return name.includes(q) ||
          email.includes(q) ||
          (empId && empId.toLowerCase().includes(q)) ||
          role.includes(q) ||
          displayRole.includes(q) ||
          division.includes(q) ||
          location.includes(q) ||
          lastLogin.includes(q);
      });
    }

    if (filters.name) {
      filtered = filtered.filter(user =>
        user.name === filters.name
      );
    }

    if (filters.role) {
      const targetRole = normalizeRole(filters.role);
      filtered = filtered.filter(user => normalizeRole(user.role) === targetRole);
    }

    if (filters.employeeId) {
      filtered = filtered.filter(user => {
        const empId = getDisplayEmployeeId(user);
        return empId && empId === filters.employeeId;
      });
    }

    if (filters.division) {
      filtered = filtered.filter(user => {
        const emp = getEmployeeRecord(user);
        return emp && emp.division === filters.division;
      });
    }

    if (filters.location) {
      filtered = filtered.filter(user => {
        const emp = getEmployeeRecord(user);
        const location = emp ? (emp.location || emp.branch) : '';
        return location && location === filters.location;
      });
    }

    const sorted = [...filtered].sort((a, b) => {
      const empIdCompare = compareEmployeeIdStrings(getDisplayEmployeeId(a), getDisplayEmployeeId(b));
      if (empIdCompare !== 0) return empIdCompare;
      return String(getDisplayEmployeeName(a) || '').localeCompare(String(getDisplayEmployeeName(b) || ''), undefined, { sensitivity: 'base' });
    });

    setFilteredUsers(sorted);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      name: '',
      email: '',
      role: '',
      employeeId: '',
      division: '',
      location: ''
    });
    setFilteredUsers(
      [...users].sort((a, b) => {
        const empIdCompare = compareEmployeeIdStrings(getDisplayEmployeeId(a), getDisplayEmployeeId(b));
        if (empIdCompare !== 0) return empIdCompare;
        return String(getDisplayEmployeeName(a) || '').localeCompare(String(getDisplayEmployeeName(b) || ''), undefined, { sensitivity: 'base' });
      })
    );
  };

  // Export CSV functions
  const exportToCSV = (dataToExport, filename) => {
    const headers = ['Name', 'Employee ID', 'Email', 'Role', 'Division', 'Location', 'Last Login', 'Permissions'];
    const csvData = dataToExport.map(user => {
      const emp = getEmployeeRecord(user);
      return [
        `"${user.name}"`,
        `"${getDisplayEmployeeId(user)}"`,
        `"${user.email}"`,
        user.role,
        `"${(emp && emp.division) || ''}"`,
        `"${(emp && (emp.location || emp.branch)) || ''}"`,
        formatLastLogin(user.lastLogin),
        `"${getDisplayPermissions(user.permissions).join(', ')}"`
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportAllUsers = () => {
    exportToCSV(allUsers, 'all_employees_access.csv');
  };

  const exportFilteredUsers = () => {
    exportToCSV(filteredUsers, 'filtered_employees_access.csv');
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleEdit = (user) => {
    if (!isAdminSession) {
      showSuccess('Access denied: Only Admin or HR can edit user access.');
      return;
    }
    setEditingUser(user);
    setShowModal(true);
  };

  const handleView = (user) => {
    setViewingUser(user);
  };

  const handleDelete = async (id) => {
    if (!isAdminSession) {
      showSuccess('Access denied: Only Admin or HR can delete users.');
      return;
    }
    try {
      await authAPI.deleteUser(id);
      fetchUsers(); // Refresh the list
      showSuccess('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user. Please try again.');
    }
  };

  const handleFormSubmit = (isEdit = false) => {
    if (!isAdminSession) {
      showSuccess('Access denied: Only Admin or HR can update user access.');
      return;
    }
    setShowModal(false);
    setEditingUser(null);
    fetchUsers(); // Refresh the list
    showSuccess(isEdit ? 'User updated successfully' : 'User added successfully');
  };

  const formatLastLogin = (value) => {
    if (!value) return 'Never logged in';
    try {
      const date = (() => {
        if (value instanceof Date) return value;
        if (typeof value === 'number') return new Date(value);
        if (typeof value === 'string') {
          const parsed = Date.parse(value);
          if (!isNaN(parsed)) return new Date(parsed);
          return null;
        }
        return null;
      })();
      if (!date || isNaN(date.getTime())) {
        return String(value);
      }
      return date.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return String(value);
    }
  };

  const getRoleColor = (role) => {
    switch (String(role).toLowerCase()) {
      case 'principal':
        return 'bg-red-100 text-red-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'employees':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'director':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'manager':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'projectmanager':
        return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAdminSession) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-50">
        <div className="text-center">
          <div className="text-6xl text-gray-300 mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-4">
            Only Admin or HR can access User Access.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-[#262760] text-white rounded hover:bg-[#1e2050]"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const totalUsersCount = users.length;
  const adminManagersCount = users.filter(u => ['admin', 'manager', 'director', 'projectmanager', 'hr'].includes(String(u.role || '').toLowerCase())).length;
  const configuredPermsCount = users.filter(u => Array.isArray(u.permissions) && u.permissions.length > 0).length;
  const activeDivisionsCount = uniqueOptions.divisions.length;

  return (
    <div className="min-h-screen bg-slate-50/60 p-3 sm:p-6 lg:p-8 space-y-6">
      <div className="max-w-none xl:max-w-8xl mx-auto space-y-6">

        {/* Page Header & Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-[#262760] to-indigo-950 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
              <p className="text-xs text-blue-200/70 font-medium">Total Accounts</p>
              <p className="text-xl font-black text-white mt-1">{totalUsersCount}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
              <p className="text-xs text-blue-200/70 font-medium">Privileged Roles</p>
              <p className="text-xl font-black text-emerald-400 mt-1">{adminManagersCount}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
              <p className="text-xs text-blue-200/70 font-medium">Custom Privileges</p>
              <p className="text-xl font-black text-amber-300 mt-1">{configuredPermsCount}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
              <p className="text-xs text-blue-200/70 font-medium">Active Divisions</p>
              <p className="text-xl font-black text-cyan-300 mt-1">{activeDivisionsCount}</p>
            </div>
          </div>
        </div>

        {/* Controls & Search Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#262760]/30 focus:border-[#262760] transition-all"
                placeholder="Search user name, employee ID, role, division..."
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-4 py-2.5 border text-sm font-semibold rounded-xl transition-all duration-150 shadow-xs ${
                  showFilters || Object.values(filters).some(Boolean)
                    ? 'border-[#262760] text-white bg-[#262760] shadow-md shadow-[#262760]/20'
                    : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                }`}
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filters
                {Object.values(filters).some(Boolean) && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-bold text-[#262760] bg-white rounded-full">
                    {Object.values(filters).filter(Boolean).length}
                  </span>
                )}
              </button>

              {Object.values(filters).some(Boolean) && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-3.5 py-2.5 border border-slate-200 text-sm font-medium rounded-xl text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4 mr-1.5" />
                  Clear Filters
                </button>
              )}

              <button
                onClick={exportFilteredUsers}
                className="inline-flex items-center px-4 py-2.5 border border-slate-200 text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 shadow-xs transition-all active:scale-95"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2 text-slate-500" />
                Export CSV
              </button>

              {isAdminSession && (
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setShowModal(true);
                  }}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#262760] to-indigo-800 hover:from-[#1d1e49] hover:to-indigo-900 text-white shadow-md shadow-[#262760]/20 transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <PlusIcon className="h-4.5 w-4.5 mr-1.5 stroke-[2.5]" />
                  Add New User
                </button>
              )}
            </div>
          </div>

          {/* Filter Options Drawer */}
          {showFilters && (
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">User (Name)</label>
                <select
                  value={filters.name}
                  onChange={(e) => handleFilterChange('name', e.target.value)}
                  className="block w-full rounded-lg border-slate-200 text-xs py-2 px-3 focus:ring-2 focus:ring-[#262760]/30 focus:border-[#262760]"
                >
                  <option value="">All Users</option>
                  {uniqueOptions.names.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Employee ID</label>
                <select
                  value={filters.employeeId}
                  onChange={(e) => handleFilterChange('employeeId', e.target.value)}
                  className="block w-full rounded-lg border-slate-200 text-xs py-2 px-3 focus:ring-2 focus:ring-[#262760]/30 focus:border-[#262760]"
                >
                  <option value="">All Employee IDs</option>
                  {uniqueOptions.employeeIds.map(id => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role</label>
                <select
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  className="block w-full rounded-lg border-slate-200 text-xs py-2 px-3 focus:ring-2 focus:ring-[#262760]/30 focus:border-[#262760]"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="employees">Employees</option>
                  <option value="projectmanager">Reporting Manager</option>
                  <option value="manager">General Manager</option>
                  <option value="director">Director</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Division</label>
                <select
                  value={filters.division}
                  onChange={(e) => handleFilterChange('division', e.target.value)}
                  className="block w-full rounded-lg border-slate-200 text-xs py-2 px-3 focus:ring-2 focus:ring-[#262760]/30 focus:border-[#262760]"
                >
                  <option value="">All Divisions</option>
                  {uniqueOptions.divisions.map(division => (
                    <option key={division} value={division}>{division}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Location</label>
                <select
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="block w-full rounded-lg border-slate-200 text-xs py-2 px-3 focus:ring-2 focus:ring-[#262760]/30 focus:border-[#262760]"
                >
                  <option value="">All Locations</option>
                  {uniqueOptions.locations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* User Access Table Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          
          {/* Results Summary Header */}
          <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-600">
              Showing <span className="text-slate-900 font-bold">{filteredUsers.length === 0 ? 0 : indexOfFirstItem + 1}</span> - {' '}
              <span className="text-slate-900 font-bold">
                {indexOfLastItem > filteredUsers.length ? filteredUsers.length : indexOfLastItem}
              </span> of{' '}
              <span className="text-slate-900 font-bold">{filteredUsers.length}</span> Users
            </p>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-gradient-to-r from-[#1e2050] to-[#262760] text-white">
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">#</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">User Details</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Employee ID</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Role</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Division</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Location</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Last Login</th>
                  <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                      <div className="text-4xl mb-2">🔍</div>
                      <p className="text-sm font-semibold text-slate-600">No users found matching your search</p>
                      <p className="text-xs text-slate-400 mt-1">Try clearing filters or searching for a different keyword</p>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((user, index) => {
                    const emp = getEmployeeRecord(user);
                    const nameStr = getDisplayEmployeeName(user);
                    const initial = nameStr ? nameStr.charAt(0).toUpperCase() : 'U';

                    return (
                      <tr key={user._id} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-400">
                          {indexOfFirstItem + index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#262760] to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm ring-2 ring-indigo-100 group-hover:scale-105 transition-transform">
                              {initial}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900 group-hover:text-[#262760] transition-colors">{nameStr}</div>
                              <div className="text-xs text-slate-400">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                            {getDisplayEmployeeId(user)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-xs ${getRoleColor(user.role)}`}>
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-700">
                          {(emp && emp.division) || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-700">
                          {(emp && (emp.location || emp.branch)) || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                          {formatLastLogin(user.lastLogin)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleView(user)}
                              className="inline-flex items-center px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50/90 hover:bg-blue-100 border border-blue-200/80 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
                              title="View Details"
                            >
                              <EyeIcon className="h-4 w-4 mr-1 text-blue-600" />
                              View
                            </button>
                            {isAdminSession && (
                              <>
                                <button
                                  onClick={() => handleEdit(user)}
                                  className="inline-flex items-center px-2.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
                                  title="Edit User Access"
                                >
                                  <PencilSquareIcon className="h-4 w-4 mr-1 text-indigo-600" />
                                  Edit
                                </button>
                                <Popconfirm
                                  title="Delete User Access"
                                  description="Are you sure you want to delete this user?"
                                  onConfirm={() => handleDelete(user._id)}
                                  okText="Yes"
                                  cancelText="No"
                                >
                                  <button
                                    className="inline-flex items-center px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50/90 hover:bg-rose-100 border border-rose-200/80 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
                                    title="Delete User"
                                  >
                                    <TrashIcon className="h-4 w-4 mr-1 text-rose-600" />
                                    Delete
                                  </button>
                                </Popconfirm>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden divide-y divide-slate-100">
            {currentItems.map((user) => {
              const emp = getEmployeeRecord(user);
              const nameStr = getDisplayEmployeeName(user);
              const initial = nameStr ? nameStr.charAt(0).toUpperCase() : 'U';

              return (
                <div key={user._id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#262760] to-indigo-600 text-white font-bold flex items-center justify-center text-base shadow-xs">
                        {initial}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{nameStr}</h3>
                        <p className="text-xs text-slate-400">{getDisplayEmployeeId(user)}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getRoleColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 my-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="font-semibold text-slate-700">Division:</span> {(emp && emp.division) || '—'}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Location:</span> {(emp && (emp.location || emp.branch)) || '—'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">Last login: {formatLastLogin(user.lastLogin)}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleView(user)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
                      >
                        View
                      </button>
                      {isAdminSession && (
                        <>
                          <button
                            onClick={() => handleEdit(user)}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100"
                          >
                            Edit
                          </button>
                          <Popconfirm
                            title="Delete User"
                            description="Are you sure?"
                            onConfirm={() => handleDelete(user._id)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <button className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 rounded-md hover:bg-red-100">
                              Delete
                            </button>
                          </Popconfirm>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Footer */}
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200/80 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-slate-500">
                  Page <span className="font-bold text-slate-900">{currentPage}</span> of <span className="font-bold text-slate-900">{totalPages || 1}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-xl shadow-xs -space-x-px overflow-hidden border border-slate-200" aria-label="Pagination">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-3 py-2 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 ${
                      currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => paginate(page)}
                      className={`relative inline-flex items-center px-3.5 py-2 text-xs font-semibold ${
                        currentPage === page
                          ? 'z-10 bg-[#262760] text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-3 py-2 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 ${
                      currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </nav>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Add / Edit Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingUser(null);
        }}
        title={editingUser ? 'Edit User Access & Permissions' : 'Add New User Access'}
        size="lg"
      >
        <UserForm
          user={editingUser}
          onSubmit={() => handleFormSubmit(!!editingUser)}
          onCancel={() => {
            setShowModal(false);
            setEditingUser(null);
          }}
        />
      </Modal>

      {/* View User Details Modal */}
      {viewingUser && (
        <Modal
          isOpen={!!viewingUser}
          onClose={() => setViewingUser(null)}
          title="User Account & Access Summary"
          size="lg"
        >
          <div className="space-y-5 p-1">
            
            {/* Modal Profile Card Header */}
            <div className="bg-gradient-to-r from-slate-900 via-[#262760] to-indigo-900 p-5 rounded-2xl text-white flex items-center gap-4 shadow-md">
              <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md text-white font-black text-2xl flex items-center justify-center border border-white/20 shadow-inner">
                {viewingUser.name ? viewingUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h3 className="text-lg font-bold">{getDisplayEmployeeName(viewingUser)}</h3>
                <p className="text-xs text-blue-200/80 font-mono mt-0.5">{getDisplayEmployeeId(viewingUser)} • {viewingUser.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getRoleColor(viewingUser.role)}`}>
                    {getRoleLabel(viewingUser.role)}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    ● Active Account
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Division</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                  {(getEmployeeRecord(viewingUser) && getEmployeeRecord(viewingUser).division) || '—'}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Location</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                  {(getEmployeeRecord(viewingUser) && (getEmployeeRecord(viewingUser).location || getEmployeeRecord(viewingUser).branch)) || '—'}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Last Active</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                  {formatLastLogin(viewingUser.lastLogin)}
                </span>
              </div>
            </div>

            {/* Permissions Matrix Grid */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span>🛡️</span> Granted Permissions ({getDisplayPermissions(viewingUser.permissions).length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {getDisplayPermissions(viewingUser.permissions).map((label, index) => (
                  <div key={index} className="bg-blue-50/70 border border-blue-200/80 text-blue-900 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setViewingUser(null)}
                className="px-5 py-2 bg-[#262760] text-white font-semibold text-xs rounded-xl hover:bg-[#1d1e49] transition-colors"
              >
                Close Summary
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Notification Toast */}
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />
    </div>
  );
};

export default UserAccess;
