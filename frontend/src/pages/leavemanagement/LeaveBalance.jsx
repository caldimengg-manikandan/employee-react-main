import React, { useEffect, useState } from 'react';
import { Search, Eye } from 'lucide-react';
import { leaveAPI } from '../../services/api';

const LeaveBalance = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);

  const monthsBetween = (dateString) => {
    if (!dateString) return 0;
    const start = new Date(dateString);
    if (isNaN(start.getTime())) return 0;
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    const months = now.getMonth() - start.getMonth();
    const total = years * 12 + months;
    return Math.max(0, total);
  };

  useEffect(() => {
    const loadBalances = async () => {
      try {
        const res = await leaveAPI.getBalance();
        const list = Array.isArray(res.data) ? res.data : [];
        const mapped = list.map((e, idx) => ({
          id: e.employeeId || idx,
          name: e.name || '',
          empId: e.employeeId || '',
          department: e.division || '',
          position: e.position || '',
          designation: e.designation || e.position || '',
          hireDate: e.hireDate || '',
          monthsOfService: e.monthsOfService || 0,
          email: e.email || '',
          phone: e.mobileNo || '',
          location: e.location || '',
          basicSalary: e.basicSalary || 0,
          balances: e.balances
        }));
        setEmployees(mapped);
      } catch {
        setEmployees([]);
      }
    };
    loadBalances();
  }, []);

  // Function to calculate leave balances based on designation and duration
  const calculateLeaveBalances = (employee) => {
    const { designation, monthsOfService } = employee;
    let casual = 0, sick = 0, privilege = 0;
    
    const isTrainee = String(designation || '').toLowerCase() === 'trainee';
    const traineeMonths = Math.min(monthsOfService, 12);
    const usedCasual = 0;
    const usedSick = 0;
    const usedPrivilege = 0;
    
    if (isTrainee) {
      privilege = traineeMonths * 1;
      casual = 0;
      sick = 0;
    } else {
      casual = 0.5 * monthsOfService;
      sick = 0.5 * monthsOfService;
      privilege = 1.25 * monthsOfService;
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

  // Calculate PL settlement amount
  const calculatePLSettlement = (employee, balance) => {
    const { basicSalary } = employee;
    const daysInMonth = 30; // Assuming 30 days in a month for calculation
    return ((basicSalary / daysInMonth) * balance).toFixed(2);
  };

  const employeesWithBalances = employees.map(emp => {
    if (emp.balances) return emp;
    return { ...emp, balances: calculateLeaveBalances(emp) };
  });

  const filteredEmployees = employeesWithBalances.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         String(emp.empId || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Leave Balance Management</h1>
          <p className="text-gray-600">View employee leave balances</p>
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
              <th className="p-4 text-left text-sm font-semibold text-gray-700">Designation</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-700">Casual Leave</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-700">Sick Leave</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-700">Privilege Leave</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((employee) => (
              <tr key={employee.id || employee.empId} className="border-t hover:bg-gray-50">
                {/* Employee ID Column */}
                <td className="p-4">
                  <div className="font-medium text-gray-800">{employee.empId}</div>
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
                </td>
                
                {/* Designation */}
                <td className="p-4">
                  <div className="font-medium text-gray-800">{employee.designation || employee.position || '-'}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {String(employee.designation || employee.position || '').toLowerCase() === 'trainee' ? 'Accrual: 1/day per month (max 12 months)' : 'Accrual: 2.25 days/month'}
                  </div>
                </td>
                
                {/* Casual Leave Column */}
                <td className="p-4">
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-gray-800">{employee.balances.casual.balance}</span>
                      <span className="text-sm text-gray-500">days</span>
                    </div>
                  </div>
                </td>
                
                {/* Sick Leave Column */}
                <td className="p-4">
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-gray-800">{employee.balances.sick.balance}</span>
                      <span className="text-sm text-gray-500">days</span>
                    </div>
                  </div>
                </td>
                
                {/* Privilege Leave Column */}
                <td className="p-4">
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-gray-800">{employee.balances.privilege.balance}</span>
                      <span className="text-sm text-gray-500">days</span>
                    </div>
                  </div>
                </td>
                
                {/* Actions Column */}
                <td className="p-4">
                  <button
                    onClick={() => setSelectedEmployee(employee)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Eye size={16} />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="text-sm text-gray-600 mt-4">
        <div className="flex flex-wrap gap-4">
          <span>Total Employees: {filteredEmployees.length}</span>
          <span>Active Trainees: {filteredEmployees.filter(emp => String(emp.designation || emp.position || '').toLowerCase() === 'trainee').length}</span>
          <span>Others: {filteredEmployees.filter(emp => String(emp.designation || emp.position || '').toLowerCase() !== 'trainee').length}</span>
        </div>
      </div>

      {/* Employee Details Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedEmployee.name}</h2>
                  <p className="text-gray-600">{selectedEmployee.empId}</p>
                </div>
                <button 
                  onClick={() => setSelectedEmployee(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              {/* Employee Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-3">Employee Information</h3>
                  <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">Department</span>
                    <p className="font-medium">{selectedEmployee.department}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Designation</span>
                    <p className="font-medium">{selectedEmployee.position || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Status</span>
                    <p className={`font-medium ${
                        (String(selectedEmployee.position || '').toLowerCase() === 'trainee' && selectedEmployee.monthsOfService <= 12)
                          ? 'text-yellow-600' 
                          : 'text-green-600'
                      }`}>
                        {String(selectedEmployee.position || '').toLowerCase() === 'trainee'
                          ? (selectedEmployee.monthsOfService <= 12 ? 'In Training' : 'Training Period Completed')
                          : 'Confirmed'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Hire Date</span>
                    <p className="font-medium">{formatDate(selectedEmployee.hireDate)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Months of Service</span>
                      <p className="font-medium">{selectedEmployee.monthsOfService} months</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-3">Contact Details</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-500">Email</span>
                      <p className="font-medium">{selectedEmployee.email}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Phone</span>
                      <p className="font-medium">{selectedEmployee.phone}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Location</span>
                      <p className="font-medium">{selectedEmployee.location}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Basic Salary</span>
                      <p className="font-medium">₹{selectedEmployee.basicSalary.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Leave Balance Details */}
              <div className="mb-8">
                <h3 className="font-semibold text-gray-700 mb-4 text-lg">Leave Balance Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Casual Leave Card */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="font-semibold text-blue-700 mb-3">Casual Leave</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Allocated</span>
                        <span className="font-bold">{selectedEmployee.balances.casual.allocated} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Used</span>
                        <span className="font-bold text-red-600">{selectedEmployee.balances.casual.used} days</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-gray-700">Balance</span>
                        <span className="font-bold text-xl text-green-600">{selectedEmployee.balances.casual.balance} days</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sick Leave Card */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <h4 className="font-semibold text-green-700 mb-3">Sick Leave</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Allocated</span>
                        <span className="font-bold">{selectedEmployee.balances.sick.allocated} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Used</span>
                        <span className="font-bold text-red-600">{selectedEmployee.balances.sick.used} days</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-gray-700">Balance</span>
                        <span className="font-bold text-xl text-green-600">{selectedEmployee.balances.sick.balance} days</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Privilege Leave Card */}
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <h4 className="font-semibold text-purple-700 mb-3">Privilege Leave</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Allocated</span>
                        <span className="font-bold">{selectedEmployee.balances.privilege.allocated} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Used</span>
                        <span className="font-bold text-red-600">{selectedEmployee.balances.privilege.used} days</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-gray-700">Balance</span>
                        <span className="font-bold text-xl text-green-600">{selectedEmployee.balances.privilege.balance} days</span>
                      </div>
                      {selectedEmployee.balances.privilege.balance >= 7 && (
                        <div className="mt-3 p-2 bg-purple-100 rounded">
                          <div className="text-sm font-medium text-purple-800">PL Encashment Value</div>
                          <div className="text-lg font-bold text-purple-900">
                            ₹{calculatePLSettlement(selectedEmployee, selectedEmployee.balances.privilege.balance)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Summary */}
              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-700">Total Leave Summary</h4>
                    <p className="text-sm text-gray-600">Allocated: {(selectedEmployee.balances.casual.allocated + selectedEmployee.balances.sick.allocated + selectedEmployee.balances.privilege.allocated).toFixed(1)} days</p>
                    <p className="text-sm text-gray-600">Used: {(selectedEmployee.balances.casual.used + selectedEmployee.balances.sick.used + selectedEmployee.balances.privilege.used)} days</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedEmployee.balances.totalBalance} days
                    </div>
                    <div className="text-sm text-gray-600">Total Available Balance</div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveBalance;
