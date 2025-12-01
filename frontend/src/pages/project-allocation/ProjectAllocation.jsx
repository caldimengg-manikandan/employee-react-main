import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Eye, Building2, Users, Target, Filter, X, ChevronDown } from 'lucide-react';
import { employeeAPI, projectAPI, allocationAPI } from '../../services/api';

const ProjectAllocation = () => {
  // Get user from sessionStorage
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isProjectManager = user.role === 'project_manager' || user.role === 'admin';
  const canEdit = isProjectManager;

  // UI state
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [branches] = useState(['Hosur', 'Chennai', 'Outside Det.']);
  const [divisions] = useState(['SDS', 'TEKLA', 'DAS', 'Mechanical']);
  const [roles] = useState(['Modeler', 'Editor', 'Backdrafting', 'Checker', 'Estimator', 'Documentation', 'Project Lead']);
  const [statuses] = useState(['Active', 'Completed']);

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
    division: [],
    location: [],
    status: []
  });
  const [allocationFilters, setAllocationFilters] = useState({
    projectCode: [],
    projectName: [],
    employeeId: [],
    division: [],
    location: [],
    status: []
  });

  // Dropdown open states
  const [projectDropdowns, setProjectDropdowns] = useState({
    projectCode: false,
    projectName: false,
    division: false,
    location: false,
    status: false
  });
  const [allocationDropdowns, setAllocationDropdowns] = useState({
    projectCode: false,
    projectName: false,
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
        setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
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
    division: '',
    branch: '',
    startDate: '',
    endDate: '',
    status: 'Active'
  });

  const [allocationForm, setAllocationForm] = useState({
    division: '',
    projectName: '',
    employeeName: '',
    employeeId: ''
  });

  // Filter handlers
  const handleProjectFilterChange = (field, value) => {
    setProjectFilters(prev => ({
      ...prev,
      [field]: prev[field].includes(value) 
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const handleAllocationFilterChange = (field, value) => {
    setAllocationFilters(prev => ({
      ...prev,
      [field]: prev[field].includes(value) 
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
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
      division: [],
      location: [],
      status: []
    });
  };

  const clearAllocationFilters = () => {
    setAllocationFilters({
      projectCode: [],
      projectName: [],
      employeeId: [],
      division: [],
      location: [],
      status: []
    });
  };

  const clearAllFilters = () => {
    clearProjectFilters();
    clearAllocationFilters();
  };

  // Dropdown handlers
  const toggleProjectDropdown = (field) => {
    setProjectDropdowns(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const toggleAllocationDropdown = (field) => {
    setAllocationDropdowns(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Close all dropdowns
  const closeAllDropdowns = () => {
    setProjectDropdowns({
      projectCode: false,
      projectName: false,
      division: false,
      location: false,
      status: false
    });
    setAllocationDropdowns({
      projectCode: false,
      projectName: false,
      employeeId: false,
      division: false,
      location: false,
      status: false
    });
  };

  // Get unique values for filter options
  const getUniqueProjectCodes = () => {
    return [...new Set(projects.map(p => p.code))].filter(Boolean);
  };

  const getUniqueProjectNames = () => {
    return [...new Set(projects.map(p => p.name))].filter(Boolean);
  };

  const getUniqueEmployeeIds = () => {
    return [...new Set(allocations.map(a => a.employeeCode))].filter(Boolean);
  };

  // Filter functions
  const filterProjects = (projects) => {
    return projects.filter(project => {
      const matchesCode = projectFilters.projectCode.length === 0 || 
        projectFilters.projectCode.includes(project.code);
      const matchesName = projectFilters.projectName.length === 0 || 
        projectFilters.projectName.includes(project.name);
      const matchesDivision = projectFilters.division.length === 0 || 
        projectFilters.division.includes(project.division);
      const matchesLocation = projectFilters.location.length === 0 || 
        projectFilters.location.includes(project.branch);
      const matchesStatus = projectFilters.status.length === 0 || 
        projectFilters.status.includes(project.status);

      return matchesCode && matchesName && matchesDivision && matchesLocation && matchesStatus;
    });
  };

  const filterAllocations = (allocations) => {
    return allocations.filter(allocation => {
      const matchesCode = allocationFilters.projectCode.length === 0 || 
        allocationFilters.projectCode.includes(allocation.projectCode);
      const matchesName = allocationFilters.projectName.length === 0 || 
        allocationFilters.projectName.includes(allocation.projectName);
      const matchesEmployeeId = allocationFilters.employeeId.length === 0 || 
        allocationFilters.employeeId.includes(allocation.employeeCode);
      const matchesDivision = allocationFilters.division.length === 0 || 
        allocationFilters.division.includes(allocation.projectDivision || allocation.division);
      const matchesLocation = allocationFilters.location.length === 0 || 
        allocationFilters.location.includes(allocation.branch);
      const matchesStatus = allocationFilters.status.length === 0 || 
        allocationFilters.status.includes(allocation.status);

      return matchesCode && matchesName && matchesEmployeeId && matchesDivision && matchesLocation && matchesStatus;
    });
  };

  // Filtered projects based on selected division
  const getFilteredProjectsByDivision = () => {
    if (!allocationForm.division) return [];
    return projects.filter(project => project.division === allocationForm.division);
  };

  // Filtered employees based on selected division
  const getFilteredEmployeesByDivision = () => {
    if (!allocationForm.division) return [];
    return employees.filter(employee => employee.division === allocationForm.division);
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
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
    } catch (e) {
      console.error('Failed to refresh data from MongoDB:', e);
      alert('Failed to refresh data from database.');
    }
  };

  // Calculate current user's allocations
  const myAllocations = allocations.filter(alloc => {
    if (!user) return false;
    if (user.id && Number(user.id) === Number(alloc.employeeId)) return true;
    if (user.employeeId && String(user.employeeId) === String(alloc.employeeCode)) return true;
    if (user.name && String(user.name).toLowerCase() === String(alloc.employeeName).toLowerCase()) return true;
    return false;
  });

  // Utility functions
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-semibold";
    switch ((status || '').toLowerCase()) {
      case 'active': return `${baseClasses} bg-green-100 text-green-800`;
      case 'completed': return `${baseClasses} bg-gray-100 text-gray-800`;
      default: return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  // Generate project code based on division
  const generateProjectCode = (division) => {
    const prefixMap = {
      'SDS': 'CDE-SDS',
      'TEKLA': 'CDE-TEK',
      'DAS': 'CDE-DAS',
      'Mechanical': 'CDE-MEC'
    };
    
    const prefix = prefixMap[division] || 'PROJ';
    const existingCodes = projects
      .filter(p => p.division === division)
      .map(p => {
        const match = p.code.match(new RegExp(`^${prefix}-(\\d+)$`));
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => num > 0);
    
    const nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
    return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
  };

  // Filter helpers with location filter
  const getFilteredProjects = () => {
    let filtered = projects;
    
    // Apply location filter
    if (selectedLocation !== 'All') {
      filtered = filtered.filter(p => p.branch === selectedLocation);
    }
    
    // Apply other filters
    return filterProjects(filtered);
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
    type = 'text'
  }) => {
    const allSelected = selectedValues.length === options.length;

    return (
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="relative">
          <button
            type="button"
            onClick={onToggle}
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
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
              <div className="p-2 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => onSelectAll(allSelected ? [] : options)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedValues.length > 0 && (
                    <button
                      type="button"
                      onClick={onClear}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {options.map(option => (
                  <label key={option} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(option)}
                      onChange={() => onChange(option)}
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-sm ${type === 'code' ? 'font-mono' : ''}`}>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
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
      alert("You don't have permission to manage projects. Please contact Project Manager or Admin.");
      return;
    }
    
    if (project) {
      setEditingProject(project);
      setProjectForm({
        name: project.name,
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
    if (!projectForm.name || !projectForm.division || !projectForm.branch || !projectForm.startDate || !projectForm.endDate) {
      alert("Please fill all required fields.");
      return;
    }

    const projectCode = editingProject ? editingProject.code : generateProjectCode(projectForm.division);

    const payload = {
      name: projectForm.name,
      code: projectCode,
      division: projectForm.division,
      branch: projectForm.branch,
      startDate: projectForm.startDate,
      endDate: projectForm.endDate,
      status: projectForm.status,
      description: editingProject ? editingProject.description || `${projectForm.name} project` : `${projectForm.name} project`,
    };

    try {
      if (editingProject && editingProject._id) {
        await projectAPI.updateProject(editingProject._id, payload);
      } else {
        await projectAPI.createProject(payload);
      }
      await refreshData();
      closeProjectModal();
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to save project');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!canEdit) {
      alert("You don't have permission to delete projects.");
      return;
    }

    if (!confirm("Are you sure you want to delete this project? This will also remove all associated allocations.")) {
      return;
    }

    try {
      await projectAPI.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p._id !== projectId));
      setAllocations(prev => prev.filter(a => String(a.projectId) !== String(projectId)));
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to delete project');
    }
  };

  // Allocation modal handlers
  const openAllocationModal = (allocation = null) => {
    if (!canEdit && allocation) {
      openViewModal(allocation, 'allocation');
      return;
    }
    
    if (!canEdit) {
      alert("You don't have permission to edit allocations. Please contact Project Manager or Admin.");
      return;
    }
    
    if (allocation) {
      setEditingAllocation(allocation);
      setAllocationForm({
        division: allocation.projectDivision || allocation.division || '',
        projectName: allocation.projectName,
        employeeName: allocation.employeeName,
        employeeId: allocation.employeeCode || allocation.employeeId || ''
      });
    } else {
      setEditingAllocation(null);
      setAllocationForm({
        division: '',
        projectName: '',
        employeeName: '',
        employeeId: ''
      });
    }
    setShowAllocationModal(true);
  };

  const closeAllocationModal = () => {
    setShowAllocationModal(false);
    setEditingAllocation(null);
  };

  // Handle employee selection
  const handleEmployeeSelect = (employeeName) => {
    const selectedEmployee = employees.find(emp => emp.name === employeeName);
    if (selectedEmployee) {
      setAllocationForm(prev => ({
        ...prev,
        employeeName: selectedEmployee.name,
        employeeId: selectedEmployee.employeeId || selectedEmployee.id || ''
      }));
    }
  };

  const handleAllocate = async () => {
    if (!allocationForm.division || !allocationForm.projectName || !allocationForm.employeeName) {
      alert("Please fill all required fields.");
      return;
    }

    // Find project by name and division
    const project = projects.find(p => 
      p.name === allocationForm.projectName && 
      p.division === allocationForm.division
    );

    // Find employee by name
    const employee = employees.find(e => 
      e.name === allocationForm.employeeName
    );

    if (!project) {
      alert("Project not found. Please check the project name and division.");
      return;
    }

    if (!employee) {
      alert("Employee not found. Please check the employee name.");
      return;
    }

    const payload = {
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
      // Preserve existing role when editing, or set empty for new allocations
      role: editingAllocation ? (editingAllocation.role || '') : ''
    };

    try {
      if (editingAllocation && editingAllocation._id) {
        await allocationAPI.updateAllocation(editingAllocation._id, payload);
      } else {
        await allocationAPI.createAllocation(payload);
      }
      await refreshData();
      closeAllocationModal();
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to save allocation');
    }
  };

  const handleDeleteAllocation = async (allocationId) => {
    if (!canEdit) {
      alert("You don't have permission to delete allocations.");
      return;
    }

    if (!confirm("Are you sure you want to delete this allocation?")) {
      return;
    }

    try {
      await allocationAPI.deleteAllocation(allocationId);
      setAllocations(prev => prev.filter(a => a._id !== allocationId));
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to delete allocation');
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
          

          {/* Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'projects' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
                >
                  <Building2 size={16} />
                  Projects
                </button>
                <button
                  onClick={() => setActiveTab('allocations')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'allocations' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
                >
                  <Users size={16} />
                  Allocations
                </button>
                {!canEdit && (
                  <button
                    onClick={() => setActiveTab('myAllocations')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'myAllocations' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
                  >
                    <Target size={16} />
                    My Allocations
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-4">
               

                {/* Filter Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFilters(!showFilters);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    showFilters ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Filter size={16} />
                  Filters
                  {(hasActiveProjectFilters || hasActiveAllocationFilters) && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      !
                    </span>
                  )}
                </button>

                {canEdit && (
                  <button
                    onClick={() => activeTab === 'projects' ? openProjectModal() : openAllocationModal()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    {activeTab === 'projects' ? (
                      <>
                        <Building2 size={16} />
                        Add Project
                      </>
                    ) : (
                      <>
                        <Users size={16} />
                        Allocate
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200" onClick={(e) => e.stopPropagation()}>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <MultiSelectDropdown
                      label="Project Code"
                      options={getUniqueProjectCodes()}
                      selectedValues={projectFilters.projectCode}
                      onChange={(value) => handleProjectFilterChange('projectCode', value)}
                      onSelectAll={(options) => selectAllProjectFilters('projectCode', options)}
                      onClear={() => clearProjectFilter('projectCode')}
                      isOpen={projectDropdowns.projectCode}
                      onToggle={(e) => {
                        e.stopPropagation();
                        toggleProjectDropdown('projectCode');
                      }}
                      type="code"
                    />

                    <MultiSelectDropdown
                      label="Project Name"
                      options={getUniqueProjectNames()}
                      selectedValues={projectFilters.projectName}
                      onChange={(value) => handleProjectFilterChange('projectName', value)}
                      onSelectAll={(options) => selectAllProjectFilters('projectName', options)}
                      onClear={() => clearProjectFilter('projectName')}
                      isOpen={projectDropdowns.projectName}
                      onToggle={(e) => {
                        e.stopPropagation();
                        toggleProjectDropdown('projectName');
                      }}
                    />

                    <MultiSelectDropdown
                      label="Division"
                      options={divisions}
                      selectedValues={projectFilters.division}
                      onChange={(value) => handleProjectFilterChange('division', value)}
                      onSelectAll={(options) => selectAllProjectFilters('division', options)}
                      onClear={() => clearProjectFilter('division')}
                      isOpen={projectDropdowns.division}
                      onToggle={(e) => {
                        e.stopPropagation();
                        toggleProjectDropdown('division');
                      }}
                    />

                    <MultiSelectDropdown
                      label="Location"
                      options={branches}
                      selectedValues={projectFilters.location}
                      onChange={(value) => handleProjectFilterChange('location', value)}
                      onSelectAll={(options) => selectAllProjectFilters('location', options)}
                      onClear={() => clearProjectFilter('location')}
                      isOpen={projectDropdowns.location}
                      onToggle={(e) => {
                        e.stopPropagation();
                        toggleProjectDropdown('location');
                      }}
                    />

                    <MultiSelectDropdown
                      label="Status"
                      options={statuses}
                      selectedValues={projectFilters.status}
                      onChange={(value) => handleProjectFilterChange('status', value)}
                      onSelectAll={(options) => selectAllProjectFilters('status', options)}
                      onClear={() => clearProjectFilter('status')}
                      isOpen={projectDropdowns.status}
                      onToggle={(e) => {
                        e.stopPropagation();
                        toggleProjectDropdown('status');
                      }}
                    />
                  </div>
                )}

                {(activeTab === 'allocations' || activeTab === 'myAllocations') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <MultiSelectDropdown
                      label="Project Code"
                      options={getUniqueProjectCodes()}
                      selectedValues={allocationFilters.projectCode}
                      onChange={(value) => handleAllocationFilterChange('projectCode', value)}
                      onSelectAll={(options) => selectAllAllocationFilters('projectCode', options)}
                      onClear={() => clearAllocationFilter('projectCode')}
                      isOpen={allocationDropdowns.projectCode}
                      onToggle={(e) => {
                        e.stopPropagation();
                        toggleAllocationDropdown('projectCode');
                      }}
                      type="code"
                    />

                    <MultiSelectDropdown
                      label="Project Name"
                      options={getUniqueProjectNames()}
                      selectedValues={allocationFilters.projectName}
                      onChange={(value) => handleAllocationFilterChange('projectName', value)}
                      onSelectAll={(options) => selectAllAllocationFilters('projectName', options)}
                      onClear={() => clearAllocationFilter('projectName')}
                      isOpen={allocationDropdowns.projectName}
                      onToggle={(e) => {
                        e.stopPropagation();
                        toggleAllocationDropdown('projectName');
                      }}
                    />

                    <MultiSelectDropdown
                      label="Employee ID"
                      options={getUniqueEmployeeIds()}
                      selectedValues={allocationFilters.employeeId}
                      onChange={(value) => handleAllocationFilterChange('employeeId', value)}
                      onSelectAll={(options) => selectAllAllocationFilters('employeeId', options)}
                      onClear={() => clearAllocationFilter('employeeId')}
                      isOpen={allocationDropdowns.employeeId}
                      onToggle={(e) => {
                        e.stopPropagation();
                        toggleAllocationDropdown('employeeId');
                      }}
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
                      onToggle={(e) => {
                        e.stopPropagation();
                        toggleAllocationDropdown('division');
                      }}
                    />

                    <MultiSelectDropdown
                      label="Location"
                      options={branches}
                      selectedValues={allocationFilters.location}
                      onChange={(value) => handleAllocationFilterChange('location', value)}
                      onSelectAll={(options) => selectAllAllocationFilters('location', options)}
                      onClear={() => clearAllocationFilter('location')}
                      isOpen={allocationDropdowns.location}
                      onToggle={(e) => {
                        e.stopPropagation();
                        toggleAllocationDropdown('location');
                      }}
                    />

                    <MultiSelectDropdown
                      label="Status"
                      options={statuses}
                      selectedValues={allocationFilters.status}
                      onChange={(value) => handleAllocationFilterChange('status', value)}
                      onSelectAll={(options) => selectAllAllocationFilters('status', options)}
                      onClear={() => clearAllocationFilter('status')}
                      isOpen={allocationDropdowns.status}
                      onToggle={(e) => {
                        e.stopPropagation();
                        toggleAllocationDropdown('status');
                      }}
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
                    {hasActiveProjectFilters && (
                      <button
                        onClick={clearProjectFilters}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex items-center gap-1"
                      >
                        <X size={14} />
                        Clear Filters
                      </button>
                    )}
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
                      <button onClick={() => { clearProjectFilters(); setSelectedLocation('All'); }} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        Clear All Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="p-3 text-left text-sm font-semibold border-b">Project Code</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Project Name</th>
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
                                      onClick={() => handleDeleteProject(project._id || project.id)} 
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

                {getFilteredAllocations().length === 0 ? (
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
                      <button onClick={() => { clearAllocationFilters(); setSelectedLocation('All'); }} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        Clear All Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="p-3 text-left text-sm font-semibold border-b">Project Code</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Project Name</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Division</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Employee Name</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Employee ID</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Location</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Status</th>
                          <th className="p-3 text-left text-sm font-semibold border-b">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredAllocations().map(allocation => (
                          <tr key={allocation._id || allocation.id} className="hover:bg-gray-50 border-b">
                            <td className="p-3">
                              <div className="font-mono text-sm font-semibold text-blue-600">{allocation.projectCode}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-gray-900">{allocation.projectName}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-sm text-gray-600">{allocation.projectDivision || allocation.division}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-gray-900">{allocation.employeeName}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-sm font-mono text-gray-500">{allocation.employeeCode}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-sm text-gray-600">{allocation.branch}</div>
                            </td>
                            <td className="p-3">
                              <span className={getStatusBadge(allocation.status)}>{allocation.status}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => openViewModal(allocation, 'allocation')} 
                                  className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors" 
                                  title="View"
                                >
                                  <Eye size={14} />
                                </button>
                                {canEdit && (
                                  <>
                                    <button 
                                      onClick={() => openAllocationModal(allocation)} 
                                      className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors" 
                                      title="Edit"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteAllocation(allocation._id || allocation.id)} 
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
                      <button onClick={() => { clearAllocationFilters(); setSelectedLocation('All'); }} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        Clear All Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
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
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Division *</label>
                    <select 
                      value={projectForm.division} 
                      onChange={(e) => setProjectForm(prev => ({ ...prev, division: e.target.value }))} 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Division</option>
                      {divisions.map(division => (
                        <option key={division} value={division}>{division}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Name *</label>
                    <input 
                      type="text" 
                      value={projectForm.name} 
                      onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))} 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      placeholder="Enter project name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                      <input type="date" value={projectForm.startDate} onChange={(e) => setProjectForm(prev => ({ ...prev, startDate: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                      <input type="date" value={projectForm.endDate} onChange={(e) => setProjectForm(prev => ({ ...prev, endDate: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
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
                  <button onClick={handleProjectSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">{editingProject ? 'Update' : 'Create'}</button>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Division *</label>
                    <select 
                      value={allocationForm.division} 
                      onChange={(e) => setAllocationForm(prev => ({ ...prev, division: e.target.value, projectName: '', employeeName: '', employeeId: '' }))} 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Division</option>
                      {divisions.map(division => (
                        <option key={division} value={division}>{division}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Name *</label>
                    <select 
                      value={allocationForm.projectName} 
                      onChange={(e) => setAllocationForm(prev => ({ ...prev, projectName: e.target.value }))} 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={!allocationForm.division}
                    >
                      <option value="">Select Project</option>
                      {getFilteredProjectsByDivision().map(project => (
                        <option key={project._id} value={project.name}>
                          {project.name} ({project.code})
                        </option>
                      ))}
                    </select>
                    {!allocationForm.division && (
                      <p className="text-sm text-gray-500 mt-1">Please select a division first</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee Name *</label>
                    <select 
                      value={allocationForm.employeeName} 
                      onChange={(e) => handleEmployeeSelect(e.target.value)} 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={!allocationForm.division}
                    >
                      <option value="">Select Employee</option>
                      {getFilteredEmployeesByDivision().map(employee => (
                        <option key={employee._id} value={employee.name}>
                          {employee.name} {employee.employeeId ? `(${employee.employeeId})` : ''}
                        </option>
                      ))}
                    </select>
                    {!allocationForm.division && (
                      <p className="text-sm text-gray-500 mt-1">Please select a division first</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                    <input 
                      type="text" 
                      value={allocationForm.employeeId} 
                      readOnly
                      className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      placeholder="Employee ID will be auto-filled"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                  <button onClick={closeAllocationModal} className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
                  <button onClick={handleAllocate} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">{editingAllocation ? 'Update' : 'Allocate'}</button>
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