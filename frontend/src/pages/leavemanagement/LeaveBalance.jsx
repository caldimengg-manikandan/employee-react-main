import React, { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';

const LeaveBalance = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Employee data with calculated leave balances
  const employees = [
    {
      id: 1,
      name: 'John Doe',
      empId: 'EMP001',
      department: 'IT',
      type: 'experienced',
      hireDate: '2023-01-15',
      probationCompleted: true,
      monthsOfService: 24,
    },
    {
      id: 2,
      name: 'Jane Smith',
      empId: 'EMP002',
      department: 'HR',
      type: 'experienced',
      hireDate: '2023-06-01',
      probationCompleted: true,
      monthsOfService: 18,
    },
    {
      id: 3,
      name: 'Alex Johnson',
      empId: 'TRN001',
      department: 'IT',
      type: 'trainee',
      hireDate: '2024-06-15',
      probationCompleted: false,
      monthsOfService: 6,
    },
    {
      id: 4,
      name: 'Mike Wilson',
      empId: 'EMP003',
      department: 'Sales',
      type: 'experienced',
      hireDate: '2024-01-01',
      probationCompleted: false,
      monthsOfService: 5,
    },
    {
      id: 5,
      name: 'Sarah Brown',
      empId: 'TRN002',
      department: 'Marketing',
      type: 'trainee',
      hireDate: '2024-03-01',
      probationCompleted: false,
      monthsOfService: 9,
    }
  ];

  // Function to calculate leave balances based on your conditions
  const calculateLeaveBalances = (employee) => {
    const { type, monthsOfService, probationCompleted } = employee;
    let casual = 0, sick = 0, privilege = 0;
    
    // Default used leaves
    const usedCasual = type === 'trainee' ? 0 : 2;
    const usedSick = type === 'trainee' ? 0 : 1;
    const usedPrivilege = type === 'trainee' ? 1 : 3;
    
    // For trainees (upto 1 year probation)
    if (type === 'trainee') {
      if (monthsOfService <= 12) {
        // 1 day/month during probation period
        privilege = monthsOfService * 1;
        casual = 0;
        sick = 0;
      } else {
        // After probation
        casual = 0.5 * (monthsOfService - 12);
        sick = 0.5 * (monthsOfService - 12);
        privilege = 1.25 * (monthsOfService - 12);
      }
    }
    
    // For experienced employees
    if (type === 'experienced') {
      // No leaves during first 6 months probation
      if (monthsOfService <= 6) {
        casual = 0;
        sick = 0;
        privilege = 0;
      } else {
        // After probation
        const eligibleMonths = monthsOfService - 6;
        casual = 0.5 * eligibleMonths;
        sick = 0.5 * eligibleMonths;
        privilege = 1.25 * eligibleMonths;
      }
    }
    
    return {
      casual: { 
        allocated: Math.round(casual * 10) / 10, 
        used: usedCasual, 
        balance: Math.max(0, Math.round((casual - usedCasual) * 10) / 10)
      },
      sick: { 
        allocated: Math.round(sick * 10) / 10, 
        used: usedSick, 
        balance: Math.max(0, Math.round((sick - usedSick) * 10) / 10)
      },
      privilege: { 
        allocated: Math.round(privilege * 10) / 10, 
        used: usedPrivilege, 
        balance: Math.max(0, Math.round((privilege - usedPrivilege) * 10) / 10)
      },
      totalBalance: Math.max(0, Math.round((casual + sick + privilege - (usedCasual + usedSick + usedPrivilege)) * 10) / 10)
    };
  };

  // Calculate balances for all employees
  const employeesWithBalances = employees.map(emp => ({
    ...emp,
    balances: calculateLeaveBalances(emp)
  }));

  const filteredEmployees = employeesWithBalances.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.empId.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getEmployeeTypeBadge = (type) => {
    return type === 'trainee' 
      ? <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">Trainee</span>
      : <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Experienced</span>;
  };

  const getProbationStatus = (employee) => {
    if (employee.type === 'trainee') {
      return employee.monthsOfService <= 12 ? 'In Probation' : 'Completed';
    } else {
      return employee.monthsOfService <= 6 ? 'In Probation' : 'Completed';
    }
  };

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Leave Balance for All Employees</h1>
          <p className="text-gray-600">Showing {filteredEmployees.length} employees</p>
        </div>
      </div>

      {/* Search Box */}
      <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-white w-full max-w-md">
        <Search size={20} className="text-gray-400" />
        <input 
          type="text" 
          placeholder="Search by employee name or ID..."
          className="outline-none w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-left text-sm font-semibold text-gray-700">Employee ID</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-700">Employee Name</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-700">Casual Leave</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-700">Sick Leave</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-700">Privilege Leave</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((employee) => (
              <tr key={employee.id} className="border-t hover:bg-gray-50">
                {/* Employee ID Column */}
                <td className="p-4">
                  <div className="font-medium text-gray-800">{employee.empId}</div>
                  <div className="flex gap-2 mt-1">
                    {getEmployeeTypeBadge(employee.type)}
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      getProbationStatus(employee) === 'In Probation' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {getProbationStatus(employee)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {employee.department}
                  </div>
                </td>
                
                {/* Employee Name Column */}
                <td className="p-4">
                  <div className="font-medium text-gray-800">{employee.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {employee.monthsOfService} months service
                  </div>
                  <div className="text-xs text-gray-500">
                    Hire Date: {employee.hireDate}
                  </div>
                  {employee.balances.totalBalance < 5 && (
                    <div className="flex items-center gap-1 text-red-600 text-xs mt-1">
                      <AlertCircle size={12} />
                      Low Balance Alert
                    </div>
                  )}
                </td>
                
                {/* Casual Leave Column */}
                <td className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-800">{employee.balances.casual.balance}</span>
                      <span className="text-sm text-gray-500">days</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Used: {employee.balances.casual.used} days
                    </div>
                    <div className="text-xs text-gray-500">
                      Allocated: {employee.balances.casual.allocated} days
                    </div>
                    {employee.balances.casual.balance < 1 && (
                      <div className="text-xs text-red-600">Low Balance</div>
                    )}
                  </div>
                </td>
                
                {/* Sick Leave Column */}
                <td className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-800">{employee.balances.sick.balance}</span>
                      <span className="text-sm text-gray-500">days</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Used: {employee.balances.sick.used} days
                    </div>
                    <div className="text-xs text-gray-500">
                      Allocated: {employee.balances.sick.allocated} days
                    </div>
                    {employee.balances.sick.balance < 1 && (
                      <div className="text-xs text-red-600">Low Balance</div>
                    )}
                  </div>
                </td>
                
                {/* Privilege Leave Column */}
                <td className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-800">{employee.balances.privilege.balance}</span>
                      <span className="text-sm text-gray-500">days</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Used: {employee.balances.privilege.used} days
                    </div>
                    <div className="text-xs text-gray-500">
                      Allocated: {employee.balances.privilege.allocated} days
                    </div>
                    {employee.balances.privilege.balance < 2 && (
                      <div className="text-xs text-red-600">Low Balance</div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="text-sm text-gray-600">
        <div className="flex gap-4">
          <span>Total Employees: {filteredEmployees.length}</span>
          <span>Trainees: {filteredEmployees.filter(emp => emp.type === 'trainee').length}</span>
          <span>Experienced: {filteredEmployees.filter(emp => emp.type === 'experienced').length}</span>
          <span className="text-red-600">
            Low Balance: {filteredEmployees.filter(emp => emp.balances.totalBalance < 5).length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LeaveBalance;