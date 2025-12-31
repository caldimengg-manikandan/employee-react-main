import React, { useState, useEffect } from 'react';
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
  const [showFilters, setShowFilters] = useState(false);
  const { notification, showSuccess, hideNotification } = useNotification();
  const [currentUser, setCurrentUser] = useState(null);
  const [hasemployeesAccess, setHasemployeesAccess] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [uniqueOptions, setUniqueOptions] = useState({
    names: [],
    employeeIds: [],
    divisions: [],
    locations: []
  });

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
      employeeIds: Array.from(employeeIds).sort(),
      divisions: Array.from(divisions).sort(),
      locations: Array.from(locations).sort()
    });
  }, [users, employees]);

  useEffect(() => {
    checkCurrentUserPermissions();
    fetchUsers();
    fetchEmployees();
  }, []);

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
  }, [users, filters]);

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

  const filterUsers = () => {
    let filtered = users;

    if (filters.name) {
      filtered = filtered.filter(user => 
        user.name === filters.name
      );
    }

    if (filters.role) {
      filtered = filtered.filter(user => 
        user.role === filters.role
      );
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

    setFilteredUsers(filtered);
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
    setFilteredUsers(users); // Reset to all users
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
        `"${user.permissions.join(', ')}"`
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
    setEditingUser(user);
    setShowModal(true);
  };

  const handleView = (user) => {
    setViewingUser(user);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await authAPI.deleteUser(id);
        fetchUsers(); // Refresh the list
        showSuccess('User deleted successfully');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user. Please try again.');
      }
    }
  };

  const handleFormSubmit = (isEdit = false) => {
    setShowModal(false);
    setEditingUser(null);
    fetchUsers(); // Refresh the list
    showSuccess(isEdit ? 'User updated successfully' : 'User added successfully');
  };

  const formatLastLogin = (dateString) => {
    if (!dateString) return 'Never logged in';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateString; // Return the original string if it's already formatted
      }
      
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      
      if (diffMinutes < 1) {
        return 'Just now';
      } else if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else if (diffDays === 1) {
        return 'Yesterday at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date format error';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'principal':
        return 'bg-red-100 text-red-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'employees':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-2 sm:p-4 lg:p-6 xl:p-8">
      <div className="max-w-none xl:max-w-8xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">

          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={filters.name}
                    onChange={(e) => handleFilterChange('name', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search by name..."
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    showFilters || Object.values(filters).some(Boolean) 
                      ? 'border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100' 
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  <FunnelIcon className="h-5 w-5 mr-2" />
                  Filters
                  {Object.values(filters).some(Boolean) && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                      {Object.values(filters).filter(Boolean).length}
                    </span>
                  )}
                </button>
                
                {Object.values(filters).some(Boolean) && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <XMarkIcon className="h-5 w-5 mr-2" />
                    Clear
                  </button>
                )}
                
                <button
                  onClick={exportFilteredUsers}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Export CSV
                </button>
                
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setShowModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add User
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User (Name)</label>
                  <select
                    value={filters.name}
                    onChange={(e) => handleFilterChange('name', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Users</option>
                    {uniqueOptions.names.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <select
                    value={filters.employeeId}
                    onChange={(e) => handleFilterChange('employeeId', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Employee IDs</option>
                    {uniqueOptions.employeeIds.map(id => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={filters.role}
                    onChange={(e) => handleFilterChange('role', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Roles</option>
                    <option value="principal">Principal</option>
                    <option value="admin">Admin</option>
                    <option value="employees">employees</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="3d_model">3D Model</option>
                    <option value="artist">Artist</option>
                    <option value="content_manager">Content Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                  <select
                    value={filters.division}
                    onChange={(e) => handleFilterChange('division', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Divisions</option>
                    {uniqueOptions.divisions.map(division => (
                      <option key={division} value={division}>{division}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <select
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Locations</option>
                    {uniqueOptions.locations.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div>
            {/* Results Count */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                <span className="font-medium">
                  {indexOfLastItem > filteredUsers.length ? filteredUsers.length : indexOfLastItem}
                </span> of{' '}
                <span className="font-medium">{filteredUsers.length}</span> results
              </p>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Division</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.map((user) => {
                      const emp = getEmployeeRecord(user);
                      return (
                        <tr key={user._id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="font-medium text-blue-800">
                                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{getDisplayEmployeeName(user)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{getDisplayEmployeeId(user)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                              {user.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{(emp && emp.division) || '—'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{(emp && (emp.location || emp.branch)) || '—'}</div>
                          </td>
                         
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatLastLogin(user.lastLogin)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleView(user)}
                                className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                                title="View"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleEdit(user)}
                                className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                                title="Edit"
                              >
                                <PencilSquareIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(user._id)}
                                className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                                title="Delete"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
            
            {/* Mobile Card View */}
            <div className="sm:hidden">
              {currentItems.map((user) => {
                const emp = getEmployeeRecord(user);
                return (
                <div key={user._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{getDisplayEmployeeName(user)}</h3>
                      <p className="text-sm text-gray-500 truncate">{getDisplayEmployeeId(user)}</p>
                    </div>
                    <div className="flex space-x-2 ml-2">
                      <button
                        onClick={() => handleView(user)}
                        className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                        title="View"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                        title="Edit"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div>
                      <span className="font-medium">Role:</span> {user.role.replace('_', ' ')}
                    </div>
                    <div>
                      <span className="font-medium">Division:</span> {(emp && emp.division) || '—'}
                    </div>
                    <div>
                      <span className="font-medium">Location:</span> {(emp && (emp.location || emp.branch)) || '—'}
                    </div>
                    <div>
                      <span className="font-medium">Qualification:</span> {(emp && emp.qualification) || '—'}
                    </div>
                    <div>
                      <span className="font-medium">Last Login:</span> {formatLastLogin(user.lastLogin)}
                    </div>
                  </div>
                </div>
              );})}
            </div>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${
                      currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => paginate(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${
                      currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingUser(null);
        }}
        title={editingUser ? 'Edit User Access' : 'Add User Access'}
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

      {/* View User Modal */}
      {viewingUser && (
        <Modal
          isOpen={!!viewingUser}
          onClose={() => setViewingUser(null)}
          title="User Details"
          size="lg"
        >
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-800">
                  {viewingUser.name ? viewingUser.name.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{getDisplayEmployeeName(viewingUser)}</h3>
                <p className="text-sm text-gray-500">{getDisplayEmployeeId(viewingUser)}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Role</h4>
                <p className="text-sm font-medium text-gray-900 capitalize mt-1">{viewingUser.role.replace('_', ' ')}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</h4>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                  Active
                </span>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</h4>
                <p className="text-sm font-medium text-gray-900 mt-1">{formatLastLogin(viewingUser.lastLogin)}</p>
              </div>
            </div>

            {(() => {
              const emp = getEmployeeRecord(viewingUser);
              if (!emp) return null;
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Details</h4>
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-900">
                        {emp.name} ({emp.employeeId})
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-sm text-gray-700">
                        <div><span className="font-medium">Division:</span> {emp.division || '—'}</div>
                        <div><span className="font-medium">Designation:</span> {emp.designation || emp.role || emp.position || '—'}</div>
                        <div><span className="font-medium">Location:</span> {emp.location || emp.branch || '—'}</div>
                        <div><span className="font-medium">Date of Joining:</span> {emp.dateOfJoining || '—'}</div>
                        <div><span className="font-medium">Experience:</span> {emp.experience || '—'}</div>
                        <div><span className="font-medium">Qualification:</span> {emp.qualification || '—'}</div>
                        <div><span className="font-medium">Mobile:</span> {emp.mobileNo || '—'}</div>
                        <div><span className="font-medium">Email:</span> {emp.email || '—'}</div>
                        <div><span className="font-medium">Status:</span> {emp.status || '—'}</div>
                        <div><span className="font-medium">Blood Group:</span> {emp.bloodGroup || '—'}</div>
                        <div><span className="font-medium">Date of Birth:</span> {emp.dateOfBirth || '—'}</div>
                        <div><span className="font-medium">Guardian Name:</span> {emp.guardianName || '—'}</div>
                        <div><span className="font-medium">Emergency Mobile:</span> {emp.emergencyMobileNo || '—'}</div>
                        <div><span className="font-medium">PAN:</span> {emp.pan || '—'}</div>
                        <div><span className="font-medium">Aadhaar:</span> {emp.aadhaar || '—'}</div>
                        <div className="sm:col-span-2"><span className="font-medium">Address:</span> {emp.address || '—'}</div>
                        <div><span className="font-medium">Bank Name:</span> {emp.bankName || '—'}</div>
                        <div><span className="font-medium">Bank Account:</span> {emp.bankAccount || '—'}</div>
                        <div><span className="font-medium">UAN:</span> {emp.uan || '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Permissions</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {viewingUser.permissions.map((permission, index) => (
                  <div key={index} className="bg-blue-50 text-blue-700 px-3 py-2 rounded-md text-sm">
                    {permission.replace(/_/g, ' ')}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-150"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setViewingUser(null);
                  handleEdit(viewingUser);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-150"
              >
                Edit User
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Notification */}
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
