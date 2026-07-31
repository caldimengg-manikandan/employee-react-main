import React, { useState, useEffect, useRef } from 'react';
import { Edit, Trash2, Eye, Building2, Users, Target, Filter, X, ChevronDown } from 'lucide-react';
import { employeeAPI, projectAPI, allocationAPI } from '../../services/api';
import Modal from '../../components/Modals/Modal';

const ProjectAllocation = () => {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const roleStr = String(user.role || '').toLowerCase();
  const isProjectManager = ['projectmanager', 'project_manager', 'admin', 'hr', 'director', 'manager'].includes(roleStr);
  const canEdit = isProjectManager;
  const [deleteProjectModal, setDeleteProjectModal] = useState({ isOpen: false, projectId: null, projectName: '' });
  const [deleteAllocationModal, setDeleteAllocationModal] = useState({ isOpen: false, allocationId: null });
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });
  const [messageModal, setMessageModal] = useState({ isOpen: false, title: '', message: '' });

  // UI state
  const [activeTab, setActiveTab] = useState(isProjectManager ? 'projects' : 'myAllocations');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [branches] = useState(['Hosur', 'Chennai', 'Outside Det.']);
  const [divisions] = useState(['SDS', 'TEKLA', 'DAS(Software)', 'Electrical', 'HR/Admin']);
  const [roles] = useState(['Modeler', 'Editor', 'Backdrafting', 'Checker', 'Estimator', 'Documentation', 'Project Lead']);
  const [statuses] = useState(['Active', 'Completed']);
  const [projectCategories] = useState(['Product', 'Non-Product']);

  const NON_PRODUCT_ACTIVITIES = [
    'Website Development',
    'Application Development',
    'Knowledge Sharing',
    'Employee Training',
    'Internal Meeting',
    'Research & Development (R&D)',
    'Documentation',
    'Process Improvement',
    'Software Testing',
    'Support Activities',
    'Leave Reserve',
    'Bench Work',
    'Internal Support'
  ];

  // Initialize data from MongoDB via API calls
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [showFilters, setShowFilters] = useState(true);
  const [projectFilters, setProjectFilters] = useState({
    projectCode: [],
    projectName: [],
    projectCategory: [],
    division: [],
    location: [],
    status: []
  });
  const [allocationFilters, setAllocationFilters] = useState({
    projectCode: [],
    projectName: [],
    projectCategory: [],
    employeeId: [],
    division: [],
    location: [],
    status: []
  });

  // Dropdown open states
  const [projectDropdowns, setProjectDropdowns] = useState({
    projectCode: false,
    projectName: false,
    projectCategory: false,
    division: false,
    location: false,
    status: false
  });
  const [allocationDropdowns, setAllocationDropdowns] = useState({
    projectCode: false,
    projectName: false,
    projectCategory: false,
    employeeId: false,
    division: false,
    location: false,
    status: false
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [projRes, allocRes, empRes] = await Promise.all([
          projectAPI.getAllProjects(),
          allocationAPI.getAllAllocations(),
          employeeAPI.getAllEmployees(),
        ]);
        setProjects(Array.isArray(projRes.data) ? projRes.data : []);
        setAllocations(Array.isArray(allocRes.data) ? allocRes.data : []);
        const allEmployees = Array.isArray(empRes.data) ? empRes.data : [];
        // Filter for active employees only for new allocations
        setEmployees(allEmployees.filter(emp => emp.status === 'Active'));
      } catch (e) {
        console.error('Failed to load data from MongoDB:', e);
        alert('Failed to load data from database. Please refresh the page or contact support.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Modal states
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);

  const [projectForm, setProjectForm] = useState({
    name: '',
    projectCategory: 'Product',
    division: '',
    branch: '',
    startDate: '',
    endDate: '',
    status: 'Active'
  });

  const [allocationForm, setAllocationForm] = useState({
    projectId: '',
    projectName: '',
    employeeName: '',
    employeeId: '',
    employeeIds: []
  });

  // Filter handlers with case-insensitive toggle logic
  const handleProjectFilterChange = (field, value) => {
    setProjectFilters(prev => {
      const currentList = prev[field] || [];
      const normValue = String(value).trim().toLowerCase();
      const exists = currentList.some(v => String(v).trim().toLowerCase() === normValue);
      return {
        ...prev,
        [field]: exists
          ? currentList.filter(item => String(item).trim().toLowerCase() !== normValue)
          : [...currentList, value]
      };
    });
  };

  const handleAllocationFilterChange = (field, value) => {
    setAllocationFilters(prev => {
      const currentList = prev[field] || [];
      const normValue = String(value).trim().toLowerCase();
      const exists = currentList.some(v => String(v).trim().toLowerCase() === normValue);
      return {
        ...prev,
        [field]: exists
          ? currentList.filter(item => String(item).trim().toLowerCase() !== normValue)
          : [...currentList, value]
      };
    });
  };

  const selectAllProjectFilters = (field, options) => {
    setProjectFilters(prev => ({
      ...prev,
      [field]: options
    }));
  };

  const selectAllAllocationFilters = (field, options) => {
    setAllocationFilters(prev => ({
      ...prev,
      [field]: options
    }));
  };

  const clearProjectFilter = (field) => {
    setProjectFilters(prev => ({
      ...prev,
      [field]: []
    }));
  };

  const clearAllocationFilter = (field) => {
    setAllocationFilters(prev => ({
      ...prev,
      [field]: []
    }));
  };

  const clearProjectFilters = () => {
    setProjectFilters({
      projectCode: [],
      projectName: [],
      projectCategory: [],
      division: [],
      location: [],
      status: []
    });
  };

  const clearAllocationFilters = () => {
    setAllocationFilters({
      projectCode: [],
      projectName: [],
      projectCategory: [],
      employeeId: [],
      division: [],
      location: [],
      status: []
    });
  };

  const clearAllFilters = () => {
    clearProjectFilters();
    clearAllocationFilters();
    setSelectedLocation('All');
  };

  // Dropdown handlers (opening one automatically closes others)
  const toggleProjectDropdown = (field) => {
    setProjectDropdowns(prev => {
      const next = {
        projectCode: false,
        projectName: false,
        projectCategory: false,
        division: false,
        location: false,
        status: false
      };
      next[field] = !prev[field];
      return next;
    });
  };

  const toggleAllocationDropdown = (field) => {
    setAllocationDropdowns(prev => {
      const next = {
        projectCode: false,
        projectName: false,
        projectCategory: false,
        employeeId: false,
        division: false,
        location: false,
        status: false
      };
      next[field] = !prev[field];
      return next;
    });
  };

  // Close all dropdowns
  const closeAllDropdowns = () => {
    setProjectDropdowns({
      projectCode: false,
      projectName: false,
      projectCategory: false,
      division: false,
      location: false,
      status: false
    });
    setAllocationDropdowns({
      projectCode: false,
      projectName: false,
      projectCategory: false,
      employeeId: false,
      division: false,
      location: false,
      status: false
    });
  };

  // Get unique values for filter options (Case-insensitive & trimmed)
  const getUniqueProjectCodes = (divisionFilters = [], source = 'projects') => {
    const list = source === 'allocations' ? allocations : projects;
    let filtered = list;

    if (divisionFilters && divisionFilters.length > 0) {
      const normDivs = divisionFilters.map(d => String(d).trim().toLowerCase());
      filtered = filtered.filter(item => {
        const div = String(item.division || item.projectDivision || '').trim().toLowerCase();
        return normDivs.includes(div);
      });
    }

    const codes = filtered.map(item => String(item.code || item.projectCode || '').trim()).filter(Boolean);
    return [...new Set(codes)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  };

  const getUniqueProjectNames = (divisionFilters = [], source = 'projects') => {
    const list = source === 'allocations' ? allocations : projects;
    let filtered = list;

    if (divisionFilters && divisionFilters.length > 0) {
      const normDivs = divisionFilters.map(d => String(d).trim().toLowerCase());
      filtered = filtered.filter(item => {
        const div = String(item.division || item.projectDivision || '').trim().toLowerCase();
        return normDivs.includes(div);
      });
    }

    const names = filtered.map(item => String(item.name || item.projectName || '').trim()).filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  };

  const getUniqueEmployeeIds = (divisionFilters = []) => {
    let filteredAllocations = allocations;

    if (divisionFilters && divisionFilters.length > 0) {
      const normDivs = divisionFilters.map(d => String(d).trim().toLowerCase());
      filteredAllocations = filteredAllocations.filter(a => {
        const div = String(a.projectDivision || a.division || '').trim().toLowerCase();
        return normDivs.includes(div);
      });
    }

    const empMap = new Map(employees.map(e => [String(e._id || e.id), e.employeeId]));

    const codes = filteredAllocations.map(a => {
      let code = a.employeeCode;
      if (!code && a.employeeId) {
        code = empMap.get(String(a.employeeId));
      }
      return String(code || a.employeeName || '').trim();
    }).filter(Boolean);

    return [...new Set(codes)].sort((a, b) => compareEmployeeCodes(a, b));
  };

  // Filter functions (Case-insensitive & trimmed)
  const filterProjects = (projectsList) => {
    return projectsList.filter(project => {
      const pCode = String(project.code || '').trim().toLowerCase();
      const pName = String(project.name || '').trim().toLowerCase();
      const pCat = String(project.projectCategory || 'Product').trim().toLowerCase();
      const pDiv = String(project.division || '').trim().toLowerCase();
      const pBranch = String(project.branch || '').trim().toLowerCase();
      const pStatus = String(project.status || '').trim().toLowerCase();

      const matchesCode = projectFilters.projectCode.length === 0 ||
        projectFilters.projectCode.some(c => String(c).trim().toLowerCase() === pCode);
      const matchesName = projectFilters.projectName.length === 0 ||
        projectFilters.projectName.some(n => String(n).trim().toLowerCase() === pName);
      const matchesCategory = !projectFilters.projectCategory || projectFilters.projectCategory.length === 0 ||
        projectFilters.projectCategory.some(cat => String(cat).trim().toLowerCase() === pCat);
      const matchesDivision = projectFilters.division.length === 0 ||
        projectFilters.division.some(d => String(d).trim().toLowerCase() === pDiv);
      const matchesLocation = projectFilters.location.length === 0 ||
        projectFilters.location.some(l => String(l).trim().toLowerCase() === pBranch);
      const matchesStatus = projectFilters.status.length === 0 ||
        projectFilters.status.some(s => String(s).trim().toLowerCase() === pStatus);

      return matchesCode && matchesName && matchesCategory && matchesDivision && matchesLocation && matchesStatus;
    });
  };

  const filterAllocations = (allocationsList) => {
    const empCodeMap = new Map(employees.map(e => [String(e._id || e.id), String(e.employeeId || '').trim().toLowerCase()]));

    return allocationsList.filter(allocation => {
      const aCode = String(allocation.projectCode || '').trim().toLowerCase();
      const aName = String(allocation.projectName || '').trim().toLowerCase();
      const aCat = String(allocation.projectCategory || 'Product').trim().toLowerCase();

      let aEmpCode = String(allocation.employeeCode || '').trim().toLowerCase();
      if (!aEmpCode && allocation.employeeId) {
        aEmpCode = empCodeMap.get(String(allocation.employeeId)) || '';
      }
      const aEmpName = String(allocation.employeeName || '').trim().toLowerCase();
      const aDiv = String(allocation.projectDivision || allocation.division || '').trim().toLowerCase();
      const aBranch = String(allocation.branch || '').trim().toLowerCase();
      const aStatus = String(allocation.status || '').trim().toLowerCase();

      const matchesCode = allocationFilters.projectCode.length === 0 ||
        allocationFilters.projectCode.some(c => String(c).trim().toLowerCase() === aCode);
      const matchesName = allocationFilters.projectName.length === 0 ||
        allocationFilters.projectName.some(n => String(n).trim().toLowerCase() === aName);
      const matchesCategory = !allocationFilters.projectCategory || allocationFilters.projectCategory.length === 0 ||
        allocationFilters.projectCategory.some(cat => String(cat).trim().toLowerCase() === aCat);
      const matchesEmployeeId = allocationFilters.employeeId.length === 0 ||
        allocationFilters.employeeId.some(e => {
          const norm = String(e).trim().toLowerCase();
          return norm === aEmpCode || norm === aEmpName || (allocation.employeeId && norm === String(allocation.employeeId).trim().toLowerCase());
        });
      const matchesDivision = allocationFilters.division.length === 0 ||
        allocationFilters.division.some(d => String(d).trim().toLowerCase() === aDiv);
      const matchesLocation = allocationFilters.location.length === 0 ||
        allocationFilters.location.some(l => String(l).trim().toLowerCase() === aBranch);
      const matchesStatus = allocationFilters.status.length === 0 ||
        allocationFilters.status.some(s => String(s).trim().toLowerCase() === aStatus);

      return matchesCode && matchesName && matchesCategory && matchesEmployeeId && matchesDivision && matchesLocation && matchesStatus;
    });
  };

  const compareEmployeeCodes = (codeA, codeB) => {
    const a = String(codeA || '').trim().toUpperCase();
    const b = String(codeB || '').trim().toUpperCase();
    const re = /^([A-Z]+)(\d+)$/;
    const ma = a.match(re);
    const mb = b.match(re);
    if (ma && mb) {
      const prefixCmp = ma[1].localeCompare(mb[1], undefined, { sensitivity: 'base' });
      if (prefixCmp !== 0) return prefixCmp;
      const na = Number(ma[2]);
      const nb = Number(mb[2]);
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    }
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  };

  const getActiveProjectsSorted = () => {
    return projects
      .filter(project => String(project.status || '').toLowerCase() === 'active')
      .sort((a, b) => {
        const nameCmp = String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
        if (nameCmp !== 0) return nameCmp;
        return String(a.code || '').localeCompare(String(b.code || ''), undefined, { numeric: true, sensitivity: 'base' });
      });
  };

  const getAllEmployeesSorted = () => {
    return [...employees].sort((a, b) => compareEmployeeCodes(a.employeeId, b.employeeId));
  };

  // Function to refresh data from MongoDB
  const refreshData = async () => {
    try {
      const [projRes, allocRes, empRes] = await Promise.all([
        projectAPI.getAllProjects(),
        allocationAPI.getAllAllocations(),
        employeeAPI.getAllEmployees(),
      ]);
      setProjects(Array.isArray(projRes.data) ? projRes.data : []);
      setAllocations(Array.isArray(allocRes.data) ? allocRes.data : []);
      const allEmployees = Array.isArray(empRes.data) ? empRes.data : [];
      setEmployees(allEmployees.filter(emp => emp.status === 'Active' || emp.status === 'ACTIVE'));
    } catch (e) {
      console.error('Failed to refresh data from MongoDB:', e);
      alert('Failed to refresh data from database.');
    }
  };

  // Calculate current user's allocations
  const myAllocations = allocations.filter(alloc => {
    if (!user) return false;

    // robust matching logic
    const matchesId = (user.id && alloc.employeeId && String(user.id) === String(alloc.employeeId)) ||
      (user._id && alloc.employeeId && String(user._id) === String(alloc.employeeId));

    const matchesEmployeeId = user.employeeId && alloc.employeeCode &&
      String(user.employeeId).trim() === String(alloc.employeeCode).trim();

    const matchesName = user.name && alloc.employeeName &&
      String(user.name).trim().toLowerCase() === String(alloc.employeeName).trim().toLowerCase();

    return matchesId || matchesEmployeeId || matchesName;
  });

  // Utility functions
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getCategoryBadge = (category) => {
    const cat = String(category || 'Product').trim();
    if (cat === 'Non-Product') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-50 to-orange-50 text-orange-700 border border-orange-200/80 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
          Non-Product
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
        Product
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'active') {
      return "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs";
    }
    return "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 shadow-xs";
  };

  // Generate project code based on division
  const generateProjectCode = (division) => {
    const d = String(division || '').trim().toUpperCase();
    let prefix = 'PROJ';
    if (d.includes('SDS')) prefix = 'CDE-SDS';
    else if (d.includes('TEK')) prefix = 'CDE-TEK';
    else if (d.includes('DAS')) prefix = 'CDE-DAS';
    else if (d.includes('DDS')) prefix = 'CDE-DDS';
    else if (d.includes('MEC') || d.includes('MECHANICAL')) prefix = 'CDE-MEC';
    else if (d.includes('ELEC')) prefix = 'CDE-ELEC';
    else if (d.includes('HR')) prefix = 'CDE-HR';
    else if (d.includes('ENG')) prefix = 'CDE-ENG';

    const existingCodes = projects
      .filter(p => p.division === division)
      .map(p => {
        const match = p.code.match(new RegExp(`^${prefix}-(\\d+)$`));
        return match ? parseInt(match[1]) : null;
      })
      .filter(num => num !== null && !Number.isNaN(num));

    const nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 0;
    return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
  };

  const getDivisionWiseProjectCounts = () => {
    const counts = {};
    divisions.forEach(d => { counts[d] = 0; });
    projects.forEach(p => {
      const div = p.division || 'Unassigned';
      if (Object.prototype.hasOwnProperty.call(counts, div)) {
        counts[div] += 1;
      }
    });
    return counts;
  };

  // Filter helpers with location filter
  const getFilteredProjects = () => {
    let filtered = projects;

    // Apply location filter
    if (selectedLocation !== 'All') {
      filtered = filtered.filter(p => p.branch === selectedLocation);
    }

    // Apply other filters
    const result = filterProjects(filtered);
    return result.sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' }));
  };

  const getFilteredAllocations = () => {
    let filtered = allocations;

    // Apply location filter
    if (selectedLocation !== 'All') {
      filtered = filtered.filter(a => a.branch === selectedLocation);
    }

    // Apply other filters
    return filterAllocations(filtered);
  };

  const getMyFilteredAllocations = () => {
    let filtered = myAllocations;

    // Apply location filter
    if (selectedLocation !== 'All') {
      filtered = filtered.filter(a => a.branch === selectedLocation);
    }

    // Apply other filters
    return filterAllocations(filtered);
  };

  // Check if any filters are active
  const hasActiveProjectFilters = Object.values(projectFilters).some(filter => filter.length > 0);
  const hasActiveAllocationFilters = Object.values(allocationFilters).some(filter => filter.length > 0);

  // MultiSelect Dropdown Component
  const MultiSelectDropdown = ({
    label,
    options,
    selectedValues,
    onChange,
    onSelectAll,
    onClear,
    isOpen,
    onToggle,
    onClose,
    type = 'text'
  }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
      if (!isOpen) {
        setSearchQuery('');
        return;
      }
      const handleOutsideClick = (e) => {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          if (onClose) onClose();
        }
      };
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen, onClose]);

    const q = searchQuery.toLowerCase().trim();
    const filteredOptions = q.length === 0
      ? options
      : options.filter(option => String(option || '').toLowerCase().includes(q));

    const allSelected = options.length > 0 && selectedValues.length === options.length;

    return (
      <div ref={containerRef} className={`relative ${isOpen ? 'z-50' : 'z-10'}`} onClick={(e) => e.stopPropagation()}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white flex justify-between items-center"
          >
            <span className="truncate">
              {selectedValues.length === 0
                ? `All ${label}`
                : selectedValues.length === 1
                  ? selectedValues[0]
                  : `${selectedValues.length} selected`
              }
            </span>
            <ChevronDown size={16} className={`transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div
              className="absolute top-full left-0 z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-2xl max-h-80 flex flex-col"
              style={{ minWidth: '220px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-2 border-b border-gray-200 bg-gray-50 flex flex-col gap-2 flex-shrink-0">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Search..."
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex justify-between items-center px-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (q.length > 0) {
                        const isAllFilteredSelected = filteredOptions.every(opt => selectedValues.includes(opt));
                        if (isAllFilteredSelected) {
                          onSelectAll(selectedValues.filter(val => !filteredOptions.includes(val)));
                        } else {
                          onSelectAll(Array.from(new Set([...selectedValues, ...filteredOptions])));
                        }
                      } else {
                        onSelectAll(allSelected ? [] : options);
                      }
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {q.length > 0
                      ? (filteredOptions.every(opt => selectedValues.includes(opt)) ? 'Deselect Filtered' : 'Select Filtered')
                      : (allSelected ? 'Deselect All' : 'Select All')
                    }
                  </button>
                  {selectedValues.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClear();
                      }}
                      className="text-xs font-semibold text-red-600 hover:text-red-800"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-y-auto max-h-56 p-1">
                {filteredOptions.length === 0 ? (
                  <div className="p-3 text-xs text-gray-500 text-center">No results</div>
                ) : (
                  filteredOptions.map(option => (
                    <label
                      key={option}
                      className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.some(v => String(v).trim().toLowerCase() === String(option).trim().toLowerCase())}
                        onChange={(e) => {
                          e.stopPropagation();
                          onChange(option);
                        }}
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm ${type === 'code' ? 'font-mono text-blue-600 font-semibold' : 'text-gray-800'}`}>{option}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const SearchableSelect = ({
    value,
    onChange,
    options,
    placeholder = 'Select',
    disabled = false
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
      if (!isOpen) return;
      const onMouseDown = (e) => {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', onMouseDown);
      return () => document.removeEventListener('mousedown', onMouseDown);
    }, [isOpen]);

    useEffect(() => {
      if (!isOpen) return;
      setQuery('');
      setTimeout(() => {
        try { inputRef.current?.focus(); } catch (_) { }
      }, 0);
    }, [isOpen]);

    const normalizedValue = String(value || '');
    const selectedOption = options.find(o => String(o.value) === normalizedValue);
    const q = String(query || '').trim().toLowerCase();
    const filteredOptions = q.length === 0
      ? options
      : options.filter(o => String(o.searchText || o.label || '').toLowerCase().includes(q));

    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (disabled) return;
            setIsOpen(v => !v);
          }}
          className={`w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white flex justify-between items-center ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        >
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          <ChevronDown size={18} className={`ml-2 flex-shrink-0 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
            <div className="p-2 border-b border-gray-200">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsOpen(false);
                }}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Search..."
              />
            </div>

            <div className="max-h-56 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">No results</div>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      onChange(opt.value, opt);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${String(opt.value) === normalizedValue ? 'bg-blue-50' : ''}`}
                  >
                    {opt.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // View modal handlers
  const openViewModal = (item, type) => {
    setViewingItem({ ...item, type });
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingItem(null);
  };

  // Project modal handlers
  const openProjectModal = (project = null) => {
    if (!canEdit && project) {
      openViewModal(project, 'project');
      return;
    }

    if (!canEdit) {
      setMessageModal({ isOpen: true, title: 'Access Denied', message: "You don't have permission to manage projects. Please contact Project Manager or Admin." });
      return;
    }

    if (project) {
      setEditingProject(project);
      setProjectForm({
        name: project.name,
        projectCategory: project.projectCategory || 'Product',
        division: project.division,
        branch: project.branch,
        startDate: project.startDate || '',
        endDate: project.endDate || '',
        status: project.status || 'Active'
      });
    } else {
      setEditingProject(null);
      setProjectForm({
        name: '',
        projectCategory: 'Product',
        division: '',
        branch: '',
        startDate: '',
        endDate: '',
        status: 'Active'
      });
    }
    setShowProjectModal(true);
  };

  const closeProjectModal = () => {
    setShowProjectModal(false);
    setEditingProject(null);
  };

  const handleProjectSave = async () => {
    if (!projectForm.name || !projectForm.projectCategory || !projectForm.division || !projectForm.branch || !projectForm.startDate || !projectForm.endDate) {
      setMessageModal({ isOpen: true, title: 'Missing Fields', message: 'Please fill all required fields.' });
      return;
    }

    const s = new Date(projectForm.startDate);
    const e = new Date(projectForm.endDate);
    if (isFinite(s) && isFinite(e) && e < s) {
      setMessageModal({ isOpen: true, title: 'Invalid Dates', message: 'End Date must be on or after Start Date.' });
      return;
    }

    // Prevent duplicate project by name + division (exclude current when editing)
    const duplicateProject = projects.some(p =>
      String(p.name).trim().toLowerCase() === String(projectForm.name).trim().toLowerCase() &&
      String(p.division).trim().toLowerCase() === String(projectForm.division).trim().toLowerCase() &&
      String(p._id || p.id) !== String(editingProject?._id || editingProject?.id || '')
    );
    if (duplicateProject) {
      setMessageModal({ isOpen: true, title: 'Duplicate Project', message: 'A project with the same name and division already exists.' });
      return;
    }

    const projectCode = editingProject ? editingProject.code : generateProjectCode(projectForm.division);

    const payload = {
      name: projectForm.name,
      projectCategory: projectForm.projectCategory || 'Product',
      code: projectCode,
      division: projectForm.division,
      branch: projectForm.branch,
      startDate: projectForm.startDate,
      endDate: projectForm.endDate,
      status: projectForm.status,
      description: editingProject ? editingProject.description || `${projectForm.name} project` : `${projectForm.name} project`,
    };

    if (editingProject) {
      const keys = ['name', 'projectCategory', 'division', 'branch', 'startDate', 'endDate', 'status'];
      const unchanged = keys.every(k => String(editingProject[k] || '') === String(payload[k] || ''));
      if (unchanged) {
        setMessageModal({ isOpen: true, title: 'No Changes', message: 'No changes detected.' });
        return;
      }
    }

    try {
      if (editingProject && editingProject._id) {
        await projectAPI.updateProject(editingProject._id, payload);
      } else {
        await projectAPI.createProject(payload);
      }
      await refreshData();
      try { window.dispatchEvent(new Event('project-allocations-updated')); } catch (_) { }
      closeProjectModal();
    } catch (e) {
      setMessageModal({ isOpen: true, title: 'Error', message: e?.response?.data?.error || 'Failed to save project' });
    }
  };

  const openDeleteProjectModal = (project) => {
    if (!canEdit) {
      alert("You don't have permission to delete projects.");
      return;
    }
    setDeleteProjectModal({
      isOpen: true,
      projectId: project._id || project.id,
      projectName: project.name || ''
    });
  };

  const confirmDeleteProject = async () => {
    const projectId = deleteProjectModal.projectId;
    if (!projectId) return;
    try {
      const removedCount = allocations.filter(a => String(a.projectId) === String(projectId)).length;
      await projectAPI.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p._id !== projectId));
      setAllocations(prev => prev.filter(a => String(a.projectId) !== String(projectId)));
      setDeleteProjectModal({ isOpen: false, projectId: null, projectName: '' });
      setSuccessModal({ isOpen: true, message: `Project deleted${removedCount > 0 ? ` with ${removedCount} allocation(s) removed` : ''}.` });
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to delete project');
      setDeleteProjectModal({ isOpen: false, projectId: null, projectName: '' });
    }
  };

  // Allocation modal handlers
  const openAllocationModal = (allocation = null) => {
    if (!canEdit && allocation) {
      openViewModal(allocation, 'allocation');
      return;
    }

    if (!canEdit) {
      setMessageModal({ isOpen: true, title: 'Access Denied', message: "You don't have permission to edit allocations. Please contact Project Manager or Admin." });
      return;
    }

    if (allocation) {
      setEditingAllocation(allocation);
      setAllocationForm({
        projectId: allocation.projectId || '',
        projectName: allocation.projectName,
        projectCategory: allocation.projectCategory || 'All',
        employeeName: allocation.employeeName,
        employeeId: allocation.employeeCode || allocation.employeeId || '',
        employeeIds: [allocation.employeeCode || allocation.employeeId].filter(Boolean)
      });
    } else {
      setEditingAllocation(null);
      setAllocationForm({
        projectId: '',
        projectName: '',
        projectCategory: 'All',
        employeeName: '',
        employeeId: '',
        employeeIds: []
      });
    }
    setShowAllocationModal(true);
  };

  const closeAllocationModal = () => {
    setShowAllocationModal(false);
    setEditingAllocation(null);
  };

  // Handle employee selection by unique employeeId to avoid duplicate names
  const handleEmployeeSelect = (employeeId) => {
    const selectedEmployee = employees.find(emp => emp.employeeId === employeeId);
    if (selectedEmployee) {
      setAllocationForm(prev => ({
        ...prev,
        employeeName: selectedEmployee.name,
        employeeId: selectedEmployee.employeeId || selectedEmployee.id || ''
      }));
    } else {
      setAllocationForm(prev => ({
        ...prev,
        employeeName: '',
        employeeId: ''
      }));
    }
  };

  const addEmployeeToList = () => {
    if (!allocationForm.employeeId) return;
    if (allocationForm.employeeIds.includes(allocationForm.employeeId)) return;
    setAllocationForm(prev => ({
      ...prev,
      employeeIds: [...prev.employeeIds, prev.employeeId],
      employeeName: '',
      employeeId: ''
    }));
  };

  const removeEmployeeFromList = (employeeCode) => {
    setAllocationForm(prev => ({
      ...prev,
      employeeIds: prev.employeeIds.filter(code => code !== employeeCode)
    }));
  };

  const handleAllocate = async () => {
    const selectedEmployeeIds = editingAllocation
      ? (allocationForm.employeeId ? [allocationForm.employeeId] : [])
      : ((allocationForm.employeeIds && allocationForm.employeeIds.length > 0)
        ? allocationForm.employeeIds
        : (allocationForm.employeeId ? [allocationForm.employeeId] : []));

    if (!allocationForm.projectId || !allocationForm.projectName || selectedEmployeeIds.length === 0) {
      setMessageModal({ isOpen: true, title: 'Missing Fields', message: 'Please fill all required fields.' });
      return;
    }

    const project = projects.find(p => String(p._id || p.id) === String(allocationForm.projectId));

    if (!project) {
      setMessageModal({ isOpen: true, title: 'Not Found', message: 'Project not found. Please check the project selection.' });
      return;
    }

    if (!editingAllocation) {
      let createdCount = 0;
      let skippedCount = 0;
      for (const empCode of selectedEmployeeIds) {
        const employee = employees.find(e => e.employeeId === empCode);
        if (!employee) {
          skippedCount++;
          continue;
        }
        const isDuplicateAllocation = allocations.some(a =>
          String(a.projectId) === String(project._id || project.id) &&
          String(a.employeeCode).trim().toLowerCase() === String(empCode).trim().toLowerCase()
        );
        if (isDuplicateAllocation) {
          skippedCount++;
          continue;
        }
        const payload = {
          projectId: project._id || project.id,
          projectName: project.name,
          projectCode: project.code,
          employeeName: employee.name,
          employeeCode: empCode,
          startDate: project.startDate,
          endDate: project.endDate,
          branch: project.branch,
          projectDivision: project.division,
          status: 'Active',
          allocatedHours: 40,
          assignedBy: user.name || 'System',
          assignedDate: new Date().toISOString().split('T')[0],
          role: ''
        };
        try {
          await allocationAPI.createAllocation(payload);
          createdCount++;
        } catch (_) {
          skippedCount++;
        }
      }
      await refreshData();
      try { window.dispatchEvent(new Event('project-allocations-updated')); } catch (_) { }
      closeAllocationModal();
      setSuccessModal({ isOpen: true, message: `${createdCount} allocation(s) created, ${skippedCount} skipped.` });
      return;
    }
    if (editingAllocation) {
      const dupOnEdit = allocations.some(a =>
        String(a._id || a.id) !== String(editingAllocation._id || editingAllocation.id) &&
        String(a.projectId) === String(project._id || project.id) &&
        String(a.employeeCode).trim().toLowerCase() === String(allocationForm.employeeId).trim().toLowerCase()
      );
      if (dupOnEdit) {
        setMessageModal({ isOpen: true, title: 'Duplicate Allocation', message: 'Another allocation for this employee and project already exists.' });
        return;
      }
    }

    const employee = employees.find(e => e.employeeId === allocationForm.employeeId);
    if (!employee) {
      setMessageModal({ isOpen: true, title: 'Not Found', message: 'Employee not found. Please check the employee name.' });
      return;
    }
    const payload = {
      projectId: project._id || project.id,
      projectName: project.name,
      projectCode: project.code,
      employeeName: employee.name,
      employeeCode: allocationForm.employeeId || employee.employeeId || employee.id,
      startDate: project.startDate,
      endDate: project.endDate,
      branch: project.branch,
      projectDivision: project.division,
      status: 'Active',
      allocatedHours: 40,
      assignedBy: user.name || 'System',
      assignedDate: new Date().toISOString().split('T')[0],
      role: editingAllocation ? (editingAllocation.role || '') : ''
    };

    if (editingAllocation) {
      const unchanged =
        String(editingAllocation.projectName || '').trim().toLowerCase() === String(payload.projectName || '').trim().toLowerCase() &&
        String(editingAllocation.employeeCode || '').trim().toLowerCase() === String(payload.employeeCode || '').trim().toLowerCase();
      if (unchanged) {
        setMessageModal({ isOpen: true, title: 'No Changes', message: 'No changes detected.' });
        return;
      }
    }

    try {
      if (editingAllocation && editingAllocation._id) {
        await allocationAPI.updateAllocation(editingAllocation._id, payload);
      } else {
        await allocationAPI.createAllocation(payload);
      }
      await refreshData();
      try { window.dispatchEvent(new Event('project-allocations-updated')); } catch (_) { }
      closeAllocationModal();
    } catch (e) {
      setMessageModal({ isOpen: true, title: 'Error', message: e?.response?.data?.error || 'Failed to save allocation' });
    }
  };

  const openDeleteAllocationModal = (allocation) => {
    if (!canEdit) {
      alert("You don't have permission to delete allocations.");
      return;
    }
    setDeleteAllocationModal({ isOpen: true, allocationId: allocation._id || allocation.id });
  };

  const confirmDeleteAllocation = async () => {
    const allocationId = deleteAllocationModal.allocationId;
    if (!allocationId) return;
    try {
      await allocationAPI.deleteAllocation(allocationId);
      setAllocations(prev => prev.filter(a => a._id !== allocationId));
      setDeleteAllocationModal({ isOpen: false, allocationId: null });
      setSuccessModal({ isOpen: true, message: 'Allocation deleted.' });
      try { window.dispatchEvent(new Event('project-allocations-updated')); } catch (_) { }
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to delete allocation');
      setDeleteAllocationModal({ isOpen: false, allocationId: null });
    }
  };

  return (
    <div className="p-6" onClick={closeAllDropdowns}>
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading data from database...</p>
          </div>
        </div>
      )}

      {!loading && (
        <>
          <Modal
            isOpen={deleteProjectModal.isOpen}
            onClose={() => setDeleteProjectModal({ isOpen: false, projectId: null, projectName: '' })}
            title="Confirm Project Deletion"
            size="sm"
          >
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to delete the project{deleteProjectModal.projectName ? ` "${deleteProjectModal.projectName}"` : ''}?
                This will also remove all associated allocations.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteProjectModal({ isOpen: false, projectId: null, projectName: '' })}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteProject}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </Modal>

          <Modal
            isOpen={deleteAllocationModal.isOpen}
            onClose={() => setDeleteAllocationModal({ isOpen: false, allocationId: null })}
            title="Confirm Allocation Deletion"
            size="sm"
          >
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to delete this allocation?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteAllocationModal({ isOpen: false, allocationId: null })}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAllocation}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </Modal>

          <Modal
            isOpen={successModal.isOpen}
            onClose={() => setSuccessModal({ isOpen: false, message: '' })}
            title="Success"
            size="sm"
          >
            <div className="space-y-4">
              <p className="text-gray-700">{successModal.message}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => setSuccessModal({ isOpen: false, message: '' })}
                  className="px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1f204d] transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </Modal>

          <Modal
            isOpen={messageModal.isOpen}
            onClose={() => setMessageModal({ isOpen: false, title: '', message: '' })}
            title={messageModal.title || 'Message'}
            size="sm"
            zIndex={100}
          >
            <div className="space-y-4">
              <p className="text-gray-700">{messageModal.message}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => setMessageModal({ isOpen: false, title: '', message: '' })}
                  className="px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1f204d] transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </Modal>


          {/* KPI Summary Cards */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Projects */}
              <div className="bg-gradient-to-br from-indigo-900 via-[#1e1b4b] to-[#262760] p-5 rounded-2xl text-white shadow-xl shadow-indigo-950/20 border border-indigo-500/20 relative overflow-hidden group hover:scale-[1.01] transition-all">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all"></div>
                <div className="flex justify-between items-center relative z-10">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-indigo-200/80">Total Master Projects</p>
                    <h3 className="text-3xl font-extrabold mt-1 text-white">{projects.length}</h3>
                  </div>
                  <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-indigo-300">
                    <Building2 size={24} />
                  </div>
                </div>
              </div>

              {/* Product Projects */}
              <div className="bg-gradient-to-br from-blue-900 via-[#172554] to-[#1e3a8a] p-5 rounded-2xl text-white shadow-xl shadow-blue-950/20 border border-blue-500/20 relative overflow-hidden group hover:scale-[1.01] transition-all">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all"></div>
                <div className="flex justify-between items-center relative z-10">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-blue-200/80">Product Projects</p>
                    <h3 className="text-3xl font-extrabold mt-1 text-white">
                      {projects.filter(p => (p.projectCategory || 'Product') === 'Product').length}
                    </h3>
                  </div>
                  <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-400/30 text-blue-300 font-bold text-xs">
                    PROD
                  </div>
                </div>
              </div>

              {/* Non-Product Activities */}
              <div className="bg-gradient-to-br from-amber-900 via-[#451a03] to-[#78350f] p-5 rounded-2xl text-white shadow-xl shadow-amber-950/20 border border-amber-500/20 relative overflow-hidden group hover:scale-[1.01] transition-all">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all"></div>
                <div className="flex justify-between items-center relative z-10">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-amber-200/80">Non-Product Activities</p>
                    <h3 className="text-3xl font-extrabold mt-1 text-white">
                      {projects.filter(p => p.projectCategory === 'Non-Product').length}
                    </h3>
                  </div>
                  <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-400/30 text-amber-300 font-bold text-xs">
                    INTERNAL
                  </div>
                </div>
              </div>
            </div>

            {/* Division-Wise Project Statistics Card */}
            <div className="bg-gradient-to-br from-purple-950 via-[#2e1065] to-[#3b0764] p-5 rounded-2xl text-white shadow-xl shadow-purple-950/20 border border-purple-500/20 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={18} className="text-purple-300" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-200">Division-Wise Project Statistics</h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {Object.entries(getDivisionWiseProjectCounts()).map(([divName, count]) => (
                  <div
                    key={divName}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/10 border border-white/10 text-purple-100"
                  >
                    <span className="truncate mr-2 font-medium">{divName}</span>
                    <span className="bg-purple-400/30 px-2.5 py-0.5 rounded-full text-white font-mono font-extrabold text-xs">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Controls Header */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-950/5 border border-slate-200/80 p-4 mb-6 relative z-20">
            <div className="flex flex-wrap gap-4 justify-between items-center">
              <div className="flex items-center bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60 space-x-1">
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${
                    activeTab === 'projects'
                      ? 'bg-gradient-to-r from-[#262760] to-[#3a3c8c] text-white shadow-md shadow-indigo-900/20 scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Building2 size={16} />
                  Projects Master
                </button>
                <button
                  onClick={() => setActiveTab('allocations')}
                  className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${
                    activeTab === 'allocations'
                      ? 'bg-gradient-to-r from-[#262760] to-[#3a3c8c] text-white shadow-md shadow-indigo-900/20 scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Users size={16} />
                  All Allocations
                </button>
                {!canEdit && (
                  <button
                    onClick={() => setActiveTab('myAllocations')}
                    className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${
                      activeTab === 'myAllocations'
                        ? 'bg-gradient-to-r from-[#262760] to-[#3a3c8c] text-white shadow-md shadow-indigo-900/20 scale-[1.02]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Target size={16} />
                    My Allocations
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-3">
                {/* Filter Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFilters(!showFilters);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 border ${
                    showFilters
                      ? 'bg-[#262760] text-white border-[#262760] shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Filter size={16} />
                  Filters
                  {(hasActiveProjectFilters || hasActiveAllocationFilters) && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                      !
                    </span>
                  )}
                </button>

                {/* Action Button */}
                {canEdit && (
                  <button
                    onClick={() => activeTab === 'projects' ? openProjectModal() : openAllocationModal()}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    {activeTab === 'projects' ? (
                      <>
                        <Building2 size={16} />
                        + Add Project
                      </>
                    ) : (
                      <>
                        <Users size={16} />
                        + Allocate Resource
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 relative z-20" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-800">Filters</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={clearAllFilters}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex items-center gap-1"
                    >
                      <X size={14} />
                      Clear All
                    </button>
                  </div>
                </div>

                {activeTab === 'projects' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <MultiSelectDropdown
                      label="Project Code"
                      options={getUniqueProjectCodes(projectFilters.division, 'projects')}
                      selectedValues={projectFilters.projectCode}
                      onChange={(value) => handleProjectFilterChange('projectCode', value)}
                      onSelectAll={(options) => selectAllProjectFilters('projectCode', options)}
                      onClear={() => clearProjectFilter('projectCode')}
                      isOpen={projectDropdowns.projectCode}
                      onToggle={() => toggleProjectDropdown('projectCode')}
                      onClose={() => setProjectDropdowns(prev => ({ ...prev, projectCode: false }))}
                      type="code"
                    />

                    <MultiSelectDropdown
                      label="Project Name"
                      options={getUniqueProjectNames(projectFilters.division, 'projects')}
                      selectedValues={projectFilters.projectName}
                      onChange={(value) => handleProjectFilterChange('projectName', value)}
                      onSelectAll={(options) => selectAllProjectFilters('projectName', options)}
                      onClear={() => clearProjectFilter('projectName')}
                      isOpen={projectDropdowns.projectName}
                      onToggle={() => toggleProjectDropdown('projectName')}
                      onClose={() => setProjectDropdowns(prev => ({ ...prev, projectName: false }))}
                    />

                    <MultiSelectDropdown
                      label="Project Category"
                      options={projectCategories}
                      selectedValues={projectFilters.projectCategory}
                      onChange={(value) => handleProjectFilterChange('projectCategory', value)}
                      onSelectAll={(options) => selectAllProjectFilters('projectCategory', options)}
                      onClear={() => clearProjectFilter('projectCategory')}
                      isOpen={projectDropdowns.projectCategory}
                      onToggle={() => toggleProjectDropdown('projectCategory')}
                      onClose={() => setProjectDropdowns(prev => ({ ...prev, projectCategory: false }))}
                    />

                    <MultiSelectDropdown
                      label="Division"
                      options={divisions}
                      selectedValues={projectFilters.division}
                      onChange={(value) => handleProjectFilterChange('division', value)}
                      onSelectAll={(options) => selectAllProjectFilters('division', options)}
                      onClear={() => clearProjectFilter('division')}
                      isOpen={projectDropdowns.division}
                      onToggle={() => toggleProjectDropdown('division')}
                      onClose={() => setProjectDropdowns(prev => ({ ...prev, division: false }))}
                    />

                    <MultiSelectDropdown
                      label="Location"
                      options={branches}
                      selectedValues={projectFilters.location}
                      onChange={(value) => handleProjectFilterChange('location', value)}
                      onSelectAll={(options) => selectAllProjectFilters('location', options)}
                      onClear={() => clearProjectFilter('location')}
                      isOpen={projectDropdowns.location}
                      onToggle={() => toggleProjectDropdown('location')}
                      onClose={() => setProjectDropdowns(prev => ({ ...prev, location: false }))}
                    />

                    <MultiSelectDropdown
                      label="Status"
                      options={statuses}
                      selectedValues={projectFilters.status}
                      onChange={(value) => handleProjectFilterChange('status', value)}
                      onSelectAll={(options) => selectAllProjectFilters('status', options)}
                      onClear={() => clearProjectFilter('status')}
                      isOpen={projectDropdowns.status}
                      onToggle={() => toggleProjectDropdown('status')}
                      onClose={() => setProjectDropdowns(prev => ({ ...prev, status: false }))}
                    />
                  </div>
                )}

                {(activeTab === 'allocations' || activeTab === 'myAllocations') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                    <MultiSelectDropdown
                      label="Project Code"
                      options={getUniqueProjectCodes(allocationFilters.division, 'allocations')}
                      selectedValues={allocationFilters.projectCode}
                      onChange={(value) => handleAllocationFilterChange('projectCode', value)}
                      onSelectAll={(options) => selectAllAllocationFilters('projectCode', options)}
                      onClear={() => clearAllocationFilter('projectCode')}
                      isOpen={allocationDropdowns.projectCode}
                      onToggle={() => toggleAllocationDropdown('projectCode')}
                      onClose={() => setAllocationDropdowns(prev => ({ ...prev, projectCode: false }))}
                      type="code"
                    />

                    <MultiSelectDropdown
                      label="Project Name"
                      options={getUniqueProjectNames(allocationFilters.division, 'allocations')}
                      selectedValues={allocationFilters.projectName}
                      onChange={(value) => handleAllocationFilterChange('projectName', value)}
                      onSelectAll={(options) => selectAllAllocationFilters('projectName', options)}
                      onClear={() => clearAllocationFilter('projectName')}
                      isOpen={allocationDropdowns.projectName}
                      onToggle={() => toggleAllocationDropdown('projectName')}
                      onClose={() => setAllocationDropdowns(prev => ({ ...prev, projectName: false }))}
                    />

                    <MultiSelectDropdown
                      label="Project Category"
                      options={projectCategories}
                      selectedValues={allocationFilters.projectCategory}
                      onChange={(value) => handleAllocationFilterChange('projectCategory', value)}
                      onSelectAll={(options) => selectAllAllocationFilters('projectCategory', options)}
                      onClear={() => clearAllocationFilter('projectCategory')}
                      isOpen={allocationDropdowns.projectCategory}
                      onToggle={() => toggleAllocationDropdown('projectCategory')}
                      onClose={() => setAllocationDropdowns(prev => ({ ...prev, projectCategory: false }))}
                    />

                    <MultiSelectDropdown
                      label="Employee ID"
                      options={getUniqueEmployeeIds(allocationFilters.division)}
                      selectedValues={allocationFilters.employeeId}
                      onChange={(value) => handleAllocationFilterChange('employeeId', value)}
                      onSelectAll={(options) => selectAllAllocationFilters('employeeId', options)}
                      onClear={() => clearAllocationFilter('employeeId')}
                      isOpen={allocationDropdowns.employeeId}
                      onToggle={() => toggleAllocationDropdown('employeeId')}
                      onClose={() => setAllocationDropdowns(prev => ({ ...prev, employeeId: false }))}
                      type="code"
                    />

                    <MultiSelectDropdown
                      label="Division"
                      options={divisions}
                      selectedValues={allocationFilters.division}
                      onChange={(value) => handleAllocationFilterChange('division', value)}
                      onSelectAll={(options) => selectAllAllocationFilters('division', options)}
                      onClear={() => clearAllocationFilter('division')}
                      isOpen={allocationDropdowns.division}
                      onToggle={() => toggleAllocationDropdown('division')}
                      onClose={() => setAllocationDropdowns(prev => ({ ...prev, division: false }))}
                    />

                    <MultiSelectDropdown
                      label="Location"
                      options={branches}
                      selectedValues={allocationFilters.location}
                      onChange={(value) => handleAllocationFilterChange('location', value)}
                      onSelectAll={(options) => selectAllAllocationFilters('location', options)}
                      onClear={() => clearAllocationFilter('location')}
                      isOpen={allocationDropdowns.location}
                      onToggle={() => toggleAllocationDropdown('location')}
                      onClose={() => setAllocationDropdowns(prev => ({ ...prev, location: false }))}
                    />

                    <MultiSelectDropdown
                      label="Status"
                      options={statuses}
                      selectedValues={allocationFilters.status}
                      onChange={(value) => handleAllocationFilterChange('status', value)}
                      onSelectAll={(options) => selectAllAllocationFilters('status', options)}
                      onClear={() => clearAllocationFilter('status')}
                      isOpen={allocationDropdowns.status}
                      onToggle={() => toggleAllocationDropdown('status')}
                      onClose={() => setAllocationDropdowns(prev => ({ ...prev, status: false }))}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedLocation !== 'All' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-sm">📍 Showing data for <strong>{selectedLocation}</strong> location
                <button onClick={() => setSelectedLocation('All')} className="ml-2 text-blue-500 hover:text-blue-700 underline text-xs">Show all locations</button>
              </p>
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-800">{selectedLocation === 'All' ? 'All Projects' : `${selectedLocation} Projects`}</h3>
                      <p className="text-gray-600 text-sm">
                        {getFilteredProjects().length} project(s)
                        {selectedLocation !== 'All' && <span className="ml-2 text-blue-600">• Filtered by {selectedLocation}</span>}
                        {hasActiveProjectFilters && <span className="ml-2 text-green-600">• With active filters</span>}
                      </p>
                    </div>
                    {/* {hasActiveProjectFilters && (
                      <button
                        onClick={clearProjectFilters}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex items-center gap-1"
                      >
                        <X size={14} />
                        Clear Filters
                      </button>
                    )} */}
                  </div>
                </div>

                {getFilteredProjects().length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-gray-400 text-6xl mb-4">🏗️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
                    <p className="text-gray-500">
                      {hasActiveProjectFilters || selectedLocation !== 'All'
                        ? "No projects match your current filters."
                        : "No projects available."
                      }
                    </p>
                    {(hasActiveProjectFilters || selectedLocation !== 'All') && (
                      <button onClick={() => { clearProjectFilters(); setSelectedLocation('All'); }} className="mt-3 px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1f204d] transition-colors text-sm">
                        Clear All Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto h-[480px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 ">
                        <tr className="bg-[#262760] text-white">
                          <th className="p-3 text-left text-sm font-semibold border-b">Project Code</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Project Name</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Project Category</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Division</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Location</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Start Date</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">End Date</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Status</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredProjects().map(project => (
                          <tr key={project._id || project.id} className="hover:bg-gray-50 border-b">
                            <td className="p-3">
                              <div className="font-mono text-sm font-semibold text-blue-600">{project.code}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-gray-900">{project.name}</div>
                            </td>
                            <td className="p-3">
                              {getCategoryBadge(project.projectCategory)}
                            </td>
                            <td className="p-3">
                              <div className="text-sm text-gray-600">{project.division}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-sm text-gray-600">{project.branch}</div>
                            </td>
                            <td className="p-3"><div className="text-sm text-gray-600">{formatDate(project.startDate)}</div></td>
                            <td className="p-3"><div className="text-sm text-gray-600">{formatDate(project.endDate)}</div></td>
                            <td className="p-3"><span className={getStatusBadge(project.status)}>{project.status}</span></td>
                            <td className="p-3">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => openViewModal(project, 'project')}
                                  className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                                  title="View"
                                >
                                  <Eye size={14} />
                                </button>
                                {canEdit && (
                                  <>
                                    <button
                                      onClick={() => openProjectModal(project)}
                                      className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                                      title="Edit"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button
                                      onClick={() => openDeleteProjectModal(project)}
                                      className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Allocations Tab */}
          {activeTab === 'allocations' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-teal-50 p-3 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-800">{selectedLocation === 'All' ? 'All Allocations' : `${selectedLocation} Allocations`}</h3>
                      <p className="text-gray-600 text-sm">
                        {getFilteredAllocations().length} allocation(s)
                        {selectedLocation !== 'All' && <span className="ml-2 text-blue-600">• Filtered by {selectedLocation}</span>}
                        {hasActiveAllocationFilters && <span className="ml-2 text-green-600">• With active filters</span>}
                      </p>
                    </div>
                    {/* {hasActiveAllocationFilters && (
                      <button
                        onClick={clearAllocationFilters}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex items-center gap-1"
                      >
                        <X size={14} />
                        Clear Filters
                      </button>
                    )} */}
                  </div>
                </div>

                {(() => {
                  const filteredAllocations = getFilteredAllocations();
                  if (filteredAllocations.length === 0) {
                    return (
                      <div className="p-8 text-center">
                        <div className="text-gray-400 text-6xl mb-4">👥</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Allocations Found</h3>
                        <p className="text-gray-500">
                          {hasActiveAllocationFilters || selectedLocation !== 'All'
                            ? "No allocations match your current filters."
                            : "No allocations available."
                          }
                        </p>
                        {(hasActiveAllocationFilters || selectedLocation !== 'All') && (
                          <button onClick={() => { clearAllocationFilters(); setSelectedLocation('All'); }} className="mt-3 px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1f204d] transition-colors text-sm">
                            Clear All Filters
                          </button>
                        )}
                      </div>
                    );
                  }

                  const groupedAllocationsMap = new Map();
                  filteredAllocations.forEach(alloc => {
                    const key = alloc.projectId || alloc.projectCode;
                    if (!groupedAllocationsMap.has(key)) {
                      groupedAllocationsMap.set(key, {
                        projectId: alloc.projectId,
                        projectCode: alloc.projectCode,
                        projectName: alloc.projectName,
                        projectCategory: alloc.projectCategory || 'Product',
                        division: alloc.projectDivision || alloc.division,
                        branch: alloc.branch,
                        status: alloc.status,
                        employees: [],
                        rawAllocation: alloc
                      });
                    }
                    groupedAllocationsMap.get(key).employees.push({
                      allocation: alloc,
                      name: alloc.employeeName,
                      code: alloc.employeeCode
                    });
                  });
                  const groupedAllocations = Array.from(groupedAllocationsMap.values());

                  return (
                    <div className="overflow-x-auto h-[480px] overflow-y-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr className="bg-[#262760] text-white">
                            <th className="p-3 text-left text-sm font-semibold border-b w-[10%]">Project Code</th>
                            <th className="p-3 text-left text-sm font-semibold border-b w-[15%]">Project Name</th>
                            <th className="p-3 text-left text-sm font-semibold border-b w-[12%]">Project Category</th>
                            <th className="p-3 text-left text-sm font-semibold border-b w-[10%]">Division</th>
                            <th className="p-3 text-left text-sm font-semibold border-b w-[30%]">Allocated Employees</th>
                            <th className="p-3 text-left text-sm font-semibold border-b w-[10%]">Location</th>
                            <th className="p-3 text-left text-sm font-semibold border-b w-[8%]">Status</th>
                            <th className="p-3 text-left text-sm font-semibold border-b w-[10%]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedAllocations.map(group => (
                            <tr key={group.projectId || group.projectCode} className="hover:bg-gray-50 border-b">
                              <td className="p-3 align-top">
                                <div className="font-mono text-sm font-semibold text-blue-600">{group.projectCode}</div>
                              </td>
                              <td className="p-3 align-top">
                                <div className="font-medium text-gray-900">{group.projectName}</div>
                              </td>
                              <td className="p-3 align-top">
                                {getCategoryBadge(group.projectCategory)}
                              </td>
                              <td className="p-3 align-top">
                                <div className="text-sm text-gray-600">{group.division}</div>
                              </td>
                              <td className="p-3 align-top">
                                <div className="flex flex-wrap gap-2">
                                  {group.employees.map(emp => (
                                    <span key={emp.allocation._id || emp.allocation.id || emp.code} className="inline-flex items-center px-2 py-1 bg-blue-50 text-[#262760] rounded-md text-xs font-medium border border-blue-100 shadow-sm">
                                      {emp.name} {emp.code ? `(${emp.code})` : ''}
                                      {canEdit && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); openDeleteAllocationModal(emp.allocation); }}
                                          className="ml-2 text-blue-400 hover:text-red-500 focus:outline-none transition-colors"
                                          title="Remove Allocation"
                                        >
                                          <X size={14} />
                                        </button>
                                      )}
                                    </span>
                                  ))}
                                  {group.employees.length === 0 && (
                                    <span className="text-gray-400 text-sm italic">No active employees</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 align-top">
                                <div className="text-sm text-gray-600">{group.branch}</div>
                              </td>
                              <td className="p-3 align-top">
                                <span className={getStatusBadge(group.status)}>{group.status}</span>
                              </td>
                              <td className="p-3 align-top">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => openViewModal(group.rawAllocation, 'allocation')}
                                    className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                                    title="View Details"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  {canEdit && (
                                    <button
                                      onClick={() => {
                                        setEditingAllocation(null);
                                        setAllocationForm({
                                          projectId: group.projectId || '',
                                          projectName: group.projectName,
                                          projectCategory: group.projectCategory || 'All',
                                          employeeName: '',
                                          employeeId: '',
                                          employeeIds: []
                                        });
                                        setShowAllocationModal(true);
                                      }}
                                      className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors flex items-center justify-center px-2"
                                      title="Add Employees to Project"
                                    >
                                      <span className="text-xs font-medium">+ Add</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* My Allocations Tab */}
          {activeTab === 'myAllocations' && !canEdit && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-800">{selectedLocation === 'All' ? 'My Project Allocations' : `My ${selectedLocation} Allocations`}</h3>
                      <p className="text-gray-600 text-sm">
                        {getMyFilteredAllocations().length} project allocation(s)
                        {selectedLocation !== 'All' && <span className="ml-2 text-blue-600">• Filtered by {selectedLocation}</span>}
                        {hasActiveAllocationFilters && <span className="ml-2 text-green-600">• With active filters</span>}
                      </p>
                    </div>
                    {hasActiveAllocationFilters && (
                      <button
                        onClick={clearAllocationFilters}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex items-center gap-1"
                      >
                        <X size={14} />
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>

                {getMyFilteredAllocations().length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-gray-400 text-6xl mb-4">📋</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Allocations Found</h3>
                    <p className="text-gray-500">
                      {hasActiveAllocationFilters || selectedLocation !== 'All'
                        ? "No allocations match your current filters."
                        : "You are not currently allocated to any projects."
                      }
                    </p>
                    <p className="text-sm text-gray-400 mt-2">Contact your Project Manager for project assignments.</p>
                    {(hasActiveAllocationFilters || selectedLocation !== 'All') && (
                      <button onClick={() => { clearAllocationFilters(); setSelectedLocation('All'); }} className="mt-3 px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1f204d] transition-colors text-sm">
                        Clear All Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto h-[480px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-[#262760] text-white">
                          <th className="p-3 text-left text-sm font-semibold border-b">Project Code</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Project Name</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Division</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Location</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Status</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Duration</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Assigned By</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getMyFilteredAllocations().map(allocation => (
                          <tr key={allocation._id || allocation.id} className="hover:bg-gray-50 border-b">
                            <td className="p-3">
                              <div className="text-sm text-blue-600 font-mono font-semibold">{allocation.projectCode}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-gray-900">{allocation.projectName}</div>
                            </td>
                            <td className="p-3">
                              {getCategoryBadge(allocation.projectCategory || 'Product')}
                            </td>
                            <td className="p-3">
                              <div className="text-sm text-gray-600">{allocation.projectDivision || allocation.division}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-sm text-gray-600">{allocation.branch}</div>
                            </td>
                            <td className="p-3">
                              <span className={getStatusBadge(allocation.status)}>{allocation.status}</span>
                            </td>
                            <td className="p-3">
                              <div className="text-sm text-gray-600">{formatDate(allocation.startDate)} to {formatDate(allocation.endDate)}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-sm text-gray-600">{allocation.assignedBy}</div>
                              <div className="text-xs text-gray-400">{formatDate(allocation.assignedDate)}</div>
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => openViewModal(allocation, 'allocation')}
                                className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                                title="View Details"
                              >
                                <Eye size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* View Details Modal */}
          {showViewModal && viewingItem && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {viewingItem.type === 'project' ? 'Project Details' : 'Allocation Details'}
                  </h3>
                </div>

                <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                  {viewingItem.type === 'project' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Code</label>
                        <p className="text-lg font-mono font-semibold text-blue-600">{viewingItem.code}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                        <p className="text-lg font-semibold text-gray-900">{viewingItem.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Category</label>
                        <div>{getCategoryBadge(viewingItem.projectCategory)}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                        <p className="text-gray-900">{viewingItem.division}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <p className="text-gray-900">{viewingItem.branch}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <p className="text-gray-900">{formatDate(viewingItem.startDate)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <p className="text-gray-900">{formatDate(viewingItem.endDate)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <span className={getStatusBadge(viewingItem.status)}>{viewingItem.status}</span>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <p className="text-gray-900">{viewingItem.description}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Code</label>
                        <p className="text-lg font-mono font-semibold text-blue-600">{viewingItem.projectCode}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                        <p className="text-lg font-semibold text-gray-900">{viewingItem.projectName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Category</label>
                        <div>{getCategoryBadge(viewingItem.projectCategory)}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                        <p className="text-gray-900">{viewingItem.projectDivision || viewingItem.division}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                        <p className="text-gray-900">{viewingItem.employeeName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                        <p className="font-mono text-gray-900">{viewingItem.employeeCode}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <p className="text-gray-900">{formatDate(viewingItem.startDate)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <p className="text-gray-900">{formatDate(viewingItem.endDate)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assigned By</label>
                        <p className="text-gray-900">{viewingItem.assignedBy}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Date</label>
                        <p className="text-gray-900">{formatDate(viewingItem.assignedDate)}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                  <button
                    onClick={closeViewModal}
                    className="px-6 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1f204d] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Project Modal */}
          {showProjectModal && canEdit && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900">{editingProject ? 'Edit Project' : 'Add New Project'}</h3>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Category *</label>
                    <select
                      value={projectForm.projectCategory}
                      onChange={(e) => {
                        const cat = e.target.value;
                        setProjectForm(prev => ({
                          ...prev,
                          projectCategory: cat,
                          name: cat === 'Non-Product' && (!prev.name || !NON_PRODUCT_ACTIVITIES.includes(prev.name)) ? NON_PRODUCT_ACTIVITIES[0] : prev.name
                        }));
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium text-gray-800"
                    >
                      <option value="Product">Product</option>
                      <option value="Non-Product">Non-Product</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Division *</label>
                    <select
                      value={projectForm.division}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, division: e.target.value }))}
                      className={`w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${editingProject ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      disabled={!!editingProject}
                    >
                      <option value="">Select Division</option>
                      {divisions.map(division => (
                        <option key={division} value={division}>{division}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {projectForm.projectCategory === 'Non-Product' ? 'Internal Activity Name *' : 'Project Name *'}
                    </label>
                    {projectForm.projectCategory === 'Non-Product' ? (
                      <div className="space-y-2">
                        <select
                          value={NON_PRODUCT_ACTIVITIES.includes(projectForm.name) ? projectForm.name : 'Others'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'Others') {
                              setProjectForm(prev => ({ ...prev, name: '' }));
                            } else {
                              setProjectForm(prev => ({ ...prev, name: val }));
                            }
                          }}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium text-gray-800"
                        >
                          {NON_PRODUCT_ACTIVITIES.map(act => (
                            <option key={act} value={act}>{act}</option>
                          ))}
                          <option value="Others">Others (Manual Entry)</option>
                        </select>
                        {(!NON_PRODUCT_ACTIVITIES.includes(projectForm.name) || projectForm.name === '') && (
                          <input
                            type="text"
                            value={projectForm.name}
                            onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter manual internal activity name"
                            required
                          />
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={projectForm.name}
                        onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter project name"
                        required
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                      <input type="date" value={projectForm.startDate} onChange={(e) => setProjectForm(prev => ({ ...prev, startDate: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                      <input type="date" value={projectForm.endDate} min={projectForm.startDate || undefined} onChange={(e) => setProjectForm(prev => ({ ...prev, endDate: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                      <select value={projectForm.branch} onChange={(e) => setProjectForm(prev => ({ ...prev, branch: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Select Location</option>
                        <option value="Hosur">Hosur</option>
                        <option value="Chennai">Chennai</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select value={projectForm.status} onChange={(e) => setProjectForm(prev => ({ ...prev, status: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  {!editingProject && projectForm.division && projectForm.name && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-700"><strong>Project Code:</strong> {generateProjectCode(projectForm.division)}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                  <button onClick={closeProjectModal} className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
                  <button onClick={handleProjectSave} className="px-6 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1f204d] transition-colors">{editingProject ? 'Update' : 'Create'}</button>
                </div>
              </div>
            </div>
          )}

          {/* Allocation Modal */}
          {showAllocationModal && canEdit && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900">{editingAllocation ? 'Edit Allocation' : 'Allocate Resource'}</h3>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Category</label>
                    <select
                      value={allocationForm.projectCategory || 'All'}
                      onChange={(e) => {
                        const cat = e.target.value;
                        setAllocationForm(prev => ({
                          ...prev,
                          projectCategory: cat,
                          projectId: '',
                          projectName: ''
                        }));
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium text-gray-800"
                    >
                      <option value="All">All Categories (Product & Non-Product)</option>
                      <option value="Product">Product Only</option>
                      <option value="Non-Product">Non-Product Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Name *</label>
                    <SearchableSelect
                      value={allocationForm.projectId}
                      placeholder="Select Project"
                      options={getActiveProjectsSorted()
                        .filter(project => {
                          if (!allocationForm.projectCategory || allocationForm.projectCategory === 'All') return true;
                          return String(project.projectCategory || 'Product').trim().toLowerCase() === String(allocationForm.projectCategory).trim().toLowerCase();
                        })
                        .map(project => ({
                          value: project._id || project.id,
                          label: `${project.name} (${project.code}) - [${project.projectCategory || 'Product'}] - ${project.division}`,
                          searchText: `${project.name} ${project.code} ${project.projectCategory || 'Product'} ${project.division}`
                        }))
                      }
                      onChange={(projectId) => {
                        const selectedProject = projects.find(p => String(p._id || p.id) === String(projectId));
                        setAllocationForm(prev => ({
                          ...prev,
                          projectId,
                          projectName: selectedProject?.name || '',
                          projectCategory: selectedProject?.projectCategory || prev.projectCategory || 'All'
                        }));
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee Name *</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <SearchableSelect
                          value={allocationForm.employeeId}
                          placeholder="Select Employee"
                          options={getAllEmployeesSorted().map(employee => ({
                            value: employee.employeeId,
                            label: `${employee.name}${employee.employeeId ? ` (${employee.employeeId})` : ''}`,
                            searchText: `${employee.name} ${employee.employeeId || ''}`
                          }))}
                          onChange={(employeeId) => handleEmployeeSelect(employeeId)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addEmployeeToList}
                        className="px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1f204d] text-sm"
                        disabled={!allocationForm.employeeId}
                      >
                        Add
                      </button>
                    </div>
                    {allocationForm.employeeIds.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {allocationForm.employeeIds.map(code => {
                          const emp = employees.find(e => e.employeeId === code);
                          return (
                            <div
                              key={code}
                              className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                            >
                              <span className="text-sm text-gray-700">
                                {(emp && emp.name) || 'Employee'} {code ? `(${code})` : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeEmployeeFromList(code)}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                    <input
                      type="text"
                      value={allocationForm.employeeIds.join(', ')}
                      readOnly
                      className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Added employees will appear below"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                  <button onClick={closeAllocationModal} className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
                  <button onClick={handleAllocate} className="px-6 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1f204d] transition-colors">{editingAllocation ? 'Update' : 'Allocate'}</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProjectAllocation;
