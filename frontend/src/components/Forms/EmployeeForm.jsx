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
  XMarkIcon
} from '@heroicons/react/24/outline';

const EmployeeForm = ({ employee, onSubmit, onCancel, isModal = false }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [maritalStatus, setMaritalStatus] = useState('single');

  const [formData, setFormData] = useState({
    // Personal Information
    employeeId: '',
    name: '',
    dateOfBirth: '',
    highestQualification: '',
    bloodGroup: '',
    location: '',
    gender: '',
    maritalStatus: 'single',
    spouseName: '',
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
    passportType: '',
    
    // Employment Information
    role: '',
    division: '',
    dateOfJoining: '',
    previousExperience: '',
    currentExperience: '',
    status: 'Active',
    
    // Bank Information
    bankName: '',
    bankAccount: '',
    branch: '',
    uan: '',
    ifsc: ''
  });

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
    { value: 'DAS', label: 'DAS' },
    { value: 'Mechanical', label: 'Mechanical' },
    { value: 'HR', label: 'HR' },
    { value: 'Finance', label: 'Finance' },
    { value: 'IT', label: 'IT' },
    { value: 'Operations', label: 'Operations' }
  ];

  // Location options - Only Hosur and Chennai
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

  // Nationality options - Only Indian
  const nationalityOptions = [
    { value: 'Indian', label: 'Indian' }
  ];

  // Passport type options
  const passportTypeOptions = [
    { value: '', label: 'Select Type' },
    { value: 'ordinary', label: 'Ordinary' },
    { value: 'official', label: 'Official' },
    { value: 'diplomatic', label: 'Diplomatic' }
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
        ...formData,
        ...employee,
        highestQualification: employee.highestQualification || employee.qualification || '',
        emergencyContact: employee.emergencyMobile || employee.emergencyContact || '',
        dateOfBirth: employee.dateOfBirth || employee.dob || '',
        dateOfJoining: employee.dateOfJoining || employee.dateofjoin || '',
        contactNumber: employee.mobileNo || employee.contactNumber || '',
        nationality: employee.nationality || 'Indian',
        role: employee.role || employee.position || ''
      };
      setFormData(mappedData);
    }
  }, [employee]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-calculate experience when date of joining changes
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
        
        setFormData(prev => ({
          ...prev,
          currentExperience: experienceText || '0 years'
        }));
      }
    }
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
    onSubmit(formData);
    if (!isModal) {
      // Reset form if not in modal mode
      setCurrentStep(1);
      setMaritalStatus('single');
      setFormData({
        employeeId: '', name: '', dateOfBirth: '', highestQualification: '', bloodGroup: '', location: '', gender: '',
        maritalStatus: 'single', spouseName: '', spouseContact: '', permanentAddress: '',
        currentAddress: '', emergencyContact: '', nationality: 'Indian', contactNumber: '',
        email: '', guardianName: '', pan: '', aadhaar: '', passportNumber: '', passportType: '',
        role: '', division: '', dateOfJoining: '', previousExperience: '', currentExperience: '',
        status: 'Active',
        bankName: '', bankAccount: '', branch: '', uan: '', ifsc: ''
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
    <div className="grid grid-cols-3 mb-8">
      <div className={`text-center ${currentStep === 1 ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
        <UserIcon className="h-6 w-6 mx-auto mb-2" />
        <span className="text-sm">Personal Info</span>
      </div>
      <div className={`text-center ${currentStep === 2 ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
        <BriefcaseIcon className="h-6 w-6 mx-auto mb-2" />
        <span className="text-sm">Professional</span>
      </div>
      <div className={`text-center ${currentStep === 3 ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
        <BanknotesIcon className="h-6 w-6 mx-auto mb-2" />
        <span className="text-sm">Bank Details</span>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {!isModal && (
        <>
          {renderStepIndicator()}
          {renderStepLabels()}
        </>
      )}

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
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                    placeholder="EMP001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                    placeholder="John Doe"
                  />
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
                    Highest Qualification
                  </label>
                  <input
                    type="text"
                    value={formData.highestQualification}
                    onChange={(e) => handleInputChange('highestQualification', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                    placeholder="e.g., B.E (CIVIL)"
                  />
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
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                    placeholder="9876543210"
                  />
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
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                    placeholder="john.doe@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact
                  </label>
                  <input
                    type="tel"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                    placeholder="Emergency contact number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Guardian Name
                  </label>
                  <input
                    type="text"
                    value={formData.guardianName}
                    onChange={(e) => handleInputChange('guardianName', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                    placeholder="Father/Mother/Spouse Name"
                  />
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
                    Location
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
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
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                    placeholder="ABCDE1234F"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aadhaar Number
                  </label>
                  <input
                    type="text"
                    value={formData.aadhaar}
                    onChange={(e) => handleInputChange('aadhaar', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                    placeholder="123456789012"
                  />
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
                    Passport Type
                  </label>
                  <select
                    value={formData.passportType}
                    onChange={(e) => handleInputChange('passportType', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                  >
                    {passportTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
                Employment Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                    placeholder="e.g., Software Engineer"
                  />
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
                    Previous Experience
                  </label>
                  <input
                    type="text"
                    value={formData.previousExperience}
                    onChange={(e) => handleInputChange('previousExperience', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                    placeholder="e.g., 2 years 6 months"
                  />
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