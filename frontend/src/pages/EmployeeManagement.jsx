// components/EmployeeManagement.jsx
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
  Bars3Icon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import EmployeeForm from '../components/Forms/EmployeeForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { employeeAPI } from '../services/api';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    division: '',
    status: 'Active',
    dateOfJoining: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const { notification, showSuccess, hideNotification } = useNotification();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterEmployees();
    setCurrentPage(1);
  }, [employees, filters]);

  const fetchEmployees = async () => {
    try {
      const response = await employeeAPI.getAllEmployees();
      setEmployees(response.data);
      setFilteredEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Mock data matching the provided structure
      const mockEmployees = [
        {
          _id: '1',
          employeeId: 'CDE004',
          name: 'PRAKASH R',
          role: 'Sr.Team leader',
          division: 'TEKLA',
          highestQualification: 'B.E (CIVIL)',
          currentExperience: '6+ years',
          previousExperience: '2 years',
          mobileNo: '8072199313',
          status: 'Active',
          email: 'vinothprakash128@gmail.com',
          dateOfJoining: '2017-08-18',
          location: 'Hosur',
          dateOfBirth: '1994-05-01',
          bloodGroup: 'AB+',
          pan: 'BSLPP0737R',
          aadhaar: '643440526564',
          bankName: 'HDFC',
          bankAccount: '50100283576471',
          branch: 'RAMAPURAM',
          uan: '101147215588',
          guardianName: 'RAVI',
          emergencyMobile: '8903907714',
          address: '38,NEHRU STREET, SURAMPATTI VALASU, ERODE-638009.'
        },
        {
          _id: '2',
          employeeId: 'EMP002',
          name: 'JANE SMITH',
          role: 'HR Manager',
          division: 'HR',
          highestQualification: 'MBA',
          currentExperience: '8+ years',
          previousExperience: '3 years',
          mobileNo: '9876543211',
          status: 'Active',
          email: 'jane.smith@example.com',
          dateOfJoining: '2020-01-15',
          location: 'Chennai',
          dateOfBirth: '1990-03-15',
          bloodGroup: 'O+',
          pan: 'ABCDE1234F',
          aadhaar: '987654321012',
          bankName: 'ICICI',
          bankAccount: '123456789012',
          branch: 'CHENNAI',
          uan: '101234567890',
          guardianName: 'JOHN SMITH',
          emergencyMobile: '9876543222',
          address: '123, Main Street, Chennai - 600001'
        },
        {
          _id: '3',
          employeeId: 'EMP003',
          name: 'RAJESH KUMAR',
          role: 'Software Developer',
          division: 'IT',
          highestQualification: 'B.Tech (CSE)',
          currentExperience: '3+ years',
          previousExperience: '1 year',
          mobileNo: '9876543212',
          status: 'Active',
          email: 'rajesh.kumar@example.com',
          dateOfJoining: '2022-06-01',
          location: 'Chennai',
          dateOfBirth: '1995-08-20',
          bloodGroup: 'B+',
          pan: 'XYZPP1234A',
          aadhaar: '876543210987',
          bankName: 'SBI',
          bankAccount: '987654321098',
          branch: 'CHENNAI',
          uan: '101987654321',
          guardianName: 'SURESH KUMAR',
          emergencyMobile: '9876543233',
          address: '456, Gandhi Street, Chennai - 600002'
        }
      ];
      setEmployees(mockEmployees);
      setFilteredEmployees(mockEmployees);
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = employees;

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm) ||
        emp.employeeId.toLowerCase().includes(searchTerm) ||
        (emp.email && emp.email.toLowerCase().includes(searchTerm)) ||
        (emp.mobileNo && emp.mobileNo.toString().includes(searchTerm))
      );
    }

    if (filters.role) {
      filtered = filtered.filter(emp => 
        emp.role.toLowerCase().includes(filters.role.toLowerCase())
      );
    }

    if (filters.division) {
      filtered = filtered.filter(emp => 
        emp.division === filters.division
      );
    }

    if (filters.status) {
      filtered = filtered.filter(emp => 
        emp.status === filters.status
      );
    }

    if (filters.dateOfJoining) {
      filtered = filtered.filter(emp => 
        emp.dateOfJoining === filters.dateOfJoining
      );
    }

    setFilteredEmployees(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      role: '',
      division: '',
      status: 'Active',
      dateOfJoining: ''
    });
  };

  const exportToCSV = () => {
    const headers = [
      'S.No', 'Employee ID', 'Full Name', 'Division', 'Role', 
      'Highest Qualification', 'Date of Joining', 'Experience', 'Contact', 'Status'
    ];

    const csvData = filteredEmployees.map((emp, index) => [
      index + 1,
      emp.employeeId,
      `"${emp.name}"`,
      emp.division,
      emp.role || emp.position || '',
      emp.highestQualification || emp.qualification || '',
      emp.dateOfJoining || emp.dateofjoin || '',
      emp.currentExperience || emp.experience || '',
      emp.mobileNo,
      emp.status
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Format date to DD/MM/YYYY
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  };

  // Calculate years of service
  const calculateServiceYears = (dateOfJoining) => {
    if (!dateOfJoining) return '';
    const joinDate = new Date(dateOfJoining);
    if (isNaN(joinDate.getTime())) return '';
    
    const today = new Date();
    const years = today.getFullYear() - joinDate.getFullYear();
    const months = today.getMonth() - joinDate.getMonth();
    
    let result = '';
    if (years > 0) result += `${years} year${years > 1 ? 's' : ''}`;
    if (months > 0) {
      if (result) result += ' ';
      result += `${months} month${months > 1 ? 's' : ''}`;
    }
    if (!result) result = 'Less than a month';
    
    return result;
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowModal(true);
  };

  const handleView = (employee) => {
    setViewingEmployee(employee);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await employeeAPI.deleteEmployee(id);
        fetchEmployees();
        showSuccess('Employee deleted successfully');
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Error deleting employee. Please try again.');
      }
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingEmployee) {
        await employeeAPI.updateEmployee(editingEmployee._id, formData);
        showSuccess('Employee updated successfully');
      } else {
        await employeeAPI.createEmployee(formData);
        showSuccess('Employee added successfully');
      }
      setShowModal(false);
      setEditingEmployee(null);
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Error saving employee. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800';
      case 'Suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Division options
  const divisionOptions = [
    'SDS', 'TEKLA', 'DAS', 'Mechanical', 'HR', 'Finance', 'IT', 'Operations'
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
                <p className="text-sm text-gray-600 mt-1">Manage your organization's employees</p>
              </div>
              
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Employee
              </button>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="px-4 py-4 border-b border-gray-200 bg-white">
            <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm"
                    placeholder="Search by name, ID, email, or phone..."
                  />
                </div>
              </div>

              {/* Filter Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-3 py-2.5 border rounded-lg shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 ${
                    showFilters || Object.values(filters).some((val, idx) => idx > 0 && Boolean(val)) 
                      ? 'border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100' 
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  <FunnelIcon className="h-5 w-5 mr-2" />
                  Filters
                  {Object.values(filters).slice(1).filter(Boolean).length > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                      {Object.values(filters).slice(1).filter(Boolean).length}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={exportToCSV}
                  className="inline-flex items-center px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Export
                </button>
              </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                    <select
                      value={filters.division}
                      onChange={(e) => handleFilterChange('division', e.target.value)}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3"
                    >
                      <option value="">All Divisions</option>
                      {divisionOptions.map(div => (
                        <option key={div} value={div}>{div}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <input
                      type="text"
                      value={filters.role}
                      onChange={(e) => handleFilterChange('role', e.target.value)}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3"
                      placeholder="Filter by role"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3"
                    >
                      <option value="">All Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining</label>
                    <input
                      type="date"
                      value={filters.dateOfJoining}
                      onChange={(e) => handleFilterChange('dateOfJoining', e.target.value)}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3"
                    />
                  </div>
                  <div className="md:col-span-2 lg:col-span-4 flex items-end">
                    {Object.values(filters).slice(1).filter(Boolean).length > 0 && (
                      <button
                        onClick={clearFilters}
                        className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full transition-colors duration-200"
                      >
                        <XMarkIcon className="h-5 w-5 mr-2" />
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Count */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-700">
                Showing <span className="font-semibold">{indexOfFirstItem + 1}</span> to{' '}
                <span className="font-semibold">
                  {Math.min(indexOfLastItem, filteredEmployees.length)}
                </span> of{' '}
                <span className="font-semibold">{filteredEmployees.length}</span> employees
              </p>
              <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                <span className="text-sm text-gray-700">Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-gray-200">
                    S.No
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-gray-200">
                    Employee ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-gray-200">
                    Full Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-gray-200">
                    Division
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-gray-200">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-gray-200">
                    Highest Qualification
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-gray-200">
                    Date of Joining
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-gray-200">
                    Experience
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-gray-200">
                    Contact
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider border-r border-gray-200">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.map((employee, index) => (
                  <tr 
                    key={employee._id} 
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-100">
                      {indexOfFirstItem + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                      <span className="font-semibold text-blue-600">{employee.employeeId}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-100">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center border border-blue-200">
                          <span className="text-lg font-bold text-blue-800">
                            {employee.name ? employee.name.charAt(0).toUpperCase() : 'E'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">{employee.name}</div>
                          <div className="text-xs text-gray-500">{employee.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-100">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {employee.division}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                      {employee.role || employee.position}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                      {employee.highestQualification || employee.qualification || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                      <div className="font-medium">
                        {formatDate(employee.dateOfJoining || employee.dateofjoin)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                      {employee.currentExperience || employee.experience || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                      <div className="font-medium">{employee.mobileNo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-100">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(employee.status)}`}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleView(employee)}
                          className="inline-flex items-center p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(employee)}
                          className="inline-flex items-center p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors duration-200"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(employee._id)}
                          className="inline-flex items-center p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="lg:hidden">
            {currentItems.map((employee, index) => (
              <div key={employee._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center border border-blue-200">
                      <span className="text-lg font-bold text-blue-800">
                        {employee.name ? employee.name.charAt(0).toUpperCase() : 'E'}
                      </span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-base font-semibold text-gray-900">{employee.name}</h3>
                      <p className="text-sm text-blue-600 font-medium">{employee.employeeId}</p>
                      <p className="text-xs text-gray-500 mt-1">{employee.email}</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleView(employee)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                      title="View"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(employee)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                      title="Edit"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(employee._id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-gray-500">Division</span>
                    <p className="font-medium text-gray-900">{employee.division}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Role</span>
                    <p className="font-medium text-gray-900">{employee.role || employee.position}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Qualification</span>
                    <p className="font-medium text-gray-900">{employee.highestQualification || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Experience</span>
                    <p className="font-medium text-gray-900">{employee.currentExperience || employee.experience || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Date of Joining</span>
                    <p className="font-medium text-gray-900">
                      {formatDate(employee.dateOfJoining || employee.dateofjoin)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Contact</span>
                    <p className="font-medium text-gray-900">{employee.mobileNo}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Status</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}>
                      {employee.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">S.No</span>
                    <p className="font-medium text-gray-900">{indexOfFirstItem + index + 1}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {filteredEmployees.length > 0 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-700 mb-4 sm:mb-0">
                  Page {currentPage} of {totalPages}
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => paginate(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Employee Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingEmployee(null);
        }}
        title={editingEmployee ? 'Edit Employee' : 'Add New Employee'}
        size="xl"
      >
        <EmployeeForm
          employee={editingEmployee}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowModal(false);
            setEditingEmployee(null);
          }}
        />
      </Modal>

      {/* View Employee Modal */}
      {viewingEmployee && (
        <Modal
          isOpen={!!viewingEmployee}
          onClose={() => setViewingEmployee(null)}
          title="Employee Details"
          size="xl"
        >
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 h-20 w-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center border border-blue-200">
                <span className="text-3xl font-bold text-blue-800">
                  {viewingEmployee.name ? viewingEmployee.name.charAt(0).toUpperCase() : 'E'}
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{viewingEmployee.name}</h3>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    ID: {viewingEmployee.employeeId}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(viewingEmployee.status)}`}>
                    {viewingEmployee.status}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</h4>
                <p className="text-base font-medium text-gray-900 mt-1">{viewingEmployee.role || viewingEmployee.position}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Division</h4>
                <p className="text-base font-medium text-gray-900 mt-1">{viewingEmployee.division}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Highest Qualification</h4>
                <p className="text-base font-medium text-gray-900 mt-1">{viewingEmployee.highestQualification || viewingEmployee.qualification || '-'}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Experience</h4>
                <p className="text-base font-medium text-gray-900 mt-1">{viewingEmployee.currentExperience || viewingEmployee.experience || '-'}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date of Joining</h4>
                <div>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {formatDate(viewingEmployee.dateOfJoining || viewingEmployee.dateofjoin || '-')}
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date of Birth</h4>
                <p className="text-base font-medium text-gray-900 mt-1">{formatDate(viewingEmployee.dateOfBirth || viewingEmployee.dob || '-')}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mobile No</h4>
                <p className="text-base font-medium text-gray-900 mt-1">{viewingEmployee.mobileNo}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</h4>
                <p className="text-base font-medium text-gray-900 mt-1">{viewingEmployee.email}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Emergency Contact</h4>
                <p className="text-base font-medium text-gray-900 mt-1">{viewingEmployee.emergencyMobile || '-'}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Guardian Name</h4>
                <p className="text-base font-medium text-gray-900 mt-1">{viewingEmployee.guardianName || '-'}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Blood Group</h4>
                <p className="text-base font-medium text-gray-900 mt-1">{viewingEmployee.bloodGroup || '-'}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</h4>
                <p className="text-base font-medium text-gray-900 mt-1">{viewingEmployee.location || '-'}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">PAN</h4>
                <p className="text-base font-medium text-gray-900 mt-1">{viewingEmployee.pan || '-'}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Aadhaar</h4>
                <p className="text-base font-medium text-gray-900 mt-1">{viewingEmployee.aadhaar || '-'}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">UAN</h4>
                <p className="text-base font-medium text-gray-900 mt-1">{viewingEmployee.uan || '-'}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank Details</h4>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {viewingEmployee.bankName || '-'} • {viewingEmployee.bankAccount || '-'}
                  <br />
                  <span className="text-gray-600">{viewingEmployee.branch || ''}</span>
                </p>
              </div>
              
              <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</h4>
                <p className="text-base font-medium text-gray-900 mt-1 whitespace-pre-line">{viewingEmployee.address || '-'}</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => setViewingEmployee(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setViewingEmployee(null);
                  handleEdit(viewingEmployee);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                Edit Employee
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

export default EmployeeManagement;