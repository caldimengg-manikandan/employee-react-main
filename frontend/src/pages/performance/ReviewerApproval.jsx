import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Eye,
  Edit,
  Trash2,
  Save,
  X,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  XCircle,
  Filter,
  User,
  Star,
  FileText
} from 'lucide-react';
import { performanceAPI } from '../../services/api';

const StatusPopup = ({ isOpen, onClose, status, message }) => {
  if (!isOpen) return null;

  const config = {
    success: {
      icon: CheckCircle,
      color: "text-green-500",
      bg: "bg-green-50",
      border: "border-green-200",
      title: "Success"
    },
    error: {
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-50",
      border: "border-red-200",
      title: "Error"
    },
    info: {
      icon: AlertCircle,
      color: "text-blue-500",
      bg: "bg-blue-50",
      border: "border-blue-200",
      title: "Information"
    }
  };

  const { icon: Icon, color, bg, border, title } = config[status] || config.info;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900 opacity-40" onClick={onClose}></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className={`inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full border-2 ${border}`}>
          <div className={`${bg} px-4 pt-5 pb-4 sm:p-6 sm:pb-4`}>
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-white ${color} sm:mx-0 sm:h-10 sm:w-10 shadow-sm`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className={`text-lg leading-6 font-bold ${color}`}>
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-600 font-medium">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none sm:ml-3 sm:w-auto sm:text-sm transition-colors ${status === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#262760] hover:bg-[#1e2050]'}`}
              onClick={onClose}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const getCurrentFinancialYear = () => {
  const today = new Date();
  const yearStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const yearEnd = String(yearStart + 1).slice(2);
  return `${yearStart}-${yearEnd}`;
};

const getPreviousFinancialYear = () => {
  const today = new Date();
  const currentStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const prevStart = currentStart - 1;
  const prevEnd = String(prevStart + 1).slice(2);
  return `${prevStart}-${prevEnd}`;
};

const ReviewerApproval = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFinancialYr, setSelectedFinancialYr] = useState(getPreviousFinancialYear());
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [statusPopup, setStatusPopup] = useState({
    isOpen: false,
    status: 'info',
    message: ''
  });
  const [submitConfirm, setSubmitConfirm] = useState({
    isOpen: false,
    count: 0,
    ids: []
  });

  // Inline Editing State
  const [editingRowId, setEditingRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [performancePayDrafts, setPerformancePayDrafts] = useState({});
  const performancePaySaveTimersRef = useRef({});

  // Comment Modal State
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [currentCommentEmpId, setCurrentCommentEmpId] = useState(null);
  const [tempComment, setTempComment] = useState('');

  // View Details Modal State
  const [viewModalData, setViewModalData] = useState(null);

  // Fetch data
  useEffect(() => {
    fetchReviewerAppraisals();
  }, []);

  const uniqueYears = useMemo(() => {
    const years = [...new Set(employees.map(e => e.financialYr).filter(Boolean))].sort();
    return years.length ? years : [getPreviousFinancialYear()];
  }, [employees]);

  useEffect(() => {
    if (!uniqueYears.length) return;
    if (!selectedFinancialYr || !uniqueYears.includes(selectedFinancialYr)) {
      setSelectedFinancialYr(uniqueYears[0]);
    }
  }, [uniqueYears, selectedFinancialYr]);

  const fetchReviewerAppraisals = async () => {
    setLoading(true);
    try {
      const response = await performanceAPI.getReviewerAppraisals();
      const raw = response.data || [];
      const enhanced = raw.map(emp => {
        const current = Number(emp.currentSalary || 0);
        const pct = Number(emp.incrementPercentage || 0);
        const correctionPct = Number(emp.incrementCorrectionPercentage || 0);
        const hasComputed = Number(emp.incrementAmount || 0) !== 0 || Number(emp.revisedSalary || 0) !== 0;
        if (current > 0 && (pct !== 0 || correctionPct !== 0) && !hasComputed) {
          const { incrementAmount, revisedSalary } = calculateFinancials(
            current,
            pct,
            correctionPct
          );
          return {
            ...emp,
            incrementAmount,
            revisedSalary
          };
        }
        return emp;
      });
      setEmployees(enhanced);
    } catch (error) {
      console.error('Error fetching appraisals:', error);
      alert('Failed to fetch appraisals');
    } finally {
      setLoading(false);
    }
  };


  const calculateFinancials = (current, pct, correctionPct) => {
    const currentVal = parseFloat(current) || 0;
    const pctVal = parseFloat(pct) || 0;
    const correctionPctVal = parseFloat(correctionPct) || 0;

    // Total percentage = Base Increment % + Correction %
    const totalPct = pctVal + correctionPctVal;
    const amount = Math.round((currentVal * totalPct) / 100);
    const revised = Math.round(currentVal + amount);

    return {
      incrementAmount: amount,
      revisedSalary: revised
    };
  };

  const handleEditClick = (emp) => {
    setEditingRowId(emp.id);
    setEditFormData({ ...emp });
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditFormData({});
  };

  const handleSaveRow = async () => {
    try {
      const {
        reviewerComments,
        incrementPercentage,
        incrementCorrectionPercentage,
        incrementAmount,
        revisedSalary,
        performancePay
      } = editFormData;

      const rounded = calculateFinancials(
        editFormData.currentSalary,
        incrementPercentage,
        incrementCorrectionPercentage
      );

      await performanceAPI.updateReviewerAppraisal(editingRowId, {
        reviewerComments,
        incrementPercentage,
        incrementCorrectionPercentage,
        incrementAmount: rounded.incrementAmount,
        revisedSalary: rounded.revisedSalary,
        performancePay
      });

      setEmployees(employees.map(emp =>
        emp.id === editingRowId ? { ...editFormData, ...rounded } : emp
      ));
      setEditingRowId(null);
      setEditFormData({});
      setStatusPopup({
        isOpen: true,
        status: 'success',
        message: 'Review saved successfully!'
      });
    } catch (error) {
      console.error('Error saving row:', error);
      setStatusPopup({
        isOpen: true,
        status: 'error',
        message: 'Failed to save row. Please try again.'
      });
    }
  };

  const handleDelete = (id) => {
    // Should probably not allow delete here, or implement API
    if (window.confirm("Are you sure you want to delete this record?")) {
      setEmployees(employees.filter(emp => emp.id !== id));
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    }
  };

  const handleInputChange = (field, value) => {
    let newData = { ...editFormData, [field]: value };

    if (field === 'incrementPercentage' || field === 'incrementCorrectionPercentage') {
      const { incrementAmount, revisedSalary } = calculateFinancials(
        newData.currentSalary,
        field === 'incrementPercentage' ? value : newData.incrementPercentage,
        field === 'incrementCorrectionPercentage' ? value : newData.incrementCorrectionPercentage
      );
      newData.incrementAmount = incrementAmount;
      newData.revisedSalary = revisedSalary;
    }

    setEditFormData(newData);
  };

  const handlePerformancePayChange = (id, rawValue) => {
    const raw = String(rawValue ?? '');
    setPerformancePayDrafts((prev) => ({ ...prev, [id]: raw }));

    const numeric = raw.trim() === '' ? 0 : Number(raw);
    const shouldSave = raw.trim() === '' || Number.isFinite(numeric);

    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, performancePay: shouldSave ? numeric : emp.performancePay } : emp))
    );

    if (editingRowId === id) {
      setEditFormData((prev) => ({ ...prev, performancePay: shouldSave ? numeric : prev.performancePay }));
    }

    if (!shouldSave) return;

    if (performancePaySaveTimersRef.current[id]) {
      clearTimeout(performancePaySaveTimersRef.current[id]);
    }

    performancePaySaveTimersRef.current[id] = setTimeout(async () => {
      try {
        await performanceAPI.updateReviewerAppraisal(id, { performancePay: numeric });
      } catch (error) {
        console.error('Failed to save performance pay', error);
        setStatusPopup({
          isOpen: true,
          status: 'error',
          message: 'Failed to save Performance Pay. Please try again.'
        });
      }
    }, 600);
  };

  const openCommentModal = (emp) => {
    setCurrentCommentEmpId(emp.id);
    const comment = editingRowId === emp.id ? editFormData.reviewerComments : emp.reviewerComments;
    setTempComment(comment || '');
    setIsCommentModalOpen(true);
  };

  const saveComment = async () => {
    // If editing inline, just update local state
    if (editingRowId === currentCommentEmpId) {
      setEditFormData({ ...editFormData, reviewerComments: tempComment });
      setIsCommentModalOpen(false);
      return;
    }

    // If not inline editing, save to backend immediately
    try {
      await performanceAPI.updateReviewerAppraisal(currentCommentEmpId, {
        reviewerComments: tempComment
      });

      setEmployees(employees.map(emp =>
        emp.id === currentCommentEmpId ? { ...emp, reviewerComments: tempComment } : emp
      ));
      setIsCommentModalOpen(false);
      setStatusPopup({
        isOpen: true,
        status: 'success',
        message: 'Review comments saved successfully!'
      });
    } catch (error) {
      console.error('Error saving comment:', error);
      setStatusPopup({
        isOpen: true,
        status: 'error',
        message: 'Failed to save comment. Please try again.'
      });
    }
  };

  const handleSubmitToDirector = () => {
    if (selectedRows.length === 0) {
      setStatusPopup({
        isOpen: true,
        status: 'info',
        message: 'Please select one or more records to submit to Director.'
      });
      return;
    }

    const candidates = employees.filter(emp => selectedRows.includes(emp.id));
    const rowsToSubmit = candidates.filter(emp => emp.status === 'APPRAISER_COMPLETED');

    // Validation: Ensure all selected rows have been reviewed (comments added)
    const unreviewed = rowsToSubmit.filter(emp => !emp.reviewerComments || emp.reviewerComments.trim() === '');
    if (unreviewed.length > 0) {
      setStatusPopup({
        isOpen: true,
        status: 'error',
        message: `Please add reviewer comments for all selected records before submitting (${unreviewed.length} pending).`
      });
      return;
    }

    const count = rowsToSubmit.length;
    if (count === 0) {
      setStatusPopup({
        isOpen: true,
        status: 'info',
        message: 'No eligible records found in your selection.'
      });
      return;
    }

    const ids = rowsToSubmit.map(e => e.id);
    setSubmitConfirm({
      isOpen: true,
      count,
      ids
    });
  };

  const confirmSubmitToDirector = async () => {
    if (!submitConfirm.isOpen || !submitConfirm.ids.length) {
      setSubmitConfirm({ isOpen: false, count: 0, ids: [] });
      return;
    }
    try {
      await performanceAPI.submitToDirector(submitConfirm.ids);
      setStatusPopup({
        isOpen: true,
        status: 'success',
        message: `${submitConfirm.count} record(s) submitted to Director successfully!`
      });
      setSubmitConfirm({ isOpen: false, count: 0, ids: [] });
      fetchReviewerAppraisals();
      setSelectedRows([]);
    } catch (error) {
      console.error('Error submitting to Director:', error);
      setStatusPopup({
        isOpen: true,
        status: 'error',
        message: 'Failed to submit to Director. Please try again.'
      });
      setSubmitConfirm({ isOpen: false, count: 0, ids: [] });
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Only select pending records
      const pendingRecords = filteredEmployees
        .filter(emp => emp.status === 'APPRAISER_COMPLETED')
        .map(emp => emp.id);
      setSelectedRows(pendingRecords);
    } else {
      setSelectedRows([]);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Submitted':
      case 'SUBMITTED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">Pending Appraiser</span>;
      case 'APPRAISER_COMPLETED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending Review</span>;
      case 'REVIEWER_COMPLETED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Submitted</span>;
      case 'DIRECTOR_APPROVED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Approved</span>;
      case 'Released':
      case 'RELEASED':
      case 'Released Letter':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Released</span>;
      case 'Accepted':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">Accepted</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const handleSelectRow = (id) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const getDivisionValue = (emp) => String(emp?.division || '').trim();
  const getLocationValue = (emp) => String(emp?.location || emp?.branch || '').trim();

  const uniqueDivisions = [...new Set(employees.map(getDivisionValue).filter(Boolean))].sort();
  const uniqueLocations = [...new Set(employees.map(getLocationValue).filter(Boolean))].sort();
  const filteredEmployees = employees.filter(emp =>
    (emp.financialYr === selectedFinancialYr) &&
    (selectedDivision === '' || getDivisionValue(emp) === selectedDivision) &&
    (selectedLocation === '' || getLocationValue(emp) === selectedLocation) &&
    (emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.empId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-8 font-sans p-8">
      <div className="max-w-[98%] mx-auto">


        {/* Top Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Financial Year Selector */}
            <select
              value={selectedFinancialYr}
              onChange={(e) => setSelectedFinancialYr(e.target.value)}
              className="block w-40 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm bg-white border"
            >
              {uniqueYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>


            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employee..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#262760] w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Division Selector */}
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="block w-40 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm bg-white border"
            >
              <option value="">All Divisions</option>
              {uniqueDivisions.map(div => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>

            {/* Location Selector */}
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="block w-40 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm bg-white border"
            >
              <option value="">All Locations</option>
              {uniqueLocations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>


          </div>

          {/* Submit Button */}
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">
              {selectedRows.length > 0 ? `${selectedRows.length} selected` : 'All records'}
            </span>
            <button
              onClick={handleSubmitToDirector}
              className="flex items-center px-4 py-2 bg-[#262760] text-white rounded-md hover:bg-[#1e2050] transition-colors shadow-sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit to Director
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white shadow border-b border-gray-200 sm:rounded-lg overflow-auto max-h-[75vh]">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#262760] sticky top-0 z-10 shadow-md">
                <tr>
                  <th className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-[#262760] focus:ring-[#262760]"
                      checked={selectedRows.length > 0 && selectedRows.length === filteredEmployees.filter(e => e.status === 'APPRAISER_COMPLETED').length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Employee ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Employee Name</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Reviewer Comments</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Current Salary</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Increment %</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Increment Correction %</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Increment Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Revised Salary</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Performance Pay</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((emp, index) => {
                  const isEditing = editingRowId === emp.id;
                  const data = isEditing ? editFormData : emp;
                  const isSelected = selectedRows.includes(emp.id);
                  const isEditable = emp.status === 'APPRAISER_COMPLETED';
                  const performancePayValue =
                    performancePayDrafts[emp.id] !== undefined
                      ? performancePayDrafts[emp.id]
                      : String(Number(data.performancePay || 0));

                  return (
                    <tr key={emp.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-indigo-50' : ''}`}>
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-[#262760] focus:ring-[#262760] disabled:opacity-50"
                          checked={isSelected}
                          onChange={() => isEditable && handleSelectRow(emp.id)}
                          disabled={!isEditable}
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{data.empId}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{data.name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(emp.status)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {isEditing ? (
                          <textarea
                            className="w-full border border-gray-300 rounded p-1 text-xs focus:ring-[#262760] focus:border-[#262760] resize-none"
                            rows={2}
                            value={data.reviewerComments || ''}
                            onChange={(e) => handleInputChange('reviewerComments', e.target.value)}
                            placeholder="Enter comments..."
                          />
                        ) : (
                          <div
                            className={`text-xs text-gray-700 max-w-[200px] truncate mx-auto ${isEditable ? 'cursor-pointer hover:text-[#262760]' : ''}`}
                            onClick={() => isEditable && openCommentModal(emp)}
                            title={data.reviewerComments || 'Click to add comments'}
                          >
                            {data.reviewerComments || <span className="text-gray-400 italic">Add comments...</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {Number(data.currentSalary || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        <span className="font-medium text-gray-700">{data.incrementPercentage}%</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {isEditing ? (
                          <div className="relative">
                            <input
                              type="number"
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-right focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-4"
                              value={data.incrementCorrectionPercentage}
                              onChange={(e) => handleInputChange('incrementCorrectionPercentage', e.target.value)}
                            />
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                          </div>
                        ) : (
                          <span className={`${data.incrementCorrectionPercentage !== 0 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                            {data.incrementCorrectionPercentage > 0 ? '+' : ''}{data.incrementCorrectionPercentage}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium text-green-600">
                        {Number(data.incrementAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                        {Number(data.revisedSalary || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        <input
                          type="number"
                          inputMode="decimal"
                          className="w-28 px-2 py-1 border border-gray-300 rounded text-right focus:ring-[#262760] focus:border-[#262760] sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                          value={performancePayValue}
                          onChange={(e) => handlePerformancePayChange(emp.id, e.target.value)}
                          disabled={!isEditable}
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex justify-center items-center space-x-2">
                          {isEditing ? (
                            <>
                              <button onClick={handleSaveRow} className="text-green-600 hover:text-green-900" title="Save">
                                <Save className="h-5 w-5" />
                              </button>
                              <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-900" title="Cancel">
                                <X className="h-5 w-5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="text-blue-400 hover:text-gray-600"
                                title="View Details"
                                onClick={() => setViewModalData(emp)}
                              >
                                <Eye className="h-5 w-5" />
                              </button>
                              {isEditable && (
                                <button onClick={() => handleEditClick(emp)} className="text-blue-600 hover:text-blue-900 flex items-center gap-1" title="Edit">
                                  <Edit className="h-4 w-4" />
                                  <span>Edit</span>
                                </button>
                              )}

                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <StatusPopup
        isOpen={statusPopup.isOpen}
        onClose={() => setStatusPopup({ ...statusPopup, isOpen: false })}
        status={statusPopup.status}
        message={statusPopup.message}
      />

      {submitConfirm.isOpen && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 bg-[#262760] text-white flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <h3 className="text-lg font-semibold">Submit to Director</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-700">
                Submit {submitConfirm.count} record(s) to Director?
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setSubmitConfirm({ isOpen: false, count: 0, ids: [] })}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmSubmitToDirector}
                className="px-4 py-2 bg-[#262760] text-white rounded-md hover:bg-[#1e2050] text-sm font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reviewer Comment Modal */}
      {isCommentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-[#262760] text-white flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Reviewer Comments
              </h3>
              <button onClick={() => setIsCommentModalOpen(false)} className="text-white hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <textarea
                className="w-full h-32 border border-gray-300 rounded-md p-3 focus:ring-[#262760] focus:border-[#262760] resize-none"
                placeholder="Enter your comments here..."
                value={tempComment}
                onChange={(e) => setTempComment(e.target.value)}
              />
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setIsCommentModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveComment}
                  className="px-4 py-2 bg-[#262760] text-white rounded-md hover:bg-[#1e2050]"
                >
                  Save Comments
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 bg-[#262760] text-white flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center">
                <User className="h-5 w-5 mr-2" />
                Employee Appraisal Details
              </h3>
              <button onClick={() => setViewModalData(null)} className="text-white hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Employee Info Header */}
              <div className="flex items-center space-x-4 pb-4 border-b border-gray-200">
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-[#262760] font-bold text-lg">
                  {viewModalData.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{viewModalData.name}</h4>
                  <p className="text-sm text-gray-500">
                    {[viewModalData.designation, viewModalData.department].filter(Boolean).join(' • ') || '-'}
                  </p>
                  <p className="text-xs text-gray-400 font-mono mt-1">{viewModalData.empId || '-'}</p>
                </div>
              </div>

              {/* Appraisal Content */}
              <div className="grid grid-cols-1 gap-6">
                {/* Self Appraisal */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-sm">
                  <h4 className="text-sm font-bold text-[#262760] uppercase tracking-wide mb-3 flex items-center border-b border-blue-200 pb-2">
                    <User className="h-4 w-4 mr-2" /> Self Appraisal Detail
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">Overall Contribution</p>
                      <p className="text-sm text-gray-800 mt-1 bg-white p-2 rounded border border-blue-100 italic">
                        {viewModalData.selfAppraiseeComments ? `"${viewModalData.selfAppraiseeComments}"` : <span className="text-gray-400">No overall comments</span>}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase">Behavioural</p>
                        <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{viewModalData.behaviourSelf?.comments || 'No comments'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase">Process Adherence</p>
                        <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{viewModalData.processSelf?.comments || 'No comments'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase">Technical Assessment</p>
                        <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{viewModalData.technicalSelf?.comments || 'No comments'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase">Growth & Career Goals</p>
                        <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{viewModalData.growthSelf?.comments || viewModalData.growthSelf?.careerGoals || 'No comments'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team/Manager Review */}
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 shadow-sm">
                  <h4 className="text-sm font-bold text-[#262760] uppercase tracking-wide mb-3 flex items-center border-b border-indigo-200 pb-2">
                    <Star className="h-4 w-4 mr-2" /> Team Appraisal (Manager Review)
                  </h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/50 p-3 rounded-lg border border-indigo-50">
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase">Final Rating Assigned</p>
                        <p className="text-lg font-black text-indigo-700 mt-0.5">{viewModalData.appraiserRating || 'Not Rated'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase">Key Performance Summary</p>
                        <p className="text-xs text-gray-700 font-medium mt-1">{viewModalData.keyPerformance || '-'}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">Manager's General Remarks</p>
                      <p className="text-sm text-gray-800 mt-1 bg-white p-2 rounded border border-indigo-100 italic font-medium">
                        {viewModalData.managerComments ? `"${viewModalData.managerComments}"` : <span className="text-gray-400">No overall comments from manager</span>}
                      </p>
                    </div>

                    {/* Sectional Detail (Mgr) */}
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center">
                        Detailed Feedback Sections
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/40 p-2 rounded border border-indigo-50">
                          <p className="text-[10px] text-gray-500 font-bold uppercase">Behavioural</p>
                          <p className="text-xs text-gray-700 mt-0.5">{viewModalData.behaviourManagerComments || '-'}</p>
                        </div>
                        <div className="bg-white/40 p-2 rounded border border-indigo-50">
                          <p className="text-[10px] text-gray-500 font-bold uppercase">Process Adherence</p>
                          <p className="text-xs text-gray-700 mt-0.5">{viewModalData.processManagerComments || '-'}</p>
                        </div>
                        <div className="bg-white/40 p-2 rounded border border-indigo-50">
                          <p className="text-[10px] text-gray-500 font-bold uppercase">Technical</p>
                          <p className="text-xs text-gray-700 mt-0.5">{viewModalData.technicalManagerComments || '-'}</p>
                        </div>
                        <div className="bg-white/40 p-2 rounded border border-indigo-50">
                          <p className="text-[10px] text-gray-500 font-bold uppercase">Growth</p>
                          <p className="text-xs text-gray-700 mt-0.5">{viewModalData.growthManagerComments || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Manager's Evaluation Matrix */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-indigo-100 pt-3">
                      <div className="bg-indigo-100/30 p-2 rounded">
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Leadership</p>
                        <p className="text-xs font-semibold text-gray-800">{viewModalData.leadership || '-'}</p>
                      </div>
                      <div className="bg-indigo-100/30 p-2 rounded">
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Attitude</p>
                        <p className="text-xs font-semibold text-gray-800">{viewModalData.attitude || '-'}</p>
                      </div>
                      <div className="bg-indigo-100/30 p-2 rounded">
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Communication</p>
                        <p className="text-xs font-semibold text-gray-800">{viewModalData.communication || '-'}</p>
                      </div>
                    </div>

                    {viewModalData.appraiseeComments && (
                      <div className="mt-2 pt-2 border-t border-indigo-200">
                        <p className="text-xs text-gray-500 font-bold uppercase">Specific Appraisee Observations</p>
                        <p className="text-xs text-gray-700 mt-1 italic">"{viewModalData.appraiseeComments}"</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Key Projects */}
                {viewModalData.projects && viewModalData.projects.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 border-b border-gray-200 pb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-2" /> Projects & Key Contributions
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {viewModalData.projects.map((project, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-xs group hover:border-[#262760] transition-colors">
                          <p className="font-black text-[#262760] group-hover:text-[#1e2050] mb-1">{project.name}</p>
                          <p className="text-gray-600 italic">"{project.contribution}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={() => setViewModalData(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
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

export default ReviewerApproval;
