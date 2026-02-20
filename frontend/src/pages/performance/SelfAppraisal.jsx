import React, { useState, useEffect } from 'react';
import WorkflowTracker from '../../components/Performance/WorkflowTracker';
import { getWorkflowForUser, APPRAISAL_STAGES } from '../../utils/performanceUtils';
import { performanceAPI, employeeAPI, leaveAPI, payrollAPI } from '../../services/api';
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
  XCircle,
  Users,
  Code,
  TrendingUp,
  Building2,
  Star,
  BarChart3,
  Target,
  Lightbulb
} from 'lucide-react';

// Colorful Modal Component
const Modal = ({ isOpen, onClose, title, children, icon: Icon, colorTheme = "blue", maxWidth = "max-w-lg" }) => {
  if (!isOpen) return null;

  const themeColors = {
    blue: "from-[#262760] to-[#1e2050]",
    purple: "from-purple-600 to-indigo-600",
    green: "from-emerald-500 to-teal-600",
    red: "from-red-500 to-rose-600",
    orange: "from-orange-500 to-red-600",
    teal: "from-teal-500 to-cyan-600"
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

// Rating Component
const RatingStars = ({ value, onChange, readOnly = false }) => {
  const stars = [1, 2, 3, 4, 5];
  
  return (
    <div className="flex items-center space-x-1">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readOnly && onChange(star)}
          className={`${!readOnly ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          disabled={readOnly}
        >
          <Star
            className={`h-5 w-5 ${
              star <= value
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
      {!readOnly && (
        <span className="ml-2 text-sm text-gray-500">
          {value ? `${value}/5` : 'Not rated'}
        </span>
      )}
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

const getFinancialYearRange = (financialYear) => {
  const parts = String(financialYear || '').split('-');
  const startYear = parseInt(parts[0], 10) || new Date().getFullYear();
  const start = new Date(startYear, 3, 1);
  const end = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);
  return { start, end };
};

const getWorkingDaysBetween = (start, end) => {
  let count = 0;
  const current = new Date(start.getTime());
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const formatDisplayDate = (value) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const deriveEffectiveDateForAppraisal = (financialYear, updatedAt, effectiveDateField) => {
  if (effectiveDateField) {
    const d = new Date(effectiveDateField);
    if (!Number.isNaN(d.getTime())) return formatDisplayDate(d);
  }
  if (updatedAt) {
    const d = new Date(updatedAt);
    if (!Number.isNaN(d.getTime())) return formatDisplayDate(d);
  }
  if (financialYear && String(financialYear).includes('-')) {
    const parts = String(financialYear).split(/[-/]/);
    const yearStart = parseInt(parts[0], 10);
    if (!Number.isNaN(yearStart)) {
      const d = new Date(yearStart, 3, 1);
      return formatDisplayDate(d);
    }
  }
  return '';
};

const getCurrentFinancialYearLabel = () => {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const nextYear = year + 1;
  return `${year}-${String(nextYear).slice(-2)}`;
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

  const employeeDisplayName = employeeInfo.name || employeeInfo.employeeName || '';
  const employeeInitials = employeeDisplayName
    ? employeeDisplayName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'EM';

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
      case 'Reviewed':
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
          division: 'Software',
          appraiser: 'John Doe',
          status: 'Submitted',
          releaseLetter: 'appraisal_2024-25.pdf',
          projects: [
            { id: 101, name: 'Project Alpha', contribution: 'Lead developer, implemented core features.' },
            { id: 102, name: 'Project Beta', contribution: 'Fixed critical bugs and improved performance.' }
          ],
          overallContribution: 'Successfully delivered two major projects and mentored junior developers.',
          // New attributes
          behaviourBased: {
            communication: 4,
            teamwork: 5,
            leadership: 4,
            adaptability: 4,
            initiatives: 5,
            comments: 'Excellent team player, always willing to help others.'
          },
          processAdherence: {
            timesheet: 4,
            reportStatus: 4,
            meeting: 5,
            comments: 'Consistently updates timesheets and attends meetings on time.'
          },
          technicalBased: {
            codingSkills: 4,
            testing: 4,
            debugging: 5,
            sds: 4,
            tekla: 4,
            comments: 'Strong debugging skills, good understanding of core concepts.'
          },
          growthBased: {
            learningNewTech: 5,
            certifications: 2,
            careerGoals: 'Aspiring to become technical architect',
            comments: 'Actively learning new technologies and pursuing certifications.'
          }
        },
        {
          id: 2,
          year: '2023-24',
          division: 'SDS',
          appraiser: 'Jane Smith',
          status: 'Released',
          releaseLetter: 'appraisal_2023-24.pdf',
          projects: [
             { id: 201, name: 'Legacy System Migration', contribution: 'Migrated database to new server.' }
          ],
          overallContribution: 'Completed migration ahead of schedule.',
          // New attributes for second appraisal
          behaviourBased: {
            communication: 4,
            teamwork: 4,
            leadership: 3,
            adaptability: 5,
            initiatives: 4,
            comments: 'Adapts quickly to changing requirements.'
          },
          processAdherence: {
            timesheet: 3,
            reportStatus: 4,
            meeting: 4,
            comments: 'Good at following reporting processes.'
          },
          technicalBased: {
            codingSkills: 4,
            testing: 3,
            debugging: 4,
            sds: 3,
            tekla: 3,
            comments: 'Solid technical foundation.'
          },
          growthBased: {
            learningNewTech: 4,
            certifications: 3,
            careerGoals: 'Want to specialize in database technologies',
            comments: 'Good progress in learning and certifications.'
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Form Data State - Enhanced with new attributes
  const [formData, setFormData] = useState({
    year: '2025-26',
    division: '',
    projects: [],
    overallContribution: '',
    status: 'Draft',
    // New attributes with default values
    behaviourBased: {
      communication: 0,
      teamwork: 0,
      leadership: 0,
      adaptability: 0,
      initiatives: 0,
      comments: ''
    },
    processAdherence: {
      timesheet: 0,
      reportStatus: 0,
      meeting: 0,
      comments: ''
    },
    technicalBased: {
      codingSkills: 0,
      testing: 0,
      debugging: 0,
      sds: 0,
      tekla: 0,
      comments: ''
    },
    growthBased: {
      learningNewTech: 0,
      certifications: 0,
      careerGoals: '',
      comments: ''
    }
  });

  const currentStageId = getStageFromStatus(formData.status);

  // Modal States
  const [showNewAppraisalModal, setShowNewAppraisalModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [currentProject, setCurrentProject] = useState({ id: null, name: '', contribution: '' });

  // New Modal States for each category
  const [showBehaviourModal, setShowBehaviourModal] = useState(false);
  const [showTechnicalModal, setShowTechnicalModal] = useState(false);
  const [showGrowthModal, setShowGrowthModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);

  // Status Popup State
  const [statusPopup, setStatusPopup] = useState({ isOpen: false, status: 'success', message: '' });

  // Letter State
  const [showReleaseLetter, setShowReleaseLetter] = useState(false);
  const [letterData, setLetterData] = useState(null);
  const [newAppraisalYear, setNewAppraisalYear] = useState(getCurrentFinancialYearLabel());
  const [newAppraisalDivision, setNewAppraisalDivision] = useState(employeeInfo.division || '');
  const [newAppraisalAttendance, setNewAppraisalAttendance] = useState({
    workingDays: 0,
    presentDays: 0,
    absentDays: 0,
    attendancePct: 0,
    loading: false,
  });

  // --- Handlers ---

  const startNewAppraisal = () => {
    setFormData({
      year: newAppraisalYear,
      division: newAppraisalDivision,
      projects: [],
      overallContribution: '',
      status: 'Draft',
      behaviourBased: {
        communication: 0,
        teamwork: 0,
        leadership: 0,
        adaptability: 0,
        initiatives: 0,
        comments: '',
      },
      processAdherence: {
        timesheet: 0,
        reportStatus: 0,
        meeting: 0,
        comments: '',
      },
      technicalBased: {
        codingSkills: 0,
        testing: 0,
        debugging: 0,
        sds: 0,
        tekla: 0,
        comments: '',
      },
      growthBased: {
        learningNewTech: 0,
        certifications: 0,
        careerGoals: '',
        comments: '',
      },
    });
    setIsReadOnly(false);
    setViewMode('edit');
  };

  useEffect(() => {
    const loadNewAppraisalAttendance = async () => {
      const fy = newAppraisalYear;
      const employeeId =
        employeeInfo.employeeId || employeeInfo.empId || employeeInfo.id || '';
      if (!fy || !employeeId) {
        setNewAppraisalAttendance({
          workingDays: 0,
          presentDays: 0,
          absentDays: 0,
          attendancePct: 0,
          loading: false,
        });
        return;
      }

      try {
        setNewAppraisalAttendance((prev) => ({ ...prev, loading: true }));
        const range = getFinancialYearRange(fy);
        const workingDays = getWorkingDaysBetween(range.start, range.end);

        const res = await performanceAPI.getMySelfAppraisals();
        const items = Array.isArray(res.data) ? res.data : [];

        let present = 0;
        let absent = 0;
        let pct = 0;

        const match = items.find((a) => a.year === fy);
        if (match && typeof match.attendancePresent === 'number') {
          present = match.attendancePresent;
          absent = match.attendanceAbsent || 0;
          if (workingDays > 0) {
            pct = Math.max(0, Math.min(100, (present / workingDays) * 100));
          }
        }

        setNewAppraisalAttendance({
          workingDays,
          presentDays: present,
          absentDays: absent,
          attendancePct: pct,
          loading: false,
        });
      } catch {
        setNewAppraisalAttendance((prev) => ({ ...prev, loading: false }));
      }
    };

    loadNewAppraisalAttendance();
  }, [newAppraisalYear, employeeInfo.employeeId, employeeInfo.empId, employeeInfo.id]);

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
      setFormData({
        division: response.data.division || 'Software',
        ...response.data
      });
      setIsReadOnly(false);
      setViewMode('edit');
    } catch (error) {
      console.error("Failed to fetch appraisal details", error);
      setFormData({ 
        ...formData, 
        division: appraisal.division || formData.division || 'Software',
        ...appraisal 
      }); 
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

  const handleAcceptAppraisal = async (appraisal) => {
    const id = appraisal._id || appraisal.id;
    if (!id) return;

    if (window.confirm('Do you accept this appraisal and release letter?')) {
      try {
        await performanceAPI.updateSelfAppraisal(id, { status: 'Reviewed' });
        fetchAppraisals();
        setStatusPopup({ 
          isOpen: true, 
          status: 'success', 
          message: 'Appraisal accepted successfully.' 
        });
      } catch (error) {
        console.error("Failed to accept appraisal", error);
        const errorMsg = error.response?.data?.message || 'Failed to accept appraisal.';
        setStatusPopup({ isOpen: true, status: 'error', message: errorMsg });
      }
    }
  };

  const handleDownloadLetter = async (appraisal) => {
    try {
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
        employeeDetails = { ...employeeInfo, ...appraisal };
      }

      const financialYear = appraisal.year || getCurrentFinancialYearLabel();
      const effectiveDate = deriveEffectiveDateForAppraisal(
        financialYear,
        appraisal.updatedAt,
        appraisal.effectiveDate
      );

      const today = new Date();
      const letterDate = formatDisplayDate(today);

      const employeeIdValue =
        employeeDetails.employeeId ||
        employeeDetails.empId ||
        appraisal.empId ||
        employeeInfo.employeeId ||
        appraisal.employeeId;

      let salaryOld = {
        basic: 0,
        hra: 0,
        special: 0,
        gross: 0,
        empPF: 0,
        employerPF: 0,
        net: 0,
        gratuity: 0,
        ctc: 0
      };

      try {
        if (employeeIdValue) {
          const payrollRes = await payrollAPI.list();
          const items = Array.isArray(payrollRes.data) ? payrollRes.data : [];
          const empIdNorm = String(employeeIdValue).toLowerCase();
          const record = items.find(
            (p) => String(p.employeeId || '').toLowerCase() === empIdNorm
          );

          if (record) {
            const basic = Number(record.basicDA || 0);
            const hra = Number(record.hra || 0);
            const special = Number(record.specialAllowance || 0);
            const gross = Number(
              record.totalEarnings !== undefined
                ? record.totalEarnings
                : basic + hra + special
            );
            const empPF = Number(record.pf || 0);
            const employerPF = Number(record.employerPF || record.pf || 0);
            const net = Number(record.netSalary || gross);
            const gratuity = Number(record.gratuity || 0);
            const ctc = Number(
              record.ctc !== undefined ? record.ctc : gross + gratuity
            );

            salaryOld = {
              basic,
              hra,
              special,
              gross,
              empPF,
              employerPF,
              net,
              gratuity,
              ctc
            };
          }
        }
      } catch (err) {
        console.error('Failed to fetch payroll details for letter', err);
      }

      if (!salaryOld.ctc) {
        const currentSalary =
          Number(appraisal.currentSalary || 0) || Number(appraisal.salary || 0);
        if (currentSalary) {
          salaryOld = {
            basic: 0,
            hra: 0,
            special: 0,
            gross: currentSalary,
            empPF: 0,
            employerPF: 0,
            net: currentSalary,
            gratuity: 0,
            ctc: currentSalary
          };
        }
      }

      const baseCtc = salaryOld.ctc || 0;
      const basePct = Number(appraisal.incrementPercentage || 0);
      const correctionPct = Number(appraisal.incrementCorrectionPercentage || 0);
      let totalPct = basePct + correctionPct;

      const revisedFromAppraisal = Number(appraisal.revisedSalary || 0);

      let factor = 1;
      if (baseCtc && totalPct > 0) {
        factor = 1 + totalPct / 100;
      } else if (baseCtc && revisedFromAppraisal > 0) {
        factor = revisedFromAppraisal / baseCtc;
      }

      const revisedCtc = Math.round(baseCtc * factor);
      const incrementAmount = revisedCtc - baseCtc;

      const salaryNew = {
        basic: Math.round((salaryOld.basic || 0) * factor),
        hra: Math.round((salaryOld.hra || 0) * factor),
        special: Math.round((salaryOld.special || 0) * factor),
        gross: Math.round((salaryOld.gross || baseCtc) * factor),
        empPF: Math.round((salaryOld.empPF || 0) * factor),
        employerPF: Math.round((salaryOld.employerPF || 0) * factor),
        net: Math.round((salaryOld.net || baseCtc) * factor),
        gratuity: Math.round((salaryOld.gratuity || 0) * factor),
        ctc: revisedCtc
      };

      const data = {
        date: letterDate,
        employeeName: employeeDetails.name || employeeDetails.fullName || employeeInfo.name,
        employeeId: employeeDetails.employeeId || employeeDetails.empId || employeeInfo.employeeId || 'EMP-001',
        designation: employeeDetails.designation || employeeDetails.role || employeeInfo.designation,
        location: employeeDetails.location || employeeDetails.branch || employeeInfo.location || 'Chennai',
        financialYear: financialYear,
        effectiveDate: effectiveDate,
        incrementPercentage: totalPct,
        incrementAmount,
        salary: {
          old: salaryOld,
          new: salaryNew
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
      const currentAppraisal = appraisals.find(
        (a) =>
          (a.employeeId || a.empId) &&
          String(a.employeeId || a.empId) === String(letterData.employeeId)
      );

      if (
        !currentAppraisal ||
        !['DIRECTOR_APPROVED', 'Released', 'Reviewed'].includes(currentAppraisal.status || '')
      ) {
        setStatusPopup({
          isOpen: true,
          status: 'error',
          message: "PDF export is available only after Director approval."
        });
        return;
      }

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

  // Category Handlers
  const updateBehaviourRating = (field, value) => {
    setFormData({
      ...formData,
      behaviourBased: {
        ...formData.behaviourBased,
        [field]: value
      }
    });
  };

  const updateTechnicalRating = (field, value) => {
    setFormData({
      ...formData,
      technicalBased: {
        ...formData.technicalBased,
        [field]: value
      }
    });
  };

  const updateGrowthRating = (field, value) => {
    setFormData({
      ...formData,
      growthBased: {
        ...formData.growthBased,
        [field]: value
      }
    });
  };

  const updateProcessRating = (field, value) => {
    setFormData({
      ...formData,
      processAdherence: {
        ...formData.processAdherence,
        [field]: value
      }
    });
  };

  const getTechnicalFieldsForDivision = (division) => {
    const d = division || 'Software';
    if (d === 'SDS') {
      return [
        { key: 'codingSkills', label: 'Structural Drawing Accuracy' },
        { key: 'testing', label: 'Steel Connection Knowledge' },
        { key: 'debugging', label: 'Bolt & Weld Detailing Accuracy' },
        { key: 'sds', label: 'GA / Shop / Erection Drawing Quality' },
        { key: 'tekla', label: 'Drawing Revision & Error Reduction' }
      ];
    }
    if (d === 'Tekla') {
      return [
        { key: 'codingSkills', label: '3D Modeling Accuracy' },
        { key: 'testing', label: 'Clash Detection Handling' },
        { key: 'debugging', label: 'Model Integrity & Cleanliness' },
        { key: 'sds', label: 'Complex Connection Modeling' },
        { key: 'tekla', label: 'Anchor Bolt Layout & Output' }
      ];
    }
    return [
      { key: 'codingSkills', label: 'Code Quality' },
      { key: 'testing', label: 'System Architecture Understanding' },
      { key: 'debugging', label: 'Debugging & Issue Resolution' },
      { key: 'sds', label: 'API Integration Skills' },
      { key: 'tekla', label: 'Testing & Validation' }
    ];
  };

  const handleSubmit = async (action) => {
    try {
      const missingSections = [];

      if (!formData.division || !formData.division.trim()) {
        missingSections.push('Division');
      }
      if (!formData.behaviourBased?.comments || !formData.behaviourBased.comments.trim()) {
        missingSections.push('Knowledge Sharing Assessment');
      }
      if (!formData.processAdherence?.comments || !formData.processAdherence.comments.trim()) {
        missingSections.push('Process Adherence Assessment');
      }
      if (!formData.technicalBased?.comments || !formData.technicalBased.comments.trim()) {
        missingSections.push('Technical Based Assessment');
      }
      if (!formData.growthBased?.comments || !formData.growthBased.comments.trim()) {
        missingSections.push('Growth Based Assessment');
      }

      if (missingSections.length > 0) {
        setStatusPopup({
          isOpen: true,
          status: 'error',
          message: `Please fill Appraisee Comments for: ${missingSections.join(', ')}.`
        });
        return;
      }

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
              onClick={() => setShowNewAppraisalModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-semibold rounded-full text-white bg-gradient-to-r from-[#262760] to-indigo-600 hover:from-[#1e2050] hover:to-[#262760] focus:outline-none"
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
                    Appraisal Letter
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
                        {(!['DIRECTOR_APPROVED', 'Released', 'Reviewed'].includes(appraisal.status || '')) && (
                          <>
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
                          </>
                        )}
                        {['DIRECTOR_APPROVED', 'Released', 'Reviewed'].includes(appraisal.status || '') && (
                          <>
                            <button 
                              onClick={() => handleViewAppraisal(appraisal)}
                              className="text-gray-600 hover:text-gray-900"
                              title="View"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDownloadLetter(appraisal)}
                              className="text-[#262760] hover:text-[#1e2050]"
                              title="Preview Appraisal Letter"
                            >
                              <FileText className="h-5 w-5" />
                            </button>
                            {appraisal.status !== 'Reviewed' && (
                              <button
                                onClick={() => handleAcceptAppraisal(appraisal)}
                                className="text-emerald-600 hover:text-emerald-800"
                                title="Accept"
                              >
                                <CheckCircle className="h-5 w-5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {appraisal.status === 'Released' || appraisal.status === 'Reviewed' || appraisal.status === 'DIRECTOR_APPROVED' ? (
                        <button 
                          onClick={() => handleDownloadLetter(appraisal)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
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

        <Modal
          isOpen={showNewAppraisalModal}
          onClose={() => setShowNewAppraisalModal(false)}
          title="Start New Self Appraisal"
          icon={Award}
          colorTheme="purple"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-[#262760] to-indigo-600 rounded-2xl p-4 text-white flex items-center shadow-md">
                <div className="flex-shrink-0 mr-4">
                  <div className="h-12 w-12 rounded-full bg-white/15 flex items-center justify-center text-lg font-bold">
                    {employeeInitials}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-indigo-100 mb-1">
                    Employee
                  </div>
                  <div className="text-base font-semibold">
                    {employeeInfo.name || employeeInfo.employeeName || 'Employee'}
                  </div>
                  <div className="text-[11px] text-indigo-100 mt-1">
                    ID: {employeeInfo.employeeId || employeeInfo.empId || 'N/A'}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="text-[11px] font-semibold text-gray-500 uppercase mb-1">
                    New Appraisal Draft
                  </div>
                  <p className="text-sm text-gray-600">
                    A fresh self appraisal will be created for you. You can add projects,
                    ratings and comments in the next screen.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Status: Draft
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Step 1 of 2
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <div className="text-[11px] font-semibold text-gray-500 uppercase mb-2">
                  Appraisal Settings
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">
                      Financial Year
                    </label>
                    <select
                      value={newAppraisalYear}
                      onChange={(e) => setNewAppraisalYear(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] text-sm font-semibold text-[#262760]"
                    >
                      {[getCurrentFinancialYearLabel(), '2025-26', '2026-27', '2027-28']
                        .filter((v, i, arr) => arr.indexOf(v) === i)
                        .map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">
                      Division
                    </label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] text-sm"
                      value={newAppraisalDivision}
                      onChange={(e) => setNewAppraisalDivision(e.target.value)}
                    >
                      <option value="">Select Division</option>
                      <option value="Software">Software</option>
                      <option value="SDS">SDS (Steel Detailing)</option>
                      <option value="Tekla">Tekla (3D Modeling)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase">
                    Attendance Snapshot
                  </span>
                  <span className="text-[11px] text-gray-400">
                    FY {newAppraisalYear}
                  </span>
                </div>
                {newAppraisalAttendance.loading ? (
                  <div className="text-sm text-gray-500 mt-2">Loading attendance...</div>
                ) : (
                  <div className="mt-2 space-y-2 text-sm text-gray-700">
                    <div className="flex justify-between">
                      <span>Present Days</span>
                      <span className="font-semibold">{newAppraisalAttendance.presentDays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Absent Days</span>
                      <span className="font-semibold">{newAppraisalAttendance.absentDays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Attendance %</span>
                      <span className="font-semibold">
                        {newAppraisalAttendance.attendancePct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-200">
              <div className="flex items-center space-x-2 text-[11px] text-gray-500">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Next: Fill self appraisal details and submit to appraiser</span>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowNewAppraisalModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newAppraisalDivision || !newAppraisalDivision.trim()) {
                      setStatusPopup({
                        isOpen: true,
                        status: 'error',
                        message: 'Please select Division before creating self appraisal.',
                      });
                      return;
                    }
                    setShowNewAppraisalModal(false);
                    startNewAppraisal();
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-full shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Appraisal
                </button>
              </div>
            </div>
          </div>
        </Modal>

        {/* View Appraisal Modal */}
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title={`Appraisal Details - FY ${viewData?.year || ''}`}
          icon={Eye}
          colorTheme="blue"
          maxWidth="max-w-6xl"
        >
          {viewData && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
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

              {/* Behaviour Based Section */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-purple-600" />
                  Knowledge Sharing Assessment
                </h3>
                <div className="bg-purple-50 rounded-lg p-5 border border-purple-100 shadow-sm">
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="font-semibold">Knowledge Sharing:</span>
                      <span className="ml-1">Self {viewData.behaviourBased?.communication}/5</span>
                      <span className="ml-2 text-gray-600">Manager {viewData.behaviourCommunicationManager || 0}/5</span>
                    </div>
                    <div>
                      <span className="font-semibold">Mentoring:</span>
                      <span className="ml-1">Self {viewData.behaviourBased?.teamwork}/5</span>
                      <span className="ml-2 text-gray-600">Manager {viewData.behaviourTeamworkManager || 0}/5</span>
                    </div>
                    <div>
                      <span className="font-semibold">Leadership:</span>
                      <span className="ml-1">Self {viewData.behaviourBased?.leadership}/5</span>
                      <span className="ml-2 text-gray-600">Manager {viewData.behaviourLeadershipManager || 0}/5</span>
                    </div>
                    <div>
                      <span className="font-semibold">Adaptability:</span>
                      <span className="ml-1">Self {viewData.behaviourBased?.adaptability}/5</span>
                      <span className="ml-2 text-gray-600">Manager {viewData.behaviourAdaptabilityManager || 0}/5</span>
                    </div>
                    <div>
                      <span className="font-semibold">Initiative:</span>
                      <span className="ml-1">Self {viewData.behaviourBased?.initiatives}/5</span>
                      <span className="ml-2 text-gray-600">Manager {viewData.behaviourInitiativesManager || 0}/5</span>
                    </div>
                  </div>
                  {viewData.behaviourBased?.comments && (
                    <div className="mt-2 p-3 bg-white rounded border border-purple-100">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Appraisee Comments</p>
                      <p className="text-sm text-gray-700 italic">"{viewData.behaviourBased.comments}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Process Adherence Section */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-orange-600" />
                  Process Adherence
                </h3>
                <div className="bg-orange-50 rounded-lg p-5 border border-orange-100 shadow-sm">
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="font-semibold">Timesheet:</span>
                      <span className="ml-1">Self {viewData.processAdherence?.timesheet}/5</span>
                      <span className="ml-2 text-gray-600">Manager {viewData.processTimesheetManager || 0}/5</span>
                    </div>
                    <div>
                      <span className="font-semibold">Report Status:</span>
                      <span className="ml-1">Self {viewData.processAdherence?.reportStatus}/5</span>
                      <span className="ml-2 text-gray-600">Manager {viewData.processReportStatusManager || 0}/5</span>
                    </div>
                    <div>
                      <span className="font-semibold">Meeting:</span>
                      <span className="ml-1">Self {viewData.processAdherence?.meeting}/5</span>
                      <span className="ml-2 text-gray-600">Manager {viewData.processMeetingManager || 0}/5</span>
                    </div>
                  </div>
                  {viewData.processAdherence?.comments && (
                    <div className="mt-2 p-3 bg-white rounded border border-orange-100">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Appraisee Comments</p>
                      <p className="text-sm text-gray-700 italic">"{viewData.processAdherence.comments}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Technical Based Section */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                  <Code className="h-5 w-5 mr-2 text-blue-600" />
                  Technical Based Assessment
                </h3>
                <div className="bg-blue-50 rounded-lg p-5 border border-blue-100 shadow-sm">
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    {getTechnicalFieldsForDivision(viewData.division).map((field) => (
                      <div key={field.key}>
                        <span className="font-semibold">{field.label}:</span>
                        <span className="ml-1">Self {viewData.technicalBased?.[field.key]}/5</span>
                        <span className="ml-2 text-gray-600">
                          Manager {viewData[`technical${field.key.charAt(0).toUpperCase() + field.key.slice(1)}Manager`] || 0}/5
                        </span>
                      </div>
                    ))}
                  </div>
                  {viewData.technicalBased?.comments && (
                    <div className="mt-2 p-3 bg-white rounded border border-blue-100">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Appraisee Comments</p>
                      <p className="text-sm text-gray-700 italic">"{viewData.technicalBased.comments}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Growth Based Section */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                  Growth Based Assessment
                </h3>
                <div className="bg-green-50 rounded-lg p-5 border border-green-100 shadow-sm">
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="font-semibold">Learning New Tech:</span>
                      <span className="ml-1">Self {viewData.growthBased?.learningNewTech}/5</span>
                      <span className="ml-2 text-gray-600">Manager {viewData.growthLearningNewTechManager || 0}/5</span>
                    </div>
                    <div>
                      <span className="font-semibold">Certifications:</span>
                      <span className="ml-1">Self {viewData.growthBased?.certifications}/5</span>
                      <span className="ml-2 text-gray-600">Manager {viewData.growthCertificationsManager || 0}/5</span>
                    </div>
                  </div>
                  {viewData.growthBased?.careerGoals && (
                    <div className="mt-2">
                      <span className="font-semibold">Career Goals:</span>
                      <p className="text-gray-700 mt-1">{viewData.growthBased.careerGoals}</p>
                    </div>
                  )}
                  {viewData.growthBased?.comments && (
                    <div className="mt-2 p-3 bg-white rounded border border-green-100">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Appraisee Comments</p>
                      <p className="text-sm text-gray-700 italic">"{viewData.growthBased.comments}"</p>
                    </div>
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

              {viewData.managerComments && getStageFromStatus(viewData.status) === 'release' && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-600" />
                    Manager Comments
                  </h3>
                  <div className="bg-blue-50 rounded-lg p-5 border border-blue-100 shadow-sm">
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-base italic">
                      "{viewData.managerComments}"
                    </p>
                  </div>
                </div>
              )}

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
                          The Performance Review for the financial year {letterData.financialYear} has been completed.
                        </p>
                        <p className="text-justify text-[14px] leading-6 mb-4">
                          We are pleased to inform you that based on the available benchmarks in the industry and your performance appraisal, we have revised your compensation effective {letterData.effectiveDate}.
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
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WorkflowTracker currentStageId={currentStageId} userFlow={userFlow} />

        {/* Projects Section */}
        <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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

        {/* NEW: Behaviour Based Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Users className="h-6 w-6 mr-2 text-purple-600" />
              Knowledge Sharing Assessment
            </h2>
            {!isReadOnly && (
              <button 
                onClick={() => setShowBehaviourModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                {Object.values(formData.behaviourBased).some(v => v !== 0 && v !== '') ? 'Edit Ratings' : 'Add Ratings'}
              </button>
            )}
          </div>

          <div className="bg-purple-50 rounded-lg p-5 border border-purple-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Knowledge Sharing:</span>
                <RatingStars value={formData.behaviourBased.communication} onChange={() => {}} readOnly={true} />
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Mentoring:</span>
                <RatingStars value={formData.behaviourBased.teamwork} onChange={() => {}} readOnly={true} />
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Leadership:</span>
                <RatingStars value={formData.behaviourBased.leadership} onChange={() => {}} readOnly={true} />
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Adaptability:</span>
                <RatingStars value={formData.behaviourBased.adaptability} onChange={() => {}} readOnly={true} />
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Initiative:</span>
                <RatingStars value={formData.behaviourBased.initiatives} onChange={() => {}} readOnly={true} />
              </div>
            </div>
            {formData.behaviourBased.comments && (
              <div className="mt-4 p-3 bg-white rounded border border-purple-100">
                <p className="text-xs font-semibold text-gray-600 mb-1">Appraisee Comments</p>
                <p className="text-sm text-gray-700 italic">"{formData.behaviourBased.comments}"</p>
              </div>
            )}
          </div>
        </div>

        {/* NEW: Process Adherence Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="h-6 w-6 mr-2 text-orange-600" />
              Process Adherence
            </h2>
            {!isReadOnly && (
              <button 
                onClick={() => setShowProcessModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                {Object.values(formData.processAdherence || {}).some(v => v !== 0 && v !== '') ? 'Edit Ratings' : 'Add Ratings'}
              </button>
            )}
          </div>

          <div className="bg-orange-50 rounded-lg p-5 border border-orange-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Timesheet:</span>
                <RatingStars value={formData.processAdherence?.timesheet || 0} onChange={() => {}} readOnly={true} />
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Report Status:</span>
                <RatingStars value={formData.processAdherence?.reportStatus || 0} onChange={() => {}} readOnly={true} />
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Meeting:</span>
                <RatingStars value={formData.processAdherence?.meeting || 0} onChange={() => {}} readOnly={true} />
              </div>
            </div>
            {formData.processAdherence?.comments && (
              <div className="mt-4 p-3 bg-white rounded border border-orange-100">
                <p className="text-xs font-semibold text-gray-600 mb-1">Appraisee Comments</p>
                <p className="text-sm text-gray-700 italic">"{formData.processAdherence.comments}"</p>
              </div>
            )}
          </div>
        </div>

        {/* NEW: Technical Based Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Code className="h-6 w-6 mr-2 text-blue-600" />
              Technical Based Assessment
            </h2>
            {!isReadOnly && (
              <button 
                onClick={() => setShowTechnicalModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                {Object.values(formData.technicalBased).some(v => v !== 0 && v !== '') ? 'Edit Ratings' : 'Add Ratings'}
              </button>
            )}
          </div>

          <div className="bg-blue-50 rounded-lg p-5 border border-blue-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getTechnicalFieldsForDivision(formData.division).map((field) => (
                <div className="flex justify-between items-center" key={field.key}>
                  <span className="font-medium text-gray-700">{field.label}:</span>
                  <RatingStars value={formData.technicalBased[field.key]} onChange={() => {}} readOnly={true} />
                </div>
              ))}
            </div>
            {formData.technicalBased.comments && (
              <div className="mt-4 p-3 bg-white rounded border border-blue-100">
                <p className="text-xs font-semibold text-gray-600 mb-1">Appraisee Comments</p>
                <p className="text-sm text-gray-700 italic">"{formData.technicalBased.comments}"</p>
              </div>
            )}
          </div>
        </div>

        {/* NEW: Growth Based Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <TrendingUp className="h-6 w-6 mr-2 text-green-600" />
              Growth Based Assessment
            </h2>
            {!isReadOnly && (
              <button 
                onClick={() => setShowGrowthModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                {Object.values(formData.growthBased).some(v => v !== 0 && v !== '') ? 'Edit Ratings' : 'Add Ratings'}
              </button>
            )}
          </div>

          <div className="bg-green-50 rounded-lg p-5 border border-green-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Learning New Tech:</span>
                <RatingStars value={formData.growthBased.learningNewTech} onChange={() => {}} readOnly={true} />
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Certifications:</span>
                <RatingStars value={formData.growthBased.certifications} onChange={() => {}} readOnly={true} />
              </div>
            </div>
            {formData.growthBased.careerGoals && (
              <div className="mt-3">
                <span className="font-medium text-gray-700">Career Goals:</span>
                <p className="text-sm text-gray-700 mt-1">{formData.growthBased.careerGoals}</p>
              </div>
            )}
            {formData.growthBased.comments && (
              <div className="mt-3 p-3 bg-white rounded border border-green-100">
                <p className="text-xs font-semibold text-gray-600 mb-1">Appraisee Comments</p>
                <p className="text-sm text-gray-700 italic">"{formData.growthBased.comments}"</p>
              </div>
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

      {/* Knowledge Sharing Modal */}
      <Modal
        isOpen={showBehaviourModal}
        onClose={() => setShowBehaviourModal(false)}
        title="Knowledge Sharing Assessment"
        icon={Users}a
        colorTheme="purple"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Knowledge Sharing</label>
            <RatingStars 
              value={formData.behaviourBased.communication} 
              onChange={(value) => updateBehaviourRating('communication', value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mentoring</label>
            <RatingStars 
              value={formData.behaviourBased.teamwork} 
              onChange={(value) => updateBehaviourRating('teamwork', value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Leadership & Influence</label>
            <RatingStars 
              value={formData.behaviourBased.leadership} 
              onChange={(value) => updateBehaviourRating('leadership', value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Adaptability & Flexibility</label>
            <RatingStars 
              value={formData.behaviourBased.adaptability} 
              onChange={(value) => updateBehaviourRating('adaptability', value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Initiative & Proactiveness</label>
            <RatingStars 
              value={formData.behaviourBased.initiatives} 
              onChange={(value) => updateBehaviourRating('initiatives', value)} 
            />
          </div>
          <div className="rounded-md bg-purple-50 border border-purple-100 p-3 text-xs text-gray-700">
            <span className="font-semibold">KPP Description: </span>
            This assessment covers knowledge sharing, mentoring, leadership, adaptability and initiative
            shown while working with team members and stakeholders.
          </div>
          <div>
            <label className="block text-sm font-medium text-red-600 mb-1">Appraisee Comments *</label>
            <textarea
              rows={3}
              value={formData.behaviourBased.comments}
              onChange={(e) => updateBehaviourRating('comments', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] sm:text-sm p-2 border"
              placeholder="Enter your comments about your knowledge sharing and behavioral performance..."
            />
          </div>
          <div className="mt-5 sm:mt-6 flex justify-end space-x-2">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
              onClick={() => setShowBehaviourModal(false)}
            >
              Close
            </button>
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#262760] text-base font-medium text-white hover:bg-[#1e2050] focus:outline-none sm:text-sm"
              onClick={() => setShowBehaviourModal(false)}
            >
              Save & Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Process Adherence Modal */}
      <Modal
        isOpen={showProcessModal}
        onClose={() => setShowProcessModal(false)}
        title="Process Adherence"
        icon={BarChart3}
        colorTheme="orange"
        maxWidth="max-w-2xl"
      >
          <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timesheet</label>
            <p className="text-xs text-gray-500 mb-1">
              Timely submission, accurate entries, daily discipline, correct project allocation, minimal missed timesheets.
            </p>
            <RatingStars 
              value={formData.processAdherence?.timesheet || 0} 
              onChange={(value) => updateProcessRating('timesheet', value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Status</label>
            <p className="text-xs text-gray-500 mb-1">
              Daily/weekly report timeliness, accuracy, clarity of progress, delay justification, report format compliance.
            </p>
            <p className="text-[11px] text-gray-500 mb-1">
              SDS/Tekla: Drawing status reports. Software: Sprint / task reports.
            </p>
            <RatingStars 
              value={formData.processAdherence?.reportStatus || 0} 
              onChange={(value) => updateProcessRating('reportStatus', value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting</label>
            <p className="text-xs text-gray-500 mb-1">
              Attendance and punctuality, active participation, action item completion, MOM follow-up.
            </p>
            <RatingStars 
              value={formData.processAdherence?.meeting || 0} 
              onChange={(value) => updateProcessRating('meeting', value)} 
            />
          </div>
          <div className="rounded-md bg-orange-50 border border-orange-100 p-3 text-xs text-gray-700">
            <span className="font-semibold">KPP Description: </span>
            Overall adherence to company processes for timesheets, reporting and meeting discipline.
          </div>
          <div>
            <label className="block text-sm font-medium text-red-600 mb-1">Appraisee Comments *</label>
            <textarea
              rows={3}
              value={formData.processAdherence?.comments || ''}
              onChange={(e) => updateProcessRating('comments', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] sm:text-sm p-2 border"
              placeholder="Enter your comments about your process adherence..."
            />
          </div>
          <div className="mt-5 sm:mt-6 flex justify-end space-x-2">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
              onClick={() => setShowProcessModal(false)}
            >
              Close
            </button>
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#262760] text-base font-medium text-white hover:bg-[#1e2050] focus:outline-none sm:text-sm"
              onClick={() => setShowProcessModal(false)}
            >
              Save & Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Technical Based Modal */}
      <Modal
        isOpen={showTechnicalModal}
        onClose={() => setShowTechnicalModal(false)}
        title="Technical Based Assessment"
        icon={Code}
        colorTheme="blue"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          {getTechnicalFieldsForDivision(formData.division).map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
              <RatingStars 
                value={formData.technicalBased[field.key]} 
                onChange={(value) => updateTechnicalRating(field.key, value)} 
              />
            </div>
          ))}
          <div className="rounded-md bg-blue-50 border border-blue-100 p-3 text-xs text-gray-700">
            <span className="font-semibold">KPP Description: </span>
            Technical attributes based on selected division (Software / SDS / Tekla).
          </div>
          <div>
            <label className="block text-sm font-medium text-red-600 mb-1">Appraisee Comments *</label>
            <textarea
              rows={3}
              value={formData.technicalBased.comments}
              onChange={(e) => updateTechnicalRating('comments', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] sm:text-sm p-2 border"
              placeholder="Enter your comments about your technical performance..."
            />
          </div>
          <div className="mt-5 sm:mt-6 flex justify-end space-x-2">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
              onClick={() => setShowTechnicalModal(false)}
            >
              Close
            </button>
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#262760] text-base font-medium text-white hover:bg-[#1e2050] focus:outline-none sm:text-sm"
              onClick={() => setShowTechnicalModal(false)}
            >
              Save & Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Growth Based Modal */}
      <Modal
        isOpen={showGrowthModal}
        onClose={() => setShowGrowthModal(false)}
        title="Growth Based Assessment"
        icon={TrendingUp}
        colorTheme="green"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Learning New Technologies</label>
            <RatingStars 
              value={formData.growthBased.learningNewTech} 
              onChange={(value) => updateGrowthRating('learningNewTech', value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Certifications & Courses</label>
            <RatingStars 
              value={formData.growthBased.certifications} 
              onChange={(value) => updateGrowthRating('certifications', value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Career Goals & Aspirations</label>
            <textarea
              rows={2}
              value={formData.growthBased.careerGoals}
              onChange={(e) => updateGrowthRating('careerGoals', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] sm:text-sm p-2 border"
              placeholder="Describe your career goals for the next 1-3 years..."
            />
          </div>
          <div className="rounded-md bg-green-50 border border-green-100 p-3 text-xs text-gray-700">
            <span className="font-semibold">KPP Description: </span>
            This assessment covers learning new technologies and pursuing relevant certifications for growth.
          </div>
          <div>
            <label className="block text-sm font-medium text-red-600 mb-1">Appraisee Comments *</label>
            <textarea
              rows={2}
              value={formData.growthBased.comments}
              onChange={(e) => updateGrowthRating('comments', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] sm:text-sm p-2 border"
              placeholder="Enter your comments about your growth and development..."
            />
          </div>
          <div className="mt-5 sm:mt-6 flex justify-end space-x-2">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
              onClick={() => setShowGrowthModal(false)}
            >
              Close
            </button>
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#262760] text-base font-medium text-white hover:bg-[#1e2050] focus:outline-none sm:text-sm"
              onClick={() => setShowGrowthModal(false)}
            >
              Save & Close
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
              placeholder="Summarize your overall performance for the year. Include key achievements, challenges overcome, and value added to the organization..."
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
