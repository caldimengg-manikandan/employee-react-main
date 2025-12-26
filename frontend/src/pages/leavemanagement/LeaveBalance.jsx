import React, { useEffect, useState } from 'react';
import { Search, Eye } from 'lucide-react';
import { leaveAPI, employeeAPI } from '../../services/api';

const LeaveBalance = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingMap, setPendingMap] = useState({});

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
    loadBalances();
  }, []);

  const loadBalances = async () => {
    setLoading(true);
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
      try {
        const pend = await leaveAPI.list({ status: 'Pending' });
        const rows = Array.isArray(pend.data) ? pend.data : [];
        const agg = {};
        rows.forEach(r => {
          const id = String(r.employeeId || '').toLowerCase();
          if (!id) return;
          if (!agg[id]) agg[id] = { CL: 0, SL: 0, PL: 0 };
          const type = r.leaveType;
          const days = Number(r.totalDays || 0);
          if (type === 'CL') agg[id].CL += days;
          else if (type === 'SL') agg[id].SL += days;
          else if (type === 'PL') agg[id].PL += days;
        });
        setPendingMap(agg);
      } catch {
        setPendingMap({});
      }
      setLoading(false);
    } catch {
      try {
        const res2 = await employeeAPI.getAllEmployees();
        const list2 = Array.isArray(res2.data) ? res2.data : [];
        const mapped2 = list2.map((e, idx) => {
          const doj = e.dateOfJoining || e.dateofjoin || e.hireDate || e.createdAt || '';
          const m = monthsBetween(doj);
          const item = {
            id: e._id || idx,
            name: e.name || e.employeename || '',
            empId: e.employeeId || e.empId || '',
            department: e.division || e.department || '',
            position: e.position || e.designation || e.role || '',
            designation: e.designation || e.position || e.role || '',
            hireDate: doj,
            monthsOfService: m,
            email: e.email || '',
            phone: e.mobileNo || e.contactNumber || '',
            location: e.location || e.branch || '',
            basicSalary: e.basicSalary || 0
          };
          return { ...item, balances: calculateLeaveBalances(item) };
        });
        setEmployees(mapped2);
        setPendingMap({});
        setLoading(false);
      } catch {
        setEmployees([]);
        setPendingMap({});
        setLoading(false);
      }
    }
  };

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
      const firstSix = Math.min(monthsOfService, 6);
      const afterSix = Math.max(monthsOfService - 6, 0);
      const plNonCarry = (firstSix * 1);
      const plCarry = afterSix * 1.25;
      privilege = plNonCarry + plCarry;
      casual = afterSix * 0.5;
      sick = afterSix * 0.5;
    }
    
    const base = {
      casual: { 
        allocated: Math.round(casual * 10) / 10, 
        used: usedCasual, 
        balance: Math.round((casual - usedCasual) * 10) / 10
      },
      sick: { 
        allocated: Math.round(sick * 10) / 10, 
        used: usedSick, 
        balance: Math.round((sick - usedSick) * 10) / 10
      },
      privilege: { 
        allocated: Math.round(privilege * 10) / 10, 
        used: usedPrivilege, 
        balance: Math.round((privilege - usedPrivilege) * 10) / 10
      },
      totalBalance: Math.round((casual + sick + privilege - (usedCasual + usedSick + usedPrivilege)) * 10) / 10
    };
    return base;
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

  // Handle refresh
  const handleRefresh = () => {
    setSearchTerm('');
    loadBalances();
  };
  
  const getAvailableBalance = (emp, type) => {
    const id = String(emp.empId || emp.id || '').toLowerCase();
    const pending = pendingMap[id] || { CL: 0, SL: 0, PL: 0 };
    const base =
      type === 'CL' ? (emp.balances.casual.balance || 0) :
      type === 'SL' ? (emp.balances.sick.balance || 0) :
      (emp.balances.privilege.balance || 0);
    const cut = type === 'CL' ? pending.CL : type === 'SL' ? pending.SL : pending.PL;
    return Math.round((Number(base) - Number(cut)) * 10) / 10;
  };

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      {/* <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Leave Balance Management</h1>
          <p className="text-gray-600">View employee leave balances</p>
        </div>
      </div> */}

      {/* Search Box and Refresh Button */}
      <div className="flex items-center justify-between">
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
        
        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <span className="rotate-45">↻</span> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full">
          <thead className="bg-blue-600">
            <tr>
              <th className="p-4 text-left text-sm font-semibold text-white">Employee ID</th>
              <th className="p-4 text-left text-sm font-semibold text-white">Employee Name</th>
              <th className="p-4 text-left text-sm font-semibold text-white">Casual Leave</th>
              <th className="p-4 text-left text-sm font-semibold text-white">Sick Leave</th>
              <th className="p-4 text-left text-sm font-semibold text-white">Privilege Leave</th>
              <th className="p-4 text-left text-sm font-semibold text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="p-8 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                  <p className="mt-2 text-gray-600">Loading employee data...</p>
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-500">
                  No employees found. {searchTerm && 'Try a different search term.'}
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => (
                <tr key={employee.id || employee.empId} className="border-t hover:bg-gray-50">
                  {/* Employee ID Column */}
                  <td className="p-4">
                    <div className="font-medium text-gray-800">{employee.empId}</div>
                    
                  </td>
                  
                  {/* Employee Name Column */}
                  <td className="p-4">
                    <div className="font-medium text-gray-800">{employee.name}</div>
                    {/* <div className="text-xs text-gray-500 mt-1">
                      {employee.monthsOfService} months service
                    </div> */}
                  </td>
                  
                  {/* Casual Leave Column */}
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-gray-800">{getAvailableBalance(employee, 'CL')}</span>
                        <span className="text-sm text-gray-500"></span>
                      </div>
                    </div>
                  </td>
                  
                  {/* Sick Leave Column */}
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-gray-800">{getAvailableBalance(employee, 'SL')}</span>
                        <span className="text-sm text-gray-500"></span>
                      </div>
                    </div>
                  </td>
                  
                  {/* Privilege Leave Column */}
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-gray-800">{getAvailableBalance(employee, 'PL')}</span>
                        <span className="text-sm text-gray-500"></span>
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
              ))
            )}
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

      {/* Employee Details Modal - Simplified View */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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
                        <span className="font-bold">{selectedEmployee.balances.casual.allocated} </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Used</span>
                        <span className="font-bold text-red-600">{selectedEmployee.balances.casual.used} </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-gray-700">Balance</span>
                        <span className="font-bold text-xl text-green-600">{selectedEmployee.balances.casual.balance} </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sick Leave Card */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <h4 className="font-semibold text-green-700 mb-3">Sick Leave</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Allocated</span>
                        <span className="font-bold">{selectedEmployee.balances.sick.allocated} </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Used</span>
                        <span className="font-bold text-red-600">{selectedEmployee.balances.sick.used} </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-gray-700">Balance</span>
                        <span className="font-bold text-xl text-green-600">{selectedEmployee.balances.sick.balance} </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Privilege Leave Card */}
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <h4 className="font-semibold text-purple-700 mb-3">Privilege Leave</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Allocated</span>
                        <span className="font-bold">{selectedEmployee.balances.privilege.allocated} </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Used</span>
                        <span className="font-bold text-red-600">{selectedEmployee.balances.privilege.used} </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-gray-700">Balance</span>
                        <span className="font-bold text-xl text-green-600">{selectedEmployee.balances.privilege.balance} </span>
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
                    <p className="text-sm text-gray-600">Allocated: {(selectedEmployee.balances.casual.allocated + selectedEmployee.balances.sick.allocated + selectedEmployee.balances.privilege.allocated).toFixed(1)} </p>
                    <p className="text-sm text-gray-600">Used: {(selectedEmployee.balances.casual.used + selectedEmployee.balances.sick.used + selectedEmployee.balances.privilege.used)} </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedEmployee.balances.totalBalance} 
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
