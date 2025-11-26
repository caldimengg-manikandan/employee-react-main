// components/Forms/EmployeeForm.jsx
import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import FloatingInput from './FloatingInput';

const EmployeeForm = ({ employee, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    location: '',
    dateOfBirth: '',
    bloodGroup: '',
    position: '',
    division: '',
    dateOfJoining: '',
    experience: '',
    qualification: '',
    mobileNo: '',
    guardianName: '',
    emergencyMobileNo: '',
    pan: '',
    aadhaar: '',
    address: '',
    email: '',
    bankName: '',
    bankAccount: '',
    branch: '',
    uan: '',
    basicDA: '',
    hra: '',
    specialAllowance: '',
    gratuity: '',
    lop: '',
    pf: '',
    esi: '',
    tax: '',
    professionalTax: '',
    loanDeduction: '',
    status: 'Active'
  });

  useEffect(() => {
    if (employee) {
      setFormData(employee);
    }
  }, [employee]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const calculateSalaryFields = () => {
    const basicDA = parseFloat(formData.basicDA) || 0;
    const hra = parseFloat(formData.hra) || 0;
    const specialAllowance = parseFloat(formData.specialAllowance) || 0;
    const gratuity = parseFloat(formData.gratuity) || 0;
    const pf = parseFloat(formData.pf) || 0;
    const esi = parseFloat(formData.esi) || 0;
    const tax = parseFloat(formData.tax) || 0;
    const professionalTax = parseFloat(formData.professionalTax) || 0;
    const loanDeduction = parseFloat(formData.loanDeduction) || 0;

    const totalEarnings = basicDA + hra + specialAllowance + gratuity;
    const totalDeductions = pf + esi + tax + professionalTax + loanDeduction;
    const netSalary = totalEarnings - totalDeductions;
    const ctc = totalEarnings;

    setFormData(prev => ({
      ...prev,
      totalEarnings,
      totalDeductions,
      netSalary,
      ctc
    }));
  };

  useEffect(() => {
    calculateSalaryFields();
  }, [
    formData.basicDA, formData.hra, formData.specialAllowance, formData.gratuity,
    formData.pf, formData.esi, formData.tax, formData.professionalTax, formData.loanDeduction
  ]);

  // Blood group options for select
  const bloodGroupOptions = [
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' }
  ];

  // Status options for select
  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Suspended', label: 'Suspended' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-96 overflow-y-auto p-1">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Personal Information */}
        <div className="col-span-3 border-b pb-4">
          <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
        </div>
        
        <FloatingInput
          label="Employee ID"
          name="employeeId"
          value={formData.employeeId}
          onChange={handleChange}
          required={true}
        />

        <FloatingInput
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required={true}
        />

        <FloatingInput
          label="Location"
          name="location"
          type="select"
          value={formData.location}
          onChange={handleChange}
          options={[
            { value: '', label: 'Select Location' },
            { value: 'Hosur', label: 'Hosur' },
            { value: 'Chennai', label: 'Chennai' }
          ]}
        />

        <FloatingInput
          label="Date of Birth"
          name="dateOfBirth"
          type="date"
          value={formData.dateOfBirth}
          onChange={handleChange}
        />

        <FloatingInput
          label="Blood Group"
          name="bloodGroup"
          type="select"
          value={formData.bloodGroup}
          onChange={handleChange}
          options={bloodGroupOptions}
        />

        {/* Employment Information */}
        <div className="col-span-3 border-b pb-4 mt-4">
          <h3 className="text-lg font-medium text-gray-900">Employment Information</h3>
        </div>

        <FloatingInput
          label="Position"
          name="position"
          value={formData.position}
          onChange={handleChange}
        />

        <FloatingInput
          label="Division"
          name="division"
          type="select"
          value={formData.division}
          onChange={handleChange}
          options={[
            { value: '', label: 'Select Division' },
            { value: 'SDS', label: 'SDS' },
            { value: 'TEKLA', label: 'TEKLA' },
            { value: 'DAS', label: 'DAS' },
            { value: 'Mechanical', label: 'Mechanical' }
          ]}
        />

        <FloatingInput
          label="Date of Joining"
          name="dateOfJoining"
          type="date"
          value={formData.dateOfJoining}
          onChange={handleChange}
        />

        <FloatingInput
          label="Experience"
          name="experience"
          value={formData.experience}
          onChange={handleChange}
        />

        <FloatingInput
          label="Qualification"
          name="qualification"
          value={formData.qualification}
          onChange={handleChange}
        />

        {/* Contact Information */}
        <div className="col-span-3 border-b pb-4 mt-4">
          <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
        </div>

        <FloatingInput
          label="Mobile No"
          name="mobileNo"
          value={formData.mobileNo}
          onChange={handleChange}
        />

        <FloatingInput
          label="Guardian Name"
          name="guardianName"
          value={formData.guardianName}
          onChange={handleChange}
        />

        <FloatingInput
          label="Emergency Mobile No"
          name="emergencyMobileNo"
          value={formData.emergencyMobileNo}
          onChange={handleChange}
        />

        <FloatingInput
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
        />

        <div className="col-span-3">
          <FloatingInput
            label="Address"
            name="address"
            type="textarea"
            value={formData.address}
            onChange={handleChange}
          />
        </div>

        {/* Bank Information */}
        <div className="col-span-3 border-b pb-4 mt-4">
          <h3 className="text-lg font-medium text-gray-900">Bank & Salary Information</h3>
        </div>

        <FloatingInput
          label="PAN"
          name="pan"
          value={formData.pan}
          onChange={handleChange}
        />

        <FloatingInput
          label="Aadhaar"
          name="aadhaar"
          value={formData.aadhaar}
          onChange={handleChange}
        />

        <FloatingInput
          label="Bank Name"
          name="bankName"
          value={formData.bankName}
          onChange={handleChange}
        />

        <FloatingInput
          label="Bank Account"
          name="bankAccount"
          value={formData.bankAccount}
          onChange={handleChange}
        />

        <FloatingInput
          label="Branch"
          name="branch"
          value={formData.branch}
          onChange={handleChange}
        />

        <FloatingInput
          label="UAN"
          name="uan"
          value={formData.uan}
          onChange={handleChange}
        />

        {/* Salary Components */}
        <div className="col-span-3 border-b pb-4 mt-4">
          <h3 className="text-lg font-medium text-gray-900">Salary Components</h3>
        </div>

        <FloatingInput
          label="Basic + DA"
          name="basicDA"
          type="number"
          value={formData.basicDA}
          onChange={handleChange}
        />

        <FloatingInput
          label="HRA"
          name="hra"
          type="number"
          value={formData.hra}
          onChange={handleChange}
        />

        <FloatingInput
          label="Special Allowance"
          name="specialAllowance"
          type="number"
          value={formData.specialAllowance}
          onChange={handleChange}
        />

        <FloatingInput
          label="Gratuity"
          name="gratuity"
          type="number"
          value={formData.gratuity}
          onChange={handleChange}
        />

        {/* Deductions */}
        <div className="col-span-3 border-b pb-4 mt-4">
          <h3 className="text-lg font-medium text-gray-900">Deductions</h3>
        </div>

        <FloatingInput
          label="PF"
          name="pf"
          type="number"
          value={formData.pf}
          onChange={handleChange}
        />

        <FloatingInput
          label="ESI"
          name="esi"
          type="number"
          value={formData.esi}
          onChange={handleChange}
        />

        <FloatingInput
          label="Tax"
          name="tax"
          type="number"
          value={formData.tax}
          onChange={handleChange}
        />

        <FloatingInput
          label="Professional Tax"
          name="professionalTax"
          type="number"
          value={formData.professionalTax}
          onChange={handleChange}
        />

        <FloatingInput
          label="Loan Deduction"
          name="loanDeduction"
          type="number"
          value={formData.loanDeduction}
          onChange={handleChange}
        />

        {/* Calculated Fields */}
        <div className="col-span-3 border-b pb-4 mt-4">
          <h3 className="text-lg font-medium text-gray-900">Salary Summary</h3>
        </div>

        <FloatingInput
          label="Total Earnings"
          name="totalEarnings"
          type="number"
          value={formData.totalEarnings || ''}
          onChange={handleChange}
          readOnly
        />

        <FloatingInput
          label="Total Deductions"
          name="totalDeductions"
          type="number"
          value={formData.totalDeductions || ''}
          onChange={handleChange}
          readOnly
        />

        <FloatingInput
          label="Net Salary"
          name="netSalary"
          type="number"
          value={formData.netSalary || ''}
          onChange={handleChange}
          readOnly
        />

        <FloatingInput
          label="CTC"
          name="ctc"
          type="number"
          value={formData.ctc || ''}
          onChange={handleChange}
          readOnly
        />

        <FloatingInput
          label="Status"
          name="status"
          type="select"
          value={formData.status}
          onChange={handleChange}
          options={statusOptions}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {employee ? 'Update Employee' : 'Add Employee'}
        </button>
      </div>
    </form>
  );
};

export default EmployeeForm;