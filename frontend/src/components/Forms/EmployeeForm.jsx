// components/Forms/EmployeeForm.jsx
import React, { useState, useEffect } from 'react';
import { 
  UserIcon, 
  BriefcaseIcon, 
  AcademicCapIcon, 
  PhoneIcon, 
  HomeIcon, 
  BanknotesIcon,
  CreditCardIcon,
  IdentificationIcon,
  CakeIcon,
  MapPinIcon,
  CalendarIcon,
  BuildingLibraryIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const EmployeeForm = ({ employee, onSubmit, onCancel, isModal = false }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [maritalStatus, setMaritalStatus] = useState('single');
  const [organizations, setOrganizations] = useState([
    { organization: '', designation: '', startDate: '', endDate: '' }
  ]);

  const toInputDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) {
      const s = String(d);
      const p = s.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return p;
      return '';
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const da = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  };

  const [formData, setFormData] = useState({
    // Personal Information
    employeeId: '',
    employeename: '',
    name: '',
    dateOfBirth: '',
    qualification: '',
    highestQualification: '',
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
  const [errors, setErrors] = useState({});

  const validateField = (field, value) => {
    const v = String(value || '').trim();
    if (field === 'employeeId') {
      if (!/^CDE\d{3}$/.test(v)) return 'Must be CDE followed by exactly 3 digits';
    }
    if (field === 'name' || field === 'employeename') {
      if (!v) return 'Employee name is required';
      if (!/^[A-Za-z\s]+$/.test(v)) return 'Only alphabetic characters allowed';
    }
    if (field === 'qualification' || field === 'highestQualification') {
      if (v && !/^[A-Z\s]+$/.test(v)) return 'Only uppercase letters allowed';
    }
    if (field === 'contactNumber') {
      if (!/^\d{10}$/.test(v)) return 'Must be exactly 10 digits';
    }
    if (field === 'email') {
      if (!v.includes('@')) return 'Email must include @';
    }
    if (field === 'emergencyContact') {
      if (v && !/^\d{10}$/.test(v)) return 'Must be 10 digits';
    }
    if (field === 'location') {
      if (!v) return 'Location is required';
    }
    if (field === 'guardianName') {
      if (v && !/^[A-Za-z\s]+$/.test(v)) return 'Only alphabetic characters allowed';
    }
    if (field === 'pan') {
      if (v && !/^[A-Z]{5}\d{4}[A-Z]$/.test(v)) return 'Format: 5 letters + 4 digits + 1 letter';
    }
    if (field === 'aadhaar') {
      if (v && !/^\d{12}$/.test(v)) return 'Must be exactly 12 digits';
    }
    return '';
  };

  const validateForm = (data) => {
    const e = {};
    e.employeeId = validateField('employeeId', data.employeeId);
    e.name = validateField('name', data.name || data.employeename);
    e.qualification = validateField('qualification', data.qualification);
    e.contactNumber = validateField('contactNumber', data.contactNumber);
    e.email = validateField('email', data.email);
    e.emergencyContact = validateField('emergencyContact', data.emergencyContact);
    e.location = validateField('location', data.location);
    e.guardianName = validateField('guardianName', data.guardianName);
    e.pan = validateField('pan', data.pan);
    e.aadhaar = validateField('aadhaar', data.aadhaar);
    Object.keys(e).forEach((k) => {
      if (!e[k]) delete e[k];
    });
    return e;
  };

  // Designation options - CORRECTED NAME
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
    { value: 'Sr.Engineer', label: 'Sr.Engineer' },
    { value: 'Jr.Engineer', label: 'Jr.Engineer' },
    { value: 'Project Manager', label: 'Project Manager' },
    { value: 'Sr Project Manager', label: 'Sr Project Manager' },
    { value: 'Asst Project Manager', label: 'Asst Project Manager' },
    { value: 'Team Lead', label: 'Team Lead' },
    { value: 'Software Developer', label: 'Software Developer' },
    { value: 'HR Executive', label: 'HR Executive' },
    { value: 'Accountant', label: 'Accountant' },
    { value: 'Sales Executive', label: 'Sales Executive' },
    { value: 'Marketing Manager', label: 'Marketing Manager' },
    { value: 'Operations Manager', label: 'Operations Manager' },
    { value: 'Technical Support', label: 'Technical Support' },
    { value: 'Network Engineer', label: 'Network Engineer' },
    { value: 'Detailer', label: 'Detailer' },
  ];

  // Blood group options
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

  // Division options
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

  // Location options
  const locationOptions = [
    { value: '', label: 'Select Location' },
    { value: 'Hosur', label: 'Hosur' },
    { value: 'Chennai', label: 'Chennai' }
  ];

  // Gender options
  const genderOptions = [
    { value: '', label: 'Select Gender' },
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ];

  // Nationality options
  const nationalityOptions = [
    { value: 'Indian', label: 'Indian' }
  ];

  // Status options
  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Suspended', label: 'Suspended' }
  ];

  useEffect(() => {
    if (employee) {
      const mappedData = {
        // Personal Information
        employeeId: employee.employeeId || employee.empId || '',
        name: employee.name || employee.employeename || '',
        employeename: employee.employeename || employee.name || '',
        dateOfBirth: toInputDate(employee.dateOfBirth || employee.dob) || '',
        qualification: employee.qualification || employee.highestQualification || '',
        highestQualification: employee.highestQualification || employee.qualification || '',
        bloodGroup: employee.bloodGroup || '',
        location: employee.location || '',
        gender: employee.gender || '',
        maritalStatus: employee.maritalStatus || 'single',
        spouseName: employee.spouseName || '',
        spouseContact: employee.spouseContact || '',
        permanentAddress: employee.permanentAddress || '',
        currentAddress: employee.currentAddress || '',
        emergencyContact: employee.emergencyContact || employee.emergencyMobile || '',
        nationality: employee.nationality || 'Indian',
        contactNumber: employee.contactNumber || employee.mobileNo || '',
        email: employee.email || '',
        guardianName: employee.guardianName || '',
        
        // Identification
        pan: employee.pan || '',
        aadhaar: employee.aadhaar || '',
        passportNumber: employee.passportNumber || '',
        uan: employee.uan || '',
        
        // Employment Information - CORRECTED: Using designation field
        designation: employee.designation || employee.role || employee.position || '',
        division: employee.division || '',
        dateOfJoining: toInputDate(employee.dateOfJoining || employee.dateofjoin) || '',
        previousExperience: employee.previousExperience || '',
        previousOrganizations: employee.previousOrganizations || [],
        currentExperience: employee.currentExperience || '',
        status: employee.status || 'Active',
        
        // Bank Information
        bankName: employee.bankName || '',
        bankAccount: employee.bankAccount || '',
        branch: employee.branch || '',
        ifsc: employee.ifsc || ''
      };
      
      // Set marital status
      setMaritalStatus(mappedData.maritalStatus || 'single');
      
      // Set organizations if available - CORRECTED: Map designation field
      if (mappedData.previousOrganizations && mappedData.previousOrganizations.length > 0) {
        setOrganizations(mappedData.previousOrganizations.map(org => ({
          organization: org.organization || '',
          designation: org.designation || org.role || '',
          startDate: toInputDate(org.startDate) || '',
          endDate: toInputDate(org.endDate) || ''
        })));
      }
      
      setFormData(mappedData);
    }
  }, [employee]);

  useEffect(() => {
    // Calculate total previous experience whenever organizations change
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
      
      // Update formData with calculated experience
      setFormData(prev => ({
        ...prev,
        previousExperience: experienceText,
        previousOrganizations: organizations
      }));
    }
  }, [organizations]);

  const handleInputChange = (field, value) => {
    let newValue = value;
    if (field === 'employeeId') {
      newValue = String(newValue || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    }
    if (field === 'name' || field === 'employeename') {
      newValue = String(newValue || '').toUpperCase().replace(/[^A-Za-z\s]/g, '');
    }
    if (field === 'qualification' || field === 'highestQualification') {
      newValue = String(newValue || '').toUpperCase().replace(/[^A-Z\s]/g, '');
    }
    if (field === 'contactNumber' || field === 'spouseContact' || field === 'emergencyContact') {
      newValue = String(newValue || '').replace(/\D/g, '');
      if (field === 'contactNumber' || field === 'emergencyContact') {
        newValue = newValue.slice(0, 10);
      }
    }
    if (field === 'guardianName') {
      newValue = String(newValue || '').replace(/[^A-Za-z\s]/g, '');
    }
    if (field === 'pan') {
      newValue = String(newValue || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    }
    if (field === 'aadhaar') {
      newValue = String(newValue || '').replace(/\D/g, '').slice(0, 12);
    }

    const updatedData = {
      ...formData,
      [field]: newValue
    };

    // Convert Employee Name to uppercase automatically
    if (field === 'name' || field === 'employeename') {
      const uppercaseValue = newValue.toUpperCase();
      updatedData.name = uppercaseValue;
      updatedData.employeename = uppercaseValue;
    }

    // Auto-calculate current experience when date of joining changes
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

    // Update marital status in state when formData changes
    if (field === 'maritalStatus') {
      setMaritalStatus(value);
    }

    setFormData(updatedData);
    const err = validateField(field, updatedData[field]);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleOrganizationChange = (index, field, value) => {
    const updatedOrganizations = [...organizations];
    updatedOrganizations[index][field] = value;
    setOrganizations(updatedOrganizations);
  };

  const addOrganization = () => {
    setOrganizations([
      ...organizations,
      { organization: '', role: '', startDate: '', endDate: '' }
    ]);
  };

  const removeOrganization = (index) => {
    const updatedOrganizations = [...organizations];
    updatedOrganizations.splice(index, 1);
    setOrganizations(updatedOrganizations);
  };

  const handleStepClick = (step) => {
    setCurrentStep(step);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prepare final data
    const finalData = {
      ...formData,
      name: formData.name || formData.employeename,
      employeename: formData.employeename || formData.name,
      qualification: formData.qualification || formData.highestQualification,
      highestQualification: formData.highestQualification || formData.qualification,
      previousOrganizations: organizations
    };

    const formErrors = validateForm(finalData);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      return;
    }
    
    onSubmit(finalData);
    
    if (!isModal) {
      // Reset form if not in modal mode
      setCurrentStep(1);
      setMaritalStatus('single');
      setOrganizations([{ organization: '', designation: '', startDate: '', endDate: '' }]);
      setFormData({
        employeeId: '',
        employeename: '',
        name: '',
        dateOfBirth: '',
        qualification: '',
        highestQualification: '',
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
        pan: '',
        aadhaar: '',
        passportNumber: '',
        uan: '',
        designation: '',
        division: '',
        dateOfJoining: '',
        previousExperience: '',
        previousOrganizations: [],
        currentExperience: '',
        status: 'Active',
        bankName: '',
        bankAccount: '',
        branch: '',
        ifsc: ''
      });
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <button
            onClick={() => handleStepClick(step)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              currentStep === step 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50' 
                : currentStep > step
                ? 'bg-blue-100 text-blue-600 border border-blue-200'
                : 'bg-white text-gray-400 border border-gray-300'
            }`}
          >
            {step}
          </button>
          {step < 3 && (
            <div className={`w-16 h-1 mx-2 ${currentStep > step ? 'bg-blue-600' : 'bg-gray-300'}`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStepLabels = () => (
    <div className="grid grid-cols-3 mb-8 gap-2">
      <button
        type="button"
        onClick={() => handleStepClick(1)}
        className={`text-center py-3 rounded-lg transition ${
          currentStep === 1
            ? 'text-blue-600 font-semibold bg-blue-50'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        }`}
      >
        <UserIcon className="h-6 w-6 mx-auto mb-2" />
        <span className="text-sm">Personal Info</span>
      </button>
      <button
        type="button"
        onClick={() => handleStepClick(2)}
        className={`text-center py-3 rounded-lg transition ${
          currentStep === 2
            ? 'text-blue-600 font-semibold bg-blue-50'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        }`}
      >
        <BriefcaseIcon className="h-6 w-6 mx-auto mb-2" />
        <span className="text-sm">Professional</span>
      </button>
      <button
        type="button"
        onClick={() => handleStepClick(3)}
        className={`text-center py-3 rounded-lg transition ${
          currentStep === 3
            ? 'text-blue-600 font-semibold bg-blue-50'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        }`}
      >
        <BanknotesIcon className="h-6 w-6 mx-auto mb-2" />
        <span className="text-sm">Bank Details</span>
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {!isModal && renderStepLabels()}

      <form onSubmit={handleSubmit} className="p-4 lg:p-6">
        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg lg:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <UserIcon className="h-6 w-6 text-blue-600" />
              Personal Information
            </h3>
            
            {/* Basic Information */}
            <div className="border border-gray-200 rounded-lg p-4 lg:p-6 bg-white shadow-sm">
              <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => handleInputChange('employeeId', e.target.value)}
                    required
                    maxLength={6}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.employeeId ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="EMP001"
                  />
                  {errors.employeeId && <p className="text-xs text-red-600 mt-1">{errors.employeeId}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name || formData.employeename}
                    onChange={(e) => {
                      const uppercaseValue = e.target.value.toUpperCase();
                      handleInputChange('name', uppercaseValue);
                      handleInputChange('employeename', uppercaseValue);
                    }}
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white uppercase ${errors.name ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="JOHN DOE"
                  />
                  {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                  >
                    {genderOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Qualification
                  </label>
                  <input
                    type="text"
                    value={formData.qualification || formData.highestQualification}
                    onChange={(e) => {
                      handleInputChange('qualification', e.target.value);
                      handleInputChange('highestQualification', e.target.value);
                    }}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.qualification ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="e.g., B.E (CIVIL)"
                  />
                  {errors.qualification && <p className="text-xs text-red-600 mt-1">{errors.qualification}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Blood Group
                  </label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                  >
                    {bloodGroupOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marital Status
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMaritalStatus('single');
                        handleInputChange('maritalStatus', 'single');
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg border transition-colors text-sm font-medium ${
                        maritalStatus === 'single'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Single
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMaritalStatus('married');
                        handleInputChange('maritalStatus', 'married');
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg border transition-colors text-sm font-medium ${
                        maritalStatus === 'married'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Married
                    </button>
                  </div>
                </div>

                {maritalStatus === 'married' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Spouse Name
                      </label>
                      <input
                        type="text"
                        value={formData.spouseName}
                        onChange={(e) => handleInputChange('spouseName', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                        placeholder="Spouse name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Spouse Contact
                      </label>
                      <input
                        type="tel"
                        value={formData.spouseContact}
                        onChange={(e) => handleInputChange('spouseContact', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                        placeholder="Spouse contact number"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="border border-gray-200 rounded-lg p-4 lg:p-6 bg-white shadow-sm">
              <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide flex items-center gap-2">
                <PhoneIcon className="h-4 w-4" />
                Contact Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.contactNumber}
                    onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                    required
                    inputMode="numeric"
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.contactNumber ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="9876543210"
                  />
                  {errors.contactNumber && <p className="text-xs text-red-600 mt-1">{errors.contactNumber}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.email ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="john.doe@example.com"
                  />
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact
                  </label>
                  <input
                    type="tel"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    inputMode="numeric"
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.emergencyContact ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="Emergency contact number"
                  />
                  {errors.emergencyContact && <p className="text-xs text-red-600 mt-1">{errors.emergencyContact}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Guardian Name
                  </label>
                  <input
                    type="text"
                    value={formData.guardianName}
                    onChange={(e) => handleInputChange('guardianName', e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.guardianName ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="Father/Mother/Spouse Name"
                  />
                  {errors.guardianName && <p className="text-xs text-red-600 mt-1">{errors.guardianName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nationality
                  </label>
                  <select
                    value={formData.nationality}
                    onChange={(e) => handleInputChange('nationality', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                  >
                    {nationalityOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.location ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                  >
                    {locationOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.location && <p className="text-xs text-red-600 mt-1">{errors.location}</p>}
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="border border-gray-200 rounded-lg p-4 lg:p-6 bg-white shadow-sm">
              <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide flex items-center gap-2">
                <MapPinIcon className="h-4 w-4" />
                Address Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permanent Address
                  </label>
                  <textarea
                    value={formData.permanentAddress}
                    onChange={(e) => handleInputChange('permanentAddress', e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                    placeholder="Permanent address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Address
                  </label>
                  <textarea
                    value={formData.currentAddress}
                    onChange={(e) => handleInputChange('currentAddress', e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                    placeholder="Current address"
                  />
                </div>
              </div>
            </div>

            {/* Identification Details */}
            <div className="border border-gray-200 rounded-lg p-4 lg:p-6 bg-white shadow-sm">
              <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide flex items-center gap-2">
                <IdentificationIcon className="h-4 w-4" />
                Identification Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    value={formData.pan}
                    onChange={(e) => handleInputChange('pan', e.target.value.toUpperCase())}
                    maxLength={10}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.pan ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="ABCDE1234F"
                  />
                  {errors.pan && <p className="text-xs text-red-600 mt-1">{errors.pan}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aadhaar Number
                  </label>
                  <input
                    type="text"
                    value={formData.aadhaar}
                    onChange={(e) => handleInputChange('aadhaar', e.target.value)}
                    inputMode="numeric"
                    maxLength={12}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.aadhaar ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="123456789012"
                  />
                  {errors.aadhaar && <p className="text-xs text-red-600 mt-1">{errors.aadhaar}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passport Number
                  </label>
                  <input
                    type="text"
                    value={formData.passportNumber}
                    onChange={(e) => handleInputChange('passportNumber', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                    placeholder="Passport number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UAN Number
                  </label>
                  <input
                    type="text"
                    value={formData.uan}
                    onChange={(e) => handleInputChange('uan', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
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
            <h3 className="text-lg lg:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BriefcaseIcon className="h-6 w-6 text-blue-600" />
              Professional Information
            </h3>
            
            {/* Employment Details */}
            <div className="border border-gray-200 rounded-lg p-4 lg:p-6 bg-white shadow-sm">
              <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide flex items-center gap-2">
                <BuildingLibraryIcon className="h-4 w-4" />
                Current Employment Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Designation *
                  </label>
                  <select
                    value={formData.designation}
                    onChange={(e) => handleInputChange('designation', e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                  >
                    {designationOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Division
                  </label>
                  <select
                    value={formData.division}
                    onChange={(e) => handleInputChange('division', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                  >
                    {divisionOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Joining *
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfJoining}
                    onChange={(e) => handleInputChange('dateOfJoining', e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Experience
                  </label>
                  <input
                    type="text"
                    value={formData.currentExperience}
                    readOnly
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm"
                    placeholder="Auto-calculated from date of joining"
                  />
                  <p className="text-xs text-gray-500 mt-1">Calculated based on date of joining</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Previous Organizations - Now includes Previous Experience field */}
            <div className="border border-gray-200 rounded-lg p-4 lg:p-6 bg-white shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <DocumentTextIcon className="h-4 w-4" />
                  Previous Organizations & Experience
                </h4>
                <button
                  type="button"
                  onClick={addOrganization}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Organization
                </button>
              </div>
              
              <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Previous Experience
                    </label>
                    <input
                      type="text"
                      value={formData.previousExperience}
                      readOnly
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm font-medium"
                      placeholder="Calculated from organizations below"
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-calculated total from all organizations</p>
                  </div>
                </div>
              </div>
              
              {organizations.map((org, index) => (
                <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="text-sm font-medium text-gray-700">Organization {index + 1}</h5>
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        value={org.organization}
                        onChange={(e) => handleOrganizationChange(index, 'organization', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                        placeholder="Company name"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        role
                      </label>
                      <input
                        type="text"
                        value={org.designation}
                        onChange={(e) => handleOrganizationChange(index, 'designation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                        placeholder="Job designation"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={org.startDate}
                        onChange={(e) => handleOrganizationChange(index, 'startDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={org.endDate}
                        onChange={(e) => handleOrganizationChange(index, 'endDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {organizations.length === 0 && (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No previous organizations added. Click "Add Organization" to add one.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Bank Information */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg lg:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BanknotesIcon className="h-6 w-6 text-blue-600" />
              Bank Information
            </h3>

            {/* Bank Details */}
            <div className="border border-gray-200 rounded-lg p-4 lg:p-6 bg-white shadow-sm">
              <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide flex items-center gap-2">
                <CreditCardIcon className="h-4 w-4" />
                Bank Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                    placeholder="HDFC Bank"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccount}
                    onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                    placeholder="123456789012"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch
                  </label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => handleInputChange('branch', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                    placeholder="Ramapuram"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={formData.ifsc}
                    onChange={(e) => handleInputChange('ifsc', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                    placeholder="IFSC code"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-8 border-t border-gray-200">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 px-4 lg:px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 lg:px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
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
                className="flex items-center gap-2 px-4 lg:px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 border border-transparent rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                Next
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            )}
            {currentStep === 3 && (
              <button
                type="submit"
                className="px-4 lg:px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 border border-transparent rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                {employee ? 'Update Employee' : 'Add Employee'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;
