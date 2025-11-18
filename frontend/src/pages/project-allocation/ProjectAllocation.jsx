import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Eye, Building2, Users, Target } from 'lucide-react';
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
  const [divisions] = useState(['SDS (Steel Detailing)', 'Tekla Projects', 'DAS (Software)', 'Mechanical Projects']);

  // Session Storage Keys
  const STORAGE_KEYS = {
    projects: 'projectAllocation_projects',
    employees: 'projectAllocation_employees', 
    allocations: 'projectAllocation_allocations',
  };

  // Initialize data from sessionStorage or set defaults
  const [projects, setProjects] = useState(() => {
    const saved = sessionStorage.getItem(STORAGE_KEYS.projects);
    if (saved) {
      return JSON.parse(saved);
    }
    // Default projects
    return [
      {
        id: 1,
        name: "1250 Maryland Avenue",
        code: "SDS-001",
        division: "SDS (Steel Detailing)",
        branch: "Hosur",
        startDate: "2025-01-01",
        endDate: "2025-06-30",
        status: "Active",
        description: "Commercial building construction project"
      },
      {
        id: 2,
        name: "NJTP CDL Training Course",
        code: "SDS-002",
        division: "SDS (Steel Detailing)",
        branch: "Chennai",
        startDate: "2025-01-15",
        endDate: "2025-07-15",
        status: "Active",
        description: "Training center development"
      },
      {
        id: 3,
        name: "CALDIM Employee Portal",
        code: "DAS-001",
        division: "DAS (Software)",
        branch: "Hosur",
        startDate: "2025-02-01",
        endDate: "2025-08-31",
        status: "Active",
        description: "Internal employee management system"
      }
    ];
  });

  const [employees, setEmployees] = useState(() => {
    const saved = sessionStorage.getItem(STORAGE_KEYS.employees);
    if (saved) {
      return JSON.parse(saved);
    }
    // Default employees
    return [
      {
        id: 1,
        employeeId: "EMP001",
        name: "Raj Kumar",
        branch: "Hosur",
        department: "Engineering",
        position: "Senior Structural Engineer",
        email: "raj.kumar@caldim.com",
        currentAllocation: 80,
        status: "Active"
      },
      {
        id: 2,
        employeeId: "EMP002",
        name: "Priya Sharma",
        branch: "Chennai",
        department: "Engineering",
        position: "Structural Engineer",
        email: "priya.sharma@caldim.com",
        currentAllocation: 100,
        status: "Active"
      },
      {
        id: 3,
        employeeId: "EMP003",
        name: "Amit Patel",
        branch: "Hosur",
        department: "IT",
        position: "Software Developer",
        email: "amit.patel@caldim.com",
        currentAllocation: 60,
        status: "Active"
      }
    ];
  });

  const [allocations, setAllocations] = useState(() => {
    const saved = sessionStorage.getItem(STORAGE_KEYS.allocations);
    if (saved) {
      return JSON.parse(saved);
    }
    // Default allocations
    return [
      {
        id: 1,
        projectId: 1,
        projectName: "1250 Maryland Avenue",
        projectCode: "SDS-001",
        projectDivision: "SDS (Steel Detailing)",
        branch: "Hosur",
        employeeId: 1,
        employeeName: "Raj Kumar",
        employeeCode: "EMP001",
        allocationPercentage: 80,
        startDate: "2025-01-01",
        endDate: "2025-06-30",
        status: "Active",
        allocatedHours: 32,
        role: "Lead Structural Engineer",
        assignedBy: "Project Manager",
        assignedDate: "2024-12-15"
      },
      {
        id: 2,
        projectId: 3,
        projectName: "CALDIM Employee Portal",
        projectCode: "DAS-001",
        projectDivision: "DAS (Software)",
        branch: "Hosur",
        employeeId: 3,
        employeeName: "Amit Patel",
        employeeCode: "EMP003",
        allocationPercentage: 60,
        startDate: "2025-02-01",
        endDate: "2025-08-31",
        status: "Active",
        allocatedHours: 24,
        role: "Full Stack Developer",
        assignedBy: "Project Manager",
        assignedDate: "2024-12-20"
      }
    ];
  });

  useEffect(() => {
    const loadData = async () => {
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
    status: 'Planning'
  });

  const [allocationForm, setAllocationForm] = useState({
    division: '',
    projectName: '',
    employeeName: '',
    allocationPercentage: 100,
    role: ''
  });

  // Save to sessionStorage whenever data changes
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.employees, JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.allocations, JSON.stringify(allocations));
  }, [allocations]);

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
      case 'planning': return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'completed': return `${baseClasses} bg-gray-100 text-gray-800`;
      default: return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  // Generate project code based on division
  const generateProjectCode = (division) => {
    const prefixMap = {
      'SDS (Steel Detailing)': 'SDS',
      'Tekla Projects': 'TKP',
      'DAS (Software)': 'DAS',
      'Mechanical Projects': 'MEC'
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

  // Filter helpers
  const getFilteredProjects = () => {
    if (selectedLocation === 'All') return projects;
    return projects.filter(p => p.branch === selectedLocation);
  };

  const getFilteredAllocations = () => {
    if (selectedLocation === 'All') return allocations;
    return allocations.filter(a => a.branch === selectedLocation);
  };

  const getMyFilteredAllocations = () => {
    if (selectedLocation === 'All') return myAllocations;
    return myAllocations.filter(a => a.branch === selectedLocation);
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
        status: project.status || 'Planning'
      });
    } else {
      setEditingProject(null);
      setProjectForm({
        name: '',
        division: '',
        branch: '',
        startDate: '',
        endDate: '',
        status: 'Planning'
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
        const res = await projectAPI.updateProject(editingProject._id, payload);
        setProjects(prev => prev.map(p => p._id === editingProject._id ? res.data : p));
      } else {
        const res = await projectAPI.createProject(payload);
        setProjects(prev => [...prev, res.data]);
      }
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
        division: allocation.projectDivision,
        projectName: allocation.projectName,
        employeeName: allocation.employeeName,
        allocationPercentage: Number(allocation.allocationPercentage),
        role: allocation.role || ''
      });
    } else {
      setEditingAllocation(null);
      setAllocationForm({
        division: '',
        projectName: '',
        employeeName: '',
        allocationPercentage: 100,
        role: ''
      });
    }
    setShowAllocationModal(true);
  };

  const closeAllocationModal = () => {
    setShowAllocationModal(false);
    setEditingAllocation(null);
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
      String(e.name).toLowerCase() === String(allocationForm.employeeName).toLowerCase()
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
      employeeName: employee.name,
      allocationPercentage: 100,
      startDate: project.startDate,
      endDate: project.endDate,
      branch: project.branch,
      status: 'Active',
      allocatedHours: 40,
      role: employee.position || allocationForm.role || '',
      assignedBy: user.name || 'System',
      assignedDate: new Date().toISOString().split('T')[0],
    };

    try {
      if (editingAllocation && editingAllocation._id) {
        await allocationAPI.deleteAllocation(editingAllocation._id);
      }
      const res = await allocationAPI.createAllocation(payload);
      if (editingAllocation && editingAllocation._id) {
        setAllocations(prev => prev.map(a => a._id === editingAllocation._id ? res.data : a));
      } else {
        setAllocations(prev => [...prev, res.data]);
      }
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Project Allocation</h1>
        <p className="text-gray-600">
          {canEdit
            ? "Manage projects and team allocations"
            : "View your project allocations and team information"
          }
          {!canEdit && (
            <span className="block text-sm text-blue-600 mt-1">
              🔒 Read-only access - Contact Project Manager for changes
            </span>
          )}
        </p>
      </div>

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
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button onClick={() => setSelectedLocation('All')} className={`px-3 py-1 rounded-md text-sm font-medium ${selectedLocation === 'All' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>All Locations</button>
              <button onClick={() => setSelectedLocation('Hosur')} className={`px-3 py-1 rounded-md text-sm font-medium ${selectedLocation === 'Hosur' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>Hosur</button>
              <button onClick={() => setSelectedLocation('Chennai')} className={`px-3 py-1 rounded-md text-sm font-medium ${selectedLocation === 'Chennai' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>Chennai</button>
            </div>

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
              <h3 className="font-semibold text-gray-800">{selectedLocation === 'All' ? 'All Projects' : `${selectedLocation} Projects`}</h3>
              <p className="text-gray-600 text-sm">{getFilteredProjects().length} project(s){selectedLocation !== 'All' && <span className="ml-2 text-blue-600">• Filtered by {selectedLocation}</span>}</p>
            </div>

            {getFilteredProjects().length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 text-6xl mb-4">🏗️</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
                <p className="text-gray-500">{selectedLocation === 'All' ? "No projects available." : `No projects found for ${selectedLocation} location.`}</p>
                {selectedLocation !== 'All' && <button onClick={() => setSelectedLocation('All')} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">View All Projects</button>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-3 text-left text-sm font-semibold border-b">Project Code</th>
                      <th className="p-3 text-left text-sm font-semibold border-b">Project Name</th>
                      <th className="p-3 text-left text-sm font-semibold border-b">Division</th>
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
              <h3 className="font-semibold text-gray-800">{selectedLocation === 'All' ? 'All Allocations' : `${selectedLocation} Allocations`}</h3>
              <p className="text-gray-600 text-sm">{getFilteredAllocations().length} allocation(s){selectedLocation !== 'All' && <span className="ml-2 text-blue-600">• Filtered by {selectedLocation}</span>}</p>
            </div>

            {getFilteredAllocations().length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 text-6xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Allocations Found</h3>
                <p className="text-gray-500">{selectedLocation === 'All' ? "No allocations available." : `No allocations found for ${selectedLocation} location.`}</p>
                {selectedLocation !== 'All' && <button onClick={() => setSelectedLocation('All')} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">View All Allocations</button>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-3 text-left text-sm font-semibold border-b">Project Code</th>
                      <th className="p-3 text-left text-sm font-semibold border-b">Project Name</th>
                      <th className="p-3 text-left text-sm font-semibold border-b">Employee Name</th>
                      <th className="p-3 text-left text-sm font-semibold border-b">Employee ID</th>
                      <th className="p-3 text-left text-sm font-semibold border-b">Allocation %</th>
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
                          <div className="font-medium text-gray-900">{allocation.employeeName}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm font-mono text-gray-500">{allocation.employeeCode}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm font-semibold text-green-600">{allocation.allocationPercentage}%</div>
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
              <h3 className="font-semibold text-gray-800">{selectedLocation === 'All' ? 'My Project Allocations' : `My ${selectedLocation} Allocations`}</h3>
              <p className="text-gray-600 text-sm">{getMyFilteredAllocations().length} project allocation(s){selectedLocation !== 'All' && <span className="ml-2 text-blue-600">• Filtered by {selectedLocation}</span>}</p>
            </div>

            {getMyFilteredAllocations().length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Allocations Found</h3>
                <p className="text-gray-500">{selectedLocation === 'All' ? "You are not currently allocated to any projects." : `You have no allocations in ${selectedLocation} location.`}</p>
                <p className="text-sm text-gray-400 mt-2">Contact your Project Manager for project assignments.</p>
                {selectedLocation !== 'All' && <button onClick={() => setSelectedLocation('All')} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">View All My Allocations</button>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-3 text-left text-sm font-semibold border-b">Project Code</th>
                      <th className="p-3 text-left text-sm font-semibold border-b">Project Name</th>
                      <th className="p-3 text-left text-sm font-semibold border-b">Duration</th>
                      <th className="p-3 text-left text-sm font-semibold border-b">Allocation %</th>
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
                          <div className="text-sm text-gray-600">{formatDate(allocation.startDate)} to {formatDate(allocation.endDate)}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm font-semibold text-green-600">{allocation.allocationPercentage}%</div>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                    <p className="text-gray-900">{viewingItem.employeeName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                    <p className="font-mono text-gray-900">{viewingItem.employeeCode}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Allocation Percentage</label>
                    <p className="text-lg font-semibold text-green-600">{viewingItem.allocationPercentage}%</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <p className="text-gray-900">{viewingItem.role}</p>
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
                    <option value="Planning">Planning</option>
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
                  onChange={(e) => setAllocationForm(prev => ({ ...prev, division: e.target.value }))} 
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
                  value={allocationForm.projectName} 
                  onChange={(e) => setAllocationForm(prev => ({ ...prev, projectName: e.target.value }))} 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee Name *</label>
                <input 
                  type="text" 
                  value={allocationForm.employeeName} 
                  onChange={(e) => setAllocationForm(prev => ({ ...prev, employeeName: e.target.value }))} 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Enter employee name"
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
    </div>
  );
};

export default ProjectAllocation;