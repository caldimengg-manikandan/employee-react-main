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
  Filter,
  User,
  Star
} from 'lucide-react';
import { performanceAPI } from '../../services/api';

const getCurrentFinancialYear = () => {
  const today = new Date();
  const yearStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const yearEnd = String(yearStart + 1).slice(2);
  return `${yearStart}-${yearEnd}`;
};

const ReviewerApproval = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFinancialYr, setSelectedFinancialYr] = useState(getCurrentFinancialYear());
  const [selectedRows, setSelectedRows] = useState([]);
  
  // Inline Editing State
  const [editingRowId, setEditingRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

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

  const fetchReviewerAppraisals = async () => {
    setLoading(true);
    try {
      const response = await performanceAPI.getReviewerAppraisals();
      setEmployees(response.data);
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
      const { 
        reviewerComments, 
        incrementPercentage, 
        incrementCorrectionPercentage, 
        incrementAmount, 
        revisedSalary 
      } = editFormData;

      await performanceAPI.updateReviewerAppraisal(editingRowId, {
        reviewerComments,
        incrementPercentage,
        incrementCorrectionPercentage,
        incrementAmount,
        revisedSalary
      });

      setEmployees(employees.map(emp => 
        emp.id === editingRowId ? editFormData : emp
      ));
      setEditingRowId(null);
      setEditFormData({});
      alert("Row saved successfully!");
    } catch (error) {
      console.error('Error saving row:', error);
      alert("Failed to save row");
    }
  };

  const handleDelete = (id) => {
    // Should probably not allow delete here, or implement API
    if(window.confirm("Are you sure you want to delete this record?")) {
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
    } catch (error) {
      console.error('Error saving comment:', error);
      alert('Failed to save comment');
    }
  };

  const handleSubmitToDirector = async () => {
    // Only consider pending records
    const candidates = selectedRows.length > 0 
      ? employees.filter(emp => selectedRows.includes(emp.id))
      : employees;
      
    const rowsToSubmit = candidates.filter(emp => emp.status === 'APPRAISER_COMPLETED');
      
    const count = rowsToSubmit.length;
    if (count === 0) {
      alert("No pending records to submit.");
      return;
    }

    if(window.confirm(`Submit ${count} record(s) to Director?`)) {
      try {
        const ids = rowsToSubmit.map(e => e.id);
        await performanceAPI.submitToDirector(ids);
        
        alert(`${count} record(s) submitted to Director successfully!`);
        
        // Refresh data or update local status
        fetchReviewerAppraisals();
        setSelectedRows([]);
      } catch (error) {
        console.error('Error submitting to Director:', error);
        alert('Failed to submit to Director');
      }
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
      case 'APPRAISER_COMPLETED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending Review</span>;
      case 'REVIEWER_COMPLETED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Submitted</span>;
      case 'DIRECTOR_APPROVED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Approved</span>;
      case 'RELEASED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Released</span>;
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
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((emp, index) => {
                  const isEditing = editingRowId === emp.id;
                  const data = isEditing ? editFormData : emp;
                  const isSelected = selectedRows.includes(emp.id);
                  const isEditable = emp.status === 'APPRAISER_COMPLETED';

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
                        {data.currentSalary.toLocaleString()}
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
                                title="View Details" 
                                onClick={() => setViewModalData(emp)}
                              >
                                <Eye className="h-5 w-5" />
                              </button>
                              {isEditable && (
                                <button onClick={() => handleEditClick(emp)} className="text-blue-600 hover:text-blue-900" title="Edit">
                                  <Edit className="h-5 w-5" />
                                </button>
                              )}
                              {isEditable && (
                                <button onClick={() => handleDelete(emp.id)} className="text-red-600 hover:text-red-900" title="Delete">
                                  <Trash2 className="h-5 w-5" />
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
                  <p className="text-sm text-gray-500">{viewModalData.designation} • {viewModalData.department}</p>
                  <p className="text-xs text-gray-400 font-mono mt-1">{viewModalData.empId}</p>
                </div>
              </div>

              {/* Appraisal Content */}
              <div className="grid grid-cols-1 gap-6">
                {/* Self Appraisal */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="text-sm font-bold text-[#262760] uppercase tracking-wide mb-2 flex items-center">
                    <User className="h-4 w-4 mr-2" /> Self Appraisal
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">Self Appraisee Comments</p>
                      <p className="text-sm text-gray-800 mt-1 italic">"{viewModalData.selfAppraiseeComments}"</p>
                    </div>
                  </div>
                </div>

                {/* Manager Review */}
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                  <h4 className="text-sm font-bold text-[#262760] uppercase tracking-wide mb-2 flex items-center">
                    <Star className="h-4 w-4 mr-2" /> Manager Review
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">Manager Comments</p>
                      <p className="text-sm text-gray-800 mt-1 italic">"{viewModalData.managerComments}"</p>
                    </div>
                  </div>
                </div>
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
