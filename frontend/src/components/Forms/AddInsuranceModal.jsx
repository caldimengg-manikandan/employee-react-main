// src/components/forms/AddInsuranceModal.jsx
import React, { useState } from 'react';
import { 
  DocumentArrowUpIcon,
  DocumentTextIcon,
  UserCircleIcon,
  CloudArrowDownIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon
} from '@heroicons/react/24/outline';

const AddInsuranceModal = ({ onClose, onSubmit }) => {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form Data for New Claim
  const [formData, setFormData] = useState({
    employeeName: '',
    employeeId: '',
    mobile: '',
    bankName: '',
    accountNumber: '',
    relationship: 'Single',
    spouseName: '',
    children: [{ name: '', age: '' }],
    memberName: '',
    claimNumber: '',
    treatment: '',
    sumInsured: '',
    dateOfAdmission: '',
    dateOfDischarge: '',
    requestedAmount: '',
    claimDate: '',
    closeDate: '',
    claimStatus: 'Pending',
    paymentStatus: 'Unpaid',
    documents: {
      employeePhoto: null,
      dischargeBill: null,
      pharmacyBill: null,
      paymentReceipt: null
    }
  });

  // Multi-step Form Components
  const steps = [
    { number: 1, title: 'EMPLOYEE DETAILS', icon: UserCircleIcon },
    { number: 2, title: 'UPLOAD DOCUMENTS', icon: DocumentArrowUpIcon },
    { number: 3, title: 'TREATMENT DETAILS', icon: DocumentTextIcon }
  ];

  // Form Handlers
  const handleInputChange = (section, field, value) => {
    if (section === 'documents') {
      setFormData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleFileUpload = (field, file) => {
    handleInputChange('documents', field, file);
  };

  // Children management functions
  const addChild = () => {
    setFormData(prev => ({
      ...prev,
      children: [...prev.children, { name: '', age: '' }]
    }));
  };

  const removeChild = (index) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index)
    }));
  };

  const updateChild = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.map((child, i) => 
        i === index ? { ...child, [field]: value } : child
      )
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    
    // Call the onSubmit prop with form data
    onSubmit(formData);
    
    // Reset form
    setFormData({
      employeeName: '',
      employeeId: '',
      mobile: '',
      bankName: '',
      accountNumber: '',
      relationship: 'Single',
      spouseName: '',
      children: [{ name: '', age: '' }],
      memberName: '',
      claimNumber: '',
      treatment: '',
      sumInsured: '',
      dateOfAdmission: '',
      dateOfDischarge: '',
      requestedAmount: '',
      claimDate: '',
      closeDate: '',
      claimStatus: 'Pending',
      paymentStatus: 'Unpaid',
      documents: {
        employeePhoto: null,
        dischargeBill: null,
        pharmacyBill: null,
        paymentReceipt: null
      }
    });
    setCurrentStep(1);
  };

  const handleDownloadZip = () => {
    alert('Downloading uploaded files as ZIP...');
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                currentStep >= step.number 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'border-gray-300 text-gray-500'
              }`}>
                <step.icon className="w-6 h-6" />
              </div>
              <span className={`mt-2 text-sm font-medium ${
                currentStep >= step.number ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 ${
                currentStep > step.number ? 'bg-blue-600' : 'bg-gray-300'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const renderEmployeeDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employee Name *
          </label>
          <input
            type="text"
            value={formData.employeeName}
            onChange={(e) => handleInputChange('employee', 'employeeName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter employee name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employee ID *
          </label>
          <input
            type="text"
            value={formData.employeeId}
            onChange={(e) => handleInputChange('employee', 'employeeId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter employee ID"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mobile Number *
          </label>
          <input
            type="tel"
            value={formData.mobile}
            onChange={(e) => handleInputChange('employee', 'mobile', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter mobile number"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bank Name *
          </label>
          <input
            type="text"
            value={formData.bankName}
            onChange={(e) => handleInputChange('employee', 'bankName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter bank name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Number *
          </label>
          <input
            type="text"
            value={formData.accountNumber}
            onChange={(e) => handleInputChange('employee', 'accountNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter account number"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Relationship Status *
          </label>
          <select
            value={formData.relationship}
            onChange={(e) => handleInputChange('employee', 'relationship', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="Single">Single</option>
            <option value="Married">Married</option>
          </select>
        </div>
      </div>

      {/* Spouse Details - Only show if Married */}
      {formData.relationship === 'Married' && (
        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Spouse Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Spouse Name *
              </label>
              <input
                type="text"
                value={formData.spouseName}
                onChange={(e) => handleInputChange('employee', 'spouseName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter spouse name"
                required
              />
            </div>
          </div>
        </div>
      )}

      {/* Children Details - Show for Married, Divorced, or Widowed */}
      {(formData.relationship === 'Married' || formData.relationship === 'Divorced' || formData.relationship === 'Widowed') && (
        <div className="border-t pt-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Children Details</h3>
            <button
              type="button"
              onClick={addChild}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Child
            </button>
          </div>
          
          {formData.children.map((child, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border border-gray-200 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Child {index + 1} Name *
                </label>
                <input
                  type="text"
                  value={child.name}
                  onChange={(e) => updateChild(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter child name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age *
                </label>
                <input
                  type="number"
                  value={child.age}
                  onChange={(e) => updateChild(index, 'age', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter age"
                  min="0"
                  max="25"
                  required
                />
              </div>
              <div className="flex items-end">
                {formData.children.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeChild(index)}
                    className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <MinusIcon className="h-4 w-4 mr-1" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderUploadDocuments = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Required Documents</h3>
        <p className="text-sm text-blue-700">
          Please upload clear and legible copies of all required documents. Maximum file size: 5MB per file.
        </p>
      </div>

      {[
        { key: 'employeePhoto', label: 'Employee Photo', required: true, accept: 'image/*' },
        { key: 'dischargeBill', label: 'Discharge Bill/Summary', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
        { key: 'pharmacyBill', label: 'Pharmacy Bills', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
        { key: 'paymentReceipt', label: 'Payment Receipts', required: true, accept: '.pdf,.jpg,.jpeg,.png' }
      ].map((doc) => (
        <div key={doc.key} className="border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {doc.label} {doc.required && <span className="text-red-500">*</span>}
          </label>
          <div className="flex items-center space-x-4">
            <label className="flex-1">
              <input
                type="file"
                onChange={(e) => handleFileUpload(doc.key, e.target.files[0])}
                className="hidden"
                accept={doc.accept}
                required={doc.required}
              />
              <div className="px-4 py-2 border border-gray-300 rounded-md text-center cursor-pointer hover:bg-gray-50 transition-colors">
                Choose File
              </div>
            </label>
            <span className="text-sm text-gray-500 flex-1">
              {formData.documents[doc.key]?.name || 'No file chosen'}
            </span>
          </div>
          {formData.documents[doc.key] && (
            <div className="mt-2 text-sm text-green-600">
              ✓ File selected: {formData.documents[doc.key].name}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Accepted formats: {doc.accept === 'image/*' ? 'JPG, JPEG, PNG' : 'PDF, JPG, JPEG, PNG'}
          </p>
        </div>
      ))}
    </div>
  );

  const renderTreatmentDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Member Name *
          </label>
          <input
            type="text"
            value={formData.memberName}
            onChange={(e) => handleInputChange('claim', 'memberName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter member name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Claim Number *
          </label>
          <input
            type="text"
            value={formData.claimNumber}
            onChange={(e) => handleInputChange('claim', 'claimNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter claim number"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Treatment/Medical Procedure *
          </label>
          <textarea
            value={formData.treatment}
            onChange={(e) => handleInputChange('claim', 'treatment', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe the treatment received or medical procedure"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sum Insured Amount *
          </label>
          <input
            type="number"
            value={formData.sumInsured}
            onChange={(e) => handleInputChange('claim', 'sumInsured', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter sum insured amount"
            min="0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Requested Amount *
          </label>
          <input
            type="number"
            value={formData.requestedAmount}
            onChange={(e) => handleInputChange('claim', 'requestedAmount', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter requested amount"
            min="0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date of Admission *
          </label>
          <input
            type="date"
            value={formData.dateOfAdmission}
            onChange={(e) => handleInputChange('claim', 'dateOfAdmission', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date of Discharge *
          </label>
          <input
            type="date"
            value={formData.dateOfDischarge}
            onChange={(e) => handleInputChange('claim', 'dateOfDischarge', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Claim Date *
          </label>
          <input
            type="date"
            value={formData.claimDate}
            onChange={(e) => handleInputChange('claim', 'claimDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Close Date
          </label>
          <input
            type="date"
            value={formData.closeDate}
            onChange={(e) => handleInputChange('claim', 'closeDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Claim Status *
          </label>
          <select
            value={formData.claimStatus}
            onChange={(e) => handleInputChange('claim', 'claimStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Status *
          </label>
          <select
            value={formData.paymentStatus}
            onChange={(e) => handleInputChange('claim', 'paymentStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderEmployeeDetails();
      case 2:
        return renderUploadDocuments();
      case 3:
        return renderTreatmentDetails();
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">New Insurance Claim</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Form Container */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 custom-scrollbar">
            <form onSubmit={handleSubmit}>
              {/* Current Step Content */}
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {renderCurrentStep()}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                <div>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                    >
                      Previous
                    </button>
                  )}
                </div>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    className="flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors duration-200"
                  >
                    <CloudArrowDownIcon className="w-5 h-5 mr-2" />
                    Download Uploaded Files as ZIP
                  </button>

                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(currentStep + 1)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200"
                    >
                      <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                      Submit Claim
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Progress Info */}
          <div className="text-center text-sm text-gray-500">
            Step {currentStep} of {steps.length} • Complete all sections to submit your claim
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddInsuranceModal;