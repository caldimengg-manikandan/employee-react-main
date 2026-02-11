// src/pages/InsuranceManagement.jsx
import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UserCircleIcon,
  DocumentArrowUpIcon,
  CloudArrowDownIcon,
  PaperAirplaneIcon,
  MinusIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  BanknotesIcon,
  UserIcon,
  BuildingLibraryIcon,
  BuildingOfficeIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { message } from 'antd';
import { employeeAPI } from '../../services/api';

const InsuranceManagement = () => {
  const [currentView, setCurrentView] = useState('main'); // 'main', 'newClaim', 'claimHistory'
  const [currentStep, setCurrentStep] = useState(1);
  const [viewingClaim, setViewingClaim] = useState(null);
  const [editingClaim, setEditingClaim] = useState(null);
  const [errors, setErrors] = useState({});
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await employeeAPI.getAllEmployees();
        setEmployees(response.data);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    fetchEmployees();
  }, []);

  // Clear errors when changing steps to prevent initial validation errors (Issue 1)
  useEffect(() => {
    setErrors({});
  }, [currentStep]);

  const [editFormData, setEditFormData] = useState({
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
    hospitalAddress: '',
    typeOfIllness: '',
    otherIllness: '',
    documents: {
      employeePhoto: null,
      dischargeBill: null,
      pharmacyBill: null,
      paymentReceipt: null
    }
  });

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
    hospitalAddress: '',
    typeOfIllness: '',
    otherIllness: '',
    documents: {
      employeePhoto: null,
      dischargeBill: null,
      pharmacyBill: null,
      paymentReceipt: null
    }
  });

  // Illness types
  const illnessTypes = [
    "Fever",
    "Flu / Viral Infection",
    "Food Poisoning",
    "Allergy",
    "Migraine",
    "Asthma Attack",
    "Pneumonia",
    "COVID-19",
    "Gastric Pain",
    "Ulcer",
    "Jaundice",
    "Diabetes Complication",
    "High Blood Pressure",
    "Heart Disease",
    "Kidney Stone",
    "Arthritis",
    "Slip / Fall Injury",
    "Back Pain",
    "Fracture",
    "Dengue",
    "Malaria",
    "Chickenpox",
    "Typhoid",
    "Surgery",
    "Hospital Admission",
    "Emergency Treatment",
    "Other"
  ];

  // Claims data state
  const [claims, setClaims] = useState([
    {
      id: 'CLM-001',
      employeeName: 'John Doe',
      employeeId: 'EMP001',
      claimNumber: 'IC-2024-001',
      memberName: 'John Doe',
      treatment: 'Dental Surgery',
      sumInsured: 50000,
      requestedAmount: 45000,
      claimDate: '2024-01-15',
      closeDate: '2024-02-01',
      status: 'Approved',
      paymentStatus: 'Paid',
      dateOfAdmission: '2024-01-10',
      dateOfDischarge: '2024-01-14',
      bankName: 'HDFC Bank',
      accountNumber: 'XXXXXX1234',
      relationship: 'Single',
      mobile: '+91 9876543210',
      hospitalAddress: 'Apollo Hospital, Chennai',
      typeOfIllness: 'Surgery',
      otherIllness: '',
      documents: {
        employeePhoto: { name: 'john_photo.jpg' },
        dischargeBill: { name: 'discharge_bill.pdf' },
        pharmacyBill: { name: 'pharmacy_bill.pdf' },
        paymentReceipt: { name: 'payment_receipt.pdf' }
      }
    },
    {
      id: 'CLM-002',
      employeeName: 'Jane Smith',
      employeeId: 'EMP002',
      claimNumber: 'IC-2024-002',
      memberName: 'Jane Smith',
      treatment: 'Eye Checkup',
      sumInsured: 30000,
      requestedAmount: 12000,
      claimDate: '2024-01-20',
      closeDate: '2024-02-05',
      status: 'Approved',
      paymentStatus: 'Paid',
      dateOfAdmission: '2024-01-18',
      dateOfDischarge: '2024-01-18',
      bankName: 'ICICI Bank',
      accountNumber: 'XXXXXX5678',
      relationship: 'Married',
      mobile: '+91 9876543211',
      spouseName: 'Mike Smith',
      hospitalAddress: 'Fortis Hospital, Mumbai',
      typeOfIllness: 'Allergy',
      otherIllness: '',
      children: [
        { name: 'Emma Smith', age: '8' },
        { name: 'Noah Smith', age: '5' }
      ],
      documents: {
        employeePhoto: { name: 'jane_photo.jpg' },
        dischargeBill: { name: 'discharge_bill.pdf' },
        pharmacyBill: { name: 'pharmacy_bill.pdf' },
        paymentReceipt: { name: 'payment_receipt.pdf' }
      }
    },
    {
      id: 'CLM-003',
      employeeName: 'Robert Wilson',
      employeeId: 'EMP003',
      claimNumber: 'IC-2024-003',
      memberName: 'Robert Wilson',
      treatment: 'Heart Surgery',
      sumInsured: 200000,
      requestedAmount: 185000,
      claimDate: '2024-02-01',
      closeDate: '',
      status: 'Pending',
      paymentStatus: 'Pending',
      dateOfAdmission: '2024-01-28',
      dateOfDischarge: '2024-02-05',
      bankName: 'SBI',
      accountNumber: 'XXXXXX9012',
      relationship: 'Married',
      mobile: '+91 9876543212',
      spouseName: 'Sarah Wilson',
      hospitalAddress: 'Manipal Hospital, Bangalore',
      typeOfIllness: 'Heart Disease',
      otherIllness: '',
      children: [
        { name: 'Liam Wilson', age: '12' }
      ],
      documents: {
        employeePhoto: { name: 'robert_photo.jpg' },
        dischargeBill: { name: 'discharge_bill.pdf' },
        pharmacyBill: { name: 'pharmacy_bill.pdf' },
        paymentReceipt: { name: 'payment_receipt.pdf' }
      }
    }
  ]);

  // Multi-step Form Components for New Claim
  const steps = [
    { number: 1, title: 'EMPLOYEE DETAILS', icon: UserCircleIcon },
    { number: 2, title: 'UPLOAD DOCUMENTS', icon: DocumentArrowUpIcon },
    { number: 3, title: 'TREATMENT DETAILS', icon: DocumentTextIcon }
  ];

  // Helper Functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Form Handlers for New Claim
  const handleInputChange = (field, value) => {
    // Format helper for max length error msg
    const setMaxLengthError = (fieldName) => {
      setErrors(prev => ({
        ...prev,
        [fieldName]: 'Maximum 250 characters allowed'
      }));
    };

    // Validation for specific fields
    if (field === 'mobile') {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 10) return;
    }
    if (field === 'accountNumber') {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 18) return;
    }

    // Issue 2: Date Picker 4 digit year restriction
    if (['claimDate', 'dateOfAdmission', 'dateOfDischarge', 'closeDate'].includes(field)) {
      if (value) {
        if (value.length > 10) return;
        const year = value.split('-')[0];
        if (year && year.length > 4) return;
      }
    }

    // Issue: Claim Number only numbers
    if (field === 'claimNumber') {
      if (!/^\d*$/.test(value)) return;
    }

    // Issue 3: Character Limit 250
    // Fields that should have limits
    const textFields = ['employeeName', 'bankName', 'spouseName', 'memberName', 'claimNumber', 'treatment', 'hospitalAddress', 'otherIllness', 'typeOfIllness'];
    if (textFields.includes(field)) {
      if (value.length > 250) {
        setMaxLengthError(field);
        return;
      }
    }

    // Restricted inputs (Name fields - Alphabets only)
    if (['spouseName', 'memberName'].includes(field)) {
      if (value && /[^a-zA-Z\s]/.test(value)) return;
    }

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setMaxLengthError('');

    // Clear error if exists
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    const employee = employees.find(emp => emp.employeeId === employeeId);

    if (employee) {
      setFormData(prev => ({
        ...prev,
        employeeName: employee.name,
        employeeId: employee.employeeId,
        mobile: employee.mobileNo || employee.contactNumber || employee.mobile || '',
        bankName: employee.bankName || '',
        accountNumber: employee.bankAccount || employee.accountNumber || '',
        relationship: employee.maritalStatus || 'Single',
        spouseName: employee.spouseName || ''
      }));

      // Clear errors
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.employeeId;
        delete newErrors.employeeName;
        delete newErrors.mobile;
        delete newErrors.bankName;
        delete newErrors.accountNumber;
        delete newErrors.relationship;
        return newErrors;
      });
    } else {
      // Handle reset if needed, or just set ID
      setFormData(prev => ({
        ...prev,
        employeeId: employeeId
      }));
    }
  };

  const handleRemoveFile = (field) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: null
      }
    }));
  };

  const handleNameBlur = (field) => {
    const value = formData[field];
    if (value && value.length > 0) {
      const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
      setFormData(prev => ({ ...prev, [field]: capitalized }));
    }
  };

  const handleFileUpload = (field, file) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: file
      }
    }));

    // Clear error
    if (errors[field] || errors.documents) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        // Re-check generic documents error if needed, but for now simple clear
        return newErrors;
      });
    }
  };

  // Edit form file upload
  const handleEditFileUpload = (field, file) => {
    setEditFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: file
      }
    }));
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
    // Issue 4: Age field restriction & Name restriction
    if (field === 'age') {
      if (value.length > 3) return;
    }
    if (field === 'name') {
      if (/[^a-zA-Z\s]/.test(value)) return;
    }

    setFormData(prev => ({
      ...prev,
      children: prev.children.map((child, i) =>
        i === index ? { ...child, [field]: value } : child
      )
    }));
  };

  // Edit children management
  const addEditChild = () => {
    setEditFormData(prev => ({
      ...prev,
      children: [...prev.children, { name: '', age: '' }]
    }));
  };

  const removeEditChild = (index) => {
    setEditFormData(prev => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index)
    }));
  };

  const updateEditChild = (index, field, value) => {
    // Issue 4: Age field restriction
    if (field === 'age') {
      if (value.length > 3) return;
    }
    if (field === 'name') {
      if (/[^a-zA-Z\s]/.test(value)) return;
    }

    setEditFormData(prev => ({
      ...prev,
      children: prev.children.map((child, i) =>
        i === index ? { ...child, [field]: value } : child
      )
    }));
  };

  // Edit form handlers
  const handleEditInputChange = (field, value) => {
    // Issue 2: Date Picker 4 digit year restriction
    if (['claimDate', 'dateOfAdmission', 'dateOfDischarge', 'closeDate'].includes(field)) {
      if (value) {
        // Strict length check
        if (value.length > 10) return;
        const year = value.split('-')[0];
        if (year && year.length > 4) return;
      }
    }

    // Issue: Claim Number only numbers
    if (field === 'claimNumber') {
      if (!/^\d*$/.test(value)) return;
    }

    // Restricted inputs (Name fields - Alphabets only)
    if (['spouseName', 'memberName'].includes(field)) {
      if (value && /[^a-zA-Z\s]/.test(value)) return;
    }

    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Enhanced PDF Download Function
  const handleDownloadPDF = (claim) => {
    // Create a new window with the claim details
    const printWindow = window.open('', '_blank');

    // HTML content for the PDF
    const htmlContent = `
  < !DOCTYPE html >
    <html>
      <head>
        <title>Insurance Claim - ${claim.claimNumber}</title>
        <style>
          body {
            font - family: Arial, sans-serif;
          margin: 40px;
          color: #333;
          }
          .header {
            text - align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          }
          .header h1 {
            color: #2c3e50;
          margin: 0;
          }
          .header h2 {
            color: #3498db;
          margin: 10px 0;
          }
          .section {
            margin - bottom: 25px;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 5px;
          background-color: #f9f9f9;
          }
          .section h3 {
            color: #2c3e50;
          border-bottom: 1px solid #ddd;
          padding-bottom: 8px;
          margin-top: 0;
          }
          .row {
            display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          }
          .label {
            font - weight: bold;
          color: #555;
          min-width: 200px;
          }
          .value {
            flex: 1;
          color: #333;
          }
          .status {
            display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: bold;
          }
          .status-approved {
            background - color: #d4edda;
          color: #155724;
          }
          .status-pending {
            background - color: #fff3cd;
          color: #856404;
          }
          .status-rejected {
            background - color: #f8d7da;
          color: #721c24;
          }
          .amount {
            font - size: 20px;
          font-weight: bold;
          color: #2ecc71;
          }
          .footer {
            text - align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          color: #777;
          font-size: 12px;
          }
          .timestamp {
            font - size: 11px;
          color: #999;
          text-align: right;
          margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="timestamp">Generated on: ${new Date().toLocaleString()}</div>

        <div class="header">
          <h1>INSURANCE CLAIM DETAILS</h1>
          <h2>Claim Number: ${claim.claimNumber}</h2>
        </div>

        <div class="section">
          <h3>Basic Information</h3>
          <div class="row">
            <span class="label">Claim Number:</span>
            <span class="value">${claim.claimNumber}</span>
          </div>
          <div class="row">
            <span class="label">Employee Name:</span>
            <span class="value">${claim.employeeName}</span>
          </div>
          <div class="row">
            <span class="label">Employee ID:</span>
            <span class="value">${claim.employeeId}</span>
          </div>
          <div class="row">
            <span class="label">Member Name:</span>
            <span class="value">${claim.memberName}</span>
          </div>
          <div class="row">
            <span class="label">Treatment:</span>
            <span class="value">${claim.treatment}</span>
          </div>
        </div>

        <div class="section">
          <h3>Financial Details</h3>
          <div class="row">
            <span class="label">Sum Insured:</span>
            <span class="value amount">₹${claim.sumInsured?.toLocaleString()}</span>
          </div>
          <div class="row">
            <span class="label">Requested Amount:</span>
            <span class="value amount">₹${claim.requestedAmount?.toLocaleString()}</span>
          </div>
        </div>

        <div class="section">
          <h3>Treatment Details</h3>
          <div class="row">
            <span class="label">Hospital Address:</span>
            <span class="value">${claim.hospitalAddress}</span>
          </div>
          <div class="row">
            <span class="label">Type of Illness:</span>
            <span class="value">${claim.typeOfIllness}</span>
          </div>
          <div class="row">
            <span class="label">Admission Date:</span>
            <span class="value">${new Date(claim.dateOfAdmission).toLocaleDateString()}</span>
          </div>
          <div class="row">
            <span class="label">Discharge Date:</span>
            <span class="value">${new Date(claim.dateOfDischarge).toLocaleDateString()}</span>
          </div>
        </div>

        <div class="section">
          <h3>Status Information</h3>
          <div class="row">
            <span class="label">Claim Status:</span>
            <span class="value">
              <span class="status status-${claim.status.toLowerCase()}">${claim.status}</span>
            </span>
          </div>
          <div class="row">
            <span class="label">Payment Status:</span>
            <span class="value">
              <span class="status status-${claim.paymentStatus.toLowerCase()}">${claim.paymentStatus}</span>
            </span>
          </div>
          <div class="row">
            <span class="label">Claim Date:</span>
            <span class="value">${new Date(claim.claimDate).toLocaleDateString()}</span>
          </div>
          <div class="row">
            <span class="label">Close Date:</span>
            <span class="value">${claim.closeDate ? new Date(claim.closeDate).toLocaleDateString() : 'Open'}</span>
          </div>
        </div>

        <div class="section">
          <h3>Employee Information</h3>
          <div class="row">
            <span class="label">Mobile Number:</span>
            <span class="value">${claim.mobile}</span>
          </div>
          <div class="row">
            <span class="label">Relationship:</span>
            <span class="value">${claim.relationship}</span>
          </div>
          ${claim.spouseName ? `
            <div class="row">
              <span class="label">Spouse Name:</span>
              <span class="value">${claim.spouseName}</span>
            </div>
          ` : ''}
        </div>

        <div class="section">
          <h3>Bank Information</h3>
          <div class="row">
            <span class="label">Bank Name:</span>
            <span class="value">${claim.bankName}</span>
          </div>
          <div class="row">
            <span class="label">Account Number:</span>
            <span class="value">${claim.accountNumber}</span>
          </div>
        </div>

        ${claim.children && claim.children.length > 0 ? `
          <div class="section">
            <h3>Children Details</h3>
            ${claim.children.map((child, index) => `
              <div class="row">
                <span class="label">Child ${index + 1}:</span>
                <span class="value">${child.name} (Age: ${child.age} years)</span>
              </div>
            `).join('')}
            
          </div>
        ` : ''}

        ${claim.documents ? `
          <div class="section">
            <h3>Uploaded Documents</h3>
            <div class="row">
              <span class="label">Employee Photo:</span>
              <span class="value">${claim.documents.employeePhoto?.name || 'Not uploaded'}</span>
            </div>
            <div class="row">
              <span class="label">Discharge Bill:</span>
              <span class="value">${claim.documents.dischargeBill?.name || 'Not uploaded'}</span>
            </div>
            <div class="row">
              <span class="label">Pharmacy Bill:</span>
              <span class="value">${claim.documents.pharmacyBill?.name || 'Not uploaded'}</span>
            </div>
            <div class="row">
              <span class="label">Payment Receipt:</span>
              <span class="value">${claim.documents.paymentReceipt?.name || 'Not uploaded'}</span>
            </div>
          </div>
        ` : ''}

        <div class="footer">
          <p>This is an official document generated by Insurance Management System</p>
          <p>Document ID: ${claim.id} | Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
    </html>
`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Give the content time to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    }, 500);
  };

  // Form Submission Handlers
  const handleSubmitClaim = (e) => {
    e.preventDefault();

    const newErrors = {};
    const requiredFields = [
      'employeeName', 'employeeId', 'mobile', 'bankName',
      'accountNumber', 'memberName', 'claimNumber', 'treatment',
      'sumInsured', 'requestedAmount', 'dateOfAdmission', 'dateOfDischarge',
      'claimDate', 'hospitalAddress', 'typeOfIllness', 'claimStatus', 'paymentStatus'
    ];

    requiredFields.forEach(field => {
      if (!formData[field]) newErrors[field] = true;
    });

    if (formData.typeOfIllness === 'Other' && !formData.otherIllness) {
      newErrors.otherIllness = true;
    }

    if (formData.relationship === 'Married') {
      if (!formData.spouseName) newErrors.spouseName = 'Spouse Name is required';

      // Validate Children - All visible rows must be filled
      formData.children.forEach((child, index) => {
        if (!child.name) newErrors[`childName_${index}`] = 'Name is required';
        if (!child.age) newErrors[`childAge_${index}`] = 'Age is required';
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // alert('Please fill in all required fields'); // Removed alert
      message.error('Please fill in all required fields');
      return;
    }

    // Additional validation for requested amount vs sum insured
    const sumInsured = parseFloat(formData.sumInsured);
    const requestedAmount = parseFloat(formData.requestedAmount);
    let maxAmountError = false;
    if (requestedAmount > sumInsured) {
      newErrors.requestedAmount = 'Requested amount cannot exceed sum insured';
      maxAmountError = true;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      message.error('Please fill in all required Treatment Details');
      return;
    }

    if (maxAmountError) {
      message.error("Requested Amount exceeds Sum Insured");
      return;
    }

    const newClaim = {
      id: `CLM-${Date.now()}`,
      employeeName: formData.employeeName,
      employeeId: formData.employeeId,
      claimNumber: formData.claimNumber,
      memberName: formData.memberName,
      treatment: formData.treatment,
      sumInsured: parseFloat(formData.sumInsured) || 0,
      requestedAmount: parseFloat(formData.requestedAmount) || 0,
      claimDate: formData.claimDate,
      closeDate: formData.closeDate,
      status: formData.claimStatus,
      paymentStatus: formData.paymentStatus,
      dateOfAdmission: formData.dateOfAdmission,
      dateOfDischarge: formData.dateOfDischarge,
      bankName: formData.bankName,
      accountNumber: formData.accountNumber,
      relationship: formData.relationship,
      mobile: formData.mobile,
      spouseName: formData.spouseName || '',
      hospitalAddress: formData.hospitalAddress,
      typeOfIllness: formData.typeOfIllness === 'Other' ? formData.otherIllness : formData.typeOfIllness,
      otherIllness: formData.typeOfIllness === 'Other' ? formData.otherIllness : '',
      children: formData.children || [],
      documents: formData.documents || {
        employeePhoto: null,
        dischargeBill: null,
        pharmacyBill: null,
        paymentReceipt: null
      }
    };

    setClaims(prev => [newClaim, ...prev]);
    message.success('Claim submitted successfully!');

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
      hospitalAddress: '',
      typeOfIllness: '',
      otherIllness: '',
      documents: {
        employeePhoto: null,
        dischargeBill: null,
        pharmacyBill: null,
        paymentReceipt: null
      }
    });
    setCurrentStep(1);
    setCurrentView('claimHistory');
  };

  const handleUpdateClaim = (e) => {
    e.preventDefault();

    const newErrors = {};
    const requiredFields = [
      'employeeName', 'employeeId', 'mobile', 'bankName',
      'accountNumber', 'memberName', 'claimNumber', 'treatment',
      'sumInsured', 'requestedAmount', 'dateOfAdmission', 'dateOfDischarge',
      'claimDate', 'hospitalAddress', 'typeOfIllness', 'claimStatus', 'paymentStatus'
    ];

    requiredFields.forEach(field => {
      if (!editFormData[field]) newErrors[field] = true;
    });

    if (editFormData.typeOfIllness === 'Other' && !editFormData.otherIllness) {
      newErrors.otherIllness = true;
    }

    if (editFormData.relationship === 'Married') {
      if (!editFormData.spouseName) newErrors.spouseName = 'Spouse Name is required';
      // Validate Children
      editFormData.children.forEach((child, index) => {
        if (!child.name) newErrors[`childName_${index}`] = 'Name is required';
        if (!child.age) newErrors[`childAge_${index}`] = 'Age is required';
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      message.error('Please fill in all required fields');
      return;
    }

    const sumInsured = parseFloat(editFormData.sumInsured);
    const requestedAmount = parseFloat(editFormData.requestedAmount);
    if (requestedAmount > sumInsured) {
      message.error("Requested Amount cannot exceed Sum Insured");
      return;
    }

    setClaims(prev => prev.map(claim =>
      claim.id === editingClaim.id
        ? {
          ...claim,
          employeeName: editFormData.employeeName,
          employeeId: editFormData.employeeId,
          mobile: editFormData.mobile,
          bankName: editFormData.bankName,
          accountNumber: editFormData.accountNumber,
          relationship: editFormData.relationship,
          spouseName: editFormData.spouseName || '',
          children: editFormData.children || [],
          memberName: editFormData.memberName,
          claimNumber: editFormData.claimNumber,
          treatment: editFormData.treatment,
          sumInsured: parseFloat(editFormData.sumInsured) || 0,
          requestedAmount: parseFloat(editFormData.requestedAmount) || 0,
          dateOfAdmission: editFormData.dateOfAdmission,
          dateOfDischarge: editFormData.dateOfDischarge,
          claimDate: editFormData.claimDate,
          closeDate: editFormData.closeDate,
          status: editFormData.claimStatus,
          paymentStatus: editFormData.paymentStatus,
          hospitalAddress: editFormData.hospitalAddress,
          typeOfIllness: editFormData.typeOfIllness === 'Other' ? editFormData.otherIllness : editFormData.typeOfIllness,
          otherIllness: editFormData.typeOfIllness === 'Other' ? editFormData.otherIllness : '',
          documents: editFormData.documents || claim.documents
        }
        : claim
    ));
    setEditingClaim(null);
    message.success('Claim updated successfully!');
  };

  const handleDeleteClaim = (claimId) => {
    if (window.confirm('Are you sure you want to delete this claim?')) {
      setClaims(prev => prev.filter(claim => claim.id !== claimId));
      message.success('Claim deleted successfully');
    }
  };

  // Navigation between steps
  const handleNextStep = (e) => {
    e?.preventDefault(); // Prevent any form submission

    let isValid = true;
    const newErrors = {};

    switch (currentStep) {
      case 1:
        // Validate employee details
        if (!formData.employeeId) newErrors.employeeId = true;
        if (!formData.employeeName) newErrors.employeeName = true; // Still check name even if auto-filled
        if (!formData.mobile || formData.mobile.length < 10) newErrors.mobile = true;
        if (!formData.bankName) newErrors.bankName = true;
        if (!formData.accountNumber || formData.accountNumber.length < 12) newErrors.accountNumber = true;

        if (formData.relationship === 'Married' && !formData.spouseName) {
          newErrors.spouseName = true;
        }

        // Validate children if relationship allows
        if (['Married', 'Divorced', 'Widowed'].includes(formData.relationship)) {
          formData.children.forEach((child, index) => {
            // "Children Details all fields required" -> Enforce validation for EVERY row
            if (!child.name) newErrors[`childName_${index}`] = 'Name is required';
            if (!child.age) newErrors[`childAge_${index}`] = 'Age is required';
          });
        }

        if (Object.keys(newErrors).length > 0) {
          isValid = false;
        }
        break;
      case 2:
        // Validate document uploads
        if (!formData.documents.employeePhoto) newErrors.employeePhoto = true;
        if (!formData.documents.dischargeBill) newErrors.dischargeBill = true;
        if (!formData.documents.pharmacyBill) newErrors.pharmacyBill = true;
        if (!formData.documents.paymentReceipt) newErrors.paymentReceipt = true;

        if (Object.keys(newErrors).length > 0) {
          isValid = false;
        }
        break;
    }

    setErrors(newErrors);

    if (!isValid) {
      message.error('Please fill in all required fields for this step.');
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  const handlePreviousStep = () => {
    setErrors({}); // Clear errors when going back
    setCurrentStep(currentStep - 1);
  };

  // UI Components for edit form
  const renderEditEmployeeDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employee Name *
          </label>
          <input
            type="text"
            value={editFormData.employeeName}
            onChange={(e) => handleEditInputChange('employeeName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
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
            value={editFormData.employeeId}
            onChange={(e) => handleEditInputChange('employeeId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
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
            value={editFormData.mobile}
            onChange={(e) => handleEditInputChange('mobile', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
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
            value={editFormData.bankName}
            onChange={(e) => handleEditInputChange('bankName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
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
            value={editFormData.accountNumber}
            onChange={(e) => handleEditInputChange('accountNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            placeholder="Enter account number"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Relationship Status *
          </label>
          <select
            value={editFormData.relationship}
            onChange={(e) => handleEditInputChange('relationship', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            required
          >
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </select>
        </div>
      </div>

      {/* Spouse Details - Only show if Married */}
      {editFormData.relationship === 'Married' && (
        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Spouse Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Spouse Name *
              </label>
              <input
                type="text"
                value={editFormData.spouseName}
                onChange={(e) => handleEditInputChange('spouseName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
                placeholder="Enter spouse name"
                required
              />
            </div>
          </div>
        </div>
      )}

      {/* Children Details */}
      {(editFormData.relationship === 'Married' || editFormData.relationship === 'Divorced' || editFormData.relationship === 'Widowed') && (
        <div className="border-t pt-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Children Details</h3>
            <button
              type="button"
              disabled={!(editFormData.children?.[editFormData.children.length - 1]?.name && editFormData.children?.[editFormData.children.length - 1]?.age)}
              onClick={addEditChild}
              className={`inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md ${
                !(editFormData.children?.[editFormData.children.length - 1]?.name && editFormData.children?.[editFormData.children.length - 1]?.age)
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-[#262760] bg-[#262760]/10 hover:bg-[#262760]/20'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#262760]`}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Child
            </button>
          </div>

          {editFormData.children.map((child, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border border-gray-200 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Child {index + 1} Name *
                </label>
                <input
                  type="text"
                  value={child.name}
                  onChange={(e) => updateEditChild(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
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
                  onChange={(e) => updateEditChild(index, 'age', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
                  placeholder="Enter age"
                  min="0"
                  max="999"
                  required
                />
              </div>
              <div className="flex items-end">
                {editFormData.children.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEditChild(index)}
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

  const renderEditUploadDocuments = () => (
    <div className="space-y-6">
      <div className="bg-[#262760]/5 border border-[#262760]/20 rounded-lg p-4">
        <h3 className="text-sm font-medium text-[#262760] mb-2">Uploaded Documents</h3>
        <p className="text-sm text-[#262760]/80">
          You can update the documents if needed. Maximum file size: 5MB per file.
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
                onChange={(e) => {
                  handleEditFileUpload(doc.key, e.target.files[0]);
                  e.target.value = ''; // Reset input to allow re-selecting same file
                }}
                className="hidden"
                accept={doc.accept}
              />
              <div className="px-4 py-2 border border-gray-300 rounded-md text-center cursor-pointer hover:bg-[#262760]/10 hover:text-[#262760] transition-colors">
                Update File
              </div>
            </label>
            <span className="text-sm text-gray-500 flex-1">
              {editFormData.documents[doc.key]?.name || 'No file chosen'}
            </span>
          </div>
          {editFormData.documents[doc.key] && (
            <div className="mt-2 text-sm text-[#262760]">
              ✓ File selected: {editFormData.documents[doc.key].name}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Accepted formats: {doc.accept === 'image/*' ? 'JPG, JPEG, PNG' : 'PDF, JPG, JPEG, PNG'}
          </p>
        </div>
      ))}
    </div>
  );

  const renderEditTreatmentDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Member Name *
          </label>
          <input
            type="text"
            value={editFormData.memberName}
            onChange={(e) => handleEditInputChange('memberName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
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
            value={editFormData.claimNumber}
            onChange={(e) => handleEditInputChange('claimNumber', e.target.value)}
            maxLength={40}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            placeholder="Enter claim number"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Treatment/Medical Procedure *
          </label>
          <textarea
            value={editFormData.treatment}
            onChange={(e) => handleEditInputChange('treatment', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            placeholder="Describe the treatment received or medical procedure"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hospital Address *
          </label>
          <textarea
            value={editFormData.hospitalAddress}
            onChange={(e) => handleEditInputChange('hospitalAddress', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            placeholder="Enter hospital name and complete address"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type of Illness *
          </label>
          <select
            value={editFormData.typeOfIllness}
            onChange={(e) => handleEditInputChange('typeOfIllness', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            required
          >
            <option value="">Select Illness Type</option>
            {illnessTypes.map((illness, index) => (
              <option key={index} value={illness}>{illness}</option>
            ))}
          </select>
        </div>

        {editFormData.typeOfIllness === 'Other' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Other Illness *
            </label>
            <input
              type="text"
              value={editFormData.otherIllness}
              onChange={(e) => handleEditInputChange('otherIllness', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
              placeholder="Please specify illness"
              required={editFormData.typeOfIllness === 'Other'}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sum Insured Amount *
          </label>
          <input
            type="number"
            value={editFormData.sumInsured}
            onChange={(e) => handleEditInputChange('sumInsured', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
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
            value={editFormData.requestedAmount}
            onChange={(e) => handleEditInputChange('requestedAmount', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
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
            value={editFormData.dateOfAdmission}
            onChange={(e) => handleEditInputChange('dateOfAdmission', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            required
            max="9999-12-31"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date of Discharge *
          </label>
          <input
            type="date"
            value={editFormData.dateOfDischarge}
            onChange={(e) => handleEditInputChange('dateOfDischarge', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            required
            max="9999-12-31"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Claim Date *
          </label>
          <input
            type="date"
            value={editFormData.claimDate}
            onChange={(e) => handleEditInputChange('claimDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            required
            max="9999-12-31"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Close Date
          </label>
          <input
            type="date"
            value={editFormData.closeDate}
            onChange={(e) => handleEditInputChange('closeDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            max="9999-12-31"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Claim Status *
          </label>
          <select
            value={editFormData.claimStatus}
            onChange={(e) => handleEditInputChange('claimStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            required
          >
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Status *
          </label>
          <select
            value={editFormData.paymentStatus}
            onChange={(e) => handleEditInputChange('paymentStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            required
          >
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>
    </div>
  );

  // UI Components
  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center mt-3">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${currentStep >= step.number
                ? 'bg-[#262760] border-[#262760] text-white'
                : 'border-gray-300 text-gray-500'
                }`}>
                <step.icon className="w-6 h-6" />
              </div>
              <span className={`mt-2 text-sm font-medium ${currentStep >= step.number ? 'text-[#262760]' : 'text-gray-500'
                }`}>
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 ${currentStep > step.number ? 'bg-[#262760]' : 'bg-gray-300'
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
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Employee *
          </label>
          <select
            value={formData.employeeId}
            onChange={(e) => handleEmployeeSelect(e.target.value)}
            className={`w-full px-3 py-2 border ${errors.employeeId ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
          >
            <option value="">Select an employee</option>
            {employees.map(emp => (
              <option key={emp.employeeId} value={emp.employeeId}>{emp.name} - {emp.employeeId}</option>
            ))}
          </select>
          {errors.employeeId && <p className="mt-1 text-xs text-red-500">Employee is required</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employee Name *
          </label>
          <input
            type="text"
            value={formData.employeeName}
            onChange={(e) => handleInputChange('employeeName', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.employeeName ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter employee name"
            readOnly
          />
          {errors.employeeName && <p className="mt-1 text-xs text-red-500">Employee Name is required</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employee ID *
          </label>
          <input
            type="text"
            value={formData.employeeId}
            onChange={(e) => handleInputChange('employeeId', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.employeeId ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter employee ID"
            readOnly
          />
          {errors.employeeId && <p className="mt-1 text-xs text-red-500">Employee ID is required</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mobile Number *
          </label>
          <input
            type="tel"
            value={formData.mobile}
            onChange={(e) => handleInputChange('mobile', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.mobile ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter mobile number"
          />
          {errors.mobile && <p className="mt-1 text-xs text-red-500">Mobile Number must be at least 10 digits</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bank Name *
          </label>
          <input
            type="text"
            value={formData.bankName}
            onChange={(e) => handleInputChange('bankName', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.bankName ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter bank name"
          />
          {errors.bankName && <p className="mt-1 text-xs text-red-500">Bank Name is required</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Number *
          </label>
          <input
            type="text"
            value={formData.accountNumber}
            onChange={(e) => handleInputChange('accountNumber', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.accountNumber ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter account number"
          />
          {errors.accountNumber && <p className="mt-1 text-xs text-red-500">Account Number must be at least 12 digits</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Relationship Status *
          </label>
          <select
            value={formData.relationship}
            onChange={(e) => handleInputChange('relationship', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.relationship ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
          >
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </select>
          {errors.relationship && <p className="mt-1 text-xs text-red-500">Relationship is required</p>}
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
                onChange={(e) => handleInputChange('spouseName', e.target.value)}
                className={`w-full px-3 py-2 border ${errors.spouseName ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
                placeholder="Enter spouse name"
              />
              {errors.spouseName && <p className="mt-1 text-xs text-red-500">Spouse Name is required</p>}
            </div>
          </div>
        </div>
      )}

      {/* Children Details */}
      {(formData.relationship === 'Married' || formData.relationship === 'Divorced' || formData.relationship === 'Widowed') && (
        <div className="border-t pt-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Children Details</h3>
            <button
              type="button"
              disabled={!(formData.children?.[formData.children.length - 1]?.name && formData.children?.[formData.children.length - 1]?.age)}
              onClick={addChild}
              className={`inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md ${
                !(formData.children?.[formData.children.length - 1]?.name && formData.children?.[formData.children.length - 1]?.age)
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-[#262760] bg-[#262760]/10 hover:bg-[#262760]/20'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#262760]`}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Child
            </button>
          </div>

          {formData.children.map((child, index) => (
            <div key={index} className="flex gap-4 mb-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Child Name *"
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-[#262760] ${errors[`childName_${index}`] ? 'border-red-500' : ''}`}
                  value={child.name}
                  onChange={(e) => updateChild(index, 'name', e.target.value)}
                />
                {errors[`childName_${index}`] && <p className="text-red-500 text-xs mt-1">{errors[`childName_${index}`]}</p>}
              </div>
              <div className="w-32">
                <input
                  type="number"
                  placeholder="Age *"
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-[#262760] ${errors[`childAge_${index}`] ? 'border-red-500' : ''}`}
                  value={child.age}
                  onChange={(e) => updateChild(index, 'age', e.target.value)}
                  min="0"
                  max="999"
                />
                {errors[`childAge_${index}`] && <p className="text-red-500 text-xs mt-1">{errors[`childAge_${index}`]}</p>}
              </div>
              {formData.children.length > 1 && (
                <button
                  onClick={() => removeChild(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderUploadDocuments = () => (
    <div className="space-y-6">
      <div className="bg-[#262760]/5 border border-[#262760]/20 rounded-lg p-4">
        <h3 className="text-sm font-medium text-[#262760] mb-2">Required Documents</h3>
        <p className="text-sm text-[#262760]/80">
          Please upload clear and legible copies of all required documents. Maximum file size: 5MB per file.
        </p>
      </div>

      {[
        { key: 'employeePhoto', label: 'Employee Photo', required: true, accept: 'image/*' },
        { key: 'dischargeBill', label: 'Discharge Bill/Summary', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
        { key: 'pharmacyBill', label: 'Pharmacy Bills', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
        { key: 'paymentReceipt', label: 'Payment Receipts', required: true, accept: '.pdf,.jpg,.jpeg,.png' }
      ].map((doc) => (
        <div key={doc.key} className={`border ${errors[doc.key] ? 'border-red-500' : 'border-gray-200'} rounded-lg p-4`}>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {doc.label} {doc.required && <span className="text-red-500">*</span>}
          </label>
          <div className="flex items-center space-x-4">
            <label className="flex-1">
              <input
                type="file"
                onChange={(e) => {
                  handleFileUpload(doc.key, e.target.files[0]);
                  e.target.value = ''; // Reset input to allow re-selecting same file
                }}
                className="hidden"
                accept={doc.accept}
              />
              <div className={`px-4 py-2 border ${errors[doc.key] ? 'border-red-300 text-red-700' : 'border-gray-300'} rounded-md text-center cursor-pointer hover:bg-[#262760]/10 hover:text-[#262760] transition-colors`}>
                Choose File
              </div>
            </label>
            <div className="flex-1 flex items-center space-x-2">
              <span className="text-sm text-gray-500 truncate">
                {formData.documents[doc.key]?.name || 'No file chosen'}
              </span>
              {formData.documents[doc.key] && (
                <button
                  type="button"
                  onClick={() => handleRemoveFile(doc.key)}
                  className="text-gray-400 hover:text-red-500 p-1"
                  title="Remove file"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          {errors[doc.key] && <p className="mt-1 text-xs text-red-500">{doc.label} is required</p>}
          {formData.documents[doc.key] && (
            <div className="mt-2 text-sm text-[#262760]">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Member Name *
          </label>
          <input
            type="text"
            value={formData.memberName}
            onChange={(e) => handleInputChange('memberName', e.target.value)}
            onBlur={() => handleNameBlur('memberName')}
            className={`w-full px-3 py-2 border ${errors.memberName ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter member name"
            maxLength={250}
          />
          {errors.memberName && <p className="mt-1 text-xs text-red-500">Member Name is required</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Claim Number *
          </label>
          <input
            type="text"
            value={formData.claimNumber}
            onChange={(e) => handleInputChange('claimNumber', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.claimNumber ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter claim number"
            maxLength={250}
          />
          {errors.claimNumber && <p className="mt-1 text-xs text-red-500">Claim Number is required</p>}
        </div>

        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Treatment/Medical Procedure *
          </label>
          <textarea
            value={formData.treatment}
            onChange={(e) => handleInputChange('treatment', e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border ${errors.treatment ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Describe the treatment received or medical procedure"
            maxLength={250}
          />
          {errors.treatment && <p className="mt-1 text-xs text-red-500">Treatment details are required</p>}
        </div>

        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hospital Address *
          </label>
          <textarea
            value={formData.hospitalAddress}
            onChange={(e) => handleInputChange('hospitalAddress', e.target.value)}
            rows={2}
            className={`w-full px-3 py-2 border ${errors.hospitalAddress ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter hospital name and complete address"
            maxLength={250}
          />
          {errors.hospitalAddress && <p className="mt-1 text-xs text-red-500">Hospital Address is required</p>}
        </div>


        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type of Illness *
          </label>
          <select
            value={formData.typeOfIllness}
            onChange={(e) => handleInputChange('typeOfIllness', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.typeOfIllness ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
          >
            <option value="">Select Illness Type</option>
            {illnessTypes.map((illness, index) => (
              <option key={index} value={illness}>{illness}</option>
            ))}
          </select>
          {errors.typeOfIllness && <p className="mt-1 text-xs text-red-500">Type of Illness is required</p>}
        </div>

        {formData.typeOfIllness === 'Other' && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Other Illness *
            </label>
            <input
              type="text"
              value={formData.otherIllness}
              onChange={(e) => handleInputChange('otherIllness', e.target.value)}
              className={`w-full px-3 py-2 border ${errors.otherIllness ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
              placeholder="Please specify illness"
              maxLength={250}
            />
            {errors.otherIllness && <p className="mt-1 text-xs text-red-500">Please specify the illness</p>}
          </div>
        )}

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sum Insured Amount *
          </label>
          <input
            type="number"
            value={formData.sumInsured}
            onChange={(e) => handleInputChange('sumInsured', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.sumInsured ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter sum insured amount"
            min="0"
          />
          {errors.sumInsured && <p className="mt-1 text-xs text-red-500">Sum Insured Amount is required</p>}
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Requested Amount *
          </label>
          <input
            type="number"
            value={formData.requestedAmount}
            onChange={(e) => handleInputChange('requestedAmount', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.requestedAmount ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter requested amount"
            min="0"
          />
          {errors.requestedAmount && <p className="mt-1 text-xs text-red-500">Requested Amount is required</p>}
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Claim Date *
          </label>
          <input
            type="date"
            value={formData.claimDate}
            onChange={(e) => handleInputChange('claimDate', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.claimDate ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            max="9999-12-31"
          />
          {errors.claimDate && <p className="mt-1 text-xs text-red-500">Claim Date is required</p>}
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date of Admission *
          </label>
          <input
            type="date"
            value={formData.dateOfAdmission}
            onChange={(e) => handleInputChange('dateOfAdmission', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.dateOfAdmission ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            max="9999-12-31"
          />
          {errors.dateOfAdmission && <p className="mt-1 text-xs text-red-500">Admission Date is required</p>}
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date of Discharge *
          </label>
          <input
            type="date"
            value={formData.dateOfDischarge}
            onChange={(e) => handleInputChange('dateOfDischarge', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.dateOfDischarge ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            max="9999-12-31"
          />
          {errors.dateOfDischarge && <p className="mt-1 text-xs text-red-500">Discharge Date is required</p>}
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Close Date
          </label>
          <input
            type="date"
            value={formData.closeDate}
            onChange={(e) => handleInputChange('closeDate', e.target.value)}
            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            max="9999-12-31"
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Claim Status *
          </label>
          <select
            value={formData.claimStatus}
            onChange={(e) => handleInputChange('claimStatus', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.claimStatus ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
          >
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          {errors.claimStatus && <p className="mt-1 text-xs text-red-500">Claim Status is required</p>}
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Status *
          </label>
          <select
            value={formData.paymentStatus}
            onChange={(e) => handleInputChange('paymentStatus', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.paymentStatus ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
          >
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
            <option value="Rejected">Rejected</option>
          </select>
          {errors.paymentStatus && <p className="mt-1 text-xs text-red-500">Payment Status is required</p>}
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

  // Main Landing Page
  if (currentView === 'main') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Removed the header text and paragraph */}

          {/* Action Cards - Increased height */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* New Insurance Claim Card - Increased height */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 md:p-10 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 min-h-[320px] flex flex-col justify-center">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-r from-[#262760]/10 to-[#262760]/20 mb-8 shadow-inner">
                  <PlusIcon className="h-12 w-12 text-[#262760]" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">New Insurance Claim</h3>
                <button
                  onClick={() => {
                    setCurrentView('newClaim');
                    setErrors({});
                  }}
                  className="w-full inline-flex items-center justify-center px-8 py-5 border border-transparent text-lg font-medium rounded-xl text-white bg-gradient-to-r from-[#262760] to-[#1e2050] hover:from-[#1e2050] hover:to-[#1a1b40] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#262760] transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <PlusIcon className="h-6 w-6 mr-3" />
                  Create New Claim
                </button>
              </div>
            </div>

            {/* Claim History Card - Increased height */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 md:p-10 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 min-h-[320px] flex flex-col justify-center">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-r from-[#262760]/10 to-[#262760]/20 mb-8 shadow-inner">
                  <DocumentTextIcon className="h-12 w-12 text-[#262760]" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Claim History</h3>
                <button
                  onClick={() => setCurrentView('claimHistory')}
                  className="w-full inline-flex items-center justify-center px-8 py-5 border border-transparent text-lg font-medium rounded-xl text-white bg-gradient-to-r from-[#262760] to-[#1e2050] hover:from-[#1e2050] hover:to-[#1a1b40] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#262760] transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <DocumentTextIcon className="h-6 w-6 mr-3" />
                  View Claim History
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // New Claim Form
  if (currentView === 'newClaim') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header with Back Button */}
          <div className="flex items-center mb-6 md:mb-8">
            <button
              onClick={() => {
                setCurrentView('main');
                setCurrentStep(1);
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
                  hospitalAddress: '',
                  typeOfIllness: '',
                  otherIllness: '',
                  documents: {
                    employeePhoto: null,
                    dischargeBill: null,
                    pharmacyBill: null,
                    paymentReceipt: null
                  }
                });
                setErrors({});
              }}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 mr-4 shadow-sm"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Insurance
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">New Insurance Claim</h1>
              {/* Removed paragraph text */}
            </div>
          </div>

          {/* Form Container - Increased height */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden min-h-[600px]">
            {/* Step Indicator */}
            {renderStepIndicator()}

            <div className="p-6 md:p-8">
              <form onSubmit={handleSubmitClaim}>
                {/* Current Step Content */}
                <div className="mb-8">
                  <div className="max-h-[600px] overflow-y-auto pr-2">
                    {renderCurrentStep()}
                  </div>
                </div>

                {/* Navigation Buttons - Removed Download ZIP button */}
                <div className="flex flex-col md:flex-row justify-between items-center mt-8 pt-8 border-t border-gray-200 space-y-4 md:space-y-0">
                  <div>
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={handlePreviousStep}
                        className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200 shadow-sm"
                      >
                        Previous
                      </button>
                    )}
                  </div>

                  <div>
                    {currentStep < 3 ? (
                      <button
                        key="next-btn"
                        type="button"
                        onClick={handleNextStep}
                        className="px-8 py-4 bg-gradient-to-r from-[#262760] to-[#1e2050] text-white rounded-lg hover:from-[#1e2050] hover:to-[#1a1b40] transition-all duration-200 shadow-md text-lg"
                      >
                        Next Step
                      </button>
                    ) : (
                      <button
                        key="submit-btn"
                        type="submit"
                        className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[#262760] to-[#1e2050] text-white rounded-lg hover:from-[#1e2050] hover:to-[#1a1b40] transition-all duration-200 shadow-md text-lg"
                      >
                        <PaperAirplaneIcon className="w-6 h-6 mr-3" />
                        Submit Claim
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Info */}
                <div className="text-center text-sm text-gray-500 mt-6">
                  Step {currentStep} of {steps.length} • Complete all sections to submit your claim
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Claim History View
  if (currentView === 'claimHistory') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header with Back Button */}
          <div className="flex items-center mb-6 md:mb-8">
            <button
              onClick={() => setCurrentView('main')}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 mr-4 shadow-sm"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Claim History</h1>
              {/* Removed paragraph text */}
            </div>
          </div>

          {/* Claims Table - Increased height */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden min-h-[600px]">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#262760]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      S.No
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Employee Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Claim No
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Treatment
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Insured Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Claim Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Payment Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {claims.map((claim, index) => (
                    <tr key={claim.id} className="hover:bg-[#262760]/5 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {claim.employeeId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {claim.employeeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {claim.claimNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {claim.treatment}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{claim.sumInsured?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(claim.claimDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(claim.status)}`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(claim.paymentStatus)}`}>
                          {claim.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setViewingClaim(claim)}
                            className="p-2 bg-[#262760] text-white hover:bg-[#1e2050] rounded-lg shadow-sm transition-all duration-150"
                            title="View Claim Details"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(claim)}
                            className="p-2 text-[#262760] hover:text-[#1e2050] hover:bg-[#262760]/10 rounded-lg transition-colors duration-150"
                            title="Download PDF"
                          >
                            <DocumentArrowDownIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingClaim(claim);
                              // Set all form data for editing
                              setEditFormData({
                                employeeName: claim.employeeName || '',
                                employeeId: claim.employeeId || '',
                                mobile: claim.mobile || '',
                                bankName: claim.bankName || '',
                                accountNumber: claim.accountNumber || '',
                                relationship: claim.relationship || 'Single',
                                spouseName: claim.spouseName || '',
                                children: claim.children || [{ name: '', age: '' }],
                                memberName: claim.memberName || '',
                                claimNumber: claim.claimNumber || '',
                                treatment: claim.treatment || '',
                                sumInsured: claim.sumInsured || '',
                                dateOfAdmission: claim.dateOfAdmission || '',
                                dateOfDischarge: claim.dateOfDischarge || '',
                                requestedAmount: claim.requestedAmount || '',
                                claimDate: claim.claimDate || '',
                                closeDate: claim.closeDate || '',
                                claimStatus: claim.status || 'Pending',
                                paymentStatus: claim.paymentStatus || 'Unpaid',
                                hospitalAddress: claim.hospitalAddress || '',
                                typeOfIllness: claim.typeOfIllness || '',
                                otherIllness: claim.otherIllness || '',
                                documents: claim.documents || {
                                  employeePhoto: null,
                                  dischargeBill: null,
                                  pharmacyBill: null,
                                  paymentReceipt: null
                                }
                              });
                            }}
                            className="p-2 text-[#262760] hover:text-[#1e2050] hover:bg-[#262760]/10 rounded-lg transition-colors duration-150"
                            title="Edit Claim"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClaim(claim.id)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors duration-150"
                            title="Delete Claim"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {claims.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-gray-400 mb-4">
                    <DocumentTextIcon className="h-16 w-16 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No claim history</h3>
                  <p className="text-gray-600 mb-6">Start by submitting your first insurance claim.</p>
                  <button
                    onClick={() => setCurrentView('newClaim')}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#262760] to-[#1e2050] text-white rounded-lg hover:from-[#1e2050] hover:to-[#1a1b40] transition-all duration-200 shadow-md"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Create First Claim
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* View Claim Modal */}
        {viewingClaim && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transform transition-all">
              <div className="p-6 bg-gradient-to-r from-[#262760] to-[#1e2050] text-white rounded-t-3xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                      <DocumentTextIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Claim Details</h2>
                      <p className="text-white/80 text-sm">#{viewingClaim.claimNumber}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingClaim(null)}
                    className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all duration-200"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-8 bg-gray-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Claim Information */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                    <h4 className="text-sm font-bold text-[#262760] mb-4 flex items-center uppercase tracking-wider">
                      <span className="w-8 h-8 rounded-full bg-[#262760]/10 flex items-center justify-center mr-3">
                        <DocumentTextIcon className="h-4 w-4 text-[#262760]" />
                      </span>
                      Claim Information
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                        <span className="text-sm font-medium text-gray-500">Claim Number</span>
                        <span className="text-sm font-bold text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">{viewingClaim.claimNumber}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                        <span className="text-sm font-medium text-gray-500">Member Name</span>
                        <span className="text-sm font-semibold text-gray-900">{viewingClaim.memberName}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500 block mb-1">Treatment</span>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100">{viewingClaim.treatment}</p>
                      </div>
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                    <h4 className="text-sm font-bold text-[#262760] mb-4 flex items-center uppercase tracking-wider">
                      <span className="w-8 h-8 rounded-full bg-[#262760]/10 flex items-center justify-center mr-3">
                        <BanknotesIcon className="h-4 w-4 text-[#262760]" />
                      </span>
                      Financial Details
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                        <span className="text-sm font-medium text-green-800">Sum Insured</span>
                        <span className="text-lg font-bold text-green-700">₹{viewingClaim.sumInsured?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <span className="text-sm font-medium text-blue-800">Requested Amount</span>
                        <span className="text-lg font-bold text-blue-700">₹{viewingClaim.requestedAmount?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Treatment Dates */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                    <h4 className="text-sm font-bold text-[#262760] mb-4 flex items-center uppercase tracking-wider">
                      <span className="w-8 h-8 rounded-full bg-[#262760]/10 flex items-center justify-center mr-3">
                        <ClockIcon className="h-4 w-4 text-[#262760]" />
                      </span>
                      Treatment Dates
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                        <span className="text-sm font-medium text-gray-500">Admission Date</span>
                        <span className="text-sm font-semibold text-gray-900">{new Date(viewingClaim.dateOfAdmission).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                        <span className="text-sm font-medium text-gray-500">Discharge Date</span>
                        <span className="text-sm font-semibold text-gray-900">{new Date(viewingClaim.dateOfDischarge).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Claim Status */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                    <h4 className="text-sm font-bold text-[#262760] mb-4 flex items-center uppercase tracking-wider">
                      <span className="w-8 h-8 rounded-full bg-[#262760]/10 flex items-center justify-center mr-3">
                        <ExclamationCircleIcon className="h-4 w-4 text-[#262760]" />
                      </span>
                      Claim Status
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-500">Claim Status</span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(viewingClaim.status)}`}>
                          {viewingClaim.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-500">Payment Status</span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getPaymentStatusColor(viewingClaim.paymentStatus)}`}>
                          {viewingClaim.paymentStatus}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                        <span className="text-xs text-gray-400">Claim Date: {new Date(viewingClaim.claimDate).toLocaleDateString()}</span>
                        <span className="text-xs text-gray-400">
                          {viewingClaim.closeDate ? `Closed: ${new Date(viewingClaim.closeDate).toLocaleDateString()}` : 'Open'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Medical Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Hospital Information */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                    <h4 className="text-sm font-bold text-[#262760] mb-4 flex items-center uppercase tracking-wider">
                      <span className="w-8 h-8 rounded-full bg-[#262760]/10 flex items-center justify-center mr-3">
                        <BuildingOfficeIcon className="h-4 w-4 text-[#262760]" />
                      </span>
                      Hospital Information
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500 block mb-1">Hospital Address</span>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100">{viewingClaim.hospitalAddress}</p>
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-50 pt-2">
                        <span className="text-sm font-medium text-gray-500">Type of Illness</span>
                        <span className="text-sm font-semibold text-gray-900 px-2 py-1 bg-purple-50 text-purple-700 rounded">{viewingClaim.typeOfIllness}</span>
                      </div>
                    </div>
                  </div>

                  {/* Employee Information */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                    <h4 className="text-sm font-bold text-[#262760] mb-4 flex items-center uppercase tracking-wider">
                      <span className="w-8 h-8 rounded-full bg-[#262760]/10 flex items-center justify-center mr-3">
                        <UserIcon className="h-4 w-4 text-[#262760]" />
                      </span>
                      Employee Information
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                        <span className="text-sm font-medium text-gray-500">Employee Name</span>
                        <span className="text-sm font-bold text-gray-900">{viewingClaim.employeeName}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                        <span className="text-sm font-medium text-gray-500">Employee ID</span>
                        <span className="text-sm font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded">{viewingClaim.employeeId}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                        <span className="text-sm font-medium text-gray-500">Mobile</span>
                        <span className="text-sm text-gray-900">{viewingClaim.mobile}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-500">Relationship</span>
                        <span className="text-sm text-gray-900">{viewingClaim.relationship}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bank Information */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                    <h4 className="text-sm font-bold text-[#262760] mb-4 flex items-center uppercase tracking-wider">
                      <span className="w-8 h-8 rounded-full bg-[#262760]/10 flex items-center justify-center mr-3">
                        <BuildingLibraryIcon className="h-4 w-4 text-[#262760]" />
                      </span>
                      Bank Information
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                        <span className="text-sm font-medium text-gray-500">Bank Name</span>
                        <span className="text-sm font-semibold text-gray-900">{viewingClaim.bankName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-500">Account Number</span>
                        <span className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">{viewingClaim.accountNumber}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Family Details */}
                {(viewingClaim.spouseName || (viewingClaim.children && viewingClaim.children.length > 0)) && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                    <h4 className="text-sm font-bold text-[#262760] mb-4 flex items-center uppercase tracking-wider">
                      <span className="w-8 h-8 rounded-full bg-[#262760]/10 flex items-center justify-center mr-3">
                        <UserGroupIcon className="h-4 w-4 text-[#262760]" />
                      </span>
                      Family Details
                    </h4>
                    <div className="space-y-4">
                      {viewingClaim.spouseName && (
                        <div className="flex justify-between items-center p-3 bg-pink-50 rounded-lg border border-pink-100">
                          <span className="text-sm font-medium text-pink-800">Spouse Name</span>
                          <span className="text-sm font-bold text-pink-900">{viewingClaim.spouseName}</span>
                        </div>
                      )}
                      {viewingClaim.children && viewingClaim.children.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-500 mb-2 block">Children</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {viewingClaim.children.map((child, index) => (
                              <div key={index} className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                                <div className="font-semibold text-blue-900">{child.name}</div>
                                <div className="text-xs font-medium text-blue-700 bg-white/50 px-2 py-1 rounded-full">{child.age} yrs</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl flex justify-between items-center">
                <button
                  onClick={() => handleDownloadPDF(viewingClaim)}
                  className="inline-flex items-center px-6 py-3 border-2 border-[#262760] text-[#262760] font-semibold rounded-xl hover:bg-[#262760] hover:text-white transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                  Download PDF
                </button>
                <button
                  onClick={() => setViewingClaim(null)}
                  className="px-8 py-3 bg-gradient-to-r from-[#262760] to-[#1e2050] text-white font-semibold rounded-xl hover:from-[#1e2050] hover:to-[#1a1b40] transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Claim Modal - Now shows full form */}
        {editingClaim && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-800">Edit Claim - {editingClaim.claimNumber}</h2>
                  <button
                    onClick={() => setEditingClaim(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <form onSubmit={handleUpdateClaim}>
                  {/* Multi-step form similar to new claim form */}
                  <div className="space-y-8">
                    {/* Employee Details Section */}
                    <div className="border-b pb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <UserCircleIcon className="h-5 w-5 mr-2 text-[#262760]" />
                        Employee Details
                      </h3>
                      {renderEditEmployeeDetails()}
                    </div>

                    {/* Upload Documents Section */}
                    <div className="border-b pb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <DocumentArrowUpIcon className="h-5 w-5 mr-2 text-[#262760]" />
                        Upload Documents
                      </h3>
                      {renderEditUploadDocuments()}
                    </div>

                    {/* Treatment Details Section */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <DocumentTextIcon className="h-5 w-5 mr-2 text-[#262760]" />
                        Treatment Details
                      </h3>
                      {renderEditTreatmentDetails()}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 mt-8 pt-8 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setEditingClaim(null)}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-[#262760] to-[#1e2050] text-white rounded-lg hover:from-[#1e2050] hover:to-[#1a1b40] transition-all duration-200 shadow-md"
                    >
                      Update Claim
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default InsuranceManagement;
