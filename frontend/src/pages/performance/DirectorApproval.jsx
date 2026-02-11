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
  Send
} from 'lucide-react';
import { performanceAPI } from '../../services/api';

const DirectorApproval = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFinancialYr, setSelectedFinancialYr] = useState('2025-26');
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
    fetchDirectorAppraisals();
  }, []);

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
      alert("Row saved successfully!");
    } catch (error) {
      console.error('Error saving row:', error);
      alert('Failed to save changes');
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
    } catch (error) {
      console.error('Error saving comment:', error);
      alert('Failed to save comment');
    }
  };

  const handleApproveRelease = async (emp) => {
    if(window.confirm(`Are you sure you want to approve and release the letter for ${emp.name}?`)) {
      try {
        await performanceAPI.updateDirectorAppraisal(emp.id, { status: 'Released' });
        setEmployees(employees.map(e => 
          e.id === emp.id ? { ...e, status: 'Released' } : e
        ));
        alert(`Appraisal letter released for ${emp.name}!`);
      } catch (error) {
        console.error('Error releasing letter:', error);
        alert('Failed to release letter');
      }
    }
  };

  const handleBulkApprove = async () => {
    const rowsToSubmit = selectedRows.length > 0 
      ? employees.filter(emp => selectedRows.includes(emp.id))
      : employees;
      
    const count = rowsToSubmit.length;
    if (count === 0) {
      alert("No records to approve.");
      return;
    }

    if(window.confirm(`Approve and Release Letters for ${count} employee(s)?`)) {
      try {
        await Promise.all(rowsToSubmit.map(emp => 
           performanceAPI.updateDirectorAppraisal(emp.id, { status: 'Released' })
        ));
        
        setEmployees(employees.map(emp => 
          (selectedRows.length === 0 || selectedRows.includes(emp.id)) 
            ? { ...emp, status: 'Released' } 
            : emp
        ));
        alert(`${count} letters released successfully!`);
        setSelectedRows([]);
      } catch (error) {
        console.error('Error releasing letters:', error);
        alert('Failed to release letters');
      }
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
                              <button onClick={() => handleEditClick(emp)} className="text-blue-600 hover:text-blue-900" title="Edit">
                                <Edit className="h-5 w-5" />
                              </button>
                              {emp.status !== 'Released' ? (
                                <button onClick={() => handleApproveRelease(emp)} className="text-green-600 hover:text-green-900" title="Approve & Release">
                                  <CheckCircle className="h-5 w-5" />
                                </button>
                              ) : (
                                <span className="text-green-600" title="Released">
                                  <CheckCircle className="h-5 w-5 fill-green-100" />
                                </span>
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

    </div>
  );
};

export default DirectorApproval;
