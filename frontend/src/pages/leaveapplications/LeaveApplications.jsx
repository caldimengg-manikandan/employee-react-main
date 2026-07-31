import React, { useState, useEffect } from 'react';
import { leaveAPI, employeeAPI, regionalHolidayAPI, BASE_URL } from '../../services/api';
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
  Trash,
  Building2,
  Paperclip,
  Send,
  Loader2
} from 'lucide-react';
import Modal from '../../components/Modals/Modal';
import Notification from '../../components/Notifications/Notification';

const DEFAULT_LEAVE_TYPES = [
  { value: 'CL', label: 'Casual Leave (CL)' },
  { value: 'SL', label: 'Sick Leave (SL)' },
  { value: 'PL', label: 'Privilege Leave (PL)' },
  { value: 'BEREAVEMENT', label: 'Bereavement Leave' },
  { value: 'REGIONAL_HOLIDAY', label: 'Regional Holiday' },
];

const LeaveApplications = () => {
  const [leaveData, setLeaveData] = useState({
    leaveType: 'PL',
    startDate: '',
    endDate: '',
    dayType: 'Full Day',
    bereavementRelation: '',
    regionalHolidayName: '',
    supportingDocuments: null
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const [allLeaveTypes, setAllLeaveTypes] = useState(DEFAULT_LEAVE_TYPES);
  const [allowedLeaveTypes, setAllowedLeaveTypes] = useState(DEFAULT_LEAVE_TYPES);

  const [totalLeaveDays, setTotalLeaveDays] = useState(0);
  const [leaveBalance, setLeaveBalance] = useState({
    CL: 6,
    SL: 6,
    PL: 15,
    BEREAVEMENT: 0
  });
  const [apiUsedLeaves, setApiUsedLeaves] = useState(null);

  const [leaveHistory, setLeaveHistory] = useState([]);
  const [editingLeaveId, setEditingLeaveId] = useState(null);
  const [viewLeave, setViewLeave] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: 'success', isVisible: false });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, leaveId: null });
  const [submitModal, setSubmitModal] = useState({ isOpen: false, leave: null });
  const [warningModal, setWarningModal] = useState({ isOpen: false, message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [regionalHolidays, setRegionalHolidays] = useState([]);
  const [leaveSplit, setLeaveSplit] = useState(null);
  const [loadingSplit, setLoadingSplit] = useState(false);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type, isVisible: true });
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  };

  const fetchMyLeaves = async () => {
    try {
      const res = await leaveAPI.myLeaves();
      const items = Array.isArray(res.data) ? res.data : [];
      const mapped = items.map(l => ({
        id: l._id,
        leaveType: l.leaveType,
        leaveTypeName: (() => {
          if (l.leaveType === 'REGIONAL_HOLIDAY') {
            return `${allLeaveTypes.find(t => t.value === 'REGIONAL_HOLIDAY')?.label || 'Regional Holiday'}${l.regionalHolidayName ? ` - ${l.regionalHolidayName}` : ''}`;
          }
          if (['CL', 'SL', 'PL'].includes(l.leaveType) && (l.clUsed > 0 || l.slUsed > 0 || l.plUsed > 0 || l.negativePL > 0 || l.lopDays > 0)) {
            const parts = [];
            if (l.clUsed > 0) parts.push('Casual Leave (CL)');
            if (l.slUsed > 0) parts.push('Sick Leave (SL)');
            if (l.plUsed > 0 || l.negativePL > 0) parts.push('Privilege Leave (PL)');
            if (l.lopDays > 0) parts.push('Loss of Pay (LOP)');
            return parts.join(', ');
          }
          return allLeaveTypes.find(t => t.value === l.leaveType)?.label || l.leaveType;
        })(),
        startDate: l.startDate,
        endDate: l.endDate,
        dayType: l.dayType,
        totalDays: l.totalDays,
        clUsed: l.clUsed || 0,
        slUsed: l.slUsed || 0,
        plUsed: l.plUsed || 0,
        negativePL: l.negativePL || 0,
        lopDays: l.lopDays || 0,
        status: l.status,
        appliedDate: l.appliedDate,
        bereavementRelation: l.bereavementRelation || '',
        regionalHolidayName: l.regionalHolidayName || '',
        documentUrl: l.documentUrl || ''
      }));
      setLeaveHistory(mapped);
    } catch { }
  };

  useEffect(() => {
    fetchMyLeaves();
    const timer = setInterval(fetchMyLeaves, 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchLeaveBalance = async () => {
    try {
      const res = await employeeAPI.getLeaveBalance();
      if (res.data?.success) {
        const bal = res.data.data;
        if (bal) {
          setLeaveBalance(prev => ({
            ...prev,
            CL: typeof bal.cl === 'number' ? bal.cl : (typeof bal.CL === 'number' ? bal.CL : prev.CL),
            SL: typeof bal.sl === 'number' ? bal.sl : (typeof bal.SL === 'number' ? bal.SL : prev.SL),
            PL: typeof bal.pl === 'number' ? bal.pl : (typeof bal.PL === 'number' ? bal.PL : prev.PL),
          }));

          if (bal.clUsed !== undefined || bal.slUsed !== undefined || bal.plUsed !== undefined) {
            setApiUsedLeaves({
              CL: bal.clUsed || 0,
              SL: bal.slUsed || 0,
              PL: bal.plUsed || 0
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch leave balance:', error);
    }
  };

  useEffect(() => {
    fetchLeaveBalance();
  }, []);

  useEffect(() => {
    const fetchProfileAndLeaveTypes = async () => {
      try {
        const profileRes = await employeeAPI.getProfile();
        const gender = (profileRes.data?.gender || '').toLowerCase();
        let types = [...DEFAULT_LEAVE_TYPES];

        if (gender === 'female' || gender === 'f') {
          types = types.filter(t => t.value !== 'PATERNITY');
        } else if (gender === 'male' || gender === 'm') {
          types = types.filter(t => t.value !== 'MATERNITY');
        }

        setAllLeaveTypes(types);
        setAllowedLeaveTypes(types);
      } catch (error) {
        console.error("Failed to load profile for leave types:", error);
      }
    };
    fetchProfileAndLeaveTypes();
  }, []);

  useEffect(() => {
    const fetchRegionalHolidays = async () => {
      try {
        const res = await regionalHolidayAPI.list();
        const items = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        const year = leaveData.startDate ? new Date(leaveData.startDate).getFullYear() : new Date().getFullYear();
        const mapped = items
          .filter(h => {
            const d = new Date(h.date);
            return !isNaN(d.getTime()) && d.getFullYear() === year;
          })
          .map(h => {
            const d = new Date(h.date);
            const dateISO = d.toISOString().split('T')[0];
            return {
              id: h._id || `${h.name}-${h.date}`,
              name: h.name,
              dateISO,
              dateObj: d
            };
          })
          .sort((a, b) => a.dateObj - b.dateObj);
        setRegionalHolidays(mapped);
      } catch (error) {
        setRegionalHolidays([]);
      }
    };
    fetchRegionalHolidays();
  }, [leaveData.startDate]);

  const bereavementRelations = [
    'Spouse',
    'Son',
    'Daughter',
    'Father',
    'Mother',
    'Brother',
    'Sister',
    'Grandfather',
    'Grandmother',
    'Father-in-law',
    'Mother-in-law'
  ];

  const dayTypes = ['Full Day', 'Half Day'];

  useEffect(() => {
    if (leaveData.startDate && leaveData.endDate) {
      const start = new Date(leaveData.startDate);
      const end = new Date(leaveData.endDate);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
        let count = 0;
        const cur = new Date(start);
        while (cur <= end) {
          const day = cur.getDay();
          if (day !== 0 && day !== 6) {
            count++;
          }
          cur.setDate(cur.getDate() + 1);
        }

        if (leaveData.dayType === 'Half Day') {
          count = 0.5;
        }

        setTotalLeaveDays(count);
      } else {
        setTotalLeaveDays(0);
      }
    } else {
      setTotalLeaveDays(0);
    }
  }, [leaveData.startDate, leaveData.endDate, leaveData.dayType]);

  useEffect(() => {
    if (leaveData.leaveType === 'REGIONAL_HOLIDAY') {
      setLeaveSplit(null);
      return;
    }
    if (!leaveData.startDate || !leaveData.endDate || totalLeaveDays <= 0) {
      setLeaveSplit(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingSplit(true);
      try {
        const res = await leaveAPI.calculateSplit({
          startDate: leaveData.startDate,
          endDate: leaveData.endDate,
          dayType: leaveData.dayType,
          requestedType: leaveData.leaveType,
          excludeLeaveId: editingLeaveId || undefined
        });
        if (res.data?.success && res.data?.data) {
          setLeaveSplit(res.data.data);
        } else {
          setLeaveSplit(null);
        }
      } catch (error) {
        setLeaveSplit(null);
      } finally {
        setLoadingSplit(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [leaveData.startDate, leaveData.endDate, leaveData.dayType, leaveData.leaveType, totalLeaveDays, editingLeaveId]);

  const now = new Date();
  const minDateLimit = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  const maxDateLimit = (() => {
    const d = new Date(now.getFullYear(), 11, 31);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'supportingDocuments') {
      setLeaveData(prev => ({
        ...prev,
        supportingDocuments: files[0]
      }));
      if (fieldErrors.supportingDocuments) {
        setFieldErrors(prev => {
          const next = { ...prev };
          delete next.supportingDocuments;
          return next;
        });
      }
      return;
    }
    setLeaveData(prev => ({
      ...prev,
      [name]: value
    }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }

    if (name === 'startDate' && leaveData.dayType === 'Half Day') {
      setLeaveData(prev => ({
        ...prev,
        startDate: value,
        endDate: value
      }));
    }
  };

  const handleDayTypeChange = (type) => {
    setLeaveData(prev => {
      const nextState = { ...prev, dayType: type };
      if (type === 'Half Day' && prev.startDate) {
        nextState.endDate = prev.startDate;
      }
      return nextState;
    });
    if (fieldErrors.dayType || fieldErrors.endDate) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next.dayType;
        delete next.endDate;
        return next;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!leaveData.startDate) errors.startDate = 'Start Date is required';
    if (!leaveData.endDate) errors.endDate = 'End Date is required';
    if (leaveData.leaveType === 'BEREAVEMENT' && !leaveData.bereavementRelation) {
      errors.bereavementRelation = 'Relationship with Deceased is required';
    }
    if (leaveData.leaveType === 'REGIONAL_HOLIDAY' && !leaveData.regionalHolidayName) {
      errors.regionalHolidayName = 'Regional Holiday Selection is required';
    }

    if (leaveData.startDate && leaveData.endDate) {
      const start = new Date(leaveData.startDate);
      const end = new Date(leaveData.endDate);
      if (start > end) {
        errors.endDate = 'End Date must be on or after Start Date';
      }
    }

    if (leaveData.leaveType === 'SL' && totalLeaveDays > 5 && !leaveData.supportingDocuments && !editingLeaveId) {
      errors.supportingDocuments = 'Medical Certificate required for sick leave exceeding 5 days';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showNotification('Please fill in all required fields correctly.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('leaveType', leaveData.leaveType);
      formData.append('startDate', leaveData.startDate);
      formData.append('endDate', leaveData.endDate);
      formData.append('dayType', leaveData.dayType);

      if (leaveData.leaveType === 'BEREAVEMENT') {
        formData.append('bereavementRelation', leaveData.bereavementRelation);
      }
      if (leaveData.leaveType === 'REGIONAL_HOLIDAY') {
        formData.append('regionalHolidayName', leaveData.regionalHolidayName);
      }
      if (leaveData.supportingDocuments) {
        formData.append('supportingDocuments', leaveData.supportingDocuments);
      }

      let res;
      if (editingLeaveId) {
        res = await leaveAPI.update(editingLeaveId, formData);
      } else {
        res = await leaveAPI.apply(formData);
      }

      if (res.data?.success) {
        showNotification(editingLeaveId ? 'Leave application updated successfully!' : 'Leave application submitted successfully!', 'success');
        setSubmitModal({
          isOpen: true,
          leave: res.data.data
        });
        resetForm();
        fetchMyLeaves();
        fetchLeaveBalance();
        if (isEditModalOpen) {
          setIsEditModalOpen(false);
        }
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to submit leave application';
      setWarningModal({ isOpen: true, message: msg });
      showNotification(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setLeaveData({
      leaveType: 'PL',
      startDate: '',
      endDate: '',
      dayType: 'Full Day',
      bereavementRelation: '',
      regionalHolidayName: '',
      supportingDocuments: null
    });
    setEditingLeaveId(null);
    setFieldErrors({});
    setTotalLeaveDays(0);
  };

  const handleEdit = (leave) => {
    if (leave.status !== 'Pending') {
      showNotification('Only pending leave applications can be edited.', 'error');
      return;
    }
    setEditingLeaveId(leave.id);
    setLeaveData({
      leaveType: leave.leaveType,
      startDate: leave.startDate.split('T')[0],
      endDate: leave.endDate.split('T')[0],
      dayType: leave.dayType,
      bereavementRelation: leave.bereavementRelation || '',
      regionalHolidayName: leave.regionalHolidayName || '',
      supportingDocuments: null
    });
    setIsEditModalOpen(true);
  };

  const handleView = (leave) => {
    setViewLeave(leave);
  };

  const handleDelete = (leave) => {
    if (leave.status !== 'Pending') {
      showNotification('Only pending leave applications can be deleted.', 'error');
      return;
    }
    setDeleteModal({ isOpen: true, leaveId: leave.id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.leaveId) return;
    try {
      await leaveAPI.cancel(deleteModal.leaveId);
      showNotification('Leave application deleted successfully.', 'success');
      fetchMyLeaves();
      fetchLeaveBalance();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to delete leave application.', 'error');
    } finally {
      setDeleteModal({ isOpen: false, leaveId: null });
    }
  };

  const handleViewCertificate = (leave) => {
    if (!leave.documentUrl) return;
    const url = `${BASE_URL.replace('/api', '')}${leave.documentUrl}`;
    window.open(url, '_blank');
  };

  const getLeaveTypeIcon = (type) => {
    switch (type) {
      case 'CL':
        return <Home className="w-5 h-5 text-emerald-600" />;
      case 'SL':
        return <AlertCircle className="w-5 h-5 text-rose-600" />;
      case 'PL':
        return <Calendar className="w-5 h-5 text-indigo-600" />;
      case 'BEREAVEMENT':
        return <Heart className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  const calculateLeaveSummary = () => {
    if (apiUsedLeaves) {
      const localBereavement = leaveHistory.reduce((sum, leave) => {
        if (leave.leaveType === 'BEREAVEMENT' && leave.status === 'Approved') {
          return sum + (leave.totalDays || 0);
        }
        return sum;
      }, 0);

      return {
        ...apiUsedLeaves,
        BEREAVEMENT: localBereavement
      };
    }

    const used = { CL: 0, SL: 0, PL: 0, BEREAVEMENT: 0 };
    leaveHistory.forEach(leave => {
      if (leave.status === 'Approved') {
        const hasSplit = (leave.clUsed || 0) > 0 || (leave.slUsed || 0) > 0 || (leave.plUsed || 0) > 0 || (leave.negativePL || 0) > 0 || (leave.lopDays || 0) > 0;
        if (hasSplit) {
          used.CL += Number(leave.clUsed || 0);
          used.SL += Number(leave.slUsed || 0);
          used.PL += Number(leave.plUsed || 0) + Number(leave.negativePL || 0);
          if (leave.leaveType === 'BEREAVEMENT') used.BEREAVEMENT += Number(leave.totalDays || 0);
        } else if (['CL', 'SL', 'PL', 'BEREAVEMENT'].includes(leave.leaveType)) {
          used[leave.leaveType] += Number(leave.totalDays || 0);
        }
      }
    });
    return used;
  };

  const usedLeaves = calculateLeaveSummary();
  const calculatePendingSummary = () => {
    const pending = { CL: 0, SL: 0, PL: 0, BEREAVEMENT: 0 };
    leaveHistory.forEach(leave => {
      if (leave.status === 'Pending') {
        const hasSplit = (leave.clUsed || 0) > 0 || (leave.slUsed || 0) > 0 || (leave.plUsed || 0) > 0 || (leave.negativePL || 0) > 0 || (leave.lopDays || 0) > 0;
        if (hasSplit) {
          pending.CL += Number(leave.clUsed || 0);
          pending.SL += Number(leave.slUsed || 0);
          pending.PL += Number(leave.plUsed || 0) + Number(leave.negativePL || 0);
          if (leave.leaveType === 'BEREAVEMENT') pending.BEREAVEMENT += Number(leave.totalDays || 0);
        } else if (['CL', 'SL', 'PL', 'BEREAVEMENT'].includes(leave.leaveType)) {
          pending[leave.leaveType] += Number(leave.totalDays || 0);
        }
      }
    });
    return pending;
  };
  const pendingLeaves = calculatePendingSummary();
  const getAvailableBalance = (type) => {
    const base = Number(leaveBalance[type] || 0);
    const pending = Number(pendingLeaves[type] || 0);
    const used = Number(usedLeaves[type] || 0);
    const val = base - pending - used;
    if (type === 'CL' || type === 'SL') return Math.max(0, val);
    return val;
  };

  const isRegionalHoliday = leaveData.leaveType === 'REGIONAL_HOLIDAY';
  const selectedRegionalHolidayValue = isRegionalHoliday && leaveData.regionalHolidayName && leaveData.startDate
    ? `${leaveData.regionalHolidayName}||${leaveData.startDate}`
    : '';

  const selectedHolidayYear = (() => {
    const d = isRegionalHoliday && leaveData.startDate ? new Date(leaveData.startDate) : new Date();
    return d instanceof Date && !isNaN(d.getTime()) ? d.getFullYear() : new Date().getFullYear();
  })();

  const hasApprovedRegionalHolidayThisYear = leaveHistory.some(leave => {
    if (leave.leaveType !== 'REGIONAL_HOLIDAY') return false;
    if (leave.status !== 'Approved') return false;
    const sd = new Date(leave.startDate);
    if (isNaN(sd.getTime())) return false;
    return sd.getFullYear() === selectedHolidayYear;
  });

  const handleRegionalHolidaySelection = (e) => {
    const value = String(e.target.value || '');
    if (!value) {
      setLeaveData(prev => ({
        ...prev,
        regionalHolidayName: '',
        startDate: '',
        endDate: '',
        dayType: 'Full Day'
      }));
      setTotalLeaveDays(0);
      return;
    }
    const parts = value.split('||');
    const name = String(parts[0] || '').trim();
    const dateISO = String(parts[1] || '').trim();
    setLeaveData(prev => ({
      ...prev,
      regionalHolidayName: name,
      startDate: dateISO,
      endDate: dateISO,
      dayType: 'Full Day'
    }));
    if (fieldErrors.regionalHolidayName || fieldErrors.startDate || fieldErrors.endDate || fieldErrors.dayType) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next.regionalHolidayName;
        delete next.startDate;
        delete next.endDate;
        delete next.dayType;
        return next;
      });
    }
    setTotalLeaveDays(1);
  };

  const leaveFormContent = (
    <form noValidate onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          Select Leave Type *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allowedLeaveTypes.map(type => {
            const blocked = type.value === 'REGIONAL_HOLIDAY' && hasApprovedRegionalHolidayThisYear;
            const isSelected = leaveData.leaveType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => {
                  if (blocked) return;
                  setLeaveData(prev => ({
                    ...prev,
                    leaveType: type.value,
                    bereavementRelation: type.value === 'BEREAVEMENT' ? prev.bereavementRelation : '',
                    regionalHolidayName: type.value === 'REGIONAL_HOLIDAY' ? '' : '',
                    startDate: type.value === 'REGIONAL_HOLIDAY' ? '' : prev.startDate,
                    endDate: type.value === 'REGIONAL_HOLIDAY' ? '' : prev.endDate,
                    dayType: type.value === 'REGIONAL_HOLIDAY' ? 'Full Day' : prev.dayType
                  }));
                }}
                disabled={blocked}
                className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-between text-left ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-md shadow-indigo-600/10'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-800'
                } ${blocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-100' : 'bg-slate-200/70'}`}>
                    {getLeaveTypeIcon(type.value)}
                  </div>
                  <span className="font-bold text-xs">{type.label}</span>
                </div>
                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>}
              </button>
            );
          })}
        </div>
      </div>

      {leaveData.leaveType === 'BEREAVEMENT' && (
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Relationship with Deceased *
          </label>
          <select
            name="bereavementRelation"
            value={leaveData.bereavementRelation}
            onChange={handleInputChange}
            className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 outline-none transition-all ${
              fieldErrors.bereavementRelation ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500 focus:bg-white'
            }`}
          >
            <option value="">Select Relationship</option>
            {bereavementRelations.map(relation => (
              <option key={relation} value={relation}>{relation}</option>
            ))}
          </select>
        </div>
      )}

      {leaveData.leaveType === 'REGIONAL_HOLIDAY' && (
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Regional Holiday *
          </label>
          <select
            value={selectedRegionalHolidayValue}
            onChange={handleRegionalHolidaySelection}
            disabled={hasApprovedRegionalHolidayThisYear}
            className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 outline-none transition-all ${
              fieldErrors.regionalHolidayName ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500 focus:bg-white'
            } ${hasApprovedRegionalHolidayThisYear ? 'bg-slate-100 cursor-not-allowed' : ''}`}
          >
            <option value="">Select Holiday</option>
            {regionalHolidays.map(h => (
              <option key={h.id} value={`${h.name}||${h.dateISO}`}>{`${h.name} (${h.dateISO})`}</option>
            ))}
          </select>
          {hasApprovedRegionalHolidayThisYear && (
            <p className="mt-1.5 text-xs text-rose-600 font-medium">
              You already have an approved regional holiday for this year.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Start Date *
          </label>
          <input
            type="date"
            name="startDate"
            value={leaveData.startDate}
            min={minDateLimit}
            max={maxDateLimit}
            onKeyDown={(e) => e.preventDefault()}
            onChange={handleInputChange}
            disabled={isRegionalHoliday}
            className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 outline-none transition-all ${
              fieldErrors.startDate ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500 focus:bg-white'
            } ${isRegionalHoliday ? 'bg-slate-100 cursor-not-allowed' : ''}`}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Day Type
          </label>
          <div className="flex gap-2">
            {dayTypes.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  if (isRegionalHoliday) return;
                  handleDayTypeChange(type);
                }}
                disabled={isRegionalHoliday}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  leaveData.dayType === type
                    ? 'bg-gradient-to-r from-[#262760] to-[#3a3c8c] text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            End Date *
          </label>
          <input
            type="date"
            name="endDate"
            value={leaveData.endDate}
            min={leaveData.startDate || minDateLimit}
            max={maxDateLimit}
            onKeyDown={(e) => e.preventDefault()}
            onChange={handleInputChange}
            disabled={leaveData.dayType === 'Half Day' || isRegionalHoliday}
            className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 outline-none transition-all ${
              fieldErrors.endDate ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500 focus:bg-white'
            } ${leaveData.dayType === 'Half Day' || isRegionalHoliday ? 'bg-slate-100 cursor-not-allowed' : ''}`}
          />
        </div>
      </div>

      {leaveData.leaveType === 'SL' && totalLeaveDays > 5 && (
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Medical Certificate * (Exceeding 5 days)
          </label>
          <input
            type="file"
            name="supportingDocuments"
            onChange={handleInputChange}
            accept=".pdf,.jpg,.jpeg,.png"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <p className="text-[11px] text-slate-500 mt-1">Upload PDF, JPG, or PNG certificate</p>
        </div>
      )}

      {leaveSplit && totalLeaveDays > 0 && (
        <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-2">
          <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" /> Leave Deduction Breakdown
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {leaveSplit.clUsed > 0 && <div>CL: <span className="font-bold text-indigo-900">{leaveSplit.clUsed} days</span></div>}
            {leaveSplit.slUsed > 0 && <div>SL: <span className="font-bold text-indigo-900">{leaveSplit.slUsed} days</span></div>}
            {leaveSplit.plUsed > 0 && <div>PL: <span className="font-bold text-indigo-900">{leaveSplit.plUsed} days</span></div>}
            {leaveSplit.negativePL > 0 && <div className="text-rose-600 font-bold">Negative PL: {leaveSplit.negativePL} days</div>}
            {leaveSplit.lopDays > 0 && <div className="text-amber-600 font-bold">LOP: {leaveSplit.lopDays} days</div>}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white rounded-xl py-3.5 font-extrabold text-xs tracking-wider shadow-lg shadow-indigo-900/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="animate-spin w-4 h-4" />
            {editingLeaveId ? 'Updating...' : 'Submitting...'}
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            {editingLeaveId ? 'Update Leave Application' : 'Submit Leave Application'}
          </>
        )}
      </button>
    </form>
  );

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-6 font-sans text-slate-800">
      

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Form & History */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Submit Form Card */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-950/5 border border-slate-200/80 p-6">
            <h2 className="text-base font-extrabold text-indigo-950 uppercase tracking-wider mb-6 flex items-center gap-2 pb-3 border-b border-slate-200">
              <Calendar className="w-5 h-5 text-indigo-600" />
              {editingLeaveId ? 'Edit Leave Application' : 'Submit Leave Request'}
            </h2>
            {leaveFormContent}
          </div>

          {/* Leave History Card */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-950/5 border border-slate-200/80 overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-indigo-600" />
                <h2 className="text-sm font-bold text-indigo-950 uppercase tracking-wider">Leave Application History</h2>
                <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-extrabold border border-indigo-200">
                  {leaveHistory.length} records
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-medium">
                <thead>
                  <tr className="bg-gradient-to-r from-[#1e1b4b] via-[#262760] to-[#2e3078] text-white font-bold uppercase tracking-wider">
                    <th className="p-3.5 pl-5">Leave Type</th>
                    <th className="p-3.5">Dates</th>
                    <th className="p-3.5 text-center">Days</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaveHistory.map(leave => (
                    <tr key={leave.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100">
                            {getLeaveTypeIcon(leave.leaveType)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{leave.leaveTypeName}</div>
                            <div className="text-[11px] text-slate-500">{leave.dayType}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-700">
                        <div className="font-bold text-indigo-950">
                          {new Date(leave.startDate).toLocaleDateString('en-GB')}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          to {new Date(leave.endDate).toLocaleDateString('en-GB')}
                        </div>
                      </td>

                      <td className="p-3.5 text-center font-bold">
                        <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs border border-indigo-200 inline-block font-mono">
                          {leave.totalDays} {leave.totalDays === 1 ? 'day' : 'days'}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide uppercase inline-block ${getStatusBadgeClass(leave.status)}`}>
                          {leave.status}
                        </span>
                        {leave.documentUrl && (
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={() => handleViewCertificate(leave)}
                              className="text-[10px] text-indigo-600 font-bold underline hover:text-indigo-800"
                            >
                              📄 View Certificate
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 pr-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleView(leave)}
                            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                            title="View Details"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            onClick={() => handleEdit(leave)}
                            disabled={leave.status !== 'Pending'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              leave.status === 'Pending' 
                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            }`}
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            onClick={() => handleDelete(leave)}
                            disabled={leave.status !== 'Pending'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              leave.status === 'Pending' 
                                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' 
                                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            }`}
                            title="Delete"
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {leaveHistory.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-12 text-slate-500 font-semibold">
                        No leave history found. Submit your first leave request above!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column - Leave Balance Cards */}
        <div className="lg:col-span-1">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-950/5 border border-slate-200/80 p-6 space-y-4 sticky top-6">
            <h2 className="text-base font-extrabold text-indigo-950 uppercase tracking-wider pb-3 border-b border-slate-200 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Leave Balance Summary
            </h2>

            {/* Casual Leave */}
            <div className="bg-emerald-50/90 border border-emerald-200/80 p-5 rounded-2xl relative overflow-hidden transition-all hover:scale-[1.01]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">Casual Leave (CL)</span>
                <Home className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-3xl font-extrabold mt-1 text-emerald-700">{getAvailableBalance('CL')} <span className="text-xs font-semibold text-emerald-900/70">days available</span></div>
              <div className="text-xs text-emerald-800 font-semibold mt-2">Used: {usedLeaves.CL} days</div>
            </div>

            {/* Sick Leave */}
            <div className="bg-rose-50/90 border border-rose-200/80 p-5 rounded-2xl relative overflow-hidden transition-all hover:scale-[1.01]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-rose-900">Sick Leave (SL)</span>
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="text-3xl font-extrabold mt-1 text-rose-700">{getAvailableBalance('SL')} <span className="text-xs font-semibold text-rose-900/70">days available</span></div>
              <div className="text-xs text-rose-800 font-semibold mt-2">Used: {usedLeaves.SL} days</div>
            </div>

            {/* Privilege Leave */}
            <div className="bg-indigo-50/90 border border-indigo-200/80 p-5 rounded-2xl relative overflow-hidden transition-all hover:scale-[1.01]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-900">Privilege Leave (PL)</span>
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-3xl font-extrabold mt-1 text-indigo-700">{getAvailableBalance('PL')} <span className="text-xs font-semibold text-indigo-900/70">days available</span></div>
              <div className="text-xs text-indigo-800 font-semibold mt-2">Used: {usedLeaves.PL} days</div>
            </div>

            {/* Bereavement Leave */}
            {allowedLeaveTypes.some(t => t.value === 'BEREAVEMENT') && (
              <div className="bg-purple-50/90 border border-purple-200/80 p-5 rounded-2xl relative overflow-hidden transition-all hover:scale-[1.01]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-purple-900">Bereavement Leave</span>
                  <Heart className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-3xl font-extrabold mt-1 text-purple-700">{getAvailableBalance('BEREAVEMENT')} <span className="text-xs font-semibold text-purple-900/70">days available</span></div>
                <div className="text-xs text-purple-800 font-semibold mt-2">Used: {usedLeaves.BEREAVEMENT} days</div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Edit Leave Application"
      >
        {leaveFormContent}
      </Modal>

      {/* Warning Modal */}
      <Modal
        isOpen={warningModal.isOpen}
        onClose={() => setWarningModal({ isOpen: false, message: '' })}
        title="Balance Check"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-700">{warningModal.message}</p>
          <div className="flex justify-end">
            <button
              onClick={() => setWarningModal({ isOpen: false, message: '' })}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all"
            >
              OK
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, leaveId: null })}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs font-medium text-slate-600">
            Are you sure you want to delete this leave application? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2.5">
            <button
              onClick={() => setDeleteModal({ isOpen: false, leaveId: null })}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Submission Success Modal */}
      <Modal
        isOpen={submitModal.isOpen}
        onClose={() => setSubmitModal({ isOpen: false, leave: null })}
        title="Leave Submitted"
        size="sm"
      >
        <div className="space-y-4">
          <div className="text-slate-700 text-xs">
            <div className="font-bold text-indigo-950 mb-2 text-sm">Your leave request has been submitted successfully.</div>
            <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div><span className="font-bold text-slate-900">Type:</span> {submitModal.leave?.leaveTypeName || submitModal.leave?.leaveType}</div>
              <div><span className="font-bold text-slate-900">Period:</span> {new Date(submitModal.leave?.startDate).toLocaleDateString()} to {new Date(submitModal.leave?.endDate).toLocaleDateString()}</div>
              <div><span className="font-bold text-slate-900">Total Days:</span> {submitModal.leave?.totalDays}</div>
              <div><span className="font-bold text-slate-900">Status:</span> {submitModal.leave?.status}</div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setSubmitModal({ isOpen: false, leave: null })}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all"
            >
              OK
            </button>
          </div>
        </div>
      </Modal>

      {/* View Detail Modal */}
      {viewLeave && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="text-sm font-extrabold text-indigo-950 flex items-center gap-2">
                <FileText className="text-indigo-600" size={18} />
                Leave Application Details
              </h3>
              <button onClick={() => setViewLeave(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200"><span className="font-bold text-slate-900">Type:</span> {viewLeave.leaveTypeName}</div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200"><span className="font-bold text-slate-900">Dates:</span> {new Date(viewLeave.startDate).toLocaleDateString('en-GB')} to {new Date(viewLeave.endDate).toLocaleDateString('en-GB')}</div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200"><span className="font-bold text-slate-900">Day Type:</span> {viewLeave.dayType}</div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200"><span className="font-bold text-slate-900">Days:</span> {viewLeave.totalDays}</div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200"><span className="font-bold text-slate-900">Status:</span> {viewLeave.status}</div>

              {viewLeave.leaveType === 'BEREAVEMENT' && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200"><span className="font-bold text-slate-900">Relation:</span> {viewLeave.bereavementRelation || '—'}</div>
              )}
              {viewLeave.leaveType === 'REGIONAL_HOLIDAY' && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200"><span className="font-bold text-slate-900">Holiday:</span> {viewLeave.regionalHolidayName || '—'}</div>
              )}

              {(viewLeave.clUsed > 0 || viewLeave.slUsed > 0 || viewLeave.plUsed > 0 || viewLeave.negativePL > 0 || viewLeave.lopDays > 0) && (
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
                  <div className="font-bold text-indigo-950 uppercase text-[11px]">Deduction Breakdown:</div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    {viewLeave.clUsed > 0 && <div>CL: {viewLeave.clUsed} days</div>}
                    {viewLeave.slUsed > 0 && <div>SL: {viewLeave.slUsed} days</div>}
                    {viewLeave.plUsed > 0 && <div>PL: {viewLeave.plUsed} days</div>}
                    {viewLeave.negativePL > 0 && <div className="text-rose-600 font-bold">Negative PL: {viewLeave.negativePL} days</div>}
                    {viewLeave.lopDays > 0 && <div className="text-amber-600 font-bold">LOP: {viewLeave.lopDays} days</div>}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={() => setViewLeave(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={closeNotification}
      />
    </div>
  );
};

export default LeaveApplications;
