import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, X, Search, Check } from 'lucide-react';
import { performanceAPI, employeeAPI } from '../../services/api';

const IncrementMaster = () => {
  // Initial data structure mirroring the image
  const [matrixData, setMatrixData] = useState([
    {
      id: 1,
      
      ratings: [
        { grade: 'ES', belowTarget: '5%', metTarget: '8%', target1_1: '', target1_25: '10%', target1_5: '12%' },
        { grade: 'ME', belowTarget: '3%', metTarget: '4%', target1_1: '', target1_25: '6%', target1_5: '8%' },
        { grade: 'BE', belowTarget: '2%', metTarget: '2%', target1_1: '', target1_25: '3%', target1_5: '5%' }
      ]
    },
    {
      id: 2,
      
      ratings: [
        { grade: 'ES', belowTarget: '8%', metTarget: '10%', target1_1: '', target1_25: '13%', target1_5: '15%' },
        { grade: 'ME', belowTarget: '3%', metTarget: '5%', target1_1: '', target1_25: '8%', target1_5: '10%' },
        { grade: 'BE', belowTarget: '2%', metTarget: '3%', target1_1: '', target1_25: '5%', target1_5: '7%' }
      ]
    },
    {
      id: 3,
     
      ratings: [
        { grade: 'ES', belowTarget: '10%', metTarget: '12%', target1_1: '', target1_25: '15%', target1_5: '20%' },
        { grade: 'ME', belowTarget: '5%', metTarget: '8%', target1_1: '', target1_25: '10%', target1_5: '15%' },
        { grade: 'BE', belowTarget: '3%', metTarget: '5%', target1_1: '', target1_25: '8%', target1_5: '10%' }
      ]
    },
    {
      id: 4,
     
      ratings: [
        { grade: 'ES', belowTarget: '10%', metTarget: '15%', target1_1: '', target1_25: '20%', target1_5: '25%' },
        { grade: 'ME', belowTarget: '5%', metTarget: '10%', target1_1: '', target1_25: '15%', target1_5: '18%' },
        { grade: 'BE', belowTarget: '3%', metTarget: '5%', target1_1: '', target1_25: '8%', target1_5: '12%' }
      ]
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Designation Modal State
  const [designations, setDesignations] = useState([]);
  const [showDesignationModal, setShowDesignationModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [tempSelectedDesignations, setTempSelectedDesignations] = useState([]);
  const [disabledDesignations, setDisabledDesignations] = useState([]);
  const [enabledColumns, setEnabledColumns] = useState({
    belowTarget: false,
    metTarget: true,
    target1_1: false,
    target1_25: false,
    target1_5: false
  });
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    columnKey: null,
    columnName: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMatrix();
    fetchDesignations();
  }, []);

  const fetchDesignations = async () => {
    try {
      const response = await employeeAPI.getAllEmployees();
      if (response.data) {
        // Extract unique designations from employees
        const uniqueDesignations = [...new Set(
          response.data
            .map(emp => emp.designation || emp.role || emp.position)
            .filter(Boolean)
        )].sort();
        setDesignations(uniqueDesignations);
      }
    } catch (error) {
      console.error('Error fetching designations:', error);
      // Fallback/Mock data if API fails or no designations found
      setDesignations([
        'Senior Project Manager', 'Project Manager', 'Assistant Project Manager', 
        'Team Lead', 'Senior Detailer', 'Checker', 'Modeler', 
        'Junior Detailer', 'Trainee'
      ]);
    }
  };

  const fetchMatrix = async () => {
    try {
      setLoading(true);
      const response = await performanceAPI.getIncrementMatrix();
      if (response.data && response.data.length > 0) {
        setMatrixData(response.data);
      }
    } catch (error) {
      console.error('Error fetching increment matrix:', error);
      // Fallback to default/initial state if error or empty
    } finally {
      setLoading(false);
    }
  };

  const toggleColumn = (columnKey) => {
    const columnNames = {
      belowTarget: 'Below Target',
      metTarget: 'Met Target',
      target1_1: '1.1 X Target',
      target1_25: '1.25 X Target',
      target1_5: '1.5 X Target'
    };

    // If we are enabling a column (it's currently false)
    if (!enabledColumns[columnKey]) {
      // Show custom confirmation modal
      setConfirmationModal({
        isOpen: true,
        columnKey,
        columnName: columnNames[columnKey]
      });
    } else {
      // If disabling the currently enabled column
      setEnabledColumns(prev => ({
        ...prev,
        [columnKey]: false
      }));
    }
  };

  const confirmEnableColumn = () => {
    const { columnKey } = confirmationModal;
    if (columnKey) {
      setEnabledColumns({
        belowTarget: false,
        metTarget: false,
        target1_1: false,
        target1_25: false,
        target1_5: false,
        [columnKey]: true
      });
    }
    setConfirmationModal({ isOpen: false, columnKey: null, columnName: '' });
  };

  const handleInputChange = (categoryId, gradeIndex, field, value) => {
    setMatrixData(prevData => prevData.map(category => {
      if (category.id === categoryId) {
        const newRatings = [...category.ratings];
        newRatings[gradeIndex] = { ...newRatings[gradeIndex], [field]: value };
        return { ...category, ratings: newRatings };
      }
      return category;
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await performanceAPI.saveIncrementMatrix({ matrixData });
      alert("Increment Matrix Saved Successfully!");
    } catch (error) {
      console.error('Error saving increment matrix:', error);
      alert("Failed to save increment matrix");
    } finally {
      setSaving(false);
    }
  };

  // Designation Modal Handlers
  const openDesignationModal = (category) => {
    setEditingCategoryId(category.id);
    // Split existing category string into array, trim whitespace
    const currentDesignations = category.category
      ? category.category.split(',').map(d => d.trim()).filter(Boolean)
      : [];
    setTempSelectedDesignations(currentDesignations);
    
    // Calculate designations used in OTHER categories
    const otherUsed = new Set();
    matrixData.forEach(cat => {
      if (cat.id !== category.id && cat.category) {
        const catDesignations = cat.category.split(',').map(d => d.trim()).filter(Boolean);
        catDesignations.forEach(d => otherUsed.add(d));
      }
    });
    setDisabledDesignations(Array.from(otherUsed));
    
    setSearchTerm('');
    setShowDesignationModal(true);
  };

  const handleDesignationToggle = (designation) => {
    if (disabledDesignations.includes(designation)) return;

    setTempSelectedDesignations(prev => {
      if (prev.includes(designation)) {
        return prev.filter(d => d !== designation);
      } else {
        return [...prev, designation];
      }
    });
  };

  const saveDesignations = async () => {
    if (editingCategoryId !== null) {
      const newCategoryString = tempSelectedDesignations.join(', ');
      
      // Update local state immediately for UI responsiveness
      const updatedMatrixData = matrixData.map(cat => 
        cat.id === editingCategoryId 
          ? { ...cat, category: newCategoryString } 
          : cat
      );
      
      setMatrixData(updatedMatrixData);
      setShowDesignationModal(false);
      setEditingCategoryId(null);

      // Silent auto-save to backend
      try {
        setSaving(true);
        await performanceAPI.saveIncrementMatrix({ matrixData: updatedMatrixData });
      } catch (error) {
        console.error('Error auto-saving designations:', error);
        // We don't alert here to avoid interrupting the flow, but the error is logged
        // and the user can try manual save if needed.
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#262760]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 p-8 font-sans">
      <div className="w-full mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Increment Master</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#262760] hover:bg-[#1e2050] focus:outline-none disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </button>
        </div>

        <div className="bg-white shadow overflow-hidden border border-gray-200 sm:rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border-collapse border border-gray-300">
            <thead className="bg-white">
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100" style={{width: '20%'}}>Category</th>
                <th className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100" style={{width: '10%'}}>Ratings</th>
                <th colSpan="5" className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100">Annual Increment %</th>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-white"></th>
                <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900">Company Performance</th>
                <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#fff2cc]">
                  <div className="flex flex-col items-center gap-1">
                    Below Target
                    <button
                      onClick={() => toggleColumn('belowTarget')}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${enabledColumns.belowTarget ? 'bg-[#262760]' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enabledColumns.belowTarget ? 'translate-x-4.5' : 'translate-x-1'}`} style={{transform: enabledColumns.belowTarget ? 'translateX(1.1rem)' : 'translateX(0.15rem)'}} />
                    </button>
                  </div>
                </th>
                <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#deebf7]">
                  <div className="flex flex-col items-center gap-1">
                    Met Target
                    <button
                      onClick={() => toggleColumn('metTarget')}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${enabledColumns.metTarget ? 'bg-[#262760]' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`} style={{transform: enabledColumns.metTarget ? 'translateX(1.1rem)' : 'translateX(0.15rem)'}} />
                    </button>
                  </div>
                </th>
                <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#deebf7]">
                  <div className="flex flex-col items-center gap-1">
                    1.1 X Target
                    <button
                      onClick={() => toggleColumn('target1_1')}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${enabledColumns.target1_1 ? 'bg-[#262760]' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`} style={{transform: enabledColumns.target1_1 ? 'translateX(1.1rem)' : 'translateX(0.15rem)'}} />
                    </button>
                  </div>
                </th>
                <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#fce4d6]">
                  <div className="flex flex-col items-center gap-1">
                    1.25 X Target
                    <button
                      onClick={() => toggleColumn('target1_25')}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${enabledColumns.target1_25 ? 'bg-[#262760]' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`} style={{transform: enabledColumns.target1_25 ? 'translateX(1.1rem)' : 'translateX(0.15rem)'}} />
                    </button>
                  </div>
                </th>
                <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#e2efda]">
                  <div className="flex flex-col items-center gap-1">
                    1.5 X Target
                    <button
                      onClick={() => toggleColumn('target1_5')}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${enabledColumns.target1_5 ? 'bg-[#262760]' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`} style={{transform: enabledColumns.target1_5 ? 'translateX(1.1rem)' : 'translateX(0.15rem)'}} />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {matrixData.map((category) => (
                <React.Fragment key={category.id}>
                  {category.ratings.map((rating, index) => (
                    <tr key={`${category.id}-${rating.grade}`}>
                      {index === 0 && (
                        <td 
                          rowSpan={category.ratings.length} 
                          className="border border-gray-300 px-4 py-2 text-sm text-gray-900 font-medium align-middle bg-white relative"
                        >
                          <button
                              onClick={() => openDesignationModal(category)}
                              className="absolute top-1 left-1 p-1 rounded hover:bg-gray-100 text-blue-600 transition-colors z-10"
                              title="Add/Edit Designations"
                          >
                            <Plus size={16} />
                          </button>
                          <div className="mt-6">
                            {category.category ? category.category.split(',').map((d, i) => (
                              <div key={i} className="py-0.5 leading-snug">{d.trim()}</div>
                            )) : <span className="text-gray-400 italic text-xs">No designations</span>}
                          </div>
                        </td>
                      )}
                      <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-900 font-bold">
                        {rating.grade}
                      </td>
                      <td className={`border border-gray-300 px-2 py-1 ${enabledColumns.belowTarget ? 'bg-[#fff2cc]' : 'bg-gray-100'}`}>
                        <input
                          type="text"
                          value={rating.belowTarget}
                          onChange={(e) => handleInputChange(category.id, index, 'belowTarget', e.target.value)}
                          className={`w-full text-center border-none bg-transparent focus:ring-0 text-sm p-1 ${!enabledColumns.belowTarget ? 'cursor-not-allowed text-gray-400' : ''}`}
                          disabled={!enabledColumns.belowTarget}
                        />
                      </td>
                      <td className={`border border-gray-300 px-2 py-1 ${enabledColumns.metTarget ? 'bg-[#deebf7]' : 'bg-gray-100'}`}>
                         <input
                          type="text"
                          value={rating.metTarget}
                          onChange={(e) => handleInputChange(category.id, index, 'metTarget', e.target.value)}
                          className={`w-full text-center border-none bg-transparent focus:ring-0 text-sm p-1 ${!enabledColumns.metTarget ? 'cursor-not-allowed text-gray-400' : ''}`}
                          disabled={!enabledColumns.metTarget}
                        />
                      </td>
                      <td className={`border border-gray-300 px-2 py-1 ${enabledColumns.target1_1 ? 'bg-[#deebf7]' : 'bg-gray-100'}`}>
                         <input
                          type="text"
                          value={rating.target1_1}
                          onChange={(e) => handleInputChange(category.id, index, 'target1_1', e.target.value)}
                          className={`w-full text-center border-none bg-transparent focus:ring-0 text-sm p-1 ${!enabledColumns.target1_1 ? 'cursor-not-allowed text-gray-400' : ''}`}
                          disabled={!enabledColumns.target1_1}
                        />
                      </td>
                      <td className={`border border-gray-300 px-2 py-1 ${enabledColumns.target1_25 ? 'bg-[#fce4d6]' : 'bg-gray-100'}`}>
                         <input
                          type="text"
                          value={rating.target1_25}
                          onChange={(e) => handleInputChange(category.id, index, 'target1_25', e.target.value)}
                          className={`w-full text-center border-none bg-transparent focus:ring-0 text-sm p-1 ${!enabledColumns.target1_25 ? 'cursor-not-allowed text-gray-400' : ''}`}
                          disabled={!enabledColumns.target1_25}
                        />
                      </td>
                      <td className={`border border-gray-300 px-2 py-1 ${enabledColumns.target1_5 ? 'bg-[#e2efda]' : 'bg-gray-100'}`}>
                         <input
                          type="text"
                          value={rating.target1_5}
                          onChange={(e) => handleInputChange(category.id, index, 'target1_5', e.target.value)}
                          className={`w-full text-center border-none bg-transparent focus:ring-0 text-sm p-1 ${!enabledColumns.target1_5 ? 'cursor-not-allowed text-gray-400' : ''}`}
                          disabled={!enabledColumns.target1_5}
                        />
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmationModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmation</h3>
            <p className="text-gray-600 mb-6">
              You'll enable <span className="font-semibold text-[#262760]">{confirmationModal.columnName}</span> column.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmationModal({ isOpen: false, columnKey: null, columnName: '' })}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmEnableColumn}
                className="px-4 py-2 bg-[#262760] text-white rounded-lg text-sm font-medium hover:bg-[#1e2050] transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Designation Selection Modal */}
      {showDesignationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col border border-gray-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Select Designations</h3>
              <button 
                onClick={() => setShowDesignationModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search designations..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-transparent bg-white shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              <div className="space-y-1">
                {designations
                  .filter(d => d.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(designation => {
                    const isDisabled = disabledDesignations.includes(designation);
                    return (
                    <label 
                      key={designation} 
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                        isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer'
                      } ${
                        !isDisabled && tempSelectedDesignations.includes(designation) 
                          ? 'bg-blue-50 border border-blue-100' 
                          : !isDisabled ? 'hover:bg-gray-50 border border-transparent' : 'border border-transparent'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center ${
                        tempSelectedDesignations.includes(designation)
                          ? 'bg-[#262760] border-[#262760]'
                          : 'border-gray-300 bg-white'
                      }`}>
                        {tempSelectedDesignations.includes(designation) && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={tempSelectedDesignations.includes(designation)}
                        onChange={() => !isDisabled && handleDesignationToggle(designation)}
                        className="hidden" 
                        disabled={isDisabled}
                      />
                      <div className="flex-1 flex justify-between items-center">
                        <span className={`text-sm font-medium ${
                          tempSelectedDesignations.includes(designation) ? 'text-[#262760]' : 'text-gray-700'
                        }`}>
                          {designation}
                        </span>
                        {isDisabled && (
                          <span className="text-xs text-red-500 italic">Already assigned</span>
                        )}
                      </div>
                    </label>
                  );
                })}
                  {designations.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No designations found.</p>
                    </div>
                  )}
                  {designations.length > 0 && designations.filter(d => d.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                    <div className="text-center py-8">
                       <p className="text-gray-500">No matching designations found.</p>
                    </div>
                  )}
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3 rounded-b-xl">
              <button
                onClick={() => setShowDesignationModal(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-white hover:shadow-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveDesignations}
                className="px-5 py-2.5 bg-[#262760] text-white rounded-lg text-sm font-medium hover:bg-[#1e2050] shadow-sm hover:shadow transition-all"
              >
                Save Changes ({tempSelectedDesignations.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncrementMaster;
