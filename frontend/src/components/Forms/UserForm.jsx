import React, { useState, useEffect } from 'react';
import { authAPI } from '../../services/api';
import { employeeAPI } from '../../services/api';
import FloatingInput from './FloatingInput';

const UserForm = ({ user, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    password: '',
    confirmPassword: '',
    permissions: [],
    employeeId: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeeLoading, setEmployeeLoading] = useState(true);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [showEmployeeIdDropdown, setShowEmployeeIdDropdown] = useState(false);
  const [employeeIdSearch, setEmployeeIdSearch] = useState('');

  const permissionOptions = [
    'dashboard',
    'user_access',
    'employee_access',
    'timesheet_access',
    'attendance_access',
    'project_access'
  ];

  const roleOptions = [
    { value: 'projectmanager', label: 'Project Manager' },
    { value: 'admin', label: 'ADMIN' },
    { value: 'employees', label: 'employees' },
    { value: 'teamlead', label: 'Team Lead' }
  ];

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || '',
        password: '',
        confirmPassword: '',
        permissions: user.permissions || [],
        employeeId: user.employeeId || ''
      });
    }
  }, [user]);

  const fetchEmployees = async () => {
    try {
      setEmployeeLoading(true);
      const response = await employeeAPI.getAllEmployees();
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setErrors(prev => ({ ...prev, employees: 'Failed to load employees' }));
    } finally {
      setEmployeeLoading(false);
    }
  };

  const handleEmployeeSelect = (employee) => {
    setFormData(prev => ({
      ...prev,
      name: employee.name,
      email: employee.email,
      employeeId: employee.employeeId
    }));
    setShowEmployeeDropdown(false);
  };

  const handleEmployeeIdSelect = (employee) => {
    setFormData(prev => ({
      ...prev,
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email
    }));
    setShowEmployeeIdDropdown(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePermissionChange = (permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.role) newErrors.role = 'Role is required';
    
    // Password validation
    if (!user) {
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    // Confirm password validation
    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (user) {
        const updateData = { 
          name: formData.name,
          email: formData.email,
          role: formData.role,
          permissions: formData.permissions,
          employeeId: formData.employeeId
        };
        // Only include password if it's provided
        if (formData.password) {
          updateData.password = formData.password;
        }
        await authAPI.updateUser(user._id, updateData);
      } else {
        await authAPI.createUser({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          password: formData.password,
          permissions: formData.permissions,
          employeeId: formData.employeeId
        });
      }
      onSubmit();
    } catch (error) {
      setErrors({ submit: error.response?.data?.message || 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      {/* Employee Dropdown */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Employee (Optional)
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
            className="w-full bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 text-left cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={employeeLoading}
          >
            {formData.employeeId 
              ? `${formData.name} - ${formData.email}`
              : employeeLoading 
                ? 'Loading employees...'
                : 'Select an employee'
            }
            <span className="absolute inset-y-0 right-0 flex items-center pr-2">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </span>
          </button>

          {showEmployeeDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {employees.length > 0 ? (
                employees.map((employee) => (
                  <div
                    key={employee._id}
                    onClick={() => handleEmployeeSelect(employee)}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{employee.name}</div>
                    <div className="text-sm text-gray-500">{employee.email}</div>
                    <div className="text-xs text-gray-400">{employee.employeeId}</div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-gray-500 text-center">
                  {employeeLoading ? 'Loading...' : 'No employees found'}
                </div>
              )}
            </div>
          )}
        </div>
        {errors.employees && (
          <p className="mt-1 text-sm text-red-600">{errors.employees}</p>
        )}
      </div>

      {/* Employee ID */}
      <div className="relative">
        <FloatingInput
          label="Employee ID"
          name="employeeId"
          value={formData.employeeId}
          onChange={handleChange}
        />
        <button
          type="button"
          onClick={() => setShowEmployeeIdDropdown(!showEmployeeIdDropdown)}
          className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
          disabled={employeeLoading}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showEmployeeIdDropdown && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                value={employeeIdSearch}
                onChange={(e) => setEmployeeIdSearch(e.target.value)}
                placeholder="Search by Employee ID or name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {(employees || []).filter(e => {
              const q = employeeIdSearch.toLowerCase();
              return !q || (String(e.employeeId || '').toLowerCase().includes(q) || String(e.name || '').toLowerCase().includes(q));
            }).map((employee) => (
              <div
                key={employee._id}
                onClick={() => handleEmployeeIdSelect(employee)}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900">{employee.employeeId}</div>
                <div className="text-sm text-gray-500">{employee.name}</div>
                <div className="text-xs text-gray-400">{employee.email}</div>
              </div>
            ))}
            {employees && employees.length === 0 && (
              <div className="px-4 py-2 text-gray-500 text-center">
                {employeeLoading ? 'Loading...' : 'No employees found'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="relative">
        <FloatingInput
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          required
          disabled={!!formData.employeeId}
        />
        {formData.employeeId && (
          <button
            type="button"
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                name: '',
                email: '',
                employeeId: ''
              }));
            }}
            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
            title="Clear employee selection"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Email */}
      <FloatingInput
        type="email"
        label="Email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
        required
        disabled={!!formData.employeeId}
      />

      {/* Role */}
      <FloatingInput
        type="select"
        label="Role"
        name="role"
        value={formData.role}
        onChange={handleChange}
        options={[
          { value: '', label: 'Select a role' },
          ...roleOptions
        ]}
        error={errors.role}
        required
      />

      {/* Password */}
      <FloatingInput
        type="password"
        label={user ? 'New Password (leave blank to keep current)' : 'Password'}
        name="password"
        value={formData.password}
        onChange={handleChange}
        error={errors.password}
        required={!user}
       
      />

      {/* Confirm Password */}
      <FloatingInput
        type="password"
        label="Confirm Password"
        name="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleChange}
        error={errors.confirmPassword}
        required={!user || formData.password}
      />

      {/* Permissions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {permissionOptions.map(permission => {
            const isActive = formData.permissions.includes(permission);
            return (
              <div
                key={permission}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <span className="text-sm text-gray-700 capitalize">
                  {permission.replace(/_/g, ' ')}
                </span>

                <button
                  type="button"
                  onClick={() => handlePermissionChange(permission)}
                  className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out 
                    ${isActive ? 'bg-primary-600' : 'bg-gray-300'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out 
                      ${isActive ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 
                     hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium 
                     text-white bg-primary-600 hover:bg-primary-700 focus:outline-none 
                     focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : user ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};

export default UserForm;
