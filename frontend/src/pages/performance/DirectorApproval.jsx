import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  Save, 
  X,
  MessageSquare,
  CheckCircle,
  User,
  Send,
  FileText,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { performanceAPI, employeeAPI, payrollAPI } from '../../services/api';

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

const formatDisplayDate = (value) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const deriveEffectiveDateForAppraisal = (financialYear, updatedAt, effectiveDateField) => {
  if (effectiveDateField) {
    const d = new Date(effectiveDateField);
    if (!Number.isNaN(d.getTime())) return formatDisplayDate(d);
  }
  if (updatedAt) {
    const d = new Date(updatedAt);
    if (!Number.isNaN(d.getTime())) return formatDisplayDate(d);
  }
  if (financialYear && String(financialYear).includes('-')) {
    const parts = String(financialYear).split(/[-/]/);
    const yearStart = parseInt(parts[0], 10);
    if (!Number.isNaN(yearStart)) {
      const d = new Date(yearStart, 3, 1);
      return formatDisplayDate(d);
    }
  }
  return '';
};

const DirectorApproval = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFinancialYr, setSelectedFinancialYr] = useState(getCurrentFinancialYear());
  const [selectedRows, setSelectedRows] = useState([]);
  const [statusPopup, setStatusPopup] = useState({
    isOpen: false,
    status: 'info',
    message: ''
  });
  const [releaseConfirm, setReleaseConfirm] = useState({
    isOpen: false,
    count: 0,
    ids: []
  });
  
  // Inline Editing State
  const [editingRowId, setEditingRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Comment Modal State
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [currentCommentEmpId, setCurrentCommentEmpId] = useState(null);
  const [tempComment, setTempComment] = useState('');

  // View Details Modal State
  const [viewModalData, setViewModalData] = useState(null);

  const [showReleaseLetter, setShowReleaseLetter] = useState(false);
  const [letterData, setLetterData] = useState(null);

  // Fetch data
  useEffect(() => {
    fetchDirectorAppraisals();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      const years = Array.from(new Set(employees.map(e => e.financialYr).filter(Boolean)));
      if (years.length > 0 && !years.includes(selectedFinancialYr)) {
        setSelectedFinancialYr(years[0]);
      }
    }
  }, [employees]);

  const fetchDirectorAppraisals = async () => {
    setLoading(true);
    try {
      const response = await performanceAPI.getDirectorAppraisals();
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching appraisals:', error);
      // alert('Failed to fetch appraisals');
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
    const amount = (currentVal * totalPct / 100);
    const revised = currentVal + amount;
    
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
      await performanceAPI.updateDirectorAppraisal(editingRowId, editFormData);
      setEmployees(employees.map(emp => 
        emp.id === editingRowId ? editFormData : emp
      ));
      setEditingRowId(null);
      setEditFormData({});
      setStatusPopup({
        isOpen: true,
        status: 'success',
        message: 'Row saved successfully!'
      });
    } catch (error) {
      console.error('Error saving row:', error);
      setStatusPopup({
        isOpen: true,
        status: 'error',
        message: 'Failed to save changes'
      });
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

  const openCommentModal = (emp) => {
    setCurrentCommentEmpId(emp.id);
    const comment = editingRowId === emp.id ? editFormData.directorComments : emp.directorComments;
    setTempComment(comment || '');
    setIsCommentModalOpen(true);
  };

  const saveComment = async () => {
    try {
      const updatedData = { directorComments: tempComment };
      await performanceAPI.updateDirectorAppraisal(currentCommentEmpId, updatedData);

      if (editingRowId === currentCommentEmpId) {
        setEditFormData({ ...editFormData, directorComments: tempComment });
      } else {
        setEmployees(employees.map(emp => 
          emp.id === currentCommentEmpId ? { ...emp, directorComments: tempComment } : emp
        ));
      }
      setIsCommentModalOpen(false);
      setStatusPopup({
        isOpen: true,
        status: 'success',
        message: 'Director comments saved successfully!'
      });
    } catch (error) {
      console.error('Error saving comment:', error);
      setStatusPopup({
        isOpen: true,
        status: 'error',
        message: 'Failed to save comment'
      });
    }
  };

  const handlePreviewLetter = async (emp) => {
    try {
      let employeeDetails = {};

      try {
        if (emp.employeeId) {
          const res = await employeeAPI.getEmployeeById(emp.employeeId);
          employeeDetails = res.data;
        } else {
          employeeDetails = { ...emp };
        }
      } catch (err) {
        console.error('Failed to fetch employee details for letter', err);
        employeeDetails = { ...emp };
      }

      const financialYear = emp.financialYr || selectedFinancialYr || getCurrentFinancialYear();

      const today = new Date();
      const letterDate = formatDisplayDate(today);

      const employeeIdValue =
        employeeDetails.employeeId ||
        employeeDetails.empId ||
        emp.empId ||
        emp.employeeId;

      let salaryOld = {
        basic: 0,
        hra: 0,
        special: 0,
        gross: 0,
        empPF: 0,
        employerPF: 0,
        net: 0,
        gratuity: 0,
        ctc: 0
      };

      try {
        if (employeeIdValue) {
          const payrollRes = await payrollAPI.list();
          const items = Array.isArray(payrollRes.data) ? payrollRes.data : [];
          const empIdNorm = String(employeeIdValue).toLowerCase();
          const record = items.find(
            (p) => String(p.employeeId || '').toLowerCase() === empIdNorm
          );

          if (record) {
            const basic = Number(record.basicDA || 0);
            const hra = Number(record.hra || 0);
            const special = Number(record.specialAllowance || 0);
            const gross = Number(
              record.totalEarnings !== undefined
                ? record.totalEarnings
                : basic + hra + special
            );
            const empPF = Number(record.pf || 0);
            const employerPF = Number(record.employerPF || record.pf || 0);
            const net = Number(record.netSalary || gross);
            const gratuity = Number(record.gratuity || 0);
            const ctc = Number(
              record.ctc !== undefined ? record.ctc : gross + gratuity
            );

            salaryOld = {
              basic,
              hra,
              special,
              gross,
              empPF,
              employerPF,
              net,
              gratuity,
              ctc
            };
          }
        }
      } catch (err) {
        console.error('Failed to fetch payroll details for letter', err);
      }

      if (!salaryOld.ctc) {
        const currentSalary =
          Number(emp.currentSalary || 0) || Number(emp.salary || 0);
        if (currentSalary) {
          salaryOld = {
            basic: 0,
            hra: 0,
            special: 0,
            gross: currentSalary,
            empPF: 0,
            employerPF: 0,
            net: currentSalary,
            gratuity: 0,
            ctc: currentSalary
          };
        }
      }

      const baseCtc = salaryOld.ctc || 0;
      const basePct = Number(emp.incrementPercentage || 0);
      const correctionPct = Number(emp.incrementCorrectionPercentage || 0);
      let totalPct = basePct + correctionPct;

      const revisedFromAppraisal = Number(emp.revisedSalary || 0);

      let factor = 1;
      if (baseCtc && totalPct > 0) {
        factor = 1 + totalPct / 100;
      } else if (baseCtc && revisedFromAppraisal > 0) {
        factor = revisedFromAppraisal / baseCtc;
      }

      const revisedCtc = Math.round(baseCtc * factor);
      const incrementAmount = revisedCtc - baseCtc;

      const salaryNew = {
        basic: Math.round((salaryOld.basic || 0) * factor),
        hra: Math.round((salaryOld.hra || 0) * factor),
        special: Math.round((salaryOld.special || 0) * factor),
        gross: Math.round((salaryOld.gross || baseCtc) * factor),
        empPF: Math.round((salaryOld.empPF || 0) * factor),
        employerPF: Math.round((salaryOld.employerPF || 0) * factor),
        net: Math.round((salaryOld.net || baseCtc) * factor),
        gratuity: Math.round((salaryOld.gratuity || 0) * factor),
        ctc: revisedCtc
      };

      const data = {
        date: letterDate,
        employeeName: employeeDetails.name || employeeDetails.fullName || emp.name,
        employeeId: employeeIdValue || 'EMP-001',
        designation: employeeDetails.designation || employeeDetails.role || emp.designation,
        location: employeeDetails.location || employeeDetails.branch || emp.location || 'Chennai',
        financialYear: financialYear,
        effectiveDate: '1st April 2026',
        incrementPercentage: totalPct,
        incrementAmount,
        salary: {
          old: salaryOld,
          new: salaryNew
        }
      };
      setLetterData(data);
      setShowReleaseLetter(true);
    } catch (error) {
      console.error('Error preparing letter', error);
      alert('Failed to prepare release letter');
    }
  };

  const handleApproveRelease = (emp) => {
    setReleaseConfirm({
      isOpen: true,
      count: 1,
      ids: [emp.id]
    });
  };

  const handleBulkApprove = () => {
    const rowsToSubmit = selectedRows.length > 0 
      ? employees.filter(emp => selectedRows.includes(emp.id))
      : employees;
      
    const count = rowsToSubmit.length;
    if (count === 0) {
      setStatusPopup({
        isOpen: true,
        status: 'info',
        message: 'No records to approve.'
      });
      return;
    }

    setReleaseConfirm({
      isOpen: true,
      count,
      ids: rowsToSubmit.map(e => e.id)
    });
  };

  const confirmRelease = async () => {
    if (!releaseConfirm.isOpen || !releaseConfirm.ids.length) {
      setReleaseConfirm({ isOpen: false, count: 0, ids: [] });
      return;
    }
    try {
      await Promise.all(
        releaseConfirm.ids.map(id =>
          performanceAPI.updateDirectorAppraisal(id, { status: 'DIRECTOR_APPROVED' })
        )
      );

      setEmployees(employees.map(emp =>
        releaseConfirm.ids.includes(emp.id)
          ? { ...emp, status: 'DIRECTOR_APPROVED' }
          : emp
      ));

      setStatusPopup({
        isOpen: true,
        status: 'success',
        message: `${releaseConfirm.count} appraisal(s) approved successfully!`
      });

      setSelectedRows([]);
    } catch (error) {
      console.error('Error approving appraisals:', error);
      setStatusPopup({
        isOpen: true,
        status: 'error',
        message: 'Failed to approve appraisals'
      });
    } finally {
      setReleaseConfirm({ isOpen: false, count: 0, ids: [] });
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(filteredEmployees.map(emp => emp.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    (emp.financialYr === selectedFinancialYr) &&
    (emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     emp.empId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-8 font-sans p-8">
      <div className="max-w-[98%] mx-auto">
       
        
        {/* Top Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex items-center space-x-4">
            {/* Financial Year Selector */}
            <select 
              value={selectedFinancialYr}
              onChange={(e) => setSelectedFinancialYr(e.target.value)}
              className="block w-48 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm bg-white border"
            >
              <option value="2023-24">2023-2024</option>
              <option value="2024-25">2024-2025</option>
              <option value="2025-26">2025-2026</option>
              <option value="2026-27">2026-2027</option>
              <option value="2027-28">2027-2028</option>
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
          </div>

          {/* Bulk Action Button */}
          <div className="flex items-center space-x-3">
             <span className="text-sm text-gray-500">
               {selectedRows.length > 0 ? `${selectedRows.length} selected` : 'All records'}
             </span>
             <button 
               onClick={handleBulkApprove}
               className="flex items-center px-4 py-2 bg-[#262760] text-white rounded-md hover:bg-[#1e2050] transition-colors shadow-sm"
             >
               <Send className="h-4 w-4 mr-2" />
               Release Letters
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
                      checked={selectedRows.length === filteredEmployees.length && filteredEmployees.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Employee ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Employee Name</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Director Comments</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Current Salary</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Increment %</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Increment Correction %</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Increment Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Revised Salary</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((emp, index) => {
                  const isEditing = editingRowId === emp.id;
                  const data = isEditing ? editFormData : emp;
                  const isSelected = selectedRows.includes(emp.id);

                  return (
                    <tr key={emp.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-indigo-50' : ''}`}>
                      <td className="px-4 py-4 text-center">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-[#262760] focus:ring-[#262760]"
                          checked={isSelected}
                          onChange={() => handleSelectRow(emp.id)}
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{data.empId}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{data.name}</td>
                      <td className="px-4 py-4 text-center">
                        {isEditing ? (
                          <textarea
                            className="w-full border border-gray-300 rounded p-1 text-xs focus:ring-[#262760] focus:border-[#262760] resize-none"
                            rows={2}
                            value={data.directorComments || ''}
                            onChange={(e) => handleInputChange('directorComments', e.target.value)}
                            placeholder="Enter comments..."
                          />
                        ) : (
                          <div 
                            className="text-xs text-gray-700 max-w-[200px] truncate mx-auto cursor-pointer hover:text-[#262760]"
                            onClick={() => openCommentModal(emp)}
                            title={data.directorComments || 'Click to add comments'}
                          >
                            {data.directorComments || <span className="text-gray-400 italic">Add comments...</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {data.currentSalary.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {isEditing ? (
                          <div className="relative">
                             <input
                              type="number"
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-right focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-4"
                              value={data.incrementPercentage}
                              onChange={(e) => handleInputChange('incrementPercentage', e.target.value)}
                            />
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                          </div>
                        ) : (
                          <span>{data.incrementPercentage}%</span>
                        )}
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
                        {data.incrementAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                        {data.revisedSalary.toLocaleString()}
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
                                className="text-gray-400 hover:text-gray-600" 
                                title="View All Comments" 
                                onClick={() => setViewModalData(emp)}
                              >
                                <Eye className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handlePreviewLetter(emp)}
                                className="text-[#262760] hover:text-[#1e2050]"
                                title="Preview Appraisal Letter"
                              >
                                <FileText className="h-5 w-5" />
                              </button>
                              <button onClick={() => handleEditClick(emp)} className="text-blue-600 hover:text-blue-900" title="Edit">
                                <Edit className="h-5 w-5" />
                              </button>
                              {['DIRECTOR_APPROVED', 'Released', 'RELEASED'].includes(emp.status || '') ? (
                                <span className="text-green-600" title="Approved">
                                  <CheckCircle className="h-5 w-5 fill-green-100" />
                                </span>
                              ) : (
                                <button onClick={() => handleApproveRelease(emp)} className="text-green-600 hover:text-green-900" title="Approve & Release">
                                  <CheckCircle className="h-5 w-5" />
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

      {releaseConfirm.isOpen && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 bg-[#262760] text-white flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <h3 className="text-lg font-semibold">Approve & Release</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-700">
                Approve and Release Letters for {releaseConfirm.count} employee(s)?
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100"
                onClick={() => setReleaseConfirm({ isOpen: false, count: 0, ids: [] })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-[#262760] hover:bg-[#1e2050] rounded-md shadow-sm"
                onClick={confirmRelease}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Director Comment Modal */}
      {isCommentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-[#262760] text-white flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Director Comments
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

      {/* View Details Modal (All Comments) */}
      {viewModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden max-h-[90vh] overflow-y-auto">
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
                  <p className="text-sm text-gray-500">{viewModalData.designation} • {viewModalData.department}</p>
                </div>
              </div>

              {/* Comments Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Self Appraisal</h4>
                  <p className="text-sm text-gray-800">{viewModalData.selfAppraiseeComments || <span className="text-gray-400 italic">No comments</span>}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Manager Review</h4>
                  <p className="text-sm text-gray-800">{viewModalData.managerComments || <span className="text-gray-400 italic">No comments</span>}</p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="text-xs font-bold text-blue-800 uppercase mb-2">Reviewer Comments</h4>
                  <p className="text-sm text-gray-800">{viewModalData.reviewerComments || <span className="text-gray-400 italic">No comments</span>}</p>
                </div>

                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                  <h4 className="text-xs font-bold text-indigo-800 uppercase mb-2">Director Comments</h4>
                  <p className="text-sm text-gray-800 font-medium">{viewModalData.directorComments || <span className="text-gray-400 italic">No comments</span>}</p>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-bold text-gray-900 mb-4">Financial Overview</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="block text-xs text-gray-500">Current Salary</span>
                    <span className="block text-sm font-medium">₹{viewModalData.currentSalary.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Increment</span>
                    <span className="block text-sm font-medium text-green-600">
                      {viewModalData.incrementPercentage + viewModalData.incrementCorrectionPercentage}%
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Amount</span>
                    <span className="block text-sm font-medium text-green-600">₹{viewModalData.incrementAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Revised Salary</span>
                    <span className="block text-sm font-bold text-[#262760]">₹{viewModalData.revisedSalary.toLocaleString()}</span>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button 
                onClick={() => setViewModalData(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showReleaseLetter && letterData && (
        <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto backdrop-blur-sm flex justify-center items-start py-8">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl relative mx-4">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-20 rounded-t-lg">
              <h2 className="text-xl font-bold text-gray-800">Appraisal Letter Preview</h2>
              <button
                onClick={() => setShowReleaseLetter(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 bg-gray-100 overflow-x-auto flex flex-col items-center gap-8">
              <div id="release-letter-page-1" className="bg-white relative min-h-[1120px] w-[794px] shadow-lg flex-shrink-0 flex flex-col">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                  <img 
                    src="/images/steel-logo.png" 
                    alt="" 
                    className="w-[500px] opacity-[0.05] grayscale"
                  />
                </div>
                
                <div className="relative z-10 flex flex-col h-full justify-between flex-grow">
                  <div className="w-full flex h-32 relative overflow-hidden">
                    <div className="absolute inset-0 z-0">
                      <svg width="100%" height="100%" viewBox="0 0 794 128" preserveAspectRatio="none">
                        <path d="M0,0 L400,0 L340,128 L0,128 Z" fill="#1e2b58" />
                        <path d="M400,0 L430,0 L370,128 L340,128 Z" fill="#f37021" />
                      </svg>
                    </div>

                    <div className="relative w-[60%] flex items-center pl-8 pr-12 z-10">
                      <div className="flex items-center gap-4">
                        <img src="/images/steel-logo.png" alt="CALDIM" className="h-16 w-auto brightness-0 invert" crossOrigin="anonymous" style={{ display: 'block' }} />
                        <div className="text-white">
                          <h1 className="text-3xl font-bold leading-none tracking-wide">CALDIM</h1>
                          <p className="text-[10px] tracking-[0.2em] mt-1 text-orange-400 font-semibold">ENGINEERING PRIVATE LIMITED</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center items-end pr-8 pt-2 z-10">
                      <div className="flex items-center mb-2">
                        <span className="font-bold text-gray-800 mr-3 text-lg">044-47860455</span>
                        <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs shadow-md">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-start justify-end text-right">
                        <span className="text-sm font-semibold text-gray-700 w-64 leading-tight">No.118, Minimac Center, Arcot Road, Valasaravakkam, Chennai - 600 087.</span>
                        <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs ml-3 mt-1 shadow-md">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-12 py-6 flex-grow">
                    <div className="flex justify-between mb-6">
                      <div />
                      <div className="text-gray-700">Date: <span className="font-bold">{letterData.date}</span></div>
                    </div>
                    
                    <div className="mb-6">
                      <div className="font-bold text-gray-800 mb-4">To:</div>
                      <div className="inline-block min-w-[300px]">
                        <div className="grid grid-cols-[100px_1fr] gap-y-1">
                          <div className="text-gray-500 font-medium">Name</div>
                          <div className="text-gray-900 font-bold">: {letterData.employeeName}</div>

                          <div className="text-gray-500 font-medium">Employee ID</div>
                          <div className="text-gray-900 font-bold">: {letterData.employeeId}</div>
                          
                          <div className="text-gray-500 font-medium">Designation</div>
                          <div className="text-gray-900 font-bold">: {letterData.designation}</div>
                          
                          <div className="text-gray-500 font-medium">Location</div>
                          <div className="text-gray-900 font-bold">: {letterData.location}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-8 text-center">
                      <div className="font-bold text-xl underline decoration-1 underline-offset-4">PERFORMANCE APPRAISAL LETTER</div>
                    </div>

                    <div className="mb-6">
                      <div className="mb-4">Dear <span className="font-semibold">{letterData.employeeName}</span>,</div>
                      <p className="text-justify text-[14px] leading-6 mb-4">
                        The Performance Review for the financial year {letterData.financialYear} has been completed.
                      </p>
                      <p className="text-justify text-[14px] leading-6 mb-4">
                        We are pleased to inform you that based on the available benchmarks in the industry and your performance appraisal, we have revised your compensation effective {letterData.effectiveDate}.
                      </p>
                      <p className="text-justify text-[14px] leading-6 mb-4">
                        Details are provided in the attached Annexure.

                        We draw your attention to the fact that your compensation is personal to you.

                        As this information is confidential, we expect you to refrain from sharing the same with your colleagues.

                        I take this opportunity to thank you for the contribution made by you during the year of review and wish you success for the year ahead.
                      </p>
                    </div>
                    
                    <div className="mb-8 text-justify text-[14px] leading-6">
                      <p>
                        We look forward to your continued dedication and commitment to the organization.
                      </p>
                      <p className="mt-4">
                        All other terms and conditions of your employment remain unchanged.
                      </p>
                    </div>

                    <div className="mt-12 flex justify-end">
                      <div className="text-right">
                        <div className="mb-2 text-sm text-gray-700">For CALDIM ENGINEERING PRIVATE LIMITED</div>
                        <div className="mt-16">
                          <div className="font-bold">Authorized Signatory</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-24 relative mt-auto overflow-hidden">
                    <div className="absolute inset-0 z-0">
                      <svg width="100%" height="100%" viewBox="0 0 794 96" preserveAspectRatio="none">
                        <rect x="0" y="84" width="350" height="12" fill="#f37021" />
                        <path d="M350,0 L794,0 L794,96 L290,96 Z" fill="#1e2b58" />
                      </svg>
                    </div>

                    <div className="relative z-10 w-full h-full flex items-center justify-end pr-10 pt-4">
                      <div className="text-white text-right">
                        <div className="text-sm font-medium tracking-wide">Website : www.caldimengg.com</div>
                        <div className="text-sm font-medium tracking-wide mt-1">CIN U74999TN2016PTC110683</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div id="release-letter-page-2" className="bg-white relative min-h-[1120px] w-[794px] shadow-lg flex-shrink-0 flex flex-col">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                  <img 
                    src="/images/steel-logo.png" 
                    alt="" 
                    className="w-[500px] opacity-[0.05] grayscale"
                  />
                </div>
                
                <div className="relative z-10 flex flex-col h-full justify-between flex-grow">
                  <div className="w-full flex h-32 relative overflow-hidden">
                    <div className="absolute inset-0 z-0">
                      <svg width="100%" height="100%" viewBox="0 0 794 128" preserveAspectRatio="none">
                        <path d="M0,0 L400,0 L340,128 L0,128 Z" fill="#1e2b58" />
                        <path d="M400,0 L430,0 L370,128 L340,128 Z" fill="#f37021" />
                      </svg>
                    </div>

                    <div className="relative w-[60%] flex items-center pl-8 pr-12 z-10">
                      <div className="flex items-center gap-4">
                        <img src="/images/steel-logo.png" alt="CALDIM" className="h-16 w-auto brightness-0 invert" crossOrigin="anonymous" style={{ display: 'block' }} />
                        <div className="text-white">
                          <h1 className="text-3xl font-bold leading-none tracking-wide">CALDIM</h1>
                          <p className="text-[10px] tracking-[0.2em] mt-1 text-orange-400 font-semibold">ENGINEERING PRIVATE LIMITED</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-end pr-8 pt-2 z-10">
                      <div className="flex items-center mb-2">
                        <span className="font-bold text-gray-800 mr-3 text-lg">044-47860455</span>
                        <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs shadow-md">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-start justify-end text-right">
                        <span className="text-sm font-semibold text-gray-700 w-64 leading-tight">No.118, Minimac Center, Arcot Road, Valasaravakkam, Chennai - 600 087.</span>
                        <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs ml-3 mt-1 shadow-md">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-12 py-4 flex-grow">
                    <div className="mb-4 text-center">
                      <div className="font-bold text-xl underline decoration-1 underline-offset-4">ANNEXURE - SALARY REVISION DETAILS</div>
                    </div>

                    <div className="mb-4">
                      <p className="text-[14px] leading-6 mb-4">
                        Name: <span className="font-semibold">{letterData.employeeName}</span><br/>
                        Employee ID: <span className="font-semibold">{letterData.employeeId}</span>
                      </p>
                      <p className="text-[14px] leading-6 mb-4">
                        Revised compensation details with effect from <span className="font-semibold">{letterData.effectiveDate}</span>:
                      </p>
                    </div>

                    <div className="mb-4">
                      <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                          <tr className="bg-[#1e2b58] text-white">
                            <th className="border border-gray-300 px-4 py-2 text-left w-1/3">Salary Component</th>
                            <th className="border border-gray-300 px-4 py-2 text-right w-1/3">Current (Monthly)</th>
                            <th className="border border-gray-300 px-4 py-2 text-right w-1/3">Revised (Monthly)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: 'Basic Salary', key: 'basic' },
                            { label: 'HRA', key: 'hra' },
                            { label: 'Special Allowance', key: 'special' },
                            { label: 'Gross Salary', key: 'gross', isBold: true },
                            { label: 'Employee PF', key: 'empPF' },
                            { label: 'Employer PF', key: 'employerPF' },
                            { label: 'Net Salary', key: 'net', isBold: true },
                            { label: 'Gratuity', key: 'gratuity' },
                            { label: 'CTC', key: 'ctc', isBold: true, isTotal: true }
                          ].map((row, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className={`border border-gray-300 px-4 py-2 ${row.isBold ? 'font-bold' : ''}`}>{row.label}</td>
                              <td className={`border border-gray-300 px-4 py-2 text-right ${row.isBold ? 'font-bold' : ''}`}>
                                {letterData.salary.old[row.key]?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                              </td>
                              <td className={`border border-gray-300 px-4 py-2 text-right ${row.isBold ? 'font-bold' : ''}`}>
                                {letterData.salary.new[row.key]?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 text-[13px] text-gray-800 leading-relaxed">
                      <div className="mb-4">
                        <p className="font-bold underline mb-1">Notes:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>CTC includes employer contributions wherever applicable.</li>
                          <li>All statutory deductions will be as per prevailing laws.</li>
                          <li>Any variable components are subject to performance and company policy.</li>
                        </ul>
                      </div>

                      <div className="mt-6">
                        <p className="mb-4">
                          This is a system-generated annexure and does not require a physical signature.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-24 relative mt-auto overflow-hidden">
                    <div className="absolute inset-0 z-0">
                      <svg width="100%" height="100%" viewBox="0 0 794 96" preserveAspectRatio="none">
                        <rect x="0" y="84" width="350" height="12" fill="#f37021" />
                        <path d="M350,0 L794,0 L794,96 L290,96 Z" fill="#1e2b58" />
                      </svg>
                    </div>

                    <div className="relative z-10 w-full h-full flex items-center justify-end pr-10 pt-4">
                      <div className="text-white text-right">
                        <div className="text-sm font-medium tracking-wide">Website : www.caldimengg.com</div>
                        <div className="text-sm font-medium tracking-wide mt-1">CIN U74999TN2016PTC110683</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DirectorApproval;
