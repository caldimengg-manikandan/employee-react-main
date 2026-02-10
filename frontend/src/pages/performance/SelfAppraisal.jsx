import React, { useState, useEffect } from 'react';
import WorkflowTracker from '../../components/Performance/WorkflowTracker';
import { getWorkflowForUser, APPRAISAL_STAGES } from '../../utils/performanceUtils';
import { performanceAPI } from '../../services/api';
import { 
  Save, 
  Send, 
  Plus, 
  Trash2, 
  Award, 
  FileText,
  AlertCircle,
  Edit,
  Eye,
  Download,
  X,
  ChevronLeft
} from 'lucide-react';

// Simple Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                {title}
              </h3>
              <button
                onClick={onClose}
                type="button"
                className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="mt-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SelfAppraisal = () => {
  
  // View State: 'list' or 'edit'
  const [viewMode, setViewMode] = useState('list');
  
  // Get user info from session storage
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const employeeInfo = {
    name: user.name || 'Employee',
    designation: user.designation || user.role || 'Designation',
    department: user.department || 'Department',
    ...user
  };

  const userFlowConfig = getWorkflowForUser(employeeInfo.department, employeeInfo.designation);
  const userFlow = APPRAISAL_STAGES.map(stage => {
    if (userFlowConfig && userFlowConfig[stage.id]) {
      return { ...stage, description: userFlowConfig[stage.id] };
    }
    return stage;
  });

  // Appraisals List State
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch Appraisals on Mount
  useEffect(() => {
    fetchAppraisals();
  }, []);

  const fetchAppraisals = async () => {
    try {
      setLoading(true);
      const response = await performanceAPI.getMySelfAppraisals();
      setAppraisals(response.data || []);
    } catch (error) {
      console.error("Failed to fetch appraisals", error);
      // Fallback for demo if API fails
      setAppraisals([
        {
          id: 1,
          year: '2024-25',
          appraiser: 'John Doe',
          status: 'Submitted',
          releaseLetter: 'appraisal_2024-25.pdf',
          projects: [
            { id: 101, name: 'Project Alpha', contribution: 'Lead developer, implemented core features.' },
            { id: 102, name: 'Project Beta', contribution: 'Fixed critical bugs and improved performance.' }
          ],
          overallContribution: 'Successfully delivered two major projects and mentored junior developers.'
        },
        {
          id: 2,
          year: '2023-24',
          appraiser: 'Jane Smith',
          status: 'Released',
          releaseLetter: 'appraisal_2023-24.pdf',
          projects: [
             { id: 201, name: 'Legacy System Migration', contribution: 'Migrated database to new server.' }
          ],
          overallContribution: 'Completed migration ahead of schedule.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Form Data State
  const [formData, setFormData] = useState({
    year: '2025-26',
    projects: [],
    overallContribution: '',
  });

  // Modal States
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [currentProject, setCurrentProject] = useState({ id: null, name: '', contribution: '' });

  // --- Handlers ---

  const handleEditAppraisal = async (appraisal) => {
    try {
      const response = await performanceAPI.getSelfAppraisalById(appraisal.id);
      setFormData(response.data);
      setViewMode('edit');
    } catch (error) {
      console.error("Failed to fetch appraisal details", error);
      // Fallback: use passed data if API fails (or for demo)
      setFormData({ ...formData, ...appraisal }); 
      setViewMode('edit');
    }
  };

  const handleDeleteAppraisal = async (id) => {
    if (window.confirm('Are you sure you want to delete this appraisal?')) {
      try {
        await performanceAPI.deleteSelfAppraisal(id);
        fetchAppraisals();
      } catch (error) {
        console.error("Failed to delete appraisal", error);
        alert("Failed to delete appraisal");
      }
    }
  };

  const handleDownloadLetter = (fileName) => {
    alert(`Downloading ${fileName}...`);
  };

  // Project Modal Handlers
  const openAddProjectModal = () => {
    setCurrentProject({ id: null, name: '', contribution: '' });
    setShowProjectModal(true);
  };

  const openEditProjectModal = (project) => {
    setCurrentProject(project);
    setShowProjectModal(true);
  };

  const saveProject = () => {
    if (currentProject.id) {
      // Update existing
      const updatedProjects = formData.projects.map(p => 
        p.id === currentProject.id ? currentProject : p
      );
      setFormData({ ...formData, projects: updatedProjects });
    } else {
      // Add new
      const newProject = { ...currentProject, id: Date.now() };
      setFormData({ ...formData, projects: [...formData.projects, newProject] });
    }
    setShowProjectModal(false);
  };

  const removeProject = (id) => {
    if (window.confirm('Remove this project?')) {
      setFormData({
        ...formData,
        projects: formData.projects.filter(p => p.id !== id)
      });
    }
  };

  // Overall Contribution Handlers
  const saveOverallContribution = (value) => {
    setFormData({ ...formData, overallContribution: value });
    setShowContributionModal(false);
  };

  const handleSubmit = async (action) => {
    try {
      const payload = { 
        ...formData, 
        status: action === 'Submit' ? 'Submitted' : 'Draft' 
      };
      
      if (formData.id) {
        await performanceAPI.updateSelfAppraisal(formData.id, payload);
      } else {
        await performanceAPI.createSelfAppraisal(payload);
      }
      
      alert(`Self appraisal ${action === 'Submit' ? 'submitted' : 'saved'} successfully!`);
      fetchAppraisals();
      setViewMode('list');
    } catch (error) {
      console.error("Failed to save appraisal", error);
      alert("Failed to save appraisal. Please try again.");
    }
  };

  // --- Render Views ---

  if (viewMode === 'list') {
    return (
      <div className="min-h-screen bg-gray-50 pb-8 font-sans p-8">
        <div className="w-full mx-auto">
          <div className="flex justify-between items-center mb-6">
            
            <button
              onClick={() => {
                setFormData({ year: '2026-27', projects: [], overallContribution: '' });
                setViewMode('edit');
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#262760] hover:bg-[#1e2050] focus:outline-none"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Appraisal
            </button>
          </div>

          <div className="bg-white shadow border-b border-gray-200 sm:rounded-lg overflow-auto max-h-[75vh]">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading appraisals...</div>
            ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#262760] sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Financial Year
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Appraiser Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                    Actions
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                    Appraisal Letter
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appraisals.map((appraisal) => (
                  <tr key={appraisal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      FY {appraisal.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {appraisal.appraiser}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      <div className="flex justify-center space-x-3">
                        <button 
                          onClick={() => handleEditAppraisal(appraisal)}
                          className="text-[#262760] hover:text-[#1e2050]"
                          title="Edit"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button 
                          className="text-gray-600 hover:text-gray-900"
                          title="View"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteAppraisal(appraisal.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      <button 
                        onClick={() => handleDownloadLetter(appraisal.releaseLetter)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Edit View
  return (
    <div className="min-h-screen bg-gray-50 pb-8 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button 
                onClick={() => setViewMode('list')}
                className="mr-4 flex items-center text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="h-6 w-6" />
                <span className="ml-2">Back</span>
              </button>
              <div className="flex items-center ml-2">
                <span className="text-xl font-bold text-gray-900 mr-2">Financial Year:</span>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] text-lg font-bold text-[#262760] py-1 pl-3 pr-10 cursor-pointer"
                >
                  {['2023-24', '2024-25', '2025-26', '2026-27', '2027-28'].map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WorkflowTracker currentStageId="appraisee" userFlow={userFlow} />

        {/* Projects Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Key Projects</h2>
            <button 
              onClick={openAddProjectModal}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#262760] hover:bg-[#1e2050]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </button>
          </div>

          <div className="space-y-4">
            {formData.projects.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No projects added yet.</p>
            ) : (
              formData.projects.map((project, index) => (
                <div key={project.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{index + 1}. {project.name}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.contribution}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => openEditProjectModal(project)}
                      className="text-[#262760] hover:text-[#1e2050] p-1"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => removeProject(project.id)}
                      className="text-red-600 hover:text-red-900 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Overall Contribution Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-gray-900">Overall Contribution</h2>
             <button
               onClick={() => setShowContributionModal(true)}
               className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
             >
               <FileText className="h-4 w-4 mr-2" />
               {formData.overallContribution ? 'Edit Contribution' : 'Add Contribution'}
             </button>
          </div>
          
          {formData.overallContribution ? (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{formData.overallContribution}</p>
            </div>
          ) : (
            <p className="text-gray-500 italic">No overall contribution summary added yet.</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-end space-x-3">
           <button
             onClick={() => handleSubmit('Save')}
             className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
           >
             <Save className="h-4 w-4 mr-2" />
             Save
           </button>
           <button
             onClick={() => handleSubmit('Submit')}
             className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#262760] hover:bg-[#1e2050]"
           >
             <Send className="h-4 w-4 mr-2" />
             Submit
           </button>
        </div>
      </div>

      {/* Project Modal */}
      <Modal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        title={currentProject.id ? "Edit Project" : "Add Project"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
            <input
              type="text"
              value={currentProject.name}
              onChange={(e) => setCurrentProject({ ...currentProject, name: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] sm:text-sm p-2 border"
              placeholder="Project Title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contribution</label>
            <textarea
              rows={4}
              value={currentProject.contribution}
              onChange={(e) => setCurrentProject({ ...currentProject, contribution: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] sm:text-sm p-2 border"
              placeholder="Describe your contribution..."
            />
          </div>
          <div className="mt-5 sm:mt-6 flex justify-end space-x-2">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
              onClick={() => setShowProjectModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#262760] text-base font-medium text-white hover:bg-[#1e2050] focus:outline-none sm:text-sm"
              onClick={saveProject}
            >
              {currentProject.id ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Overall Contribution Modal */}
      <Modal
        isOpen={showContributionModal}
        onClose={() => setShowContributionModal(false)}
        title="Overall Contribution"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Executive Summary</label>
            <textarea
              rows={8}
              value={formData.overallContribution}
              onChange={(e) => setFormData({ ...formData, overallContribution: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] sm:text-sm p-2 border"
              placeholder="Summarize your performance..."
            />
          </div>
          <div className="mt-5 sm:mt-6 flex justify-end space-x-2">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
              onClick={() => setShowContributionModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#262760] text-base font-medium text-white hover:bg-[#1e2050] focus:outline-none sm:text-sm"
              onClick={() => setShowContributionModal(false)}
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default SelfAppraisal;
