import React, { useEffect, useState } from 'react';
import { Search, Edit, History, Download, X, ChevronDown, ChevronUp, Lock, PenLine, ClipboardList } from 'lucide-react';
import { leaveAPI, employeeAPI } from '../../services/api';
import * as XLSX from 'xlsx';
import useNotification from '../../hooks/useNotification';
import Notification from '../../components/Notifications/Notification';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const LeaveBalance = () => {
  const { notification, showSuccess, showError, showWarning, hideNotification } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingMap, setPendingMap] = useState({});

  // Policy Configuration Modal
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyEmployee, setPolicyEmployee] = useState(null);
  const [policyData, setPolicyData] = useState({
    monthly_cl_allocation: 0.5, cl_carry_forward: true,
    monthly_sl_allocation: 0.5, sl_carry_forward: true,
    monthly_pl_allocation: 1.25, pl_carry_forward: true,
    bereavement_leave_enabled: false, monthly_bereavement_allocation: 0
  });
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '', employee: null });
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);

  // Monthly Ledger History Modal
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [ledgerEmployee, setLedgerEmployee] = useState(null);
  const [ledgerData, setLedgerData] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState(null);

  // Leave Application History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState(null);
  const [historyLeaves, setHistoryLeaves] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Current Month Leave Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [editBalances, setEditBalances] = useState({ cl: '', sl: '', pl: '' });
  const [editReason, setEditReason] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editLocked, setEditLocked] = useState(false);
  const [editAuditLogs, setEditAuditLogs] = useState([]);
  const [editAuditLoading, setEditAuditLoading] = useState(false);
  const [editTab, setEditTab] = useState('edit'); // 'edit' | 'audit'

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  // ---------------------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------------------

  useEffect(() => { loadBalances(); }, []);

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
        location: e.location || '',
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
          if (!agg[id]) agg[id] = { CL: 0, SL: 0, PL: 0, BL: 0 };
          const hasSplit = (r.clUsed || 0) > 0 || (r.slUsed || 0) > 0 || (r.plUsed || 0) > 0 || (r.negativePL || 0) > 0 || (r.lopDays || 0) > 0 || (r.blUsed || 0) > 0;
          if (hasSplit) {
            agg[id].CL += Number(r.clUsed || 0);
            agg[id].SL += Number(r.slUsed || 0);
            agg[id].PL += Number(r.plUsed || 0) + Number(r.negativePL || 0);
            agg[id].BL += Number(r.blUsed || 0);
          } else {
            if (r.leaveType === 'CL') agg[id].CL += Number(r.totalDays || 0);
            else if (r.leaveType === 'SL') agg[id].SL += Number(r.totalDays || 0);
            else if (r.leaveType === 'PL') agg[id].PL += Number(r.totalDays || 0);
            else if (r.leaveType === 'BL') agg[id].BL += Number(r.totalDays || 0);
          }
        });
        setPendingMap(agg);
      } catch { setPendingMap({}); }
    } catch (err) {
      console.error('Failed to fetch balances', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setLocationFilter('');
    loadBalances();
  };

  // ---------------------------------------------------------------------------
  // Balance Helpers
  // ---------------------------------------------------------------------------

  const getAvailableBalance = (emp, type) => {
    if (!emp.balances) return 0;
    const id = String(emp.empId || emp.id || '').toLowerCase();
    const pending = pendingMap[id] || { CL: 0, SL: 0, PL: 0, BL: 0 };
    const base =
      type === 'CL' ? (emp.balances.casual?.balance || 0) :
      type === 'SL' ? (emp.balances.sick?.balance || 0) :
      type === 'BL' ? (emp.balances.bereavement?.balance || 0) :
      (emp.balances.privilege?.balance || 0);
    const cut = type === 'CL' ? pending.CL : type === 'SL' ? pending.SL : type === 'BL' ? pending.BL : pending.PL;
    const val = Number(base) - Number(cut);
    if (type === 'CL' || type === 'SL' || type === 'BL') return Math.max(0, parseFloat(val.toFixed(2)));
    return parseFloat(val.toFixed(2));
  };

  const getBalanceColor = (value, type) => {
    if (value < 0) return 'text-red-600';
    if (value === 0) return 'text-gray-400';
    return type === 'CL' ? 'text-blue-600' : type === 'SL' ? 'text-green-600' : type === 'BL' ? 'text-rose-600' : 'text-purple-600';
  };

  // ---------------------------------------------------------------------------
  // Filtering / Sorting
  // ---------------------------------------------------------------------------

  const filteredEmployees = employees
    .filter(emp => {
      if (!emp.balances) return false;
      const matchesSearch =
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(emp.empId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(emp.location || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation = locationFilter ? emp.location === locationFilter : true;
      return matchesSearch && matchesLocation;
    })
    .sort((a, b) => {
      const idA = (a.empId || '').toString().toLowerCase();
      const idB = (b.empId || '').toString().toLowerCase();
      if (idA < idB) return -1;
      if (idA > idB) return 1;
      return 0;
    });

  // ---------------------------------------------------------------------------
  // Policy Modal
  // ---------------------------------------------------------------------------

  const handleOpenPolicyModal = async (employee) => {
    setPolicyEmployee(employee);
    setPolicyLoading(true);
    setShowPolicyModal(true);
    try {
      const res = await leaveAPI.getPolicy(employee.empId || employee.id);
      const p = res.data || {};
      setPolicyData({
        monthly_cl_allocation: p.monthly_cl_allocation ?? 0.5,
        cl_carry_forward: p.cl_carry_forward ?? true,
        monthly_sl_allocation: p.monthly_sl_allocation ?? 0.5,
        sl_carry_forward: p.sl_carry_forward ?? true,
        monthly_pl_allocation: p.monthly_pl_allocation ?? 1.25,
        pl_carry_forward: p.pl_carry_forward ?? true,
        bereavement_leave_enabled: p.bereavement_leave_enabled ?? false,
        monthly_bereavement_allocation: 2
      });
    } catch (err) {
      console.error('Failed to load policy', err);
      setPolicyData({ monthly_cl_allocation: 0.5, cl_carry_forward: true, monthly_sl_allocation: 0.5, sl_carry_forward: true, monthly_pl_allocation: 1.25, pl_carry_forward: true, bereavement_leave_enabled: false, monthly_bereavement_allocation: 2 });
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!policyEmployee) return;
    setPolicySaving(true);
    try {
      await leaveAPI.savePolicy(policyEmployee.empId || policyEmployee.id, policyData);
      setShowPolicyModal(false);
      setSuccessModal({ 
        isOpen: true, 
        message: 'Leave policy saved successfully!',
        employee: {
          name: policyEmployee.name,
          empId: policyEmployee.empId,
          position: policyEmployee.position,
          department: policyEmployee.department,
          location: policyEmployee.location
        }
      });
    } catch (err) {
      console.error('Failed to save policy', err);
      showError('Failed to save policy: ' + (err.response?.data?.error || err.message));
    } finally {
      setPolicySaving(false);
    }
  };

  const policyField = (label, field, step = 0.25, readOnly = false) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <div className="text-sm font-medium text-gray-700">{label}</div>
        <div className="text-xs text-gray-400 mt-0.5">Monthly credit (days)</div>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number"
          step={step}
          min={0}
          max={31}
          readOnly={readOnly}
          className={`w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-300 ${readOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed outline-none' : ''}`}
          value={policyData[field]}
          onChange={e => !readOnly && setPolicyData(prev => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }))}
        />
      </div>
    </div>
  );

  const carryForwardToggle = (label, field) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <div className="text-sm font-medium text-gray-700">{label} Carry Forward</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {policyData[field] ? 'Unused balance carries to next month' : 'Balance resets to 0 each month'}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPolicyData(prev => ({ ...prev, [field]: !prev[field] }))}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${policyData[field] ? 'bg-indigo-600' : 'bg-gray-200'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${policyData[field] ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  const enableToggle = (label, field, desc) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <div className="text-sm font-medium text-gray-700">{label}</div>
        <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
      </div>
      <button
        type="button"
        onClick={() => setPolicyData(prev => ({ ...prev, [field]: !prev[field] }))}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${policyData[field] ? 'bg-indigo-600' : 'bg-gray-200'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${policyData[field] ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Ledger History Modal
  // ---------------------------------------------------------------------------

  const handleOpenLedger = async (employee) => {
    setLedgerEmployee(employee);
    setLedgerLoading(true);
    setShowLedgerModal(true);
    setExpandedMonth(null);
    try {
      const res = await leaveAPI.getMonthlyLedger(employee.empId || employee.id);
      setLedgerData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load ledger', err);
      setLedgerData([]);
    } finally {
      setLedgerLoading(false);
    }
  };

  // Group ledger records by year-month
  const groupLedgerByMonth = (data) => {
    const groups = {};
    data.forEach(r => {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = { year: r.year, month: r.month, records: [] };
      groups[key].records.push(r);
    });

    const leaveTypeOrder = { 'CL': 1, 'SL': 2, 'PL': 3 };

    return Object.values(groups).map(group => {
      group.records.sort((a, b) => {
        return (leaveTypeOrder[a.leave_type] || 99) - (leaveTypeOrder[b.leave_type] || 99);
      });
      return group;
    }).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  };

  const getLopForMonth = (records) => records.reduce((sum, r) => sum + (r.lop_days || 0), 0);

  // ---------------------------------------------------------------------------
  // Leave Application History Modal
  // ---------------------------------------------------------------------------

  const handleViewHistory = async (employee) => {
    setHistoryEmployee(employee);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const res = await leaveAPI.list({ employeeId: employee.empId || employee.id });
      setHistoryLeaves(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setHistoryLeaves([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Current Month Leave Edit
  // ---------------------------------------------------------------------------

  const currentMonthLabel = () => {
    const now = new Date();
    return now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  };

  const handleOpenEditModal = async (employee) => {
    setEditEmployee(employee);
    setEditTab('edit');
    setEditReason('');
    setEditLocked(false);
    setEditAuditLogs([]);
    // Pre-fill from current displayed balance
    setEditBalances({
      cl: getAvailableBalance(employee, 'CL'),
      sl: getAvailableBalance(employee, 'SL'),
      pl: getAvailableBalance(employee, 'PL')
    });
    setShowEditModal(true);

    // Load audit logs in background
    setEditAuditLoading(true);
    try {
      const res = await leaveAPI.getAdjustmentLogs(employee.empId || employee.id);
      setEditAuditLogs(Array.isArray(res.data) ? res.data : []);
    } catch (_) { setEditAuditLogs([]); }
    finally { setEditAuditLoading(false); }
  };

  const handleSaveEdit = async () => {
    if (!editEmployee) return;
    if (!editReason.trim()) {
      showWarning('Please provide a reason for this adjustment.');
      return;
    }
    setEditSaving(true);
    try {
      const payload = {
        cl_balance: editBalances.cl !== '' ? parseFloat(editBalances.cl) : undefined,
        sl_balance: editBalances.sl !== '' ? parseFloat(editBalances.sl) : undefined,
        pl_balance: editBalances.pl !== '' ? parseFloat(editBalances.pl) : undefined,
        reason: editReason.trim()
      };
      await leaveAPI.currentMonthEdit(editEmployee.empId || editEmployee.id, payload);
      setShowEditModal(false);
      setSuccessModal({ 
        isOpen: true, 
        message: `Leave balances updated successfully!`,
        employee: {
          name: editEmployee.name,
          empId: editEmployee.empId,
          position: editEmployee.position,
          department: editEmployee.department,
          location: editEmployee.location
        }
      });
    } catch (err) {
      if (err.response?.status === 423) {
        setEditLocked(true);
      } else {
        showError('Failed to save: ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setEditSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  const handleDownloadExcel = () => {
    const data = filteredEmployees.map(emp => ({
      'Employee ID': emp.empId || emp.id,
      'Employee Name': emp.name,
      'Location': emp.location || 'N/A',
      'CL Balance': getAvailableBalance(emp, 'CL'),
      'SL Balance': getAvailableBalance(emp, 'SL'),
      'PL Balance': getAvailableBalance(emp, 'PL')
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leave Balances');
    ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.writeFile(wb, `Leave_Balance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4 p-6 h-[calc(100vh-64px)] flex flex-col">

      {/* Top Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-white w-full max-w-sm shadow-sm">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by name, ID or location..."
            className="outline-none w-full text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 bg-white outline-none text-sm min-w-[140px] shadow-sm"
          >
            <option value="">All Locations</option>
            {[...new Set(employees.map(e => e.location).filter(Boolean))].map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] transition-colors text-sm shadow-sm"
          >
            <Download size={15} /> Download Report
          </button>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] transition-colors text-sm shadow-sm"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-white flex-1 overflow-auto min-h-0 shadow-sm">
        <table className="w-full relative">
          <thead className="bg-[#262760] sticky top-0 z-20">
            <tr>
              {['Employee ID', 'Employee Name', 'Location', 'CL Balance', 'SL Balance', 'PL Balance', 'BL Balance', 'Actions'].map(h => (
                <th key={h} className="p-4 text-left text-sm font-semibold text-white">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#262760]" />
                    <p className="text-gray-500 text-sm">Loading employee leave balances...</p>
                  </div>
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-gray-400 text-sm">
                  No employees found. {searchTerm && 'Try a different search term.'}
                </td>
              </tr>
            ) : (
              filteredEmployees.map(employee => {
                const cl = getAvailableBalance(employee, 'CL');
                const sl = getAvailableBalance(employee, 'SL');
                const pl = getAvailableBalance(employee, 'PL');
                const bl = getAvailableBalance(employee, 'BL');
                return (
                  <tr key={employee.id || employee.empId} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <span className="font-mono text-sm font-medium text-gray-700">{employee.empId}</span>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-800">{employee.name}</div>
                      {employee.position && <div className="text-xs text-gray-400 mt-0.5">{employee.position}</div>}
                    </td>
                    <td className="p-4 text-gray-500 text-sm">{employee.location || '—'}</td>

                    {/* CL Balance */}
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className={`text-xl font-bold ${getBalanceColor(cl, 'CL')}`}>{cl}</span>
                        <span className="text-xs text-gray-400">CL</span>
                      </div>
                    </td>
                    {/* SL Balance */}
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className={`text-xl font-bold ${getBalanceColor(sl, 'SL')}`}>{sl}</span>
                        <span className="text-xs text-gray-400">SL</span>
                      </div>
                    </td>
                    {/* PL Balance */}
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className={`text-xl font-bold ${getBalanceColor(pl, 'PL')}`}>{pl}</span>
                        <span className="text-xs text-gray-400">{pl < 0 ? 'LOP' : 'PL'}</span>
                      </div>
                    </td>
                    {/* BL Balance */}
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className={`text-xl font-bold ${getBalanceColor(bl, 'BL')}`}>{bl}</span>
                        <span className="text-xs text-gray-400">BL</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewHistory(employee)}
                          className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Leave Application History"
                        >
                          <History size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenLedger(employee)}
                          className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Monthly Ledger History"
                        >
                          <span className="text-xs font-bold">📊</span>
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleOpenPolicyModal(employee)}
                              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Configure Leave Policy (Allocation Settings)"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(employee)}
                              className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Edit Current Month Leave Balances"
                            >
                              <PenLine size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Summary */}
      <div className="flex items-center justify-between text-sm text-gray-500 px-1">
        <span>Showing <strong>{filteredEmployees.length}</strong> of <strong>{employees.length}</strong> employees</span>
        <span className="text-xs text-gray-400">Leave allocates automatically on 1st of every month at 12:00 AM</span>
      </div>

      {/* ================================================================
          LEAVE POLICY CONFIGURATION MODAL
          ================================================================ */}
      {showPolicyModal && policyEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Leave Policy Configuration</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {policyEmployee.name} &bull; <span className="font-mono">{policyEmployee.empId}</span>
                </p>
              </div>
              <button onClick={() => setShowPolicyModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto">
              {policyLoading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
                </div>
              ) : (
                <div className="p-6 space-y-6">

                  {/* Casual Leave */}
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Casual Leave (CL)</h3>
                    </div>
                    {policyField('Monthly CL Allocation', 'monthly_cl_allocation')}
                    {carryForwardToggle('CL', 'cl_carry_forward')}
                  </div>

                  {/* Sick Leave */}
                  <div className="bg-green-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <h3 className="text-sm font-bold text-green-800 uppercase tracking-wide">Sick Leave (SL)</h3>
                    </div>
                    {policyField('Monthly SL Allocation', 'monthly_sl_allocation')}
                    {carryForwardToggle('SL', 'sl_carry_forward')}
                  </div>

                  {/* Privilege Leave */}
                  <div className="bg-purple-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <h3 className="text-sm font-bold text-purple-800 uppercase tracking-wide">Privilege Leave (PL)</h3>
                    </div>
                    {policyField('Monthly PL Allocation', 'monthly_pl_allocation')}
                    {carryForwardToggle('PL', 'pl_carry_forward')}
                  </div>

                  {/* Bereavement Leave */}
                  <div className="bg-rose-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wide">Bereavement Leave</h3>
                    </div>
                    {policyField('Monthly Bereavement Allocation', 'monthly_bereavement_allocation', 1, true)}
                    {enableToggle('Enable Bereavement Leave', 'bereavement_leave_enabled', 'Allow employee to apply for bereavement leave')}
                  </div>

                  {/* Info note */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                    <strong>Note:</strong> Changes take effect from the next automatic monthly allocation (1st of every month). The current month's ledger will not be altered.
                  </div>
                </div>
              )}
            </div>

            {/* Footer — always visible */}
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl flex-shrink-0">
              <button
                onClick={() => setShowPolicyModal(false)}
                className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePolicy}
                disabled={policySaving || policyLoading}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {policySaving ? 'Saving…' : 'Save Policy'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ================================================================
          MONTHLY LEDGER HISTORY MODAL
          ================================================================ */}
      {showLedgerModal && ledgerEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Monthly Leave Ledger</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {ledgerEmployee.name} &bull; <span className="font-mono">{ledgerEmployee.empId}</span>
                </p>
              </div>
              <button onClick={() => setShowLedgerModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {ledgerLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
                </div>
              ) : ledgerData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-gray-500 text-sm">No ledger records found.</p>
                  <p className="text-gray-400 text-xs mt-1">Ledger entries are created on the 1st of every month.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupLedgerByMonth(ledgerData).map(group => {
                    const key = `${group.year}-${group.month}`;
                    const isExpanded = expandedMonth === key;
                    const totalLop = getLopForMonth(group.records);
                    const hasLocked = group.records.some(r => r.is_locked);

                    return (
                      <div key={key} className="border border-gray-200 rounded-xl overflow-hidden">
                        {/* Month Header */}
                        <button
                          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                          onClick={() => setExpandedMonth(isExpanded ? null : key)}
                        >
                          <div className="flex items-center gap-3">
                            {hasLocked && <Lock size={14} className="text-gray-400" title="Payroll Locked" />}
                            <div>
                              <span className="font-semibold text-gray-800">{MONTH_NAMES[group.month]} {group.year}</span>
                              {hasLocked && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Payroll Locked</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {totalLop > 0 && (
                              <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-lg font-medium">
                                LOP: {totalLop} days
                              </span>
                            )}
                            {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                          </div>
                        </button>

                        {/* Month Detail */}
                        {isExpanded && (
                          <div className="p-4">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-gray-500 uppercase">
                                  <th className="text-left pb-3 font-medium">Leave Type</th>
                                  <th className="text-right pb-3 font-medium">Opening</th>
                                  <th className="text-right pb-3 font-medium">Allocated</th>
                                  <th className="text-right pb-3 font-medium">Used</th>
                                  <th className="text-right pb-3 font-medium">Closing</th>
                                  <th className="text-right pb-3 font-medium">LOP Days</th>
                                  <th className="text-center pb-3 font-medium">Carry Fwd</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {group.records.map(r => (
                                  <tr key={r._id || `${r.leave_type}-${r.month}`} className="hover:bg-gray-50">
                                    <td className="py-3">
                                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                        r.leave_type === 'CL' ? 'bg-blue-100 text-blue-700' :
                                        r.leave_type === 'SL' ? 'bg-green-100 text-green-700' :
                                        'bg-purple-100 text-purple-700'
                                      }`}>
                                        {r.leave_type}
                                      </span>
                                    </td>
                                    <td className="py-3 text-right text-gray-600">{parseFloat(r.opening_balance || 0).toFixed(2)}</td>
                                    <td className="py-3 text-right text-indigo-600 font-medium">+{parseFloat(r.allocated_leave || 0).toFixed(2)}</td>
                                    <td className="py-3 text-right text-red-500">-{parseFloat(r.used_leave || 0).toFixed(2)}</td>
                                    <td className="py-3 text-right font-bold text-gray-800">{parseFloat(r.closing_balance || 0).toFixed(2)}</td>
                                    <td className="py-3 text-right">
                                      {(r.lop_days || 0) > 0
                                        ? <span className="text-red-600 font-medium">{r.lop_days}</span>
                                        : <span className="text-gray-300">—</span>
                                      }
                                    </td>
                                    <td className="py-3 text-center">
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.carry_forward ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {r.carry_forward ? 'Yes' : 'No'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t flex-shrink-0 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowLedgerModal(false)}
                className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          LEAVE APPLICATION HISTORY MODAL
          ================================================================ */}
      {showHistoryModal && historyEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Leave Application History</h2>
                <p className="text-sm text-gray-500 mt-0.5">{historyEmployee.name} &bull; <span className="font-mono">{historyEmployee.empId}</span></p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                </div>
              ) : historyLeaves.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No leave applications found.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {['Type', 'Start Date', 'End Date', 'Days', 'CL', 'SL', 'PL', 'LOP', 'Status'].map(h => (
                        <th key={h} className="p-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {historyLeaves.map((leave, idx) => (
                      <tr key={leave._id || idx} className="hover:bg-gray-50">
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            leave.leaveType === 'CL' ? 'bg-blue-100 text-blue-800' :
                            leave.leaveType === 'SL' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>{leave.leaveType}</span>
                        </td>
                        <td className="p-3 text-gray-600">{formatDate(leave.startDate)}</td>
                        <td className="p-3 text-gray-600">{formatDate(leave.endDate)}</td>
                        <td className="p-3 font-medium">{leave.totalDays}</td>
                        <td className="p-3 text-blue-600">{leave.clUsed || 0}</td>
                        <td className="p-3 text-green-600">{leave.slUsed || 0}</td>
                        <td className="p-3 text-purple-600">{leave.plUsed || 0}</td>
                        <td className="p-3 text-red-600">{leave.lopDays || 0}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                            leave.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>{leave.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 border-t flex-shrink-0 bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowHistoryModal(false)} className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          CURRENT MONTH LEAVE EDIT MODAL
          ================================================================ */}
      {showEditModal && editEmployee && (() => {
        const MONTH_LABEL = currentMonthLabel();
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Current Month Leave Edit</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {editEmployee.name} &bull; <span className="font-mono">{editEmployee.empId}</span>
                  </p>
                </div>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b flex-shrink-0">
                <button
                  onClick={() => setEditTab('edit')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    editTab === 'edit' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Edit Balances
                </button>
                <button
                  onClick={() => setEditTab('audit')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    editTab === 'audit' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Audit Log {editAuditLogs.length > 0 && (
                    <span className="ml-1 bg-orange-100 text-orange-600 text-xs px-1.5 py-0.5 rounded-full">
                      {editAuditLogs.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto">

                {/* ── EDIT TAB ── */}
                {editTab === 'edit' && (
                  <div className="p-6 space-y-5">

                    {/* Payroll Locked Banner */}
                    {editLocked && (
                      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                        <Lock size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-red-700 text-sm">Payroll Locked</div>
                          <div className="text-xs text-red-500 mt-0.5">
                            Payroll already locked for this month. Leave balances cannot be modified.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Current Month Banner */}
                    <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                      <span className="text-2xl">📅</span>
                      <div>
                        <div className="text-xs text-orange-500 font-medium uppercase tracking-wide">Editing Current Month</div>
                        <div className="text-sm font-bold text-orange-700">{MONTH_LABEL}</div>
                      </div>
                    </div>

                    {/* Balance Inputs */}
                    <div className="space-y-3">
                      {[
                        { type: 'CL', label: 'Casual Leave (CL)', key: 'cl', borderColor: 'border-blue-100', bgColor: 'bg-blue-50', textColor: 'text-blue-700', ringColor: 'focus:ring-blue-300', allowNegative: false },
                        { type: 'SL', label: 'Sick Leave (SL)', key: 'sl', borderColor: 'border-green-100', bgColor: 'bg-green-50', textColor: 'text-green-700', ringColor: 'focus:ring-green-300', allowNegative: false },
                        { type: 'PL', label: 'Privilege Leave (PL)', key: 'pl', borderColor: 'border-purple-100', bgColor: 'bg-purple-50', textColor: 'text-purple-700', ringColor: 'focus:ring-purple-300', allowNegative: true }
                      ].map(f => (
                        <div key={f.type} className={`flex items-center justify-between p-4 ${f.bgColor} rounded-xl border ${f.borderColor}`}>
                          <div>
                            <div className={`text-sm font-semibold ${f.textColor}`}>{f.label}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {f.allowNegative ? 'New balance — negative values treated as LOP' : 'New balance (days)'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.25"
                              {...(!f.allowNegative ? { min: '0' } : {})}
                              disabled={editLocked}
                              className={`w-28 border border-gray-200 rounded-lg px-3 py-2 text-center text-sm font-bold focus:outline-none focus:ring-2 ${f.ringColor} disabled:opacity-50 disabled:bg-gray-100 bg-white`}
                              value={editBalances[f.key]}
                              onChange={e => setEditBalances(prev => ({ ...prev, [f.key]: e.target.value }))}
                            />
                            <span className="text-xs text-gray-400 w-8">days</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reason */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for Adjustment <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        disabled={editLocked}
                        placeholder="e.g. Opening Balance Migration, HR Correction, Carry Forward Adjustment, Joining Balance..."
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none disabled:opacity-50 disabled:bg-gray-50"
                        value={editReason}
                        onChange={e => setEditReason(e.target.value)}
                      />
                    </div>

                    {/* Info note */}
                    {!editLocked && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700 leading-relaxed">
                        <strong>Note:</strong> This edit affects <strong>only {MONTH_LABEL}</strong>. The updated closing balance automatically becomes next month's opening balance during the 1st-of-month allocation run.
                      </div>
                    )}
                  </div>
                )}

                {/* ── AUDIT TAB ── */}
                {editTab === 'audit' && (
                  <div className="p-4">
                    {editAuditLoading ? (
                      <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-orange-500" />
                      </div>
                    ) : editAuditLogs.length === 0 ? (
                      <div className="text-center py-10">
                        <ClipboardList size={32} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No adjustment records found.</p>
                        <p className="text-gray-300 text-xs mt-1">Adjustments will appear here after saving.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {editAuditLogs.map((log, i) => (
                          <div key={log._id || i} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  log.leave_type === 'CL' ? 'bg-blue-100 text-blue-700' :
                                  log.leave_type === 'SL' ? 'bg-green-100 text-green-700' :
                                  'bg-purple-100 text-purple-700'
                                }`}>{log.leave_type}</span>
                                <span className="text-xs text-gray-500">{MONTH_NAMES[log.month]} {log.year}</span>
                              </div>
                              <span className="text-xs text-gray-400">
                                {new Date(log.modified_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm mb-2">
                              <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded font-medium">{log.old_balance} days</span>
                              <span className="text-gray-400 font-bold">→</span>
                              <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded font-bold">{log.new_balance} days</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">Reason:</span> {log.reason}
                            </div>
                            <div className="mt-1 text-xs text-gray-400">
                              Modified by {log.modified_by_name || log.modified_by}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-5 border-t bg-gray-50 rounded-b-2xl flex-shrink-0">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm"
                >
                  Cancel
                </button>
                {!editLocked && editTab === 'edit' && (
                  <button
                    onClick={handleSaveEdit}
                    disabled={editSaving}
                    className="px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editSaving ? 'Saving…' : 'Save Adjustments'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toast Notification */}
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />

      {/* Success Confirmation Modal */}
      {successModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center transform scale-100 transition-all duration-300">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <span className="text-green-600 text-2xl font-bold">✓</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Success</h3>
            <p className="text-sm text-gray-500 mb-4">{successModal.message}</p>
            
            {successModal.employee && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left border border-gray-100 space-y-2">
                <div className="flex justify-between text-xs border-b border-gray-200/60 pb-1.5">
                  <span className="text-gray-400 font-medium">Employee ID</span>
                  <span className="text-gray-800 font-mono font-semibold">{successModal.employee.empId}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-gray-200/60 pb-1.5">
                  <span className="text-gray-400 font-medium">Name</span>
                  <span className="text-gray-800 font-semibold">{successModal.employee.name}</span>
                </div>
                {successModal.employee.position && (
                  <div className="flex justify-between text-xs border-b border-gray-200/60 pb-1.5">
                    <span className="text-gray-400 font-medium">Designation</span>
                    <span className="text-gray-800">{successModal.employee.position}</span>
                  </div>
                )}
                {successModal.employee.department && (
                  <div className="flex justify-between text-xs border-b border-gray-200/60 pb-1.5">
                    <span className="text-gray-400 font-medium">Division</span>
                    <span className="text-gray-800">{successModal.employee.department}</span>
                  </div>
                )}
                {successModal.employee.location && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 font-medium">Location</span>
                    <span className="text-gray-800">{successModal.employee.location}</span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => {
                setSuccessModal({ isOpen: false, message: '', employee: null });
                loadBalances();
              }}
              className="w-full inline-flex justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors focus:outline-none"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveBalance;