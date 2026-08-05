import React, { useEffect, useState } from 'react';
import { monthlyPayrollAPI, employeeAPI } from '../../services/api';
import { ChevronDown, ChevronRight, Download, Edit2 } from 'lucide-react';
import useNotification from '../../hooks/useNotification';
import Notification from '../../components/Notifications/Notification';
import Modal from '../../components/Modals/Modal';

export default function GratuitySummary() {
  const [gratuityData, setGratuityData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterDesignation, setFilterDesignation] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalEmployee, setStatusModalEmployee] = useState(null);
  const [statusModalValue, setStatusModalValue] = useState('Active');
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    fetchGratuityData();
  }, []);

  const fetchGratuityData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch all monthly payroll records and employees in parallel
      const [payrollResponse, employeeResponse] = await Promise.all([
        monthlyPayrollAPI.list(),
        employeeAPI.getAllEmployees()
      ]);

      const records = Array.isArray(payrollResponse.data) ? payrollResponse.data : [];
      const employees = Array.isArray(employeeResponse.data) ? employeeResponse.data : [];

      // Create a map of employeeId -> department / location / meta
      const deptMap = {};
      employees.forEach(emp => {
        if (emp.employeeId) {
          // Use department if available, otherwise fallback to division
          deptMap[emp.employeeId] = emp.department || emp.division || 'Unknown';
        }
      });
      const locMap = {};
      employees.forEach(emp => {
        if (emp.employeeId) {
          locMap[emp.employeeId] = emp.location || 'Unknown';
        }
      });
      const metaMap = {};
      employees.forEach(emp => {
        if (emp.employeeId) {
          metaMap[emp.employeeId] = { id: emp._id || null, status: emp.status || 'Active' };
        }
      });

      // Group by employee
      const grouped = {};
      
      records.forEach(record => {
        const gratuity = Number(record.gratuity || 0);
        
        // Only consider records with positive gratuity
        if (gratuity > 0) {
           if (!grouped[record.employeeId]) {
             grouped[record.employeeId] = {
               employeeId: record.employeeId,
               employeeName: record.employeeName,
               designation: record.designation,
               department: record.department || deptMap[record.employeeId] || 'Unknown',
               location: record.location || locMap[record.employeeId] || 'Unknown',
               employeeDbId: metaMap[record.employeeId]?.id || null,
               employeeStatus: metaMap[record.employeeId]?.status || 'Unknown',
               totalGratuity: 0,
               history: []
             };
           }
           grouped[record.employeeId].totalGratuity += gratuity;
           grouped[record.employeeId].history.push({
             month: record.salaryMonth,
             amount: gratuity,
             date: record.createdAt,
             status: record.status
           });
        }
      });

      // Sort history by month for each employee
      Object.values(grouped).forEach(emp => {
        emp.history.sort((a, b) => b.month.localeCompare(a.month));
      });

      // Convert to array and sort by Employee ID
      const data = Object.values(grouped);
      data.sort((a, b) => a.employeeId.localeCompare(b.employeeId, undefined, { numeric: true }));
      setGratuityData(data);

    } catch (err) {
      console.error("Failed to fetch gratuity data", err);
      setError('Failed to load gratuity data');
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800';
      case 'Suspended':
        return 'bg-red-100 text-red-800';
      case 'Closed':
        return 'bg-slate-200 text-slate-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const openStatusModal = (emp) => {
    setStatusModalEmployee(emp);
    setStatusModalValue(emp?.employeeStatus && emp.employeeStatus !== 'Unknown' ? emp.employeeStatus : 'Active');
    setStatusModalOpen(true);
  };

  const closeStatusModal = () => {
    if (statusSaving) return;
    setStatusModalOpen(false);
    setStatusModalEmployee(null);
    setStatusModalValue('Active');
  };

  const saveEmployeeStatus = async () => {
    const emp = statusModalEmployee;
    if (!emp?.employeeDbId) {
      showError('Cannot update status: employee record not found');
      return;
    }
    setStatusSaving(true);
    try {
      await employeeAPI.updateEmployee(emp.employeeDbId, { status: statusModalValue });
      setGratuityData(prev =>
        prev.map(item =>
          item.employeeId === emp.employeeId
            ? { ...item, employeeStatus: statusModalValue }
            : item
        )
      );
      showSuccess(`Status updated to ${statusModalValue}`);
      closeStatusModal();
    } catch (err) {
      console.error('Failed to update employee status', err);
      showError('Failed to update status');
    } finally {
      setStatusSaving(false);
    }
  };

  const toggleRow = (employeeId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedRows(newExpanded);
  };

  const exportCSV = () => {
    const header = ['Employee ID', 'Name', 'Designation', 'Total Gratuity Accrued'];
    const rows = gratuityData.map(emp => [
      emp.employeeId,
      emp.employeeName,
      emp.designation,
      emp.totalGratuity.toFixed(2)
    ]);

    const csvContent = [header, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'gratuity_summary.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('CSV exported successfully');
  };

  const depCandidateData = gratuityData.filter(item => (filterDesignation === 'all' || item.designation === filterDesignation) && (filterLocation === 'all' || item.location === filterLocation));
  const departments = ['all', ...new Set(depCandidateData.map(item => item.department).filter(Boolean))];
  const desigCandidateData = gratuityData.filter(item => (filterDepartment === 'all' || item.department === filterDepartment) && (filterLocation === 'all' || item.location === filterLocation));
  const designations = ['all', ...new Set(desigCandidateData.map(item => item.designation).filter(Boolean))];
  const locCandidateData = gratuityData.filter(item => (filterDepartment === 'all' || item.department === filterDepartment) && (filterDesignation === 'all' || item.designation === filterDesignation));
  const locations = ['all', ...new Set(locCandidateData.map(item => item.location).filter(Boolean))];

  const filteredData = gratuityData.filter(item => {
    const matchesSearch = 
      item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || item.department === filterDepartment;
    const matchesDesignation = filterDesignation === 'all' || item.designation === filterDesignation;
    const matchesLocation = filterLocation === 'all' || item.location === filterLocation;
    return matchesSearch && matchesDepartment && matchesDesignation && matchesLocation;
  });

  useEffect(() => {
    const available = new Set(desigCandidateData.map(i => i.designation).filter(Boolean));
    if (filterDesignation !== 'all' && !available.has(filterDesignation)) {
      setFilterDesignation('all');
    }
    const availableLoc = new Set(locCandidateData.map(i => i.location).filter(Boolean));
    if (filterLocation !== 'all' && !availableLoc.has(filterLocation)) {
      setFilterLocation('all');
    }
  }, [filterDepartment, gratuityData]);

  useEffect(() => {
    const availableDepts = new Set(depCandidateData.map(i => i.department).filter(Boolean));
    if (filterDepartment !== 'all' && !availableDepts.has(filterDepartment)) {
      setFilterDepartment('all');
    }
    const availableLoc = new Set(locCandidateData.map(i => i.location).filter(Boolean));
    if (filterLocation !== 'all' && !availableLoc.has(filterLocation)) {
      setFilterLocation('all');
    }
  }, [filterDesignation, gratuityData]);

  if (loading) return <div className="p-6">Loading gratuity data...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="w-full">

        <div className="flex justify-between items-center mb-6">
         
          
        </div>

        {/* Filters */}
        <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-slate-200/80 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Search Employee</label>
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                maxLength={10}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Division</label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                <option value="all">All Divisions</option>
                {departments.filter(d => d !== 'all').map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Designation Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Designation</label>
              <select
                value={filterDesignation}
                onChange={(e) => setFilterDesignation(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                <option value="all">All Designations</option>
                {designations.filter(d => d !== 'all').map(desig => (
                  <option key={desig} value={desig}>{desig}</option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Location</label>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                <option value="all">All Locations</option>
                {locations.filter(l => l !== 'all').map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end justify-end">
              <button
                onClick={exportCSV}
                className="w-full flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Gratuity Summary Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200/80">
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 z-10 bg-[#262760]">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-white uppercase tracking-wider w-10"></th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Employee ID</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Designation</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-white uppercase tracking-wider text-right">Total Accrued (₹)</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-white uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-500 font-medium">
                      No gratuity records found.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((emp) => (
                    <React.Fragment key={emp.employeeId}>
                      <tr 
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${expandedRows.has(emp.employeeId) ? 'bg-indigo-50/40' : ''}`}
                        onClick={() => toggleRow(emp.employeeId)}
                      >
                        <td className="px-6 py-4 text-slate-400">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            {expandedRows.has(emp.employeeId) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                            {emp.employeeId}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                              {(emp.employeeName || 'E').charAt(0).toUpperCase()}
                            </div>
                            <div className="font-semibold text-slate-900 text-sm">{emp.employeeName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700 whitespace-nowrap">{emp.designation}</td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${getEmployeeStatusColor(emp.employeeStatus)}`}>
                            {emp.employeeStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-emerald-700 text-right whitespace-nowrap">
                          ₹{emp.totalGratuity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openStatusModal(emp);
                            }}
                            className="inline-flex items-center px-3 py-1.5 border border-slate-200 shadow-sm text-xs font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-all"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                            Edit Status
                          </button>
                        </td>
                      </tr>
                      {expandedRows.has(emp.employeeId) && (
                        <tr className="bg-slate-50/60">
                          <td colSpan="7" className="px-6 py-4">
                            <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden p-3 shadow-inner">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-100/70">
                                  <tr>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-left">Month</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {emp.history.map((record, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/60">
                                      <td className="px-4 py-2 text-slate-700 font-medium">{record.month}</td>
                                      <td className="px-4 py-2 text-right font-semibold text-indigo-600">
                                        ₹{record.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-right text-xs font-medium text-slate-600">
            Total Records: <strong className="text-slate-900">{filteredData.length}</strong>
          </div>
        </div>
      </div>
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />
      <Modal
        isOpen={statusModalOpen}
        onClose={closeStatusModal}
        title="Edit Employee Status"
        size="sm"
        zIndex={60}
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-700">
            <div className="font-medium text-gray-900">
              {statusModalEmployee?.employeeName || 'Employee'}
            </div>
            <div className="text-gray-500">{statusModalEmployee?.employeeId || ''}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusModalValue}
              onChange={(e) => setStatusModalValue(e.target.value)}
              disabled={statusSaving}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeStatusModal}
              disabled={statusSaving}
              className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEmployeeStatus}
              disabled={statusSaving || !statusModalEmployee?.employeeDbId}
              className="px-4 py-2 rounded-md bg-[#262760] text-white text-sm font-medium hover:bg-[#1e2050] disabled:opacity-50"
            >
              {statusSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
