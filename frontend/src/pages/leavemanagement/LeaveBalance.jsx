import React, { useEffect, useState } from 'react';
import { Search, Eye, Edit, Save, X, History } from 'lucide-react';
import { leaveAPI, employeeAPI } from '../../services/api';

const LeaveBalance = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingMap, setPendingMap] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editBalances, setEditBalances] = useState({ casual: 0, sick: 0, privilege: 0 });
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLeaves, setHistoryLeaves] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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
        allocated: casual, 
        used: usedCasual, 
        balance: (casual - usedCasual)
      },
      sick: { 
        allocated: sick, 
        used: usedSick, 
        balance: (sick - usedSick)
      },
      privilege: { 
        allocated: privilege, 
        used: usedPrivilege, 
        balance: (privilege - usedPrivilege)
      },
      totalBalance: (casual + sick + privilege - (usedCasual + usedSick + usedPrivilege))
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

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setEditBalances({
      casual: employee.balances?.casual?.balance || 0,
      sick: employee.balances?.sick?.balance || 0,
      privilege: employee.balances?.privilege?.balance || 0
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEmployee) return;
    try {
      await leaveAPI.saveBalance({
        employeeId: editingEmployee.empId || editingEmployee.id,
        balances: editBalances
      });
      alert('Leave balance updated successfully');
      setShowEditModal(false);
      handleRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to update leave balance');
    }
  };
  
  const handleSave = async (employee) => {
    try {
      const employeeId = employee.empId || employee.id;
      await leaveAPI.saveBalance({ employeeId });
      alert('Leave balance saved to database');
      handleRefresh();
    } catch (err) {
      alert('Failed to save leave balance');
    }
  };

  const handleSyncAll = async () => {
    if (!window.confirm('Are you sure you want to save all employee balances to the database?')) return;
    setLoading(true);
    try {
      const res = await leaveAPI.syncAllBalances();
      alert(res.data.message || 'Saved all balances successfully');
      loadBalances();
    } catch (err) {
      console.error(err);
      alert('Failed to save balances');
      setLoading(false);
    }
  };

  const handleViewHistory = async (employee) => {
    setSelectedEmployee(employee);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const res = await leaveAPI.list({ employeeId: employee.empId || employee.id });
      setHistoryLeaves(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setHistoryLeaves([]);
    } finally {
      setHistoryLoading(false);
    }
  };
  
  const getAvailableBalance = (emp, type) => {
    const id = String(emp.empId || emp.id || '').toLowerCase();
    const pending = pendingMap[id] || { CL: 0, SL: 0, PL: 0 };
    const base =
      type === 'CL' ? (emp.balances.casual.balance || 0) :
      type === 'SL' ? (emp.balances.sick.balance || 0) :
      (emp.balances.privilege.balance || 0);
    const cut = type === 'CL' ? pending.CL : type === 'SL' ? pending.SL : pending.PL;
    return Number(base) - Number(cut);
  };

  return (
    <div className="space-y-4 p-6 h-[calc(100vh-64px)] flex flex-col">
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
        
        <div className="flex gap-2">
          <button
            onClick={handleSyncAll}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <Save size={16} /> Save All
          </button>
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <span className="rotate-45">↻</span> Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-white flex-1 overflow-auto min-h-0">
        <table className="w-full relative">
          <thead className="bg-blue-600 sticky top-0 z-20">
            <tr>
              <th className="p-4 text-left text-sm font-semibold text-white sticky top-0 bg-blue-600 z-20">Employee ID</th>
              <th className="p-4 text-left text-sm font-semibold text-white sticky top-0 bg-blue-600 z-20">Employee Name</th>
              <th className="p-4 text-left text-sm font-semibold text-white sticky top-0 bg-blue-600 z-20">Casual Leave</th>
              <th className="p-4 text-left text-sm font-semibold text-white sticky top-0 bg-blue-600 z-20">Sick Leave</th>
              <th className="p-4 text-left text-sm font-semibold text-white sticky top-0 bg-blue-600 z-20">Privilege Leave</th>
              <th className="p-4 text-left text-sm font-semibold text-white sticky top-0 bg-blue-600 z-20">Actions</th>
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewHistory(employee)}
                        className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                        title="View Leave History"
                      >
                        <History size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(employee)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit Balance"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleSave(employee)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Save Balance"
                      >
                        <Save size={16} />
                      </button>
                    </div>
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
      {/* History Modal */}
      {showHistoryModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Leave History: {selectedEmployee.name}</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : historyLeaves.length === 0 ? (
                <p className="text-center text-gray-500 p-8">No leave applications found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left font-medium text-gray-600">Type</th>
                      <th className="p-3 text-left font-medium text-gray-600">Start Date</th>
                      <th className="p-3 text-left font-medium text-gray-600">End Date</th>
                      <th className="p-3 text-left font-medium text-gray-600">Days</th>
                      <th className="p-3 text-left font-medium text-gray-600">Status</th>
                      <th className="p-3 text-left font-medium text-gray-600">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {historyLeaves.map((leave, idx) => (
                      <tr key={leave._id || idx} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">
                          <span className={`px-2 py-1 rounded text-xs ${
                            leave.leaveType === 'CL' ? 'bg-blue-100 text-blue-800' :
                            leave.leaveType === 'SL' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {leave.leaveType}
                          </span>
                        </td>
                        <td className="p-3">{formatDate(leave.startDate)}</td>
                        <td className="p-3">{formatDate(leave.endDate)}</td>
                        <td className="p-3">{leave.totalDays}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                            leave.status === 'Pending' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {leave.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600 max-w-xs truncate" title={leave.reason}>
                          {leave.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Edit Leave Balance</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Employee: <span className="font-semibold">{editingEmployee.name}</span></p>
              <p className="text-xs text-gray-500">Note: Editing balance will adjust the allocation.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Casual Leave Balance</label>
                <input
                  type="number"
                  step="0.5"
                  className="w-full border rounded p-2"
                  value={editBalances.casual}
                  onChange={(e) => setEditBalances({ ...editBalances, casual: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sick Leave Balance</label>
                <input
                  type="number"
                  step="0.5"
                  className="w-full border rounded p-2"
                  value={editBalances.sick}
                  onChange={(e) => setEditBalances({ ...editBalances, sick: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Privilege Leave Balance</label>
                <input
                  type="number"
                  step="0.5"
                  className="w-full border rounded p-2"
                  value={editBalances.privilege}
                  onChange={(e) => setEditBalances({ ...editBalances, privilege: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveBalance;
