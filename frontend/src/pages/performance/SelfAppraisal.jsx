import React, { useState, useEffect } from 'react';
import WorkflowTracker from '../../components/Performance/WorkflowTracker';
import { getWorkflowForUser, APPRAISAL_STAGES } from '../../utils/performanceUtils';
import { performanceAPI, employeeAPI } from '../../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  ChevronLeft,
  CheckCircle,
  XCircle
} from 'lucide-react';

// Colorful Modal Component
const Modal = ({ isOpen, onClose, title, children, icon: Icon, colorTheme = "blue", maxWidth = "max-w-lg" }) => {
  if (!isOpen) return null;

  const themeColors = {
    blue: "from-[#262760] to-[#1e2050]",
    purple: "from-purple-600 to-indigo-600",
    green: "from-emerald-500 to-teal-600",
    red: "from-red-500 to-rose-600"
  };

  const headerGradient = themeColors[colorTheme] || themeColors.blue;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900 opacity-60 backdrop-blur-sm" onClick={onClose}></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className={`inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:w-full border border-gray-100 ${maxWidth}`}>
          
          {/* Colorful Header */}
          <div className={`bg-gradient-to-r ${headerGradient} px-4 py-4 sm:px-6 flex justify-between items-center`}>
            <div className="flex items-center space-x-3">
              {Icon && <div className="bg-white/20 p-2 rounded-full"><Icon className="h-6 w-6 text-white" /></div>}
              <h3 className="text-lg leading-6 font-bold text-white" id="modal-title">
                {title}
              </h3>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="bg-white/10 rounded-full p-1 text-white hover:bg-white/20 focus:outline-none transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="mt-2">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// New Colorful Popup for Notifications
const StatusPopup = ({ isOpen, onClose, status, message }) => {
  if (!isOpen) return null;

  const config = {
    success: {
      icon: CheckCircle,
      color: "text-green-500",
      bg: "bg-green-50",
      border: "border-green-200",
      title: "Success!"
    },
    error: {
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-50",
      border: "border-red-200",
      title: "Error"
    },
    info: {
      icon: AlertCircle,
      color: "text-blue-500",
      bg: "bg-blue-50",
      border: "border-blue-200",
      title: "Information"
    }
  };

  const { icon: Icon, color, bg, border, title } = config[status] || config.info;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900 opacity-40" onClick={onClose}></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className={`inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full border-2 ${border}`}>
          <div className={`${bg} px-4 pt-5 pb-4 sm:p-6 sm:pb-4`}>
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-white ${color} sm:mx-0 sm:h-10 sm:w-10 shadow-sm`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className={`text-lg leading-6 font-bold ${color}`} id="modal-title">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-600 font-medium">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none sm:ml-3 sm:w-auto sm:text-sm transition-colors ${status === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#262760] hover:bg-[#1e2050]'}`}
              onClick={onClose}
            >
              Okay, Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SelfAppraisal = () => {
  
  // View State: 'list' or 'edit'
  const [viewMode, setViewMode] = useState('list');
  const [isReadOnly, setIsReadOnly] = useState(false);
  
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

  // Helper to determine workflow stage based on status
  const getStageFromStatus = (status) => {
    switch(status) {
      case 'Draft': return 'appraisee';
      
      case 'Submitted': 
      case 'SUBMITTED':
      case 'AppraiserReview': 
        return 'appraiser';
      
      case 'APPRAISER_COMPLETED': 
      case 'ReviewerReview': 
        return 'reviewer';
      
      case 'REVIEWER_COMPLETED': 
      case 'DirectorApproval': 
        return 'director';
      
      case 'DIRECTOR_APPROVED': 
      case 'Released': 
        return 'release';
        
      default: return 'appraisee';
    }
  };

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
    status: 'Draft'
  });

  const currentStageId = getStageFromStatus(formData.status);

  // Modal States
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [currentProject, setCurrentProject] = useState({ id: null, name: '', contribution: '' });

  // Status Popup State
  const [statusPopup, setStatusPopup] = useState({ isOpen: false, status: 'success', message: '' });

  // Letter State
  const [showReleaseLetter, setShowReleaseLetter] = useState(false);
  const [letterData, setLetterData] = useState(null);

  // --- Handlers ---

  const handleViewAppraisal = async (appraisal) => {
    try {
      const id = appraisal._id || appraisal.id;
      if (!id) throw new Error("Appraisal ID not found");
      const response = await performanceAPI.getSelfAppraisalById(id);
      setViewData(response.data);
      setShowViewModal(true);
    } catch (error) {
      console.error("Failed to fetch appraisal details", error);
      setViewData(appraisal);
      setShowViewModal(true);
    }
  };

  const handleEditAppraisal = async (appraisal) => {
    try {
      const id = appraisal._id || appraisal.id;
      if (!id) throw new Error("Appraisal ID not found");
      const response = await performanceAPI.getSelfAppraisalById(id);
      setFormData(response.data);
      setIsReadOnly(false);
      setViewMode('edit');
    } catch (error) {
      console.error("Failed to fetch appraisal details", error);
      // Fallback: use passed data if API fails (or for demo)
      setFormData({ ...formData, ...appraisal }); 
      setIsReadOnly(false);
      setViewMode('edit');
    }
  };

  const handleDeleteAppraisal = async (id) => {
    if (window.confirm('Are you sure you want to delete this appraisal?')) {
      try {
        await performanceAPI.deleteSelfAppraisal(id);
        fetchAppraisals();
        setStatusPopup({ isOpen: true, status: 'success', message: 'Appraisal deleted successfully.' });
      } catch (error) {
        console.error("Failed to delete appraisal", error);
        const errorMsg = error.response?.data?.message || 'Failed to delete appraisal.';
        setStatusPopup({ isOpen: true, status: 'error', message: errorMsg });
      }
    }
  };

  const handleDownloadLetter = async (appraisal) => {
    try {
      // Fetch employee details from Employee Management API
      let employeeDetails = {};
      
      try {
        if (appraisal.employeeId) {
          const res = await employeeAPI.getEmployeeById(appraisal.employeeId);
          employeeDetails = res.data;
        } else {
          // Fallback to current user profile if no specific employee ID in appraisal
          const res = await employeeAPI.getMyProfile();
          employeeDetails = res.data;
        }
      } catch (err) {
        console.error("Failed to fetch fresh employee details, using available info", err);
        // Fallback to existing info if API fails
        employeeDetails = { ...employeeInfo, ...appraisal };
      }

      // Construct letter data
      const data = {
        date: '01.04.2025',
        employeeName: employeeDetails.name || employeeDetails.fullName || employeeInfo.name,
        employeeId: employeeDetails.employeeId || employeeDetails.empId || employeeInfo.employeeId || 'EMP-001',
        designation: employeeDetails.designation || employeeDetails.role || employeeInfo.designation,
        location: employeeDetails.location || employeeDetails.branch || employeeInfo.location || 'Chennai',
        effectiveDate: '1st April 2025',
        salary: {
          old: {
            basic: 41500,
            hra: 31125,
            special: 31125,
            gross: 103750,
            empPF: 1800,
            employerPF: 1950,
            net: 100000,
            gratuity: 1995,
            ctc: 105745
          },
          new: {
            basic: 50000,
            hra: 37500,
            special: 37500,
            gross: 125000,
            empPF: 1800,
            employerPF: 1950,
            net: 121250,
            gratuity: 2404,
            ctc: 127404
          }
        }
      };
      setLetterData(data);
      setShowReleaseLetter(true);
    } catch (error) {
      console.error("Error preparing letter", error);
      setStatusPopup({ isOpen: true, status: 'error', message: "Failed to prepare release letter." });
    }
  };

  const downloadReleaseLetter = async () => {
    try {
      const page1 = document.getElementById('release-letter-page-1');
      const page2 = document.getElementById('release-letter-page-2');

      if (!page1 || !page2) {
        setStatusPopup({ isOpen: true, status: 'error', message: "Template not found." });
        return;
      }
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;

      // Helper function to capture element with high fidelity
      const captureElement = async (element) => {
        // Create a clone to render off-screen but fully visible
        const clone = element.cloneNode(true);
        
        // Reset styles on clone to ensure it renders at full A4 size
        clone.style.cssText = `
          position: fixed; 
          top: 0; 
          left: 0; 
          width: 794px; 
          min-height: 1123px; 
          z-index: -9999; 
          background-color: white;
          transform: none;
          margin: 0;
          padding: 0;
          overflow: visible;
        `;
        
        document.body.appendChild(clone);
        
        try {
          // Use html2canvas on the clone
          const canvas = await html2canvas(clone, {
            scale: 2, // Higher scale for crisp text
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: 794,
            windowWidth: 794,
            onclone: (clonedDoc) => {
                // Ensure all images in the clone are loaded (optional double check)
                const images = clonedDoc.getElementsByTagName('img');
                for (let img of images) {
                    img.crossOrigin = "Anonymous";
                }
            }
          });
          return canvas;
        } finally {
          // Clean up
          if (document.body.contains(clone)) {
            document.body.removeChild(clone);
          }
        }
      };
      
      // Capture Page 1
      const canvas1 = await captureElement(page1);
      const imgData1 = canvas1.toDataURL('image/jpeg', 1.0);
      pdf.addImage(imgData1, 'JPEG', 0, 0, imgWidth, pageHeight);

      // Capture Page 2
      pdf.addPage();
      const canvas2 = await captureElement(page2);
      const imgData2 = canvas2.toDataURL('image/jpeg', 1.0);
      pdf.addImage(imgData2, 'JPEG', 0, 0, imgWidth, pageHeight);
      
      pdf.save(`Release_Letter_${letterData.employeeId}.pdf`);
    } catch (error) {
      console.error("PDF Generation failed", error);
      setStatusPopup({ isOpen: true, status: 'error', message: "Failed to generate PDF." });
    }
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
      
      setStatusPopup({ 
        isOpen: true, 
        status: 'success', 
        message: `Self appraisal ${action === 'Submit' ? 'submitted' : 'saved'} successfully!` 
      });
      fetchAppraisals();
      setViewMode('list');
    } catch (error) {
      console.error("Failed to save appraisal", error);
      setStatusPopup({ 
        isOpen: true, 
        status: 'error', 
        message: "Failed to save appraisal. Please try again." 
      });
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
                setFormData({ year: '2026-27', projects: [], overallContribution: '', status: 'Draft' });
                setIsReadOnly(false);
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                    Actions
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                    Release Letter
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appraisals.map((appraisal) => (
                  <tr key={appraisal._id || appraisal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      FY {appraisal.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {appraisal.appraiser}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${appraisal.status === 'Released' ? 'bg-green-100 text-green-800' : 
                          appraisal.status === 'Submitted' ? 'bg-blue-100 text-blue-800' : 
                          appraisal.status === 'Draft' ? 'bg-gray-100 text-gray-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        {appraisal.status || 'Draft'}
                      </span>
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
                          onClick={() => handleViewAppraisal(appraisal)}
                          className="text-gray-600 hover:text-gray-900"
                          title="View"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteAppraisal(appraisal._id || appraisal.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {appraisal.status === 'DIRECTOR_APPROVED' || appraisal.status === 'Released' ? (
                        <button 
                          onClick={() => handleDownloadLetter(appraisal)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download Release Letter
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Pending Release</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>

        {/* View Appraisal Modal */}
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title={`Appraisal Details - FY ${viewData?.year || ''}`}
          icon={Eye}
          colorTheme="blue"
          maxWidth="max-w-4xl"
        >
          {viewData && (
            <div className="space-y-6">
              {/* Workflow Status Tracker */}
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Approval Status</h4>
                <WorkflowTracker 
                   currentStageId={getStageFromStatus(viewData.status)} 
                   userFlow={userFlow} 
                />
              </div>

              {/* Projects Section */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                  <Award className="h-5 w-5 mr-2 text-[#262760]" />
                  Key Projects
                </h3>
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  {viewData.projects && viewData.projects.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {viewData.projects.map((project, index) => (
                        <div key={index} className="p-4 hover:bg-white transition-colors">
                          <h4 className="font-bold text-[#262760] text-lg mb-2">{index + 1}. {project.name}</h4>
                          <div className="bg-white p-3 rounded border border-gray-100 shadow-sm">
                             <p className="text-gray-700 whitespace-pre-wrap">{project.contribution}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="p-4 text-gray-500 italic">No projects recorded.</p>
                  )}
                </div>
              </div>

              {/* Overall Contribution Section */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-purple-600" />
                  Overall Contribution
                </h3>
                <div className="bg-purple-50 rounded-lg p-5 border border-purple-100 shadow-sm">
                  {viewData.overallContribution ? (
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-base">
                      {viewData.overallContribution}
                    </p>
                  ) : (
                    <p className="text-gray-500 italic">No overall contribution summary provided.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-2 bg-[#262760] text-base font-medium text-white hover:bg-[#1e2050] focus:outline-none sm:text-sm"
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Release Letter Modal */}
        {showReleaseLetter && letterData && (
          <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto backdrop-blur-sm flex justify-center items-start py-8">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl relative mx-4">
              <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-20 rounded-t-lg">
                <h2 className="text-xl font-bold text-gray-800">Release Letter Preview</h2>
                <div className="flex gap-3">
                  <button
                    onClick={downloadReleaseLetter}
                    className="flex items-center gap-2 px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => setShowReleaseLetter(false)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-8 bg-gray-100 overflow-x-auto flex flex-col items-center gap-8">
                
                {/* PAGE 1: Appreciation Letter */}
                <div id="release-letter-page-1" className="bg-white relative min-h-[1120px] w-[794px] shadow-lg flex-shrink-0 flex flex-col">
                   {/* Background Logo */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                    <img 
                      src="/images/steel-logo.png" 
                      alt="" 
                      className="w-[500px] opacity-[0.05] grayscale"
                    />
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10 flex flex-col h-full justify-between flex-grow">
                    {/* Header */}
                    <div className="w-full flex h-32 relative overflow-hidden">
                       {/* SVG Background for Header */}
                      <div className="absolute inset-0 z-0">
                        <svg width="100%" height="100%" viewBox="0 0 794 128" preserveAspectRatio="none">
                          <path d="M0,0 L400,0 L340,128 L0,128 Z" fill="#1e2b58" />
                          <path d="M400,0 L430,0 L370,128 L340,128 Z" fill="#f37021" />
                        </svg>
                      </div>

                      <div className="relative w-[60%] flex items-center pl-8 pr-12 z-10">
                        <div className="flex items-center gap-4">
                          <img src="/images/steel-logo.png" alt="CALDIM" className="h-16 w-auto brightness-0 invert" crossOrigin="anonymous" style={{ display: 'block' }} />
                          <div className="text-white">
                            <h1 className="text-3xl font-bold leading-none tracking-wide">CALDIM</h1>
                            <p className="text-[10px] tracking-[0.2em] mt-1 text-orange-400 font-semibold">ENGINEERING PRIVATE LIMITED</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right Part: Address */}
                      <div className="flex-1 flex flex-col justify-center items-end pr-8 pt-2 z-10">
                          <div className="flex items-center mb-2">
                              <span className="font-bold text-gray-800 mr-3 text-lg">044-47860455</span>
                              <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs shadow-md">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                </svg>
                              </div>
                          </div>
                          <div className="flex items-start justify-end text-right">
                              <span className="text-sm font-semibold text-gray-700 w-64 leading-tight">No.118, Minimac Center, Arcot Road, Valasaravakkam, Chennai - 600 087.</span>
                              <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs ml-3 mt-1 shadow-md">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                </svg>
                              </div>
                          </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="px-12 py-6 flex-grow">
                      <div className="flex justify-between mb-6">
                        <div />
                        <div className="text-gray-700">Date: <span className="font-bold">{letterData.date}</span></div>
                      </div>
                      
                      <div className="mb-6">
                        <div className="font-bold text-gray-800 mb-4">To:</div>
                        <div className="inline-block min-w-[300px]">
                          <div className="grid grid-cols-[100px_1fr] gap-y-1">
                            <div className="text-gray-500 font-medium">Name</div>
                            <div className="text-gray-900 font-bold">: {letterData.employeeName}</div>

                            <div className="text-gray-500 font-medium">Employee ID</div>
                            <div className="text-gray-900 font-bold">: {letterData.employeeId}</div>
                            
                            <div className="text-gray-500 font-medium">Designation</div>
                            <div className="text-gray-900 font-bold">: {letterData.designation}</div>
                            
                            <div className="text-gray-500 font-medium">Location</div>
                            <div className="text-gray-900 font-bold">: {letterData.location}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-8 text-center">
                        <div className="font-bold text-xl underline decoration-1 underline-offset-4">PERFORMANCE APPRAISAL LETTER</div>
                      </div>

                      <div className="mb-6">
                        <div className="mb-4">Dear <span className="font-semibold">{letterData.employeeName}</span>,</div>
                        <p className="text-justify text-[14px] leading-6 mb-4">
                          The Performance Review for the financial year 2023-24 has been completed. 
                        </p>
                        <p className="text-justify text-[14px] leading-6 mb-4">
                          We are pleased to inform you that based on the available benchmarks in the industry and your performance appraisal, we have revised your compensation effective 1st August 2024 .
                        </p>
                        <p className="text-justify text-[14px] leading-6 mb-4">
                        Details are provided in the attached Annexure.

We draw your attention to the fact that your compensation is personal to you.

As this information is confidential, we expect you to refrain from sharing the same with your colleagues.

I take this opportunity to thank you for the contribution made by you during the year of review and wish you success for the year ahead.
                        </p>
                      </div>
                      
                      <div className="mb-8 text-justify text-[14px] leading-6">
                        <p>
                          We look forward to your continued dedication and commitment to the organization.
                        </p>
                        <p className="mt-4">
                          All other terms and conditions of your employment remain unchanged.
                        </p>
                      </div>

                      {/* Signatory */}
                      <div className="mt-12 flex justify-end">
                        <div className="text-right">
                          <div className="mb-2 text-sm text-gray-700">For CALDIM ENGINEERING PRIVATE LIMITED</div>
                          <div className="mt-16">
                            <div className="font-bold">Authorized Signatory</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="w-full h-24 relative mt-auto overflow-hidden">
                       {/* SVG Background for Footer */}
                      <div className="absolute inset-0 z-0">
                        <svg width="100%" height="100%" viewBox="0 0 794 96" preserveAspectRatio="none">
                          {/* Orange Bar */}
                          <rect x="0" y="84" width="350" height="12" fill="#f37021" />
                          {/* Blue Shape */}
                          <path d="M350,0 L794,0 L794,96 L290,96 Z" fill="#1e2b58" />
                        </svg>
                      </div>

                      <div className="relative z-10 w-full h-full flex items-center justify-end pr-10 pt-4">
                        <div className="text-white text-right">
                          <div className="text-sm font-medium tracking-wide">Website : www.caldimengg.com</div>
                          <div className="text-sm font-medium tracking-wide mt-1">CIN U74999TN2016PTC110683</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PAGE 2: Salary Revision Table */}
                <div id="release-letter-page-2" className="bg-white relative min-h-[1120px] w-[794px] shadow-lg flex-shrink-0 flex flex-col">
                   {/* Background Logo */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                    <img 
                      src="/images/steel-logo.png" 
                      alt="" 
                      className="w-[500px] opacity-[0.05] grayscale"
                    />
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10 flex flex-col h-full justify-between flex-grow">
                    {/* Header */}
                    <div className="w-full flex h-32 relative overflow-hidden">
                       {/* SVG Background for Header */}
                      <div className="absolute inset-0 z-0">
                        <svg width="100%" height="100%" viewBox="0 0 794 128" preserveAspectRatio="none">
                          <path d="M0,0 L400,0 L340,128 L0,128 Z" fill="#1e2b58" />
                          <path d="M400,0 L430,0 L370,128 L340,128 Z" fill="#f37021" />
                        </svg>
                      </div>

                      <div className="relative w-[60%] flex items-center pl-8 pr-12 z-10">
                        <div className="flex items-center gap-4">
                          <img src="/images/steel-logo.png" alt="CALDIM" className="h-16 w-auto brightness-0 invert" crossOrigin="anonymous" style={{ display: 'block' }} />
                          <div className="text-white">
                            <h1 className="text-3xl font-bold leading-none tracking-wide">CALDIM</h1>
                            <p className="text-[10px] tracking-[0.2em] mt-1 text-orange-400 font-semibold">ENGINEERING PRIVATE LIMITED</p>
                          </div>
                        </div>
                      </div>

                      {/* Right Part: Address */}
                      <div className="flex-1 flex flex-col justify-center items-end pr-8 pt-2 z-10">
                          <div className="flex items-center mb-2">
                              <span className="font-bold text-gray-800 mr-3 text-lg">044-47860455</span>
                              <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs shadow-md">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                </svg>
                              </div>
                          </div>
                          <div className="flex items-start justify-end text-right">
                              <span className="text-sm font-semibold text-gray-700 w-64 leading-tight">No.118, Minimac Center, Arcot Road, Valasaravakkam, Chennai - 600 087.</span>
                              <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs ml-3 mt-1 shadow-md">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                </svg>
                              </div>
                          </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="px-12 py-4 flex-grow">
                      <div className="mb-4 text-center">
                        <div className="font-bold text-xl underline decoration-1 underline-offset-4">ANNEXURE - SALARY REVISION DETAILS</div>
                      </div>

                      <div className="mb-4">
                        <p className="text-[14px] leading-6 mb-4">
                          Name: <span className="font-semibold">{letterData.employeeName}</span><br/>
                          Employee ID: <span className="font-semibold">{letterData.employeeId}</span>
                        </p>
                        <p className="text-[14px] leading-6 mb-4">
                          Revised compensation details with effect from <span className="font-semibold">{letterData.effectiveDate}</span>:
                        </p>
                      </div>

                      {/* Salary Table */}
                      <div className="mb-4">
                        <table className="w-full border-collapse border border-gray-300 text-sm">
                          <thead>
                            <tr className="bg-[#1e2b58] text-white">
                              <th className="border border-gray-300 px-4 py-2 text-left w-1/3">Salary Component</th>
                              <th className="border border-gray-300 px-4 py-2 text-right w-1/3">Current (Monthly)</th>
                              <th className="border border-gray-300 px-4 py-2 text-right w-1/3">Revised (Monthly)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label: 'Basic Salary', key: 'basic' },
                              { label: 'HRA', key: 'hra' },
                              { label: 'Special Allowance', key: 'special' },
                              { label: 'Gross Salary', key: 'gross', isBold: true },
                              { label: 'Employee PF', key: 'empPF' },
                              { label: 'Employer PF', key: 'employerPF' },
                              { label: 'Net Salary', key: 'net', isBold: true },
                              { label: 'Gratuity', key: 'gratuity' },
                              { label: 'CTC', key: 'ctc', isBold: true, isTotal: true }
                            ].map((row, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className={`border border-gray-300 px-4 py-2 ${row.isBold ? 'font-bold' : ''}`}>{row.label}</td>
                                <td className={`border border-gray-300 px-4 py-2 text-right ${row.isBold ? 'font-bold' : ''}`}>
                                  {letterData.salary.old[row.key]?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                </td>
                                <td className={`border border-gray-300 px-4 py-2 text-right ${row.isBold ? 'font-bold' : ''}`}>
                                  {letterData.salary.new[row.key]?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Notes and Declaration */}
                      <div className="mt-4 text-[13px] text-gray-800 leading-relaxed">
                        <div className="mb-4">
                          <p className="font-bold underline mb-1">Notes:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Professional Tax (PT): ₹1,250 (deducted every six months) in addition to regular statutory deductions.</li>
                            <li>Your revised salary will be subject to applicable statutory deductions, including Tax Deducted at Source (TDS) under the Income Tax Act, 1961, as amended from time to time, and any other statutory obligations.</li>
                          </ul>
                        </div>

                        <div className="mb-4">
                           <p>I accept the above offer described in this letter.</p>
                        </div>

                        <div className="mt-4">
                          <p className="font-bold underline mb-2">Employee Declaration:</p>
                          <p className="mb-8 text-justify">
                            I have read and understood the terms stated in this Annexure and agree to abide by them during my employment with Caldim Engineering Pvt Ltd.
                          </p>
                          
                          <div className="flex justify-between items-end mt-8 px-4">
                             <div className="font-bold">Signature: ______________________</div>
                             <div className="font-bold">Date: __________________</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="w-full h-24 relative mt-auto overflow-hidden">
                       {/* SVG Background for Footer */}
                      <div className="absolute inset-0 z-0">
                        <svg width="100%" height="100%" viewBox="0 0 794 96" preserveAspectRatio="none">
                          {/* Orange Bar */}
                          <rect x="0" y="84" width="350" height="12" fill="#f37021" />
                          {/* Blue Shape */}
                          <path d="M350,0 L794,0 L794,96 L290,96 Z" fill="#1e2b58" />
                        </svg>
                      </div>

                      <div className="relative z-10 w-full h-full flex items-center justify-end pr-10 pt-4">
                        <div className="text-white text-right">
                          <div className="text-sm font-medium tracking-wide">Website : www.caldimengg.com</div>
                          <div className="text-sm font-medium tracking-wide mt-1">CIN U74999TN2016PTC110683</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Popup */}
        <StatusPopup
          isOpen={statusPopup.isOpen}
          onClose={() => setStatusPopup({ ...statusPopup, isOpen: false })}
          status={statusPopup.status}
          message={statusPopup.message}
        />
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
                {isReadOnly ? (
                  <span className="text-lg font-bold text-[#262760] py-1 pl-3 pr-10">{formData.year}</span>
                ) : (
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] text-lg font-bold text-[#262760] py-1 pl-3 pr-10 cursor-pointer"
                  >
                    {['2025-26', '2026-27', '2027-28'].map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WorkflowTracker currentStageId={currentStageId} userFlow={userFlow} />

        {/* Projects Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Key Projects</h2>
            {!isReadOnly && (
              <button 
                onClick={openAddProjectModal}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#262760] hover:bg-[#1e2050]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Project
              </button>
            )}
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
                  {!isReadOnly && (
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
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Overall Contribution Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-gray-900">Overall Contribution</h2>
             {!isReadOnly && (
               <button
                 onClick={() => setShowContributionModal(true)}
                 className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
               >
                 <FileText className="h-4 w-4 mr-2" />
                 {formData.overallContribution ? 'Edit Contribution' : 'Add Contribution'}
               </button>
             )}
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
        icon={Award}
        colorTheme="blue"
        maxWidth="max-w-2xl"
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
        icon={FileText}
        colorTheme="purple"
        maxWidth="max-w-4xl"
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
              onClick={() => saveOverallContribution(formData.overallContribution)}
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      {/* Status Popup */}
      <StatusPopup
        isOpen={statusPopup.isOpen}
        onClose={() => setStatusPopup({ ...statusPopup, isOpen: false })}
        status={statusPopup.status}
        message={statusPopup.message}
      />


    </div>
  );
};

export default SelfAppraisal;
