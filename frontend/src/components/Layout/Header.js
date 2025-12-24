// src/components/Header.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  UserIcon,
  BriefcaseIcon,
  PhoneIcon,
  BanknotesIcon,
  CreditCardIcon,
  IdentificationIcon,
  MapPinIcon,
  BuildingLibraryIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { employeeAPI } from '../../services/api';

const Header = ({ onMenuClick }) => {
  const location = useLocation();
  const user = JSON.parse(sessionStorage.getItem('user') || '{"name":"John Doe","email":"john.doe@example.com","role":"Employee"}');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const profileRef = useRef(null);
  const navigate = useNavigate();

  // Map routes to page titles
  const getPageTitle = () => {
    const routeTitles = {
      '/dashboard': 'Caldim Engineering ',
      '/user-access': 'User Access',
      '/employee-management': 'Employee Management',
      '/announcements': 'Announcement Management',
      '/timesheet': 'Employee Timesheet',
      '/timesheet/history': 'Timesheet History',
      '/timesheet/attendance': 'Employee In/Out Timing',
      '/timesheet/regularization': 'Attendance Regularization',
      '/timesheet/attendance-approval': 'Attendance Approval',
      '/admin/timesheet': 'Admin Timesheet Management',
      '/admin/timesheet/approval': 'Timesheet Summary',
      '/project-allocation': 'Project Allocation',
      '/leave-management/summary': 'Leave Summary',
      '/leave-management/balance': 'Leave Balance',
      '/leave-management/edit-eligibility': 'Edit Leave Eligibility',
      '/leave-management/trainees': 'Trainees Management',
      '/leave-applications': 'Leave Applications',
      '/insurance': 'Insurance',
      '/policies': 'Policy Portal',
      '/salaryslips': 'Salary Slips',
      '/expenditure-management': 'Expenditure Management',
      '/employee-reward-tracker': 'Employee Reward Tracker',
      '/admin/team-management': 'Team Management',
      '/payroll/details': 'Employee PayRolls Details',
      '/payroll/cost-to-the-company': 'Cost to the Company',
      '/payroll/loan-summary': 'Loan Summary',
      '/payroll/gratuity-summary': 'Gratuity Summary',
      '/payroll/monthly': 'Monthly Payroll',
      '/admin/interns': 'Internships',
    };
    
    return routeTitles[location.pathname] || 'Dashboard';
  };

  // Get the first letter of the user's name for the avatar
  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const handleProfileEdit = () => {
    setIsProfileOpen(false);
    setIsProfileEditOpen(true);
  };

  // Format date and time for India (Asia/Kolkata)
  const formattedDate = currentTime.toLocaleDateString('en-IN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });

  const formattedTime = currentTime.toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });

  // Get greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Profile form state
  const [formData, setFormData] = useState({
    // Personal Information
    employeeId: '',
    name: '',
    dateOfBirth: '',
    qualification: '',
    bloodGroup: '',
    location: '',
    gender: '',
    maritalStatus: 'single',
    spouseName: '',
    spouseContact: '',
    permanentAddress: '',
    currentAddress: '',
    emergencyContact: '',
    nationality: 'Indian',
    contactNumber: '',
    email: '',
    guardianName: '',
    
    // Identification
    pan: '',
    aadhaar: '',
    passportNumber: '',
    uan: '',
    
    // Employment Information
    designation: '',
    division: '',
    dateOfJoining: '',
    previousExperience: '',
    previousOrganizations: [],
    currentExperience: '',
    status: 'Active',
    
    // Bank Information
    bankName: '',
    bankAccount: '',
    branch: '',
    ifsc: ''
  });

  const [organizations, setOrganizations] = useState([
    { organization: '', designation: '', startDate: '', endDate: '' }
  ]);
  const [currentStep, setCurrentStep] = useState(1);
  const [maritalStatus, setMaritalStatus] = useState('single');
  const [employeeDoc, setEmployeeDoc] = useState(null);

  // Populate form data when modal opens
  useEffect(() => {
    const load = async () => {
      if (!isProfileEditOpen) return;
      const base = {
        employeeId: user.employeeId || '',
        name: user.name || '',
        dateOfBirth: user.dateOfBirth || '',
        qualification: user.qualification || '',
        bloodGroup: user.bloodGroup || '',
        location: user.location || '',
        gender: user.gender || '',
        maritalStatus: user.maritalStatus || 'single',
        spouseName: user.spouseName || '',
        spouseContact: user.spouseContact || '',
        permanentAddress: user.permanentAddress || '',
        currentAddress: user.currentAddress || '',
        emergencyContact: user.emergencyContact || user.emergencyMobile || '',
        nationality: user.nationality || 'Indian',
        contactNumber: user.contactNumber || user.mobileNo || '',
        email: user.email || '',
        guardianName: user.guardianName || '',
        pan: user.pan || '',
        aadhaar: user.aadhaar || '',
        passportNumber: user.passportNumber || '',
        uan: user.uan || '',
        designation: user.designation || user.role || user.position || '',
        division: user.division || '',
        dateOfJoining: user.dateOfJoining || user.dateofjoin || '',
        previousExperience: user.previousExperience || '',
        previousOrganizations: user.previousOrganizations || [],
        currentExperience: user.currentExperience || '',
        status: user.status || 'Active',
        bankName: user.bankName || '',
        bankAccount: user.bankAccount || '',
        branch: user.branch || '',
        ifsc: user.ifsc || ''
      };
      try {
        const res = await employeeAPI.getMyProfile();
        const emp = res.data;
        if (emp && emp.employeeId) {
          setEmployeeDoc(emp);
          const mappedData = {
            employeeId: emp.employeeId || base.employeeId,
            name: emp.name || emp.employeename || base.name,
            dateOfBirth: (emp.dateOfBirth || emp.dob) ? new Date(emp.dateOfBirth || emp.dob).toISOString().split('T')[0] : base.dateOfBirth,
            qualification: emp.qualification || emp.highestQualification || base.qualification,
            bloodGroup: emp.bloodGroup || base.bloodGroup,
            location: emp.location || base.location,
            gender: emp.gender || base.gender,
            maritalStatus: emp.maritalStatus || base.maritalStatus,
            spouseName: emp.spouseName || base.spouseName,
            spouseContact: emp.spouseContact || base.spouseContact,
            permanentAddress: emp.permanentAddress || base.permanentAddress,
            currentAddress: emp.currentAddress || base.currentAddress,
            emergencyContact: emp.emergencyContact || base.emergencyContact,
            nationality: emp.nationality || base.nationality,
            contactNumber: emp.contactNumber || base.contactNumber,
            email: emp.email || base.email,
            guardianName: emp.guardianName || base.guardianName,
            pan: emp.pan || base.pan,
            aadhaar: emp.aadhaar || base.aadhaar,
            passportNumber: emp.passportNumber || base.passportNumber,
            uan: emp.uan || base.uan,
            designation: emp.designation || base.designation,
            division: emp.division || base.division,
            dateOfJoining: (emp.dateOfJoining || emp.dateofjoin) ? new Date(emp.dateOfJoining || emp.dateofjoin).toISOString().split('T')[0] : base.dateOfJoining,
            previousExperience: emp.previousExperience || base.previousExperience,
            previousOrganizations: emp.previousOrganizations || base.previousOrganizations,
            currentExperience: emp.currentExperience || base.currentExperience,
            status: emp.status || base.status,
            bankName: emp.bankName || base.bankName,
            bankAccount: emp.bankAccount || base.bankAccount,
            branch: emp.branch || base.branch,
            ifsc: emp.ifsc || base.ifsc
          };
          setMaritalStatus(mappedData.maritalStatus || 'single');
          if (mappedData.previousOrganizations && mappedData.previousOrganizations.length > 0) {
            setOrganizations(mappedData.previousOrganizations.map(org => ({
              organization: org.organization || '',
              designation: org.designation || org.role || '',
              startDate: org.startDate || '',
              endDate: org.endDate || ''
            })));
          } else {
            setOrganizations([{ organization: '', designation: '', startDate: '', endDate: '' }]);
          }
          setFormData(mappedData);
        } else {
          setEmployeeDoc(null);
          setMaritalStatus(base.maritalStatus || 'single');
          setOrganizations(base.previousOrganizations && base.previousOrganizations.length > 0 ? base.previousOrganizations : [{ organization: '', designation: '', startDate: '', endDate: '' }]);
          setFormData(base);
        }
      } catch {
        setEmployeeDoc(null);
        setMaritalStatus(base.maritalStatus || 'single');
        setOrganizations([{ organization: '', designation: '', startDate: '', endDate: '' }]);
        setFormData(base);
      }
    };
    load();
  }, [isProfileEditOpen, user]);

  // Calculate total previous experience
  useEffect(() => {
    if (organizations.length > 0 && organizations[0].organization) {
      let totalMonths = 0;
      
      organizations.forEach(org => {
        if (org.startDate && org.endDate) {
          const start = new Date(org.startDate);
          const end = new Date(org.endDate);
          const diffInMonths = (end.getFullYear() - start.getFullYear()) * 12 + 
                              (end.getMonth() - start.getMonth());
          totalMonths += diffInMonths;
        } else if (org.startDate) {
          const start = new Date(org.startDate);
          const now = new Date();
          const diffInMonths = (now.getFullYear() - start.getFullYear()) * 12 + 
                              (now.getMonth() - start.getMonth());
          totalMonths += diffInMonths;
        }
      });
      
      const years = Math.floor(totalMonths / 12);
      const months = totalMonths % 12;
      
      let experienceText = '';
      if (years > 0) {
        experienceText += `${years} year${years > 1 ? 's' : ''}`;
      }
      if (months > 0) {
        experienceText += `${years > 0 ? ' ' : ''}${months} month${months > 1 ? 's' : ''}`;
      }
      if (!experienceText) {
        experienceText = '0 years';
      }
      
      setFormData(prev => ({
        ...prev,
        previousExperience: experienceText,
        previousOrganizations: organizations
      }));
    }
  }, [organizations]);

  const handleInputChange = (field, value) => {
    const updatedData = {
      ...formData,
      [field]: value
    };

    if (field === 'name') {
      const uppercaseValue = value.toUpperCase();
      updatedData.name = uppercaseValue;
    }

    if (field === 'dateOfJoining' && value) {
      const joiningDate = new Date(value);
      const today = new Date();
      const experienceInMilliseconds = today - joiningDate;
      const experienceInYears = experienceInMilliseconds / (1000 * 60 * 60 * 24 * 365.25);
      
      if (experienceInYears > 0) {
        const years = Math.floor(experienceInYears);
        const months = Math.floor((experienceInYears - years) * 12);
        let experienceText = '';
        
        if (years > 0) {
          experienceText += `${years} year${years > 1 ? 's' : ''}`;
        }
        if (months > 0) {
          experienceText += `${years > 0 ? ' ' : ''}${months} month${months > 1 ? 's' : ''}`;
        }
        if (!experienceText) {
          experienceText = 'Less than 1 month';
        }
        
        updatedData.currentExperience = experienceText;
      } else {
        updatedData.currentExperience = '0 years';
      }
    }

    if (field === 'maritalStatus') {
      setMaritalStatus(value);
    }

    setFormData(updatedData);
  };

  const handleOrganizationChange = (index, field, value) => {
    const updatedOrganizations = [...organizations];
    updatedOrganizations[index][field] = value;
    setOrganizations(updatedOrganizations);
  };

  const addOrganization = () => {
    setOrganizations([
      ...organizations,
      { organization: '', designation: '', startDate: '', endDate: '' }
    ]);
  };

  const removeOrganization = (index) => {
    const updatedOrganizations = [...organizations];
    updatedOrganizations.splice(index, 1);
    setOrganizations(updatedOrganizations);
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const finalData = {
      ...formData,
      qualification: formData.qualification,
      previousOrganizations: organizations
    };
    try {
      const hasUserAccess = Array.isArray(user.permissions) && user.permissions.includes('user_access');
      if (hasUserAccess && employeeDoc && employeeDoc._id) {
        // If user has admin access and is editing a linked employee doc, update it via ID
        await employeeAPI.updateEmployee(employeeDoc._id, finalData);
      } else {
        // Otherwise use the "me" endpoint which uses the logged-in user's employeeId
        await employeeAPI.updateMyProfile(finalData);
      }
      const updatedUser = {
        ...user,
        name: finalData.name || user.name,
        email: finalData.email || user.email,
        employeeId: finalData.employeeId || user.employeeId,
        designation: finalData.designation || user.designation,
        division: finalData.division || user.division,
        status: finalData.status || user.status
      };
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsProfileEditOpen(false);
      alert('Profile updated successfully!');
      
      // Refresh the employee data
      try {
        const res = await employeeAPI.getMyProfile();
        setEmployeeDoc(res.data);
      } catch (err) {
        console.error("Error refreshing profile:", err);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleProfileCancel = () => {
    setIsProfileEditOpen(false);
    setCurrentStep(1);
    setOrganizations([{ organization: '', designation: '', startDate: '', endDate: '' }]);
    setMaritalStatus('single');
  };

  // Options for dropdowns
  const designationOptions = [
    { value: '', label: 'Select Designation' },
    { value: 'Managing Director (MD)', label: 'Managing Director (MD)' },
    { value: 'General Manager (GM)', label: 'General Manager (GM)' },
    { value: 'Branch Manager', label: 'Branch Manager' },
    { value: 'Admin Manager', label: 'Admin Manager' },
    { value: 'Office Assistant', label: 'Office Assistant' },
    { value: 'IT Admin', label: 'IT Admin' },
    { value: 'Trainee', label: 'Trainee' },
    { value: 'System Engineer', label: 'System Engineer' },
    { value: 'Senior Engineer', label: 'Senior Engineer' },
    { value: 'Junior Engineer', label: 'Junior Engineer' },
    { value: 'Project Manager', label: 'Project Manager' },
    { value: 'Team Lead', label: 'Team Lead' },
    { value: 'Software Developer', label: 'Software Developer' },
    { value: 'HR Executive', label: 'HR Executive' },
    { value: 'Accountant', label: 'Accountant' },
    { value: 'Sales Executive', label: 'Sales Executive' },
    { value: 'Marketing Manager', label: 'Marketing Manager' },
    { value: 'Operations Manager', label: 'Operations Manager' },
    { value: 'Quality Analyst', label: 'Quality Analyst' },
    { value: 'Technical Support', label: 'Technical Support' },
    { value: 'Network Engineer', label: 'Network Engineer' },
    { value: 'Database Administrator', label: 'Database Administrator' },
    { value: 'Business Analyst', label: 'Business Analyst' },
    { value: 'Consultant', label: 'Consultant' }
  ];

  const bloodGroupOptions = [
    { value: '', label: 'Select Blood Group' },
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' }
  ];

  const divisionOptions = [
    { value: '', label: 'Select Division' },
    { value: 'SDS', label: 'SDS' },
    { value: 'TEKLA', label: 'TEKLA' },
    { value: 'DAS(Software)', label: 'DAS(Software)' },
    { value: 'DDS(Manufacturing)', label: 'DDS(Manufacturing)' },
    { value: 'Electrical', label: 'Electrical' },
    { value: 'HR/Admin', label: 'HR/Admin' },
    { value: 'Engineering Services', label: 'Engineering Services' }
  ];

  const locationOptions = [
    { value: '', label: 'Select Location' },
    { value: 'Hosur', label: 'Hosur' },
    { value: 'Chennai', label: 'Chennai' }
  ];

  const genderOptions = [
    { value: '', label: 'Select Gender' },
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ];

  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Suspended', label: 'Suspended' }
  ];

  const nationalityOptions = [
    { value: 'Indian', label: 'Indian' }
  ];

  // Lite color themes for each section
  const sectionColors = {
    personal: {
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      icon: 'text-blue-500',
      title: 'text-blue-700'
    },
    contact: {
      bg: 'bg-green-50',
      border: 'border-green-100',
      icon: 'text-green-500',
      title: 'text-green-700'
    },
    address: {
      bg: 'bg-purple-50',
      border: 'border-purple-100',
      icon: 'text-purple-500',
      title: 'text-purple-700'
    },
    identification: {
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      icon: 'text-amber-500',
      title: 'text-amber-700'
    },
    professional: {
      bg: 'bg-cyan-50',
      border: 'border-cyan-100',
      icon: 'text-cyan-500',
      title: 'text-cyan-700'
    },
    bank: {
      bg: 'bg-pink-50',
      border: 'border-pink-100',
      icon: 'text-pink-500',
      title: 'text-pink-700'
    }
  };

  // Simple section indicator
  const SectionIndicator = () => (
    <div className="flex items-center justify-center mb-6 space-x-8">
      {['Personal Info', 'Professional', 'Bank Details'].map((section, index) => (
        <div key={section} className="flex items-center">
          <div className={`text-center ${currentStep === index + 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`text-sm font-medium px-4 py-2 rounded-lg ${currentStep === index + 1 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}>
              {section}
            </div>
          </div>
          {index < 2 && (
            <div className="w-4 h-0.5 bg-gray-300 mx-2"></div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <header className="bg-white shadow border-b border-gray-200 w-full">
        <div className="flex items-center px-4 py-3">
          
          {/* Left Section */}
          <div className="flex-1">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
          </div>
          
          {/* Center Section */}
          <div className="flex-1 text-center">
              <h1 className="text-lg font-medium text-gray-800">{getPageTitle()}</h1>
          </div>
          
          {/* Right Section */}
          <div className="flex-1 flex justify-end items-center space-x-4">
            {/* Time Display */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm text-gray-600">{formattedTime}</span>
              <span className="text-xs text-gray-500">{formattedDate}</span>
            </div>
            
            {/* Mobile Time Display */}
            <div className="sm:hidden flex flex-col items-end">
              <span className="text-sm text-gray-600">{formattedTime}</span>
            </div>

            {/* Profile Section */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-200 text-gray-700 font-medium">
                  {userInitial}
                </div>
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                  <div className="p-4 bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-300 text-gray-700 font-medium">
                        {userInitial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-500">{getGreeting()}</p>
                        <p className="font-medium text-gray-800 truncate">{user.name}</p>
                        <p className="text-sm text-gray-600 truncate">{user.employeeId || ''}</p>
                        
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2 border-t border-gray-200">
                    <button
                      onClick={handleProfileEdit}
                      className="flex items-center w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    >
                      <UserIcon className="mr-3 h-4 w-4 text-gray-400" />
                      Edit Profile
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <i className="fas fa-sign-out-alt mr-3 w-4 text-center"></i>
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Professional Edit Profile Modal */}
      {isProfileEditOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-white p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Edit Profile</h2>
                  <p className="text-gray-600 text-sm">Update your information</p>
                </div>
                <button 
                  onClick={handleProfileCancel}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              {/* Simple Section Indicator */}
              <SectionIndicator />
            </div>

            <form onSubmit={handleProfileSubmit} className="p-6">
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  {/* Personal Information Section */}
                  <div className={`rounded-lg p-5 ${sectionColors.personal.bg} border ${sectionColors.personal.border}`}>
                    <div className="flex items-center mb-4">
                      <UserIcon className={`h-5 w-5 ${sectionColors.personal.icon} mr-2`} />
                      <h3 className={`font-medium ${sectionColors.personal.title}`}>Personal Information</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Employee ID */}
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Employee ID *
                        </label>
                        <input
                          type="text"
                          value={formData.employeeId}
                          onChange={(e) => handleInputChange('employeeId', e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
                          placeholder="EMP001"
                        />
                      </div>

                      {/* Full Name */}
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value.toUpperCase())}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm uppercase"
                          placeholder="JOHN DOE"
                        />
                        <p className="text-xs text-gray-500 mt-1">Name will be converted to uppercase</p>
                      </div>

                      {/* Gender */}
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Gender *
                        </label>
                        <select
                          value={formData.gender}
                          onChange={(e) => handleInputChange('gender', e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
                        >
                          {genderOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Date of Birth */}
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
                        />
                      </div>

                      {/* Blood Group */}
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Blood Group
                        </label>
                        <select
                          value={formData.bloodGroup}
                          onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
                        >
                          {bloodGroupOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Marital Status */}
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Marital Status
                        </label>
                        <select
                          value={maritalStatus}
                          onChange={(e) => {
                            setMaritalStatus(e.target.value);
                            handleInputChange('maritalStatus', e.target.value);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
                        >
                          <option value="single">Single</option>
                          <option value="married">Married</option>
                        </select>
                      </div>
                    </div>

                    {/* Spouse Details (if married) */}
                    {maritalStatus === 'married' && (
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <h4 className="text-sm font-medium text-blue-700 mb-2">Spouse Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">
                              Spouse Name
                            </label>
                            <input
                              type="text"
                              value={formData.spouseName}
                              onChange={(e) => handleInputChange('spouseName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
                              placeholder="Spouse name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">
                              Spouse Contact
                            </label>
                            <input
                              type="tel"
                              value={formData.spouseContact}
                              onChange={(e) => handleInputChange('spouseContact', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
                              placeholder="Spouse contact number"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contact Information */}
                  <div className={`rounded-lg p-5 ${sectionColors.contact.bg} border ${sectionColors.contact.border}`}>
                    <div className="flex items-center mb-4">
                      <PhoneIcon className={`h-5 w-5 ${sectionColors.contact.icon} mr-2`} />
                      <h3 className={`font-medium ${sectionColors.contact.title}`}>Contact Information</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Mobile Number *
                        </label>
                        <input
                          type="tel"
                          value={formData.contactNumber}
                          onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-green-500 focus:border-green-500 focus:outline-none text-sm"
                          placeholder="9876543210"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-green-500 focus:border-green-500 focus:outline-none text-sm"
                          placeholder="john.doe@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Emergency Contact
                        </label>
                        <input
                          type="tel"
                          value={formData.emergencyContact}
                          onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-green-500 focus:border-green-500 focus:outline-none text-sm"
                          placeholder="Emergency contact number"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Guardian Name
                        </label>
                        <input
                          type="text"
                          value={formData.guardianName}
                          onChange={(e) => handleInputChange('guardianName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-green-500 focus:border-green-500 focus:outline-none text-sm"
                          placeholder="Father/Mother/Spouse Name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Nationality
                        </label>
                        <select
                          value={formData.nationality}
                          onChange={(e) => handleInputChange('nationality', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-green-500 focus:border-green-500 focus:outline-none text-sm"
                        >
                          {nationalityOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Location
                        </label>
                        <select
                          value={formData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-green-500 focus:border-green-500 focus:outline-none text-sm"
                        >
                          {locationOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className={`rounded-lg p-5 ${sectionColors.address.bg} border ${sectionColors.address.border}`}>
                    <div className="flex items-center mb-4">
                      <MapPinIcon className={`h-5 w-5 ${sectionColors.address.icon} mr-2`} />
                      <h3 className={`font-medium ${sectionColors.address.title}`}>Address Information</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Permanent Address
                        </label>
                        <textarea
                          value={formData.permanentAddress}
                          onChange={(e) => handleInputChange('permanentAddress', e.target.value)}
                          rows="3"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 focus:outline-none text-sm"
                          placeholder="Permanent address"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Current Address
                        </label>
                        <textarea
                          value={formData.currentAddress}
                          onChange={(e) => handleInputChange('currentAddress', e.target.value)}
                          rows="3"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 focus:outline-none text-sm"
                          placeholder="Current address"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Identification Details */}
                  <div className={`rounded-lg p-5 ${sectionColors.identification.bg} border ${sectionColors.identification.border}`}>
                    <div className="flex items-center mb-4">
                      <IdentificationIcon className={`h-5 w-5 ${sectionColors.identification.icon} mr-2`} />
                      <h3 className={`font-medium ${sectionColors.identification.title}`}>Identification Details</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          PAN Number
                        </label>
                        <input
                          type="text"
                          value={formData.pan}
                          onChange={(e) => handleInputChange('pan', e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 focus:outline-none text-sm"
                          placeholder="ABCDE1234F"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Aadhaar Number
                        </label>
                        <input
                          type="text"
                          value={formData.aadhaar}
                          onChange={(e) => handleInputChange('aadhaar', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 focus:outline-none text-sm"
                          placeholder="123456789012"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Passport Number
                        </label>
                        <input
                          type="text"
                          value={formData.passportNumber}
                          onChange={(e) => handleInputChange('passportNumber', e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 focus:outline-none text-sm"
                          placeholder="Passport number"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          UAN Number
                        </label>
                        <input
                          type="text"
                          value={formData.uan}
                          onChange={(e) => handleInputChange('uan', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 focus:outline-none text-sm"
                          placeholder="101147215588"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Professional Information */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  {/* Employment Details */}
                  <div className={`rounded-lg p-5 ${sectionColors.professional.bg} border ${sectionColors.professional.border}`}>
                    <div className="flex items-center mb-4">
                      <BuildingLibraryIcon className={`h-5 w-5 ${sectionColors.professional.icon} mr-2`} />
                      <h3 className={`font-medium ${sectionColors.professional.title}`}>Employment Information</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Designation *
                        </label>
                        <select
                          value={formData.designation}
                          onChange={(e) => handleInputChange('designation', e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none text-sm"
                        >
                          {designationOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Division
                        </label>
                        <select
                          value={formData.division}
                          onChange={(e) => handleInputChange('division', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none text-sm"
                        >
                          {divisionOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Date of Joining *
                        </label>
                        <input
                          type="date"
                          value={formData.dateOfJoining}
                          onChange={(e) => handleInputChange('dateOfJoining', e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Current Experience
                        </label>
                        <input
                          type="text"
                          value={formData.currentExperience}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 text-sm"
                          placeholder="Auto-calculated from date of joining"
                        />
                        <p className="text-xs text-gray-500 mt-1">Calculated based on date of joining</p>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) => handleInputChange('status', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none text-sm"
                        >
                          {statusOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Qualification
                        </label>
                        <input
                          type="text"
                          value={formData.qualification}
                          onChange={(e) => handleInputChange('qualification', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none text-sm"
                          placeholder="e.g., B.E (CIVIL)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Previous Organizations */}
                  <div className={`rounded-lg p-5 ${sectionColors.professional.bg} border ${sectionColors.professional.border}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <DocumentTextIcon className={`h-5 w-5 ${sectionColors.professional.icon} mr-2`} />
                        <h3 className={`font-medium ${sectionColors.professional.title}`}>Previous Experience</h3>
                      </div>
                      <button
                        type="button"
                        onClick={addOrganization}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-cyan-600 bg-cyan-50 rounded-lg hover:bg-cyan-100"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Add
                      </button>
                    </div>
                    
                    <div className="mb-4 p-4 border border-cyan-200 rounded-lg bg-cyan-50/50">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total Previous Experience
                        </label>
                        <input
                          type="text"
                          value={formData.previousExperience}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm"
                          placeholder="Calculated from organizations below"
                        />
                        <p className="text-xs text-cyan-600 mt-1">Auto-calculated total from all organizations</p>
                      </div>
                    </div>
                    
                    {organizations.map((org, index) => (
                      <div key={index} className="mb-4 p-4 border border-cyan-200 rounded-lg bg-white">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-sm font-medium text-gray-700">Organization {index + 1}</h4>
                          {organizations.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeOrganization(index)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Organization Name
                            </label>
                            <input
                              type="text"
                              value={org.organization}
                              onChange={(e) => handleOrganizationChange(index, 'organization', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none text-sm"
                              placeholder="Company name"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Role
                            </label>
                            <input
                              type="text"
                              value={org.designation}
                              onChange={(e) => handleOrganizationChange(index, 'designation', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none text-sm"
                              placeholder="Job role"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Start Date
                            </label>
                            <input
                              type="date"
                              value={org.startDate}
                              onChange={(e) => handleOrganizationChange(index, 'startDate', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              End Date
                            </label>
                            <input
                              type="date"
                              value={org.endDate}
                              onChange={(e) => handleOrganizationChange(index, 'endDate', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {organizations.length === 0 && (
                      <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">No previous organizations added.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Bank Information */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  {/* Bank Details */}
                  <div className={`rounded-lg p-5 ${sectionColors.bank.bg} border ${sectionColors.bank.border}`}>
                    <div className="flex items-center mb-4">
                      <BanknotesIcon className={`h-5 w-5 ${sectionColors.bank.icon} mr-2`} />
                      <h3 className={`font-medium ${sectionColors.bank.title}`}>Bank Information</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={formData.bankName}
                          onChange={(e) => handleInputChange('bankName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-pink-500 focus:border-pink-500 focus:outline-none text-sm"
                          placeholder="HDFC Bank"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Bank Account Number
                        </label>
                        <input
                          type="text"
                          value={formData.bankAccount}
                          onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-pink-500 focus:border-pink-500 focus:outline-none text-sm"
                          placeholder="123456789012"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Branch
                        </label>
                        <input
                          type="text"
                          value={formData.branch}
                          onChange={(e) => handleInputChange('branch', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-pink-500 focus:border-pink-500 focus:outline-none text-sm"
                          placeholder="Ramapuram"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          IFSC Code
                        </label>
                        <input
                          type="text"
                          value={formData.ifsc}
                          onChange={(e) => handleInputChange('ifsc', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-pink-500 focus:border-pink-500 focus:outline-none text-sm"
                          placeholder="IFSC code"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-200">
                <div>
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <ArrowLeftIcon className="h-4 w-4" />
                      Back
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleProfileCancel}
                      className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {currentStep < 3 && (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
                    >
                      Next
                      <ArrowRightIcon className="h-4 w-4" />
                    </button>
                  )}
                  {currentStep === 3 && (
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700"
                    >
                      Save Changes
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
