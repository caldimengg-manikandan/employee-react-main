// components/EmployeeManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  AdjustmentsHorizontalIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  IdentificationIcon,
  CakeIcon,
  BriefcaseIcon,
  BanknotesIcon,
  AcademicCapIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import EmployeeForm from '../components/Forms/EmployeeForm';
import XLSX from "xlsx-js-style";
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { employeeAPI } from '../services/api';

const DIVISION_DESIGNATION_MAP = {
  TEKLA: [
    'Detailer',
    'Modeler',
    'Jr.Engineer',
    'Sr.Engineer',
    'Team Lead',
    'Project Co-Ordinator'
  ],
  SDS: [
    'Project Manager',
    'Asst Project Manager',
    'Sr Project Manager',
    'System Engineer',
    'Trainee',
    'Delivery Manager'
  ],
  'HR/Admin': [
    'Office Assistant',
    'Admin Manager',
    'IT Admin'
  ],
  'DAS(Software)': [
    'Software Developer',
    'System Engineer',
    'Trainee',
    'Delivery Manager'
  ],
  Electrical: ['Sr.Engineer', 'Trainee'],
  Management: [
    'Managing Director (MD)',
    'General Manager (GM)',
    'Branch Manager',
    'Delivery Manager'
  ]
};


const EmployeeManagement = () => {
  const [employees, setEmployees] = useState(() => {
    try {
      const cached = sessionStorage.getItem('cached_employees');
      return cached ? JSON.parse(cached) : [];
    } catch (e) { return []; }
  });
  const [filteredEmployees, setFilteredEmployees] = useState(() => {
    try {
      const cached = sessionStorage.getItem('cached_employees');
      return cached ? JSON.parse(cached) : [];
    } catch (e) { return []; }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = sessionStorage.getItem('cached_employees');
      return !cached || JSON.parse(cached).length === 0;
    } catch (e) { return true; }
  });
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [viewingPhotoModal, setViewingPhotoModal] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    designation: '',
    division: '',
    location: '',
    status: 'Active'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [employees, filters]);

  const fetchEmployees = async () => {
    try {
      const response = await employeeAPI.getAllEmployees('all');
      const data = Array.isArray(response?.data) ? response.data : [];
      // Sort employees by employeeId
      const sortedEmployees = data.sort((a, b) => {
        const idA = a.employeeId || '';
        const idB = b.employeeId || '';
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
      });
      setEmployees(sortedEmployees);
      try {
        sessionStorage.setItem('cached_employees', JSON.stringify(sortedEmployees));
      } catch (e) {}
    } catch (error) {
      console.error('Error fetching employees:', error);
      if (employees.length === 0) {
        showError('Failed to load employees. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = employees;

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.employeeId.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.designation) {
      filtered = filtered.filter(emp =>
        String(emp.designation || emp.role || emp.position || '') === filters.designation
      );
    }

    if (filters.division) {
      filtered = filtered.filter(emp =>
        emp.division === filters.division
      );
    }

    if (filters.location) {
      filtered = filtered.filter(emp =>
        String(emp.location || emp.branch || '') === filters.location
      );
    }
    if (filters.status) {
      filtered = filtered.filter(emp =>
        emp.status === filters.status
      );
    }

    setFilteredEmployees(filtered);
  };

  // const handleFilterChange = (key, value) => {
  //   setFilters(prev => ({
  //     ...prev,
  //     [key]: value
  //   }));
  // };
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      ...(key === 'division' ? { designation: '' } : {})
    }));
  };


  const clearFilters = () => {
    setFilters({
      search: '',
      designation: '',
      division: '',
      location: '',
      status: ''
    });
  };

  // Check if any filter is applied
  const isFilterApplied = useMemo(() => {
    return Object.values(filters).some(value => value !== '');
  }, [filters]);

  const exportToExcel = () => {
    const headers = [
      "S.No", "Employee ID", "Full Name", "Gender", "Date of Birth",
      "Original Date of Birth", "Qualification", "Blood Group", "Marital Status",
      "Spouse Name", "Spouse Contact", "Nationality", "Guardian Name",
      "PAN Number", "Aadhaar Number", "Passport Number", "UAN Number",
      "Permanent Address", "Current Address", "Mobile Number", "Personal Email",
      "Official Email", "Emergency Contact", "Designation", "Division",
      "Date of Joining", "Current Experience", "Previous Experience", "Bank Name",
      "Account Number", "Branch", "IFSC Code", "Status", "Exit Date",
      "Last Working Day", "Exit Reason"
    ];

    const rows = filteredEmployees.map((emp, index) => {
      // Format permanent address
      const permanentAddr = emp.permanentAddress || emp.permanentAddressLine ? (
        `${emp.permanentAddressLine || emp.permanentAddress || ""}${emp.permanentCity ? ", " + emp.permanentCity : ""}${emp.permanentState ? ", " + emp.permanentState : ""}${emp.permanentPincode ? " - " + emp.permanentPincode : ""}`
      ) : "-";

      // Format current address
      const currentAddr = emp.currentAddress || emp.currentAddressLine ? (
        `${emp.currentAddressLine || emp.currentAddress || ""}${emp.currentCity ? ", " + emp.currentCity : ""}${emp.currentState ? ", " + emp.currentState : ""}${emp.currentPincode ? " - " + emp.currentPincode : ""}`
      ) : "-";

      return [
        index + 1,
        emp.employeeId || "",
        emp.name || "",
        emp.gender || "",
        formatDate(emp.dateOfBirth || emp.dob),
        formatDate(emp.originalDateOfBirth),
        emp.qualification || emp.highestQualification || "",
        emp.bloodGroup || "",
        emp.maritalStatus || "",
        emp.spouseName || "",
        emp.spouseContact || "",
        emp.nationality || "Indian",
        emp.guardianName || "",
        emp.pan || "",
        emp.aadhaar || "",
        emp.passportNumber || "",
        emp.uan || "",
        permanentAddr,
        currentAddr,
        emp.contactNumber || emp.mobileNo || "",
        emp.email || "",
        emp.officialEmail || "",
        emp.emergencyContact || emp.emergencyMobile || "",
        emp.designation || emp.role || emp.position || "",
        emp.division || "",
        formatDate(emp.dateOfJoining || emp.dateofjoin),
        calculateServiceYears(emp.dateOfJoining || emp.dateofjoin) || emp.currentExperience || "",
        emp.previousExperience || "",
        emp.bankName || "",
        emp.bankAccount || "",
        emp.branch || "",
        emp.ifsc || "",
        emp.status || "Active",
        formatDate(emp.exitDate),
        formatDate(emp.lastWorkingDay),
        emp.exitReason || ""
      ];
    });

    const wsData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();

    // Dark Blue theme `#262760` header, bold white text, orange bottom border `#F37021`
    const headerStyle = {
      fill: {
        fgColor: { rgb: "262760" }
      },
      font: {
        name: "Segoe UI",
        sz: 10,
        bold: true,
        color: { rgb: "FFFFFF" }
      },
      alignment: {
        vertical: "center",
        horizontal: "left"
      },
      border: {
        bottom: { style: "medium", color: { rgb: "F37021" } }
      }
    };

    const dataStyle = {
      font: {
        name: "Segoe UI",
        sz: 9,
        color: { rgb: "333333" }
      },
      alignment: {
        vertical: "center",
        horizontal: "left"
      },
      border: {
        bottom: { style: "thin", color: { rgb: "E2E8F0" } }
      }
    };

    // Set widths for columns
    const colWidths = headers.map(() => ({ wch: 20 }));
    colWidths[0] = { wch: 8 }; // S.No
    worksheet["!cols"] = colWidths;

    // Apply styles to cells
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellRef]) continue;

        if (R === 0) {
          worksheet[cellRef].s = headerStyle;
        } else {
          worksheet[cellRef].s = dataStyle;

          if (C === 0) {
            worksheet[cellRef].s = {
              ...dataStyle,
              alignment: { vertical: "center", horizontal: "center" }
            };
          }

          const cellValue = worksheet[cellRef].v;
          if (cellValue === "Active") {
            worksheet[cellRef].s = {
              ...dataStyle,
              font: { ...dataStyle.font, bold: true, color: { rgb: "059669" } }
            };
          } else if (cellValue === "Exited") {
            worksheet[cellRef].s = {
              ...dataStyle,
              font: { ...dataStyle.font, bold: true, color: { rgb: "DC2626" } }
            };
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees List");
    XLSX.writeFile(workbook, `employees_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Format date to DD/MM/YYYY for table
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
    let joinDate = new Date(dateOfJoining);
    if (isNaN(joinDate.getTime())) {
      const s = String(dateOfJoining).trim();
      const parts = s.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          joinDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else if (parts[2].length === 4) {
          joinDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }
    }
    if (isNaN(joinDate.getTime())) return '';

    const today = new Date();
    let months = (today.getFullYear() - joinDate.getFullYear()) * 12;
    months -= joinDate.getMonth();
    months += today.getMonth();

    // Check if the current day of the month is less than the join day of the month
    if (today.getDate() < joinDate.getDate()) {
      months--;
    }

    if (months < 0) months = 0;

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    let result = '';
    if (years > 0) result += `${years} year${years > 1 ? 's' : ''}`;
    if (remainingMonths > 0) {
      if (result) result += ' ';
      result += `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    }
    if (!result) result = 'Less than a month';

    return result;
  };



  const handleEdit = async (employee) => {
    setEditingEmployee(employee);
    setShowModal(true);
    if (employee && (employee._id || employee.employeeId)) {
      try {
        const id = employee._id || employee.employeeId;
        const res = await employeeAPI.getEmployeeById(id);
        if (res?.data) {
          setEditingEmployee(res.data);
        }
      } catch (e) {
        console.error('Error fetching full employee details for edit:', e);
      }
    }
  };

  const handleView = async (employee) => {
    setViewingEmployee(employee);
    if (employee && (employee._id || employee.employeeId)) {
      try {
        const id = employee._id || employee.employeeId;
        const res = await employeeAPI.getEmployeeById(id);
        if (res?.data) {
          setViewingEmployee(res.data);
        }
      } catch (e) {
        console.error('Error fetching full employee details for view:', e);
      }
    }
  };

  const handleDelete = (id) => {
    setEmployeeToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await employeeAPI.deleteEmployee(employeeToDelete);
      fetchEmployees();
      showSuccess('Employee deleted successfully');
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
    } catch (error) {
      console.error('Error deleting employee:', error);
      showError('Error deleting employee. Please try again.');
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
      const serverMsg = error.response?.data?.message || error.message || 'Error saving employee. Please try again.';
      showError(`Failed to save employee: ${serverMsg}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'Exited':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Dynamic filter options from employees
  const divisionOptions = useMemo(() => (
    Array.from(new Set(employees.map(e => e.division).filter(Boolean)))
  ), [employees]);


  // Designation options including MD and GM
  // const designationOptions = useMemo(() => {
  //   const designationsFromEmployees = Array.from(new Set(
  //     employees.map(e => (e.designation || e.role || e.position)).filter(Boolean)
  //   ));

  //   // Add MD and GM if not already present
  //   const allDesignations = [...designationsFromEmployees];
  //   console.log("allDesignations", allDesignations);
  //   if (!allDesignations.includes('Managing Director (MD)')) {
  //     allDesignations.push('Managing Director (MD)');
  //   }
  //   if (!allDesignations.includes('General Manager (GM)')) {
  //     allDesignations.push('General Manager (GM)');
  //   }

  //   // Sort alphabetically
  //   return allDesignations.sort((a, b) => a.localeCompare(b));
  // }, [employees]);

  const designationOptions = useMemo(() => {
    // If no division selected → show all designations
    if (!filters.division) {
      return Array.from(
        new Set(
          employees
            .map(e => e.designation || e.role || e.position)
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));
    }

    // If division selected → show mapped designations only
    return (DIVISION_DESIGNATION_MAP[filters.division] || []).slice().sort(
      (a, b) => a.localeCompare(b)
    );
  }, [employees, filters.division]);


  const locationOptions = useMemo(() => (
    Array.from(new Set(employees.map(e => (e.location || e.branch)).filter(Boolean)))
  ), [employees]);

  // View Employee Modal Component (integrated) - Vibrant, colorful popup with complete data
  const renderViewEmployeeModal = () => {
    if (!viewingEmployee) return null;

    const photoUrl = viewingEmployee.profilePicture || viewingEmployee.photo;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-y-auto shadow-2xl border border-white/20">
          
          {/* Vibrant Hero Header Banner */}
          <div className="sticky top-0 z-20 bg-gradient-to-r from-[#262760] via-indigo-900 to-purple-900 text-white p-6 rounded-t-3xl shadow-lg border-b border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-5">
              {/* Passport Size Photo Frame (3.5 x 4.5 cm / 3:4 ratio) */}
              <div 
                className="w-[75px] h-[95px] rounded-xl border-2 border-white/40 shadow-xl bg-slate-900 overflow-hidden flex-shrink-0 relative group cursor-pointer"
                onClick={() => photoUrl && setViewingPhotoModal({ url: photoUrl, name: viewingEmployee.name, id: viewingEmployee.employeeId })}
                title={photoUrl ? "Click to view full size photo" : "No photo"}
              >
                {photoUrl ? (
                  <>
                    <img
                      src={photoUrl}
                      alt={viewingEmployee.name || 'Passport Photo'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold backdrop-blur-[1px]">
                      <span>Enlarge</span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-700 text-white">
                    <span className="text-3xl font-extrabold">{viewingEmployee.name ? viewingEmployee.name.charAt(0).toUpperCase() : 'E'}</span>
                    <span className="text-[9px] uppercase tracking-wider opacity-80 mt-0.5">Photo</span>
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white drop-shadow-sm">
                  {viewingEmployee.name}
                </h2>
                <p className="text-indigo-200 text-sm font-medium mt-0.5">
                  {viewingEmployee.designation || viewingEmployee.role || viewingEmployee.position || 'Employee'}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs font-bold text-blue-900 bg-blue-100 px-3 py-1 rounded-full shadow-sm">
                    🆔 {viewingEmployee.employeeId || viewingEmployee.displayId || 'EMP'}
                  </span>
                  <span className="text-xs font-bold text-purple-900 bg-purple-100 px-3 py-1 rounded-full shadow-sm">
                    🏢 {viewingEmployee.division || 'SDS'}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                    viewingEmployee.status === 'Active' ? 'bg-green-100 text-green-800 border border-green-300' :
                    viewingEmployee.status === 'Exited' ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-gray-100 text-gray-800'
                  }`}>
                    ● {viewingEmployee.status || 'Active'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setViewingEmployee(null)}
              className="text-white/80 hover:text-white hover:bg-white/10 p-2.5 rounded-full transition-colors"
            >
              <XMarkIcon className="h-7 w-7" />
            </button>
          </div>

          {/* Modal Content - Colorful Themed Cards */}
          <div className="p-6 space-y-6 bg-slate-50/50">

            {/* 1. Personal Information Card */}
            <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-purple-50/70 border border-blue-200/80 rounded-2xl p-6 shadow-md">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-blue-200/60">
                <UserIcon className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-bold text-blue-950">Personal Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-blue-100 shadow-sm">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Employee ID</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.employeeId || '-'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-blue-100 shadow-sm">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Full Name</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.name || '-'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-blue-100 shadow-sm">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Gender</div>
                  <div className="text-base font-bold text-gray-900 capitalize mt-1">{viewingEmployee.gender || '-'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-blue-100 shadow-sm">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Date of Birth</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{formatDate(viewingEmployee.dateOfBirth || viewingEmployee.dob)}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-blue-100 shadow-sm">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Original Date of Birth</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{formatDate(viewingEmployee.originalDateOfBirth)}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-blue-100 shadow-sm">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Qualification</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.qualification || viewingEmployee.highestQualification || '-'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-blue-100 shadow-sm">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Blood Group</div>
                  <div className="text-base font-bold text-red-600 mt-1">{viewingEmployee.bloodGroup || '-'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-blue-100 shadow-sm">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Marital Status</div>
                  <div className="text-base font-bold text-gray-900 capitalize mt-1">{viewingEmployee.maritalStatus || '-'}</div>
                </div>

                {viewingEmployee.maritalStatus === 'married' && (
                  <>
                    <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-blue-100 shadow-sm">
                      <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Spouse Name</div>
                      <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.spouseName || '-'}</div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-blue-100 shadow-sm">
                      <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Spouse Contact</div>
                      <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.spouseContact || '-'}</div>
                    </div>
                  </>
                )}

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-blue-100 shadow-sm">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Nationality</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.nationality || 'Indian'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-blue-100 shadow-sm">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Guardian Name</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.guardianName || '-'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-blue-100 shadow-sm">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Location</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.location || '-'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-blue-100 shadow-sm">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">PAN Number</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.pan || '-'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-blue-100 shadow-sm">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Aadhaar Number</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.aadhaar || '-'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-blue-100 shadow-sm">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Passport Number</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.passportNumber || '-'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-blue-100 shadow-sm">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">UAN Number</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.uan || '-'}</div>
                </div>
              </div>

              {/* Address Details */}
              <div className="mt-6 pt-5 border-t border-blue-200/60 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white/90 p-4 rounded-xl border border-purple-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <HomeIcon className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">Permanent Address</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 leading-relaxed whitespace-pre-line">
                    {viewingEmployee.permanentAddress || viewingEmployee.permanentAddressLine ? (
                      `${viewingEmployee.permanentAddressLine || viewingEmployee.permanentAddress || ''}${viewingEmployee.permanentCity ? ', ' + viewingEmployee.permanentCity : ''}${viewingEmployee.permanentState ? ', ' + viewingEmployee.permanentState : ''}${viewingEmployee.permanentPincode ? ' - ' + viewingEmployee.permanentPincode : ''}`
                    ) : '-'}
                  </p>
                </div>

                <div className="bg-white/90 p-4 rounded-xl border border-purple-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <HomeIcon className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">Current Address</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 leading-relaxed whitespace-pre-line">
                    {viewingEmployee.currentAddress || viewingEmployee.currentAddressLine ? (
                      `${viewingEmployee.currentAddressLine || viewingEmployee.currentAddress || ''}${viewingEmployee.currentCity ? ', ' + viewingEmployee.currentCity : ''}${viewingEmployee.currentState ? ', ' + viewingEmployee.currentState : ''}${viewingEmployee.currentPincode ? ' - ' + viewingEmployee.currentPincode : ''}`
                    ) : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Contact Information Card */}
            <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/80 to-green-50/70 border border-emerald-200/80 rounded-2xl p-6 shadow-md">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-200/60">
                <PhoneIcon className="h-6 w-6 text-emerald-600" />
                <h3 className="text-lg font-bold text-emerald-950">Contact Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-emerald-100 shadow-sm">
                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Mobile Number</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.contactNumber || viewingEmployee.mobileNo || '-'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-emerald-100 shadow-sm">
                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Personal Email</div>
                  <div className="text-base font-bold text-gray-900 break-words mt-1">{viewingEmployee.email || '-'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-emerald-100 shadow-sm">
                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Official Email</div>
                  <div className="text-base font-bold text-gray-900 break-words mt-1">{viewingEmployee.officialEmail || '-'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-emerald-100 shadow-sm">
                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Emergency Contact</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.emergencyContact || viewingEmployee.emergencyMobile || '-'}</div>
                </div>
              </div>
            </div>

            {/* 3. Professional Information Card */}
            <div className="bg-gradient-to-br from-cyan-50/90 via-sky-50/80 to-blue-50/70 border border-cyan-200/80 rounded-2xl p-6 shadow-md">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-cyan-200/60">
                <BriefcaseIcon className="h-6 w-6 text-cyan-600" />
                <h3 className="text-lg font-bold text-cyan-950">Professional Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-cyan-100 shadow-sm">
                  <div className="text-xs font-bold text-cyan-700 uppercase tracking-wider">Designation</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.designation || viewingEmployee.role || viewingEmployee.position || '-'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-cyan-100 shadow-sm">
                  <div className="text-xs font-bold text-cyan-700 uppercase tracking-wider">Division</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.division || '-'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-cyan-100 shadow-sm">
                  <div className="text-xs font-bold text-cyan-700 uppercase tracking-wider">Date of Joining</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{formatDate(viewingEmployee.dateOfJoining || viewingEmployee.dateofjoin)}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-cyan-100 shadow-sm">
                  <div className="text-xs font-bold text-cyan-700 uppercase tracking-wider">Current Experience</div>
                  <div className="text-base font-bold text-gray-900 mt-1">
                    {calculateServiceYears(viewingEmployee.dateOfJoining || viewingEmployee.dateofjoin) || viewingEmployee.currentExperience || '-'}
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-cyan-100 shadow-sm">
                  <div className="text-xs font-bold text-cyan-700 uppercase tracking-wider">Previous Experience</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.previousExperience || '-'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-cyan-100 shadow-sm">
                  <div className="text-xs font-bold text-cyan-700 uppercase tracking-wider">Status</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.status || 'Active'}</div>
                </div>
              </div>

              {/* Exit Details if Exited */}
              {viewingEmployee.status === 'Exited' && (
                <div className="mt-5 pt-5 border-t border-red-200/60 bg-red-50/70 p-4 rounded-xl border border-red-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <XMarkIcon className="h-5 w-5 text-red-600" />
                    <h4 className="text-sm font-bold text-red-900 uppercase tracking-wider">Exit Details</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-xs font-bold text-red-700 block">Exit Date</span>
                      <span className="text-sm font-bold text-gray-900">{formatDate(viewingEmployee.exitDate)}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-red-700 block">Last Working Day</span>
                      <span className="text-sm font-bold text-gray-900">{formatDate(viewingEmployee.lastWorkingDay)}</span>
                    </div>
                    <div className="md:col-span-3">
                      <span className="text-xs font-bold text-red-700 block">Exit Reason</span>
                      <span className="text-sm font-medium text-gray-800 italic">{viewingEmployee.exitReason || '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Previous Organizations */}
              {viewingEmployee.previousOrganizations && viewingEmployee.previousOrganizations.length > 0 && (
                <div className="mt-5 pt-5 border-t border-cyan-200/60">
                  <div className="flex items-center gap-2 mb-3">
                    <AcademicCapIcon className="h-5 w-5 text-indigo-600" />
                    <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wider">Previous Organizations</h4>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-indigo-200 shadow-sm">
                    <table className="min-w-full divide-y divide-indigo-100">
                      <thead>
                        <tr className="bg-indigo-100/80">
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-indigo-900 uppercase">Organization</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-indigo-900 uppercase">Designation</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-indigo-900 uppercase">Start Date</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-indigo-900 uppercase">End Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/90 divide-y divide-indigo-50">
                        {viewingEmployee.previousOrganizations.map((org, index) => (
                          <tr key={index} className="hover:bg-indigo-50/50">
                            <td className="px-4 py-2.5 text-sm font-semibold text-gray-900">{org.organization || '-'}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-800">{org.designation || org.position || org.role || '-'}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-800">{formatDate(org.startDate)}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-800">{formatDate(org.endDate) || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Bank Information Card */}
            <div className="bg-gradient-to-br from-amber-50/90 via-rose-50/80 to-orange-50/70 border border-amber-200/80 rounded-2xl p-6 shadow-md">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-200/60">
                <BanknotesIcon className="h-6 w-6 text-amber-600" />
                <h3 className="text-lg font-bold text-amber-950">Bank Account Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-amber-100 shadow-sm">
                  <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Bank Name</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.bankName || '-'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-amber-100 shadow-sm">
                  <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Account Number</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.bankAccount || '-'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-amber-100 shadow-sm">
                  <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Branch</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.branch || '-'}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-amber-100 shadow-sm">
                  <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">IFSC Code</div>
                  <div className="text-base font-bold text-gray-900 mt-1">{viewingEmployee.ifsc || '-'}</div>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 px-6 rounded-b-3xl flex justify-end gap-3 shadow-md">
            <button
              onClick={() => setViewingEmployee(null)}
              className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors shadow-sm"
            >
              Close
            </button>
            <button
              onClick={() => {
                const emp = viewingEmployee;
                setViewingEmployee(null);
                handleEdit(emp);
              }}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[#262760] rounded-xl hover:bg-[#1f204d] transition-all shadow-md"
            >
              Edit Employee
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full mx-auto px-0">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Status Tabs */}
          <div className="px-4 border-b border-gray-200 bg-gray-50/50">
            <div className="flex space-x-8 overflow-x-auto no-scrollbar">
              {[
                { id: '', label: 'All Employees' },
                { id: 'Active', label: 'Active' },
                { id: 'Inactive', label: 'Inactive' },
                { id: 'Exited', label: 'Exited' }
              ].map((tab) => {
                const isActive = filters.status === tab.id;
                const count = employees.filter(e => tab.id === '' || e.status === tab.id).length;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleFilterChange('status', tab.id)}
                    className={`
                      whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 flex items-center gap-2
                      ${isActive 
                        ? 'border-[#262760] text-[#262760]' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    `}
                  >
                    {tab.label}
                    <span className={`
                      px-2 py-0.5 rounded-full text-[11px] font-bold
                      ${isActive ? 'bg-[#262760] text-white' : 'bg-gray-200 text-gray-600'}
                    `}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Header with Actions - All buttons on right side */}
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-white">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {filters.status || 'All'} Employees
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage and monitor employee records and their status.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {/* Filter Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-3 py-2.5 border rounded-lg shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 ${showFilters || isFilterApplied
                    ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" />
                  Filters
                  {isFilterApplied && (
                    <span className="ml-2 inline-flex items-center justify-center h-5 w-5 text-xs font-semibold rounded-full bg-blue-600 text-white">
                      !
                    </span>
                  )}
                </button>

                <button
                  onClick={exportToExcel}
                  className="inline-flex items-center px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Export
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-[#262760] hover:bg-[#202150] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Employee
                </button>
              </div>
            </div>
          </div>

          {/* Filters Panel (Collapsible) */}
          {showFilters && (
            <div className="px-4 py-4 border-b border-gray-200 bg-blue-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Filter Employees</h3>
                {isFilterApplied && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                  >
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    Clear All Filters
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3"
                    placeholder="Filter by employee id"
                  />
                </div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <select
                    value={filters.designation}
                    onChange={(e) => handleFilterChange('designation', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3"
                  >
                    <option value="">All Designations</option>
                    {designationOptions.map(desig => (
                      <option key={desig} value={desig}>{desig}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <select
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3"
                  >
                    <option value="">All Locations</option>
                    {locationOptions.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3"
                  >
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Exited">Exited</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-700">
              Showing <span className="font-semibold">{filteredEmployees.length}</span> employees
            </p>
          </div>

          {/* Desktop Table View with BLUE HEADER */}
          <div className="hidden lg:block border-t border-gray-200">
            <div className="overflow-x-auto">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="sticky top-0 z-10 bg-[#262760]">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        S.No
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        Employee ID
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        Employee Name
                      </th>

                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        Division
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        Designation
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        Qualification
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        Experience
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        Contact
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEmployees.map((employee, index) => (
                      <tr
                        key={employee._id}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-100">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                          <span className="font-semibold text-blue-600">{employee.employeeId}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-r border-gray-100">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-[35px] h-[45px] rounded border border-blue-200 shadow-xs overflow-hidden bg-slate-100 flex-shrink-0 cursor-pointer relative group"
                              onClick={() => {
                                const photoUrl = employee.profilePicture || employee.photo;
                                if (photoUrl) {
                                  setViewingPhotoModal({ url: photoUrl, name: employee.name, id: employee.employeeId });
                                }
                              }}
                              title={employee.profilePicture || employee.photo ? "Click to view full size photo" : "No photo"}
                            >
                              {employee.profilePicture || employee.photo ? (
                                <>
                                  <img
                                    src={employee.profilePicture || employee.photo}
                                    alt={employee.name || 'Photo'}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold">
                                    🔍
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#262760] to-indigo-800 text-white flex items-center justify-center font-bold text-xs">
                                  {employee.name ? employee.name.charAt(0).toUpperCase() : 'E'}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{employee.name}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap border-r border-gray-100">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            {employee.division}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                          {employee.designation || employee.role || employee.position}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                          {employee.highestQualification || employee.qualification || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                          {calculateServiceYears(employee.dateOfJoining || employee.dateofjoin) || employee.currentExperience || employee.experience || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                          <div className="font-medium">{employee.mobileNo}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-r border-gray-100">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(employee.status)}`}>
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
            </div>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="lg:hidden">
            {filteredEmployees.map((employee, index) => (
              <div key={employee._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-[42px] h-[54px] rounded-lg border border-blue-200 shadow-sm overflow-hidden bg-slate-900 flex-shrink-0 cursor-pointer relative group"
                      onClick={() => {
                        const photoUrl = employee.profilePicture || employee.photo;
                        if (photoUrl) {
                          setViewingPhotoModal({ url: photoUrl, name: employee.name, id: employee.employeeId });
                        }
                      }}
                      title={employee.profilePicture || employee.photo ? "Touch to view full size photo" : "No photo"}
                    >
                      {employee.profilePicture || employee.photo ? (
                        <>
                          <img
                            src={employee.profilePicture || employee.photo}
                            alt={employee.name || 'Photo'}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                            🔍
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#262760] to-indigo-800 text-white flex items-center justify-center font-bold text-base">
                          {employee.name ? employee.name.charAt(0).toUpperCase() : 'E'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{employee.name}</h3>
                      <p className="text-sm text-blue-600 font-medium">{employee.employeeId}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{employee.officialEmail || '-'}</p>
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
                    <span className="text-xs text-gray-500">Designation</span>
                    <p className="font-medium text-gray-900">{employee.designation || employee.role || employee.position}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Qualification</span>
                    <p className="font-medium text-gray-900">{employee.highestQualification || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Experience</span>
                    <p className="font-medium text-gray-900">{calculateServiceYears(employee.dateOfJoining || employee.dateofjoin) || employee.currentExperience || employee.experience || '-'}</p>
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
                    <p className="font-medium text-gray-900">{index + 1}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
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

      {/* View Employee Modal - Showing only Add Employee fields */}
      {renderViewEmployeeModal()}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setEmployeeToDelete(null);
        }}
        title="Delete Employee"
        size="md"
      >
        <div className="p-6">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <TrashIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <p className="text-center text-gray-700 text-lg mb-8">
            Are you sure you want to delete this employee? This action cannot be undone.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setEmployeeToDelete(null);
              }}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-6 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors duration-200 shadow-lg shadow-red-200"
            >
              Delete Employee
            </button>
          </div>
        </div>
      </Modal>

      {/* Notification */}
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />

      {/* Large Photo Preview Modal */}
      {viewingPhotoModal && viewingPhotoModal.url && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4 transition-all duration-300 animate-fadeIn"
          onClick={() => setViewingPhotoModal(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-white/10 p-3 sm:p-5 rounded-3xl border border-white/20 shadow-2xl overflow-hidden flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setViewingPhotoModal(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-red-600 text-white rounded-full p-2.5 transition-all shadow-lg focus:outline-none z-10 hover:scale-110"
              title="Close Preview"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header Info */}
            <div className="w-full text-center pb-3 text-white/90 font-semibold text-sm sm:text-base border-b border-white/10 mb-3 pr-10">
              {viewingPhotoModal.name || 'Employee Photo'} {viewingPhotoModal.id ? `(${viewingPhotoModal.id})` : ''}
            </div>

            {/* Large Image Container */}
            <div className="relative overflow-hidden rounded-2xl flex items-center justify-center bg-black/40 p-2">
              <img
                src={viewingPhotoModal.url}
                alt={viewingPhotoModal.name || "Employee Passport Photo"}
                className="max-h-[75vh] max-w-[85vw] sm:max-w-xl object-contain rounded-xl shadow-2xl border-2 border-white/20"
              />
            </div>

            <div className="pt-3 text-xs text-white/70 font-medium flex items-center gap-2">
              <span>Tap anywhere outside to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
