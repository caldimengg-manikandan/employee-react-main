import React, { useState, useEffect } from 'react';
import { leaveAPI, employeeAPI } from '../../services/api';
import {
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  AlertCircle,
  Home,
  Heart,
  XCircle,
  Eye,
  Pencil,
  Trash
} from 'lucide-react';

const LeaveApplications = () => {
  // State for leave form
  const [leaveData, setLeaveData] = useState({
    leaveType: 'CL',
    startDate: '',
    endDate: '',
    dayType: 'Full Day',
    reason: '',
    bereavementRelation: '',
    supportingDocuments: null
  });

  const [totalLeaveDays, setTotalLeaveDays] = useState(0);
  const [leaveBalance, setLeaveBalance] = useState({
    CL: 6,
    SL: 6,
    PL: 15,
    BEREAVEMENT: 2
  });

  // Leave history state
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [editingLeaveId, setEditingLeaveId] = useState(null);
  const [viewLeave, setViewLeave] = useState(null);

  const fetchMyLeaves = async () => {
    try {
      const res = await leaveAPI.myLeaves();
      const items = Array.isArray(res.data) ? res.data : [];
      const mapped = items.map(l => ({
        id: l._id,
        leaveType: l.leaveType,
        leaveTypeName: leaveTypes.find(t => t.value === l.leaveType)?.label || l.leaveType,
        startDate: l.startDate,
        endDate: l.endDate,
        dayType: l.dayType,
        totalDays: l.totalDays,
        status: l.status,
        appliedDate: l.appliedDate,
        reason: l.reason,
        bereavementRelation: l.bereavementRelation || ''
      }));
      setLeaveHistory(mapped);
    } catch { }
  };

  useEffect(() => {
    fetchMyLeaves();
    const timer = setInterval(fetchMyLeaves, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
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
    const calculateLeaveBalances = (employee) => {
      const { designation, monthsOfService } = employee;
      let casual = 0, sick = 0, privilege = 0;
      const isTrainee = String(designation || '').toLowerCase() === 'trainee';
      const traineeMonths = Math.min(monthsOfService, 12);
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
      return {
        CL: Math.round(casual * 10) / 10,
        SL: Math.round(sick * 10) / 10,
        PL: Math.round(privilege * 10) / 10
      };
    };
    const loadBalanceForMe = async () => {
      try {
        // Try dedicated endpoint for current user's balance
        const myRes = await leaveAPI.myBalance();
        const data = myRes?.data || {};
        if (data && data.balances) {
          setLeaveBalance({
            CL: data.balances.casual?.balance || 0,
            SL: data.balances.sick?.balance || 0,
            PL: data.balances.privilege?.balance || 0,
            BEREAVEMENT: 2
          });
          return;
        }
        // Fallback to generic balance list when accessible
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        const empId = user.employeeId || user.employeeCode || user.empId || '';
        const res = await leaveAPI.getBalance(empId ? { employeeId: empId } : undefined);
        const items = Array.isArray(res.data) ? res.data : [];
        const mine = items.find(e => String(e.employeeId || '').toLowerCase() === String(empId || '').toLowerCase())
          || items.find(e => String(e.email || '').toLowerCase() === String(user.email || '').toLowerCase())
          || items.find(e => String(e.name || '').toLowerCase() === String(user.name || '').toLowerCase());
        if (mine && mine.balances) {
          setLeaveBalance({
            CL: mine.balances.casual?.balance || 0,
            SL: mine.balances.sick?.balance || 0,
            PL: mine.balances.privilege?.balance || 0,
            BEREAVEMENT: 2
          });
          return;
        }
        throw new Error('No balance found');
      } catch {
        try {
          const [empRes, myLeavesRes] = await Promise.all([
            employeeAPI.getMyProfile().catch(() => null),
            leaveAPI.myLeaves().catch(() => ({ data: [] }))
          ]);
          const emp = empRes?.data || {};
          const doj = emp.dateOfJoining || emp.dateofjoin || emp.hireDate || emp.createdAt || '';
          const m = monthsBetween(doj);
          const d = emp.designation || emp.position || emp.role || '';
          const alloc = calculateLeaveBalances({ designation: d, monthsOfService: m });
          const myApproved = Array.isArray(myLeavesRes?.data) ? myLeavesRes.data.filter(l => l.status === 'Approved') : [];
          const used = myApproved.reduce((acc, l) => {
            const t = l.leaveType;
            const days = Number(l.totalDays || 0);
            if (t === 'CL') acc.CL += days;
            else if (t === 'SL') acc.SL += days;
            else if (t === 'PL') acc.PL += days;
            return acc;
          }, { CL: 0, SL: 0, PL: 0 });
          setLeaveBalance({
            CL: Math.round((Number(alloc.CL || 0) - Number(used.CL || 0)) * 10) / 10,
            SL: Math.round((Number(alloc.SL || 0) - Number(used.SL || 0)) * 10) / 10,
            PL: Math.round((Number(alloc.PL || 0) - Number(used.PL || 0)) * 10) / 10,
            BEREAVEMENT: 2
          });
        } catch { }
      }
    };
    loadBalanceForMe();
  }, []);

  // Leave types as per policy
  const leaveTypes = [
    { value: 'CL', label: 'Casual Leave (CL)' },
    { value: 'SL', label: 'Sick Leave (SL)' },
    { value: 'PL', label: 'Privilege Leave (PL)' },
    { value: 'BEREAVEMENT', label: 'Bereavement Leave' }
  ];

  const bereavementRelations = [
    'Spouse', 'Parent', 'Child', 'Sibling', 'Grandparent', 'In-Laws'
  ];

  const dayTypes = ['Full Day', 'Half Day'];

  // Calculate total working days excluding weekends
  const calculateWorkingDays = (start, end, dayType) => {
    if (!start || !end) return 0;

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (startDate > endDate) return 0;

    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const day = current.getDay();
      // Skip weekends (0=Sunday, 6=Saturday)
      if (day !== 0 && day !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    // Adjust for half day
    if (dayType === 'Half Day' && count === 1) {
      return 0.5;
    }

    return count;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;

    if (type === 'file') {
      setLeaveData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setLeaveData(prev => ({ ...prev, [name]: value }));
    }

    // Recalculate days when dates or day type changes
    if (name === 'startDate' || name === 'endDate' || name === 'dayType') {
      setTimeout(() => {
        const days = calculateWorkingDays(
          name === 'startDate' ? value : leaveData.startDate,
          name === 'endDate' ? value : leaveData.endDate,
          name === 'dayType' ? value : leaveData.dayType
        );
        setTotalLeaveDays(days);
      }, 0);
    }
  };

  // Handle day type change
  const handleDayTypeChange = (type) => {
    setLeaveData(prev => ({ ...prev, dayType: type }));

    if (leaveData.startDate && leaveData.endDate) {
      const days = calculateWorkingDays(leaveData.startDate, leaveData.endDate, type);
      setTotalLeaveDays(days);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!leaveData.startDate || !leaveData.endDate || !leaveData.leaveType) {
      alert('Please fill in all required fields');
      return;
    }

    if (leaveData.leaveType === 'BEREAVEMENT' && !leaveData.bereavementRelation) {
      alert('Please specify relationship for bereavement leave');
      return;
    }

    // Check leave balance (allow negative for CL/SL/PL; keep bereavement strict)
    if (leaveData.leaveType === 'BEREAVEMENT' && totalLeaveDays > getAvailableBalance('BEREAVEMENT')) {
      alert(`Insufficient Bereavement Leave balance. Available: ${getAvailableBalance('BEREAVEMENT')} days`);
      return;
    }

    // Medical certificate check for sick leave > 3 days
    if (leaveData.leaveType === 'SL' && totalLeaveDays > 3 && !leaveData.supportingDocuments) {
      alert('Medical certificate is required for sick leave exceeding 3 days');
      return;
    }

    // Create or update leave application
    const leaveTypeName = leaveTypes.find(type => type.value === leaveData.leaveType)?.label || leaveData.leaveType;

    try {
      if (editingLeaveId) {
        const res = await leaveAPI.update(editingLeaveId, {
          leaveType: leaveData.leaveType,
          startDate: leaveData.startDate,
          endDate: leaveData.endDate,
          dayType: leaveData.dayType,
          reason: leaveData.reason || '',
          bereavementRelation: leaveData.bereavementRelation || '',
          totalDays: totalLeaveDays
        });
        const l = res.data;
        setLeaveHistory(prev => prev.map(x => x.id === editingLeaveId ? {
          id: l._id,
          leaveType: l.leaveType,
          leaveTypeName: leaveTypeName,
          startDate: l.startDate,
          endDate: l.endDate,
          dayType: l.dayType,
          totalDays: l.totalDays,
          status: l.status,
          appliedDate: l.appliedDate,
          reason: l.reason
        } : x));
        setEditingLeaveId(null);
      } else {
        const res = await leaveAPI.apply({
          leaveType: leaveData.leaveType,
          startDate: leaveData.startDate,
          endDate: leaveData.endDate,
          dayType: leaveData.dayType,
          reason: leaveData.reason || '',
          bereavementRelation: leaveData.bereavementRelation || '',
          totalDays: totalLeaveDays
        });
        const l = res.data;
        const newLeave = {
          id: l._id,
          leaveType: l.leaveType,
          leaveTypeName: leaveTypeName,
          startDate: l.startDate,
          endDate: l.endDate,
          dayType: l.dayType,
          totalDays: l.totalDays,
          status: l.status,
          appliedDate: l.appliedDate,
          reason: l.reason
        };
        setLeaveHistory(prev => [newLeave, ...prev]);
      }
    } catch { }

    // Reset form
    setLeaveData({
      leaveType: 'CL',
      startDate: '',
      endDate: '',
      dayType: 'Full Day',
      reason: '',
      bereavementRelation: '',
      supportingDocuments: null
    });
    setTotalLeaveDays(0);

    alert(editingLeaveId ? 'Leave application updated successfully.' : 'Leave application submitted successfully! Awaiting approval.');
  };

  const handleEdit = (leave) => {
    if (leave.status !== 'Pending') {
      alert('Only Pending applications can be edited.');
      return;
    }
    setEditingLeaveId(leave.id);
    setLeaveData({
      leaveType: leave.leaveType,
      startDate: new Date(leave.startDate).toISOString().slice(0, 10),
      endDate: new Date(leave.endDate).toISOString().slice(0, 10),
      dayType: leave.dayType || 'Full Day',
      reason: leave.reason || '',
      bereavementRelation: leave.leaveType === 'BEREAVEMENT' ? (leave.bereavementRelation || '') : '',
      supportingDocuments: null
    });
    setTotalLeaveDays(leave.totalDays || 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (leave) => {
    if (leave.status !== 'Pending') {
      alert('Only Pending applications can be deleted.');
      return;
    }
    const ok = window.confirm('Delete this leave application?');
    if (!ok) return;
    try {
      await leaveAPI.remove(leave.id);
      setLeaveHistory(prev => prev.filter(x => x.id !== leave.id));
      alert('Leave application deleted.');
    } catch (e) {
      alert('Failed to delete leave application.');
    }
  };

  const handleView = (leave) => setViewLeave(leave);

  // Get leave type icon
  const getLeaveTypeIcon = (type) => {
    switch (type) {
      case 'CL': return <Home className="w-5 h-5" />;
      case 'SL': return <AlertCircle className="w-5 h-5" />;
      case 'PL': return <Calendar className="w-5 h-5" />;
      case 'BEREAVEMENT': return <Heart className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  // Get status badge style
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'Pending':
        return <Clock className="w-4 h-4" />;
      case 'Rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // Calculate leave summary
  const calculateLeaveSummary = () => {
    const used = {
      CL: 0,
      SL: 0,
      PL: 0,
      BEREAVEMENT: 0
    };

    leaveHistory.forEach(leave => {
      if (['CL', 'SL', 'PL', 'BEREAVEMENT'].includes(leave.leaveType) && leave.status === 'Approved') {
        used[leave.leaveType] += leave.totalDays;
      }
    });

    return used;
  };

  const usedLeaves = calculateLeaveSummary();
  const calculatePendingSummary = () => {
    const pending = {
      CL: 0,
      SL: 0,
      PL: 0,
      BEREAVEMENT: 0
    };
    leaveHistory.forEach(leave => {
      if (['CL', 'SL', 'PL', 'BEREAVEMENT'].includes(leave.leaveType) && leave.status === 'Pending') {
        pending[leave.leaveType] += leave.totalDays;
      }
    });
    return pending;
  };
  const pendingLeaves = calculatePendingSummary();
  const getAvailableBalance = (type) => {
    const base = Number(leaveBalance[type] || 0);
    const pending = Number(pendingLeaves[type] || 0);
    return Math.round((base - pending) * 10) / 10;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="w-full mx-auto px-0">
        {/* Header */}
        {/* <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Employee Leave Application</h1>

        </div> */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Leave request form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Submit Leave Request
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Leave Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Leave Type *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {leaveTypes.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setLeaveData(prev => ({ ...prev, leaveType: type.value }))}
                        className={`p-4 rounded-lg border-2 transition flex items-center justify-center gap-3 ${leaveData.leaveType === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <div className={`p-2 rounded ${leaveData.leaveType === type.value ? 'bg-blue-100' : 'bg-gray-100'}`}>
                          {getLeaveTypeIcon(type.value)}
                        </div>
                        <div className="font-medium text-gray-900">{type.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bereavement Relation (if bereavement leave selected) */}
                {leaveData.leaveType === 'BEREAVEMENT' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Relationship with Deceased *
                    </label>
                    <select
                      name="bereavementRelation"
                      value={leaveData.bereavementRelation}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      required
                    >
                      <option value="">Select Relationship</option>
                      {bereavementRelations.map(relation => (
                        <option key={relation} value={relation}>{relation}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Dates Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={leaveData.startDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      required
                    />
                  </div>

                  {/* Day Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Day Type
                    </label>
                    <div className="flex gap-2">
                      {dayTypes.map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleDayTypeChange(type)}
                          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition ${leaveData.dayType === type
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={leaveData.endDate}
                      onChange={handleInputChange}
                      min={leaveData.startDate}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      required
                    />
                  </div>
                </div>




                {/* Supporting Documents (for sick leave) */}
                {leaveData.leaveType === 'SL' && totalLeaveDays > 3 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medical Certificate * (Required for sick leave exceeding 3 days)
                    </label>
                    <input
                      type="file"
                      name="supportingDocuments"
                      onChange={handleInputChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Upload medical certificate (PDF, JPG, PNG)
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition duration-200"
                >
                  Submit Leave Application
                </button>
              </form>
            </div>

            {/* Leave History */}
            <div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Leave History</h2>
                <p className="text-gray-600 text-sm mt-1">Your previous leave applications</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>

                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leaveHistory.map(leave => (
                      <tr key={leave.id} className="hover:bg-gray-50 transition">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded ${getStatusBadge(leave.status)}`}>
                              {getLeaveTypeIcon(leave.leaveType)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{leave.leaveTypeName}</div>
                              <div className="text-sm text-gray-500">{leave.dayType}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-gray-900">
                            {new Date(leave.startDate).toLocaleDateString('en-GB')}
                          </div>
                          <div className="text-sm text-gray-500">
                            to {new Date(leave.endDate).toLocaleDateString('en-GB')}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => handleView(leave)}
                              className="text-blue-600 hover:text-blue-800"
                              title="View"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleEdit(leave)}
                              disabled={leave.status !== 'Pending'}
                              className={`hover:text-green-700 ${leave.status === 'Pending' ? 'text-green-600' : 'text-gray-300 cursor-not-allowed'}`}
                              title="Edit"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(leave)}
                              disabled={leave.status !== 'Pending'}
                              className={`hover:text-red-700 ${leave.status === 'Pending' ? 'text-red-600' : 'text-gray-300 cursor-not-allowed'}`}
                              title="Delete"
                            >
                              <Trash className="w-5 h-5" />
                            </button>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-center">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(leave.status)}`}>
                              {getStatusIcon(leave.status)}
                              {leave.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {leaveHistory.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-12 text-center">
                          <div className="text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-lg">No leave history found</p>
                            <p className="text-sm mt-1">Submit your first leave application</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {viewLeave && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                    <div className="p-6 border-b">
                      <h3 className="text-lg font-semibold text-gray-800">Leave Application</h3>
                    </div>
                    <div className="p-6 space-y-2 text-sm">
                      <div><span className="font-medium text-gray-700">Type:</span> {viewLeave.leaveTypeName}</div>
                      <div><span className="font-medium text-gray-700">Dates:</span> {new Date(viewLeave.startDate).toLocaleDateString('en-GB')} to {new Date(viewLeave.endDate).toLocaleDateString('en-GB')}</div>
                      <div><span className="font-medium text-gray-700">Day Type:</span> {viewLeave.dayType}</div>
                      <div><span className="font-medium text-gray-700">Days:</span> {viewLeave.totalDays}</div>
                      <div><span className="font-medium text-gray-700">Status:</span> {viewLeave.status}</div>
                      {viewLeave.leaveType === 'BEREAVEMENT' && (
                        <div><span className="font-medium text-gray-700">Relation:</span> {viewLeave.bereavementRelation || '—'}</div>
                      )}
                      <div><span className="font-medium text-gray-700">Reason:</span> {viewLeave.reason || '—'}</div>
                    </div>
                    <div className="p-4 border-t flex justify-end">
                      <button
                        onClick={() => setViewLeave(null)}
                        className="px-4 py-2 border rounded hover:bg-gray-50"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column - Leave Summary */}
          <div className="lg:col-span-1">
            {/* Leave Balance Summary */}
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Leave Summary</h2>

              {/* Leave Balance Cards */}
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900">Casual Leave (CL)</h3>
                    <Home className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-green-600">{getAvailableBalance('CL')} days</div>
                  <div className="text-sm text-gray-600 mt-1">0.5 days/month entitlement</div>
                  <div className="text-l text-gray-500 mt-2">Used: {usedLeaves.CL} days</div>
                </div>

                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900">Sick Leave (SL)</h3>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="text-3xl font-bold text-red-600">{getAvailableBalance('SL')} days</div>
                  <div className="text-sm text-gray-600 mt-1">0.5 days/month entitlement</div>
                  <div className="text-l text-gray-500 mt-2">Used: {usedLeaves.SL} days</div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900">Privilege Leave (PL)</h3>
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-blue-600">{getAvailableBalance('PL')} days</div>
                  <div className="text-sm text-gray-600 mt-1">15 days/year after completion</div>
                  <div className="text-l text-gray-500 mt-2">Used: {usedLeaves.PL} days</div>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900">Bereavement Leave</h3>
                    <Heart className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-3xl font-bold text-purple-600">{getAvailableBalance('BEREAVEMENT')} days</div>
                  <div className="text-sm text-gray-600 mt-1">Paid leave for immediate family</div>
                  <div className="text-l text-gray-500 mt-2">Used: {usedLeaves.BEREAVEMENT} days</div>
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveApplications;
