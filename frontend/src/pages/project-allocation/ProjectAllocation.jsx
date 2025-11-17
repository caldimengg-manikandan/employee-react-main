import React, { useState, useEffect } from 'react';

const ProjectAllocation = () => {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isProjectManager = user.role === 'project_manager' || user.role === 'admin';
  const canEdit = isProjectManager;
  
  const [activeTab, setActiveTab] = useState('projects');
  const [branches] = useState(['Hosur', 'Chennai', 'Outside Det.']);
  
  // All available projects
  const [availableProjects] = useState([
    '1250 Maryland Avenue',
    'NJTP CDL Training Course',
    'Templeton Elementary School (Main Steel)',
    'Maryland Ave Main Steel',
    'New Century Bridge',
    'Templeton Elementary School (Misc Steel)',
    'KIPP Academy Charter School',
    'Ocean C College - New Admin Building',
    'Grove Street-Building 2',
    'Metro YMCA of Oranges',
    'Kirkwood - Sunroom Addition',
    'Great Oaks Legacy Charter School',
    'Paper Mill play House',
    'Miami Freedom Park',
    'URBA - BLDG II_624 N Glebe',
    'Cleveland Brothers',
    'Tenant Communicating 102 Stair Option A',
    'Susquehanna Trail Apartments',
    'Elwyn New School',
    'East End United Methodist Church',
    'Bulverde Marketplace D9',
    'USVI Elevator Slab',
    'NISD John Jay High School',
    'Jia terminal B expansion Deck rig',
    'Congress Heights Recreation Center',
    'Brandywine K-8 School',
    'DGS KING ES (MLK ES)',
    'Broderick MV GIS Substation',
    'Coatesville Train Station',
    'ACADEMY-KERRVILLE',
    '25-018 - MES Racks',
    '25-014 – Alamo Hall',
    'CALDIM Employee Portal',
    'CALDIM Management Portal',
    'Shangrila Enterprises Portal',
    'ServoTech Automation System',
    'Voomet Dashboard',
    'Steel Fabrication ERP',
    'HVAC System Installation',
    'Mechanical Piping Project',
    'Industrial Equipment Setup',
    'Mechanical Assembly Line',
    'Pump and Valve Systems'
  ]);

  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [myAllocations, setMyAllocations] = useState([]);
  
  // Modal States
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingAllocation, setEditingAllocation] = useState(null);
  
  // Forms
  const [projectForm, setProjectForm] = useState({
    name: '',
    branch: '',
    startDate: '',
    endDate: '',
    status: 'Planning'
  });

  const [allocationForm, setAllocationForm] = useState({
    projectId: '',
    employeeId: '',
    allocationPercentage: 100,
    role: ''
  });

  // Initialize sample data
  useEffect(() => {
    const sampleProjects = [
      {
        id: 1,
        name: "1250 Maryland Avenue",
        code: "25-001",
        branch: "Hosur",
        startDate: "2025-01-01",
        endDate: "2025-06-30",
        status: "Active",
        description: "Commercial building construction project"
      },
      {
        id: 2,
        name: "NJTP CDL Training Course",
        code: "25-002",
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
        branch: "Hosur",
        startDate: "2025-02-01",
        endDate: "2025-08-31",
        status: "Active",
        description: "Internal employee management system"
      },
      {
        id: 4,
        name: "New Century Bridge",
        code: "25-003",
        branch: "Hosur",
        startDate: "2025-03-01",
        endDate: "2025-12-31",
        status: "Planning",
        description: "Bridge construction project"
      }
    ];

    const sampleEmployees = [
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
      },
      {
        id: 4,
        employeeId: "EMP004",
        name: "Sneha Reddy",
        branch: "Hosur",
        department: "Engineering",
        position: "Project Manager",
        email: "sneha.reddy@caldim.com",
        currentAllocation: 100,
        status: "Active"
      }
    ];

    const sampleAllocations = [
      {
        id: 1,
        projectId: 1,
        projectName: "1250 Maryland Avenue",
        projectCode: "25-001",
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
      },
      {
        id: 3,
        projectId: 2,
        projectName: "NJTP CDL Training Course",
        projectCode: "25-002",
        branch: "Chennai",
        employeeId: 2,
        employeeName: "Priya Sharma",
        employeeCode: "EMP002",
        allocationPercentage: 100,
        startDate: "2025-01-15",
        endDate: "2025-07-15",
        status: "Active",
        allocatedHours: 40,
        role: "Structural Engineer",
        assignedBy: "Project Manager",
        assignedDate: "2024-12-18"
      }
    ];

    setProjects(sampleProjects);
    setEmployees(sampleEmployees);
    setAllocations(sampleAllocations);

    // Set current user's allocations (mock - replace with actual user ID matching)
    const userAllocations = sampleAllocations.filter(
      alloc => alloc.employeeCode === user.employeeId || alloc.employeeName === user.name
    );
    setMyAllocations(userAllocations);
  }, [user]);

  // Generate project code based on existing projects
  const generateProjectCode = (projectName) => {
    const prefix = projectName.includes('CALDIM') ? 'DAS' : 
                  projectName.includes('HVAC') || projectName.includes('Mechanical') ? 'MEC' : '25';
    
    const existingCount = projects.filter(p => 
      p.name.includes(projectName.split(' ')[0])
    ).length;
    
    const nextNumber = existingCount + 1;
    return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
  };

  // ========== PROJECT FUNCTIONS ==========
  const openProjectModal = (project = null) => {
    if (!canEdit) {
      alert("You don't have permission to manage projects. Please contact Project Manager or Admin.");
      return;
    }

    if (project) {
      setEditingProject(project);
      setProjectForm({
        name: project.name,
        branch: project.branch,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status
      });
    } else {
      setEditingProject(null);
      setProjectForm({
        name: '',
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

  const handleProjectSave = () => {
    if (!projectForm.name || !projectForm.branch || !projectForm.startDate || !projectForm.endDate) {
      alert("Please fill all required fields.");
      return;
    }

    const projectCode = editingProject ? editingProject.code : generateProjectCode(projectForm.name);

    const newProject = {
      id: editingProject ? editingProject.id : Date.now(),
      name: projectForm.name,
      code: projectCode,
      branch: projectForm.branch,
      startDate: projectForm.startDate,
      endDate: projectForm.endDate,
      status: projectForm.status,
      description: editingProject ? editingProject.description : `${projectForm.name} project`
    };

    if (editingProject) {
      setProjects(prev => 
        prev.map(proj => proj.id === editingProject.id ? newProject : proj)
      );
    } else {
      setProjects(prev => [...prev, newProject]);
    }

    closeProjectModal();
  };

  // ========== ALLOCATION FUNCTIONS ==========
  const openAllocationModal = (allocation = null) => {
    if (!canEdit) {
      alert("You don't have permission to edit allocations. Please contact Project Manager or Admin.");
      return;
    }

    if (allocation) {
      setEditingAllocation(allocation);
      setAllocationForm({
        projectId: allocation.projectId.toString(),
        employeeId: allocation.employeeId.toString(),
        allocationPercentage: allocation.allocationPercentage,
        role: allocation.role
      });
    } else {
      setEditingAllocation(null);
      setAllocationForm({
        projectId: '',
        employeeId: '',
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

  const handleAllocate = () => {
    if (!allocationForm.projectId || !allocationForm.employeeId || !allocationForm.allocationPercentage) {
      alert("Please fill all required fields.");
      return;
    }

    const project = projects.find(p => p.id.toString() === allocationForm.projectId);
    const employee = employees.find(e => e.id.toString() === allocationForm.employeeId);

    if (!project || !employee) {
      alert("Invalid project or employee selection.");
      return;
    }

    const newAllocation = {
      id: editingAllocation ? editingAllocation.id : Date.now(),
      projectId: parseInt(allocationForm.projectId),
      projectName: project.name,
      projectCode: project.code,
      branch: project.branch,
      employeeId: parseInt(allocationForm.employeeId),
      employeeName: employee.name,
      employeeCode: employee.employeeId,
      allocationPercentage: parseInt(allocationForm.allocationPercentage),
      startDate: project.startDate,
      endDate: project.endDate,
      status: 'Active',
      allocatedHours: Math.round((parseInt(allocationForm.allocationPercentage) / 100) * 40),
      role: allocationForm.role || employee.position,
      assignedBy: user.name || 'System',
      assignedDate: new Date().toISOString().split('T')[0]
    };

    if (editingAllocation) {
      setAllocations(prev => 
        prev.map(alloc => alloc.id === editingAllocation.id ? newAllocation : alloc)
      );
    } else {
      setAllocations(prev => [...prev, newAllocation]);
    }

    closeAllocationModal();
  };

  // ========== UTILITY FUNCTIONS ==========
  const getStatusBadge = (status) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-semibold";
    switch (status.toLowerCase()) {
      case 'active': return `${baseClasses} bg-green-100 text-green-800`;
      case 'planning': return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'completed': return `${baseClasses} bg-gray-100 text-gray-800`;
      default: return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Group projects by branch for display
  const getProjectsByBranch = (branch) => {
    return projects.filter(project => project.branch === branch);
  };

  // Group allocations by branch for display
  const getAllocationsByBranch = (branch) => {
    return allocations.filter(allocation => allocation.branch === branch);
  };

  // Get current user's allocations
  const getMyAllocations = () => {
    return myAllocations;
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
              📋 Read-only access - Contact Project Manager for changes
            </span>
          )}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'projects'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              📋 Projects
            </button>
            <button
              onClick={() => setActiveTab('allocations')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'allocations'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              👥 Allocations
            </button>
            {!canEdit && (
              <button
                onClick={() => setActiveTab('myAllocations')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'myAllocations'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                🎯 My Allocations
              </button>
            )}
          </div>
          
          {canEdit && (
            <button 
              onClick={() => activeTab === 'projects' ? openProjectModal() : openAllocationModal()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              {activeTab === 'projects' ? '➕ Add Project' : '👥 Allocate'}
            </button>
          )}
        </div>
      </div>

      {/* Projects Tab - Visible to all */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          {branches.map(branch => {
            const branchProjects = getProjectsByBranch(branch);
            if (branchProjects.length === 0) return null;
            
            return (
              <div key={branch} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800">{branch} Branch</h3>
                  <p className="text-gray-600 text-sm">
                    {branchProjects.length} project(s)
                  </p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-3 text-left text-sm font-semibold border-b">Project Name</th>
                        <th className="p-3 text-left text-sm font-semibold border-b">Project ID</th>
                        <th className="p-3 text-left text-sm font-semibold border-b">Start Date</th>
                        <th className="p-3 text-left text-sm font-semibold border-b">End Date</th>
                        <th className="p-3 text-left text-sm font-semibold border-b">Status</th>
                        {canEdit && <th className="p-3 text-left text-sm font-semibold border-b">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {branchProjects.map((project) => (
                        <tr key={project.id} className="hover:bg-gray-50 border-b">
                          <td className="p-3">
                            <div className="font-medium text-gray-900">{project.name}</div>
                            {project.description && (
                              <div className="text-sm text-gray-500 mt-1">{project.description}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="text-sm text-blue-600 font-mono">{project.code}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm text-gray-600">{formatDate(project.startDate)}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm text-gray-600">{formatDate(project.endDate)}</div>
                          </td>
                          <td className="p-3">
                            <span className={getStatusBadge(project.status)}>
                              {project.status}
                            </span>
                          </td>
                          {canEdit && (
                            <td className="p-3">
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => openProjectModal(project)}
                                  className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                                  title="Edit"
                                >
                                  ✏️
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* All Allocations Tab - Visible to all, editable only for managers */}
      {activeTab === 'allocations' && (
        <div className="space-y-4">
          {branches.map(branch => {
            const branchAllocations = getAllocationsByBranch(branch);
            if (branchAllocations.length === 0) return null;
            
            return (
              <div key={branch} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-teal-50 p-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800">{branch} Branch</h3>
                  <p className="text-gray-600 text-sm">
                    {branchAllocations.length} allocation(s)
                  </p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-3 text-left text-sm font-semibold border-b">Project</th>
                        <th className="p-3 text-left text-sm font-semibold border-b">Employee ID</th>
                        <th className="p-3 text-left text-sm font-semibold border-b">Employee Name</th>
                        <th className="p-3 text-left text-sm font-semibold border-b">Allocation</th>
                        <th className="p-3 text-left text-sm font-semibold border-b">Role</th>
                        {canEdit && <th className="p-3 text-left text-sm font-semibold border-b">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {branchAllocations.map((allocation) => (
                        <tr key={allocation.id} className="hover:bg-gray-50 border-b">
                          <td className="p-3">
                            <div className="font-medium text-gray-900">{allocation.projectName}</div>
                            <div className="text-sm text-blue-600 font-mono">{allocation.projectCode}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm font-mono text-gray-900">{allocation.employeeCode}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-gray-900">{allocation.employeeName}</div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className="bg-purple-600 h-2 rounded-full" 
                                  style={{ width: `${allocation.allocationPercentage}%` }}
                                ></div>
                              </div>
                              <span className="font-semibold text-purple-700 text-sm">
                                {allocation.allocationPercentage}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              {allocation.role}
                            </span>
                          </td>
                          {canEdit && (
                            <td className="p-3">
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => openAllocationModal(allocation)}
                                  className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                                  title="Edit"
                                >
                                  ✏️
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* My Allocations Tab - Only for regular employees */}
      {activeTab === 'myAllocations' && !canEdit && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">My Project Allocations</h3>
              <p className="text-gray-600 text-sm">
                {myAllocations.length} project allocation(s)
              </p>
            </div>
            
            {myAllocations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Allocations Found</h3>
                <p className="text-gray-500">You are not currently allocated to any projects.</p>
                <p className="text-sm text-gray-400 mt-2">Contact your Project Manager for project assignments.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-3 text-left text-sm font-semibold border-b">Project</th>
                      <th className="p-3 text-left text-sm font-semibold border-b">Allocation</th>
                      <th className="p-3 text-left text-sm font-semibold border-b">Role</th>
                      <th className="p-3 text-left text-sm font-semibold border-b">Duration</th>
                      <th className="p-3 text-left text-sm font-semibold border-b">Assigned By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myAllocations.map((allocation) => (
                      <tr key={allocation.id} className="hover:bg-gray-50 border-b">
                        <td className="p-3">
                          <div className="font-medium text-gray-900">{allocation.projectName}</div>
                          <div className="text-sm text-blue-600 font-mono">{allocation.projectCode}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-purple-600 h-2 rounded-full" 
                                style={{ width: `${allocation.allocationPercentage}%` }}
                              ></div>
                            </div>
                            <span className="font-semibold text-purple-700 text-sm">
                              {allocation.allocationPercentage}%
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {allocation.allocatedHours}h/week
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            {allocation.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="text-sm text-gray-600">
                            {formatDate(allocation.startDate)} to {formatDate(allocation.endDate)}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm text-gray-600">{allocation.assignedBy}</div>
                          <div className="text-xs text-gray-400">{formatDate(allocation.assignedDate)}</div>
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

      {/* Project Modal - Only for managers */}
      {showProjectModal && canEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingProject ? 'Edit Project' : 'Add New Project'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project Name *</label>
                <select 
                  value={projectForm.name}
                  onChange={(e) => setProjectForm(prev => ({...prev, name: e.target.value}))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Project Name</option>
                  {availableProjects.map(projectName => (
                    <option key={projectName} value={projectName}>{projectName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={projectForm.startDate}
                    onChange={(e) => setProjectForm(prev => ({...prev, startDate: e.target.value}))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                  <input
                    type="date"
                    value={projectForm.endDate}
                    onChange={(e) => setProjectForm(prev => ({...prev, endDate: e.target.value}))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Branch *</label>
                  <select 
                    value={projectForm.branch}
                    onChange={(e) => setProjectForm(prev => ({...prev, branch: e.target.value}))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Branch</option>
                    {branches.map(branch => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select 
                    value={projectForm.status}
                    onChange={(e) => setProjectForm(prev => ({...prev, status: e.target.value}))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {!editingProject && projectForm.name && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Project Code:</strong> {generateProjectCode(projectForm.name)}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={closeProjectModal}
                className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProjectSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingProject ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Allocation Modal - Only for managers */}
      {showAllocationModal && canEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingAllocation ? 'Edit Allocation' : 'Allocate Resource'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee *</label>
                <select 
                  value={allocationForm.employeeId}
                  onChange={(e) => setAllocationForm(prev => ({...prev, employeeId: e.target.value}))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.employeeId})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project *</label>
                <select 
                  value={allocationForm.projectId}
                  onChange={(e) => setAllocationForm(prev => ({...prev, projectId: e.target.value}))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project.code})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allocation Percentage *</label>
                <div className="flex items-center space-x-4">
                  <input 
                    type="range"
                    value={allocationForm.allocationPercentage}
                    onChange={(e) => setAllocationForm(prev => ({...prev, allocationPercentage: e.target.value}))}
                    min="0"
                    max="100"
                    className="flex-1"
                  />
                  <span className="w-16 text-center font-semibold text-purple-700">
                    {allocationForm.allocationPercentage}%
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-2 text-center">
                  Estimated: {Math.round((allocationForm.allocationPercentage / 100) * 40)}h/week
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <input 
                  type="text"
                  value={allocationForm.role}
                  onChange={(e) => setAllocationForm(prev => ({...prev, role: e.target.value}))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter role for this project"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={closeAllocationModal}
                className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAllocate}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingAllocation ? 'Update' : 'Allocate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectAllocation;