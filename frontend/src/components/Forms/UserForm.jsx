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

  const [employeeSearch, setEmployeeSearch] = useState('');

  const moduleHierarchy = [
    {
      name: "Dashboard & Profile",
      children: [
        { key: 'home', label: 'Home', alwaysOn: true },
        { key: 'my_profile', label: 'My Profile', alwaysOn: true },
      ]
    },
    {
      name: "Timesheet Management",
      key: 'timesheet_access',
      children: [
        { key: 'timesheet_access', label: 'Timesheet' },
        { key: 'timesheet_history', label: 'Timesheet History' },
        { key: 'attendance_regularization', label: 'Attendance Regularization' },
        { key: 'attendance_access', label: 'Employee Attendance' },
        { key: 'attendance_approval', label: 'Attendance Approval' },
        { key: 'edit_attendance', label: 'Edit In and Out Time' },
      ]
    },
    {
      name: "Admin Timesheet",
      key: 'admin_timesheet_access',
      children: [
        { key: 'admin_timesheet', label: 'Admin Timesheet' },
        { key: 'timesheet_summary', label: 'Timesheet Summary' },
        { key: 'special_permission', label: 'Special Permission' }
      ]
    },
    {
      name: "Performance Management (Appraisal)",
      key: 'performance_access',
      children: [
        { key: 'self_appraisal', label: 'Self Appraisal' },
        { key: 'team_appraisal', label: 'Team Appraisal' },
        { key: 'reviewer_approval', label: 'Reviewer Approval' },
        { key: 'director_approval', label: 'Director Approval' },
        { key: 'performance_pay', label: 'Performance Pay' },
        { key: 'appraisal_workflow', label: 'Appraisal Workflow' },
        { key: 'appraisal_master', label: 'Appraisal Master' },
        { key: 'increment_summary', label: 'Increment Summary' },
        { key: 'attendance_summary', label: 'Attendance Summary' },
        { key: 'promotion_history', label: 'Promotion History' }
      ]
    },
    {
      name: "Leave Management",
      key: 'leave_group_access',
      children: [
        { key: 'leave_access', label: 'Leave Applications' },
        { key: 'leave_summary', label: 'Leave Summary' },
        { key: 'regional_holidays', label: 'Regional Holidays' },
        { key: 'office_holidays', label: 'Office Holidays' },
        { key: 'leave_balance', label: 'Leave Balance' },
        { key: 'leave_manage', label: 'Leave Ledger (Admin)' }
      ]
    },
    {
      name: "Payroll Management",
      key: 'payroll_access',
      children: [
        { key: 'payroll_details', label: 'Payroll Details' },
        { key: 'payroll_history', label: 'Payroll History' },
        { key: 'cost_to_company', label: 'Cost to the Company' },
        { key: 'compensation_master', label: 'Compensation Master' },
        { key: 'loan_summary', label: 'Loan Summary' },
        { key: 'gratuity_summary', label: 'Gratuity Summary' },
        { key: 'monthly_payroll', label: 'Monthly Payroll' },
        { key: 'marriage_allowance', label: 'Marriage Allowance' },
        { key: 'referral_bonus', label: 'Referral Bonus' }
      ]
    },
    {
      name: "Exit Management",
      key: 'exit_access',
      children: [
        { key: 'exit_form_access', label: 'Employee Exit Form' },
        { key: 'exit_approval_access', label: 'Exit Approval' }
      ]
    },
    {
      name: "User & Team Management",
      children: [
        { key: 'employee_access', label: 'Employee Management' },
        { key: 'team_access', label: 'Team Management' },
        { key: 'user_access', label: 'User Access' },
        { key: 'reward_access', label: 'Employee Reward Tracker' }
      ]
    },
    {
      name: "Support Center",
      key: "support_group_access",
      children: [
        { key: 'raise_ticket_access', label: 'Raise Ticket' },
        { key: 'support_dashboard_access', label: 'Support Dashboard' }
      ]
    },
    {
      name: "Document Templates",
      children: [
        { key: 'document_templates', label: 'Document Templates' }
      ]
    },
    {
      name: "Other Modules",
      children: [
        { key: 'project_access', label: 'Project Allocation' },
        { key: 'insurance_access', label: 'Insurance' },
        { key: 'policy_portal', label: 'Policy Portal' },
        { key: 'induction_program', label: 'Induction Program' },
        { key: 'induction_admin', label: 'Induction Admin' },
        { key: 'salary_slips', label: 'Salary Slips' },
        { key: 'holiday_allowance', label: 'Holiday Allowance' },
        { key: 'holiday_working_request', label: 'Holiday Working Request' },
        { key: 'expenditure_access', label: 'Expenditure Management' },
        { key: 'announcement_manage', label: 'Announcements' },
        { key: 'intern_reference', label: 'Intern Reference' },
        { key: 'resume_access', label: 'Resume Repository' },
        { key: 'asset_management_access', label: 'Asset Management' },
        { key: 'office_sync_access', label: 'Office Sync' }
      ]
    },
    {
      name: "Unified Hub Calendar",
      children: [
        { key: 'unified_calendar', label: 'Unified Hub Calendar', alwaysOn: true }
      ]
    }
  ];

  // Helper to get flat permissions
  const getAllPermissionKeys = () => {
    const keys = new Set();
    moduleHierarchy.forEach(module => {
      if (module.key) keys.add(module.key);
      module.children.forEach(child => keys.add(child.key));
    });
    return Array.from(keys);
  };

  const alwaysOnPermissionKeys = ['home', 'my_profile', 'unified_calendar'];
  const restrictedPermissionsForNonAdmin = [
    'user_access',
    'support_dashboard_access',
    'induction_admin'
  ];

  const rolePermissionDefaults = {
    admin: getAllPermissionKeys(),
    director: getAllPermissionKeys(),
    manager: getAllPermissionKeys(),

    projectmanager: [
      'timesheet_access',
      'admin_timesheet_access',
      'admin_timesheet',
      'timesheet_summary',
      'special_permission',
      'project_access',
      'leave_access',
      'leave_group_access',
      'leave_summary',
      'regional_holidays',
      'office_holidays',
      'performance_access',
      'self_appraisal',
      'performance_pay',
      'salary_slips',
      'policy_portal',
      'document_templates',
      'induction_program',
      'unified_calendar',
      'support_group_access',
      'raise_ticket_access',
      'support_dashboard_access',
      'asset_management_access',
      'office_sync_access',
    ],

    employees: [
      'home',
      'my_profile',
      'timesheet_access',
      'timesheet_history',
      'attendance_regularization',
      'leave_access',
      'leave_balance',
      'performance_access',
      'self_appraisal',
      'exit_form_access',
      'salary_slips',
      'policy_portal',
      'induction_program',
      'unified_calendar',
      'support_group_access',
      'raise_ticket_access',
      'office_sync_access',
    ]
  };

  const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'employees', label: 'Employees' },
    { value: 'projectmanager', label: 'Reporting Manager' },
    { value: 'manager', label: 'General Manager' },
    { value: 'director', label: 'Director' }
  ];

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (user) {
      const roleValue = user.role || '';
      const isPrivilegedRole = ['admin', 'hr', 'director', 'manager'].includes(String(roleValue).toLowerCase());
      const userPermissions = Array.isArray(user.permissions) ? user.permissions : [];
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: roleValue,
        password: '',
        confirmPassword: '',
        permissions: isPrivilegedRole ? userPermissions : userPermissions.filter(p => !restrictedPermissionsForNonAdmin.includes(p)),
        employeeId: user.employeeId || ''
      });
    } else {
      setFormData({
        name: '',
        email: '',
        role: '',
        password: '',
        confirmPassword: '',
        permissions: [],
        employeeId: ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (user && employees.length > 0) {
      const roleValue = user.role || '';
      const isPrivilegedRole = ['admin', 'hr', 'director', 'manager'].includes(String(roleValue).toLowerCase());
      const userPermissions = Array.isArray(user.permissions) ? user.permissions : [];
      
      const empId = user.employeeId;
      const email = user.email;
      const emp = employees.find(e => 
        (empId && e.employeeId === empId) || 
        (email && (e.officialEmail === email || e.email === email))
      );
      const isITAdminDesignation = emp && /IT Admin/i.test(emp.designation || '');

      setFormData(prev => ({
        ...prev,
        permissions: isPrivilegedRole 
          ? userPermissions 
          : userPermissions.filter(p => !restrictedPermissionsForNonAdmin.includes(p) || (isITAdminDesignation && p === 'support_dashboard_access'))
      }));
    }
  }, [user, employees]);

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
    const isITAdminDesignation = employee && /IT Admin/i.test(employee.designation || '');
    setFormData(prev => {
      let nextPermissions = [...prev.permissions];
      if (isITAdminDesignation) {
        if (!nextPermissions.includes('support_dashboard_access')) {
          nextPermissions.push('support_dashboard_access');
        }
      }
      return {
        ...prev,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        permissions: nextPermissions
      };
    });
    setShowEmployeeDropdown(false);
  };

  const handleEmployeeIdSelect = (employee) => {
    const isITAdminDesignation = employee && /IT Admin/i.test(employee.designation || '');
    setFormData(prev => {
      let nextPermissions = [...prev.permissions];
      if (isITAdminDesignation) {
        if (!nextPermissions.includes('support_dashboard_access')) {
          nextPermissions.push('support_dashboard_access');
        }
      }
      return {
        ...prev,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        permissions: nextPermissions
      };
    });
    setShowEmployeeIdDropdown(false);
  };

  const handleEmployeeIdChange = (e) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    setFormData(prev => ({ ...prev, employeeId: value }));

    if (value && !/^CDE\d{3}$/.test(value)) {
      setErrors(prev => ({ ...prev, employeeId: 'Must be CDE followed by exactly 3 digits' }));
    } else {
      setErrors(prev => ({ ...prev, employeeId: '' }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'role') {
        next.permissions = rolePermissionDefaults[value] || [];
      }
      return next;
    });

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePermissionChange = (permission, isGroup = false) => {
    setFormData(prev => {
      const isPrivilegedRole = ['admin', 'hr', 'director', 'manager'].includes(String(prev.role || '').toLowerCase());
      
      const empId = prev.employeeId || (user && user.employeeId);
      const email = prev.email || (user && user.email);
      const emp = employees.find(e => 
        (empId && e.employeeId === empId) || 
        (email && (e.officialEmail === email || e.email === email))
      );
      const isITAdminDesignation = emp && /IT Admin/i.test(emp.designation || '');
      const isRestrictedForRole = !isPrivilegedRole && restrictedPermissionsForNonAdmin.includes(permission) && !(isITAdminDesignation && permission === 'support_dashboard_access');

      if (isRestrictedForRole) {
        return prev;
      }
      let nextPermissions = [...prev.permissions];

      if (isGroup) {
        const group = moduleHierarchy.find(m => m.key === permission);
        if (group) {
          const childKeys = group.children.map(c => c.key).filter(k => !alwaysOnPermissionKeys.includes(k));
          const allSelected = childKeys.length > 0 && childKeys.every(k => nextPermissions.includes(k)) && nextPermissions.includes(permission);

          if (allSelected) {
            nextPermissions = nextPermissions.filter(p => p !== permission && !childKeys.includes(p));
          } else {
            nextPermissions = Array.from(new Set([...nextPermissions, permission, ...childKeys]));
          }
        }
      } else {
        if (nextPermissions.includes(permission)) {
          nextPermissions = nextPermissions.filter(p => p !== permission);
        } else {
          nextPermissions.push(permission);

          // If child is selected, ensure parent is also selected (if it has a key)
          moduleHierarchy.forEach(module => {
            if (module.key && module.children.some(c => c.key === permission)) {
              if (!nextPermissions.includes(module.key)) {
                nextPermissions.push(module.key);
              }
            }
          });
        }
      }

      return { ...prev, permissions: nextPermissions };
    });
  };

  const selectAllPermissions = () => {
    const isPrivilegedRole = ['admin', 'hr', 'director', 'manager'].includes(String(formData.role || '').toLowerCase());
    const empId = formData.employeeId || (user && user.employeeId);
    const email = formData.email || (user && user.email);
    const emp = employees.find(e => 
      (empId && e.employeeId === empId) || 
      (email && (e.officialEmail === email || e.email === email))
    );
    const isITAdminDesignation = emp && /IT Admin/i.test(emp.designation || '');

    setFormData(prev => ({
      ...prev,
      permissions: isPrivilegedRole 
        ? getAllPermissionKeys() 
        : getAllPermissionKeys().filter(p => !restrictedPermissionsForNonAdmin.includes(p) || (isITAdminDesignation && p === 'support_dashboard_access'))
    }));
  };

  const clearAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: []
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.role) newErrors.role = 'Role is required';

    // Password validation
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;

    if (!user) {
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      else if (!specialCharRegex.test(formData.password)) newErrors.password = 'Password must contain at least one special character';
    } else if (formData.password) {
      if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      else if (!specialCharRegex.test(formData.password)) newErrors.password = 'Password must contain at least one special character';
    }

    // Confirm password validation
    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Permissions validation
    const effectivePermissions = new Set([
      ...formData.permissions,
      ...alwaysOnPermissionKeys
    ]);
    if (effectivePermissions.size < 2) {
      newErrors.permissions = 'At least 2 permissions must be selected (including Timesheet Access)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const empId = formData.employeeId || (user && user.employeeId);
      const email = formData.email || (user && user.email);
      const emp = employees.find(e => 
        (empId && e.employeeId === empId) || 
        (email && (e.officialEmail === email || e.email === email))
      );
      const isITAdminDesignation = emp && /IT Admin/i.test(emp.designation || '');

      if (user) {
        let permissionsToUpdate = [...formData.permissions];
        const isPrivilegedRole = ['admin', 'hr', 'director', 'manager'].includes(String(formData.role || '').toLowerCase());
        if (!isPrivilegedRole) {
          permissionsToUpdate = permissionsToUpdate.filter(p => !restrictedPermissionsForNonAdmin.includes(p) || (isITAdminDesignation && p === 'support_dashboard_access'));
        }
        alwaysOnPermissionKeys.forEach(key => {
          if (!permissionsToUpdate.includes(key)) {
            permissionsToUpdate.push(key);
          }
        });

        const updateData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          permissions: permissionsToUpdate,
          employeeId: formData.employeeId
        };
        // Only include password if it's provided
        if (formData.password) {
          updateData.password = formData.password;
        }
        await authAPI.updateUser(user._id, updateData);
      } else {
        const isPrivilegedRole = ['admin', 'hr', 'director', 'manager'].includes(String(formData.role || '').toLowerCase());
        const basePermissions = isPrivilegedRole
          ? [...formData.permissions]
          : formData.permissions.filter(p => !restrictedPermissionsForNonAdmin.includes(p) || (isITAdminDesignation && p === 'support_dashboard_access'));
        alwaysOnPermissionKeys.forEach(key => {
          if (!basePermissions.includes(key)) {
            basePermissions.push(key);
          }
        });

        await authAPI.createUser({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          password: formData.password,
          permissions: basePermissions,
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
    <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
      <div className="space-y-6 overflow-y-auto pr-2 flex-1 p-1">
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
              className={`w-full bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 text-left cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 ${!!user ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
              disabled={employeeLoading || !!user}
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
                <div className="p-2 border-b border-gray-100">
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Search by name, email or ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {employees.filter(e => {
                  const q = employeeSearch.toLowerCase();
                  return !q ||
                    (e.name && e.name.toLowerCase().includes(q)) ||
                    (e.email && e.email.toLowerCase().includes(q)) ||
                    (e.employeeId && e.employeeId.toLowerCase().includes(q));
                }).length > 0 ? (
                  employees
                    .filter(e => {
                      const q = employeeSearch.toLowerCase();
                      return !q ||
                        (e.name && e.name.toLowerCase().includes(q)) ||
                        (e.email && e.email.toLowerCase().includes(q)) ||
                        (e.employeeId && e.employeeId.toLowerCase().includes(q));
                    })
                    .map((employee) => (
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
            onChange={handleEmployeeIdChange}
            disabled={!!user}
          />
          <button
            type="button"
            onClick={() => setShowEmployeeIdDropdown(!showEmployeeIdDropdown)}
            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
            disabled={employeeLoading || !!user}
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
            disabled={!!formData.employeeId || !!user}
          />
          {formData.employeeId && !user && (
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
          disabled={!!formData.employeeId || !!user}
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

        <div>
          <div className="bg-gradient-to-r from-slate-900 via-[#262760] to-indigo-900 p-4 rounded-xl text-white shadow-md mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>🔐</span> Access & Permission Matrix
              </h3>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Configure module privileges and role permissions for this user account.
              </p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={selectAllPermissions}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border border-white/20 transition-all duration-150 active:scale-95"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearAllPermissions}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm text-red-200 border border-red-400/30 transition-all duration-150 active:scale-95"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Permission Progress Bar */}
          {(() => {
            const allKeys = getAllPermissionKeys();
            const grantedCount = allKeys.filter(k => formData.permissions.includes(k) || alwaysOnPermissionKeys.includes(k)).length;
            const percent = Math.round((grantedCount / Math.max(allKeys.length, 1)) * 100);
            return (
              <div className="mb-5 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Granted Access Level
                  </span>
                  <span className="font-bold text-[#262760]">{grantedCount} of {allKeys.length} Permissions ({percent}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-[#262760] h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>
            );
          })()}

          <div className="space-y-4">
            {moduleHierarchy.map(module => {
              const hasGroupKey = !!module.key;

              const getModuleCategoryStyle = (name) => {
                switch (name) {
                  case 'Dashboard & Profile':
                    return { icon: '🏠', gradient: 'from-blue-500/10 to-indigo-500/5', border: 'border-blue-200', text: 'text-blue-900' };
                  case 'Timesheet Management':
                    return { icon: '⏱️', gradient: 'from-cyan-500/10 to-blue-500/5', border: 'border-cyan-200', text: 'text-cyan-900' };
                  case 'Admin Timesheet':
                    return { icon: '📊', gradient: 'from-teal-500/10 to-emerald-500/5', border: 'border-teal-200', text: 'text-teal-900' };
                  case 'Performance Management (Appraisal)':
                    return { icon: '⭐', gradient: 'from-amber-500/10 to-yellow-500/5', border: 'border-amber-200', text: 'text-amber-900' };
                  case 'Leave Management':
                    return { icon: '📅', gradient: 'from-purple-500/10 to-violet-500/5', border: 'border-purple-200', text: 'text-purple-900' };
                  case 'Payroll Management':
                    return { icon: '💳', gradient: 'from-emerald-500/10 to-green-500/5', border: 'border-emerald-200', text: 'text-emerald-900' };
                  case 'Exit Management':
                    return { icon: '🚪', gradient: 'from-rose-500/10 to-red-500/5', border: 'border-rose-200', text: 'text-rose-900' };
                  case 'User & Team Management':
                    return { icon: '👥', gradient: 'from-indigo-500/10 to-purple-500/5', border: 'border-indigo-200', text: 'text-indigo-900' };
                  case 'Support Center':
                    return { icon: '🎧', gradient: 'from-sky-500/10 to-blue-500/5', border: 'border-sky-200', text: 'text-sky-900' };
                  case 'Document Templates':
                    return { icon: '📄', gradient: 'from-violet-600/15 to-indigo-600/10', border: 'border-violet-300 ring-2 ring-violet-400/30', text: 'text-violet-900' };
                  case 'Unified Hub Calendar':
                    return { icon: '🗓️', gradient: 'from-orange-500/10 to-amber-500/5', border: 'border-orange-200', text: 'text-orange-900' };
                  default:
                    return { icon: '🧩', gradient: 'from-gray-500/10 to-slate-500/5', border: 'border-gray-200', text: 'text-gray-900' };
                }
              };

              const catStyle = getModuleCategoryStyle(module.name);

              // Calculate if all children are selected for the "Full Access" state
              const childKeys = module.children
                .filter(c => !c.alwaysOn)
                .map(c => c.key);

              const allChildrenSelected = childKeys.length > 0 && childKeys.every(k => formData.permissions.includes(k));
              const isGroupActive = hasGroupKey && allChildrenSelected;

              return (
                <div key={module.name} className={`bg-white rounded-xl border ${catStyle.border} shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md`}>
                  <div className={`bg-gradient-to-r ${catStyle.gradient} px-4 py-3 border-b border-gray-100 flex items-center justify-between`}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{catStyle.icon}</span>
                      <h3 className={`text-sm font-bold ${catStyle.text}`}>{module.name}</h3>
                    </div>
                    {hasGroupKey && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium hidden sm:inline">Full Module Access</span>
                        <button
                          type="button"
                          onClick={() => handlePermissionChange(module.key, true)}
                          className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none 
                            ${isGroupActive ? 'bg-[#262760] ring-2 ring-[#262760]/30' : 'bg-gray-300'}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                              ${isGroupActive ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {module.children.map(child => {
                      const permission = child.key;
                      const isAlwaysEnabled = !!child.alwaysOn;
                      const roleStr = String(formData.role || '').toLowerCase();
                      const isPrivilegedRole = ['admin', 'hr', 'director', 'manager'].includes(roleStr);
                      const empId = formData.employeeId || (user && user.employeeId);
                      const email = formData.email || (user && user.email);
                      const emp = employees.find(e => 
                        (empId && e.employeeId === empId) || 
                        (email && (e.officialEmail === email || e.email === email))
                      );
                      const isITAdminDesignation = emp && /IT Admin/i.test(emp.designation || '');
                      const isRestrictedForRole = !isPrivilegedRole && restrictedPermissionsForNonAdmin.includes(permission) && !(isITAdminDesignation && permission === 'support_dashboard_access');
                      const isActive = isAlwaysEnabled || formData.permissions.includes(permission);
                      const isDisabled = isAlwaysEnabled || isRestrictedForRole;
                      return (
                        <div
                          key={`${permission}-${child.label}`}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 
                            ${isActive ? 'bg-blue-50/60 border-blue-200 shadow-2xs' : 'bg-gray-50/50 border-gray-200/70 hover:border-gray-300'} 
                            ${isDisabled ? 'opacity-70' : ''}`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-500 shadow-xs' : 'bg-gray-300'}`}></span>
                            <span className="text-xs font-semibold text-gray-800 truncate">
                              {child.label}
                            </span>
                            {isAlwaysEnabled && (
                              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-medium">Always On</span>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={isDisabled}
                            onClick={() => !isDisabled && handlePermissionChange(permission)}
                            className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none 
                          ${isActive ? 'bg-[#262760] ring-1 ring-[#262760]/40' : 'bg-gray-300'} ${isDisabled ? 'cursor-not-allowed' : ''}`}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                          ${isActive ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {errors.permissions && (
            <p className="mt-2 text-sm font-medium text-red-600">{errors.permissions}</p>
          )}
        </div>

      </div>
      <div className="flex justify-end gap-3 pt-5 border-t border-gray-200 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#262760] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-gradient-to-r from-[#262760] to-indigo-800 hover:from-[#1d1e49] hover:to-indigo-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#262760] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
        >
          {loading ? 'Saving...' : user ? 'Update Access Privileges' : 'Create User Access'}
        </button>
      </div>
    </form>
  );
};

export default UserForm;
