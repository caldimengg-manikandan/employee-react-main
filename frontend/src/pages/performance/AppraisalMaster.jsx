import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, X, Search, Check, Edit } from 'lucide-react';
import { performanceAPI, employeeAPI } from '../../services/api';

const AppraisalMaster = () => {
  // Main Data (Source of Truth)
  const [matrixData, setMatrixData] = useState([]);
  
  const [enabledColumns, setEnabledColumns] = useState({
    belowTarget: false,
    metTarget: true,
    target1_1: false,
    target1_25: false,
    target1_5: false
  });

  const [financialYear, setFinancialYear] = useState('2025-2026');
  const [editFinancialYear, setEditFinancialYear] = useState('2025-2026');
  const financialYears = ['2025-2026', '2026-2027'];

  // Edit Mode State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editMatrixData, setEditMatrixData] = useState([]);
  const [editEnabledColumns, setEditEnabledColumns] = useState({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Designation Modal State
  const [designations, setDesignations] = useState([]);
  const [showDesignationModal, setShowDesignationModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [tempSelectedDesignations, setTempSelectedDesignations] = useState([]);
  const [disabledDesignations, setDisabledDesignations] = useState([]);
  
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    columnKey: null,
    columnName: ''
  });
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    message: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMatrix();
  }, [financialYear]);

  useEffect(() => {
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
      const response = await performanceAPI.getIncrementMatrix({ financialYear });
      
      if (response.data) {
        // Handle new response format { matrix, enabledColumns }
        if (response.data.matrix && response.data.matrix.length > 0) {
          setMatrixData(response.data.matrix);
        } else if (Array.isArray(response.data) && response.data.length > 0) {
          // Fallback for old format
          setMatrixData(response.data);
        } else {
          // If no data found for this year, backend should have seeded it
          setMatrixData([]);
        }
        
        // Set enabled columns if present in response
        if (response.data.enabledColumns) {
          setEnabledColumns(response.data.enabledColumns);
        } else {
           // Default enabled columns if not found
           setEnabledColumns({
            belowTarget: false,
            metTarget: true,
            target1_1: false,
            target1_25: false,
            target1_5: false
          });
        }
      }
    } catch (error) {
      console.error('Error fetching increment matrix:', error);
      // Fallback to default/initial state if error or empty
      setMatrixData([]);
    } finally {
      setLoading(false);
    }
  };

  // Edit Mode Handlers
  const handleEditOpen = () => {
    setEditMatrixData(JSON.parse(JSON.stringify(matrixData)));
    setEditEnabledColumns({ ...enabledColumns });
    setEditFinancialYear(financialYear);
    setIsEditMode(true);
  };

  const handleEditClose = () => {
    setIsEditMode(false);
    setEditMatrixData([]);
    setEditEnabledColumns({});
  };

  const handleEditSave = async () => {
    try {
      setSaving(true);
      await performanceAPI.saveIncrementMatrix({ 
        matrixData: editMatrixData,
        enabledColumns: editEnabledColumns,
        financialYear: editFinancialYear 
      });
      
      setSuccessModal({ isOpen: true, message: "Increment Matrix Saved Successfully!" });
      setIsEditMode(false);

      if (financialYear !== editFinancialYear) {
        setFinancialYear(editFinancialYear);
      } else {
        setMatrixData(editMatrixData);
        setEnabledColumns(editEnabledColumns);
      }
    } catch (error) {
      console.error('Error saving increment matrix:', error);
      alert("Failed to save increment matrix");
    } finally {
      setSaving(false);
    }
  };

  const toggleEditColumn = (columnKey) => {
    const columnNames = {
      belowTarget: 'Below Target',
      metTarget: 'Met Target',
      target1_1: '1.1 X Target',
      target1_25: '1.25 X Target',
      target1_5: '1.5 X Target'
    };

    // If we are enabling a column (it's currently false)
    if (!editEnabledColumns[columnKey]) {
      // Show custom confirmation modal
      setConfirmationModal({
        isOpen: true,
        columnKey,
        columnName: columnNames[columnKey]
      });
    } else {
      // If disabling the currently enabled column
      setEditEnabledColumns(prev => ({
        ...prev,
        [columnKey]: false
      }));
    }
  };

  const confirmEnableEditColumn = () => {
    const { columnKey } = confirmationModal;
    if (columnKey) {
      setEditEnabledColumns({
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

  const handleEditInputChange = (categoryId, gradeIndex, field, value) => {
    setEditMatrixData(prevData => prevData.map(category => {
      if (category.id === categoryId) {
        const newRatings = [...category.ratings];
        newRatings[gradeIndex] = { ...newRatings[gradeIndex], [field]: value };
        return { ...category, ratings: newRatings };
      }
      return category;
    }));
  };

  // Designation Modal Handlers (Operating on editMatrixData)
  const openDesignationModal = (category) => {
    setEditingCategoryId(category.id);
    // Split existing category string into array, trim whitespace
    const currentDesignations = category.category
      ? category.category.split(',').map(d => d.trim()).filter(Boolean)
      : [];
    setTempSelectedDesignations(currentDesignations);
    
    // Calculate designations used in OTHER categories (using editMatrixData)
    const otherUsed = new Set();
    editMatrixData.forEach(cat => {
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

  const saveDesignations = () => {
    if (editingCategoryId !== null) {
      const newCategoryString = tempSelectedDesignations.join(', ');
      
      // Update local state immediately for UI responsiveness
      const updatedMatrixData = editMatrixData.map(cat => 
        cat.id === editingCategoryId 
          ? { ...cat, category: newCategoryString } 
          : cat
      );
      
      setEditMatrixData(updatedMatrixData);
      setShowDesignationModal(false);
      setEditingCategoryId(null);
      // Removed auto-save to API
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#262760]" />
      </div>
    );
  }

  const getGradeDisplay = (grade) => {
    // If grade is already in full format "Exceeds Expectations (ES)", return it.
    // If it's short format "ES", map it to full format.
    const gradeMap = {
      'ES': 'Exceeds Expectations (ES)',
      'ME': 'Meets Expectations (ME)',
      'BE': 'Below Expectations (BE)'
    };

    if (gradeMap[grade]) {
      return gradeMap[grade];
    }
    
    // If it's already full format or unknown, return as is
    return grade;
  };

  const renderViewTable = () => (
    <div className="bg-white shadow overflow-hidden border border-gray-200 sm:rounded-lg overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 border-collapse border border-gray-300">
        <thead className="bg-white">
          <tr>
            <th className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100" style={{width: '20%'}}>Category</th>
            <th className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100" style={{width: '20%'}}>Ratings</th>
            <th colSpan={Object.values(enabledColumns).filter(Boolean).length} className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100" sstyle={{width: '20%'}}>Annual Increment %</th>
          </tr>
          <tr>
            <th className="border border-gray-300 bg-white"></th>
            <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900">Company Performance</th>
            {enabledColumns.belowTarget && <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#fff2cc]">Below Target</th>}
            {enabledColumns.metTarget && <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#deebf7]">Met Target</th>}
            {enabledColumns.target1_1 && <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#deebf7]">1.1 X Target</th>}
            {enabledColumns.target1_25 && <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#fce4d6]">1.25 X Target</th>}
            {enabledColumns.target1_5 && <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#e2efda]">1.5 X Target</th>}
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
                      className="border border-gray-300 px-4 py-2 text-sm text-gray-900 font-medium align-middle bg-white"
                    >
                      <div className="">
                        {category.category ? category.category.split(',').map((d, i) => (
                          <div key={i} className="py-0.5 leading-snug">{d.trim()}</div>
                        )) : <span className="text-gray-400 italic text-xs">No designations</span>}
                      </div>
                    </td>
                  )}
                  <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-900 font-bold">
                    {getGradeDisplay(rating.grade)}
                  </td>
                  {enabledColumns.belowTarget && (
                    <td className="border border-gray-300 px-2 py-1 bg-[#fff2cc] text-center text-sm">
                      {rating.belowTarget}
                    </td>
                  )}
                  {enabledColumns.metTarget && (
                    <td className="border border-gray-300 px-2 py-1 bg-[#deebf7] text-center text-sm">
                      {rating.metTarget}
                    </td>
                  )}
                  {enabledColumns.target1_1 && (
                    <td className="border border-gray-300 px-2 py-1 bg-[#deebf7] text-center text-sm">
                      {rating.target1_1}
                    </td>
                  )}
                  {enabledColumns.target1_25 && (
                    <td className="border border-gray-300 px-2 py-1 bg-[#fce4d6] text-center text-sm">
                      {rating.target1_25}
                    </td>
                  )}
                  {enabledColumns.target1_5 && (
                    <td className="border border-gray-300 px-2 py-1 bg-[#e2efda] text-center text-sm">
                      {rating.target1_5}
                    </td>
                  )}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20 p-8 font-sans">
      <div className="w-full mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appraisal Master</h1>
            <div className="flex items-center mt-2">
              <label htmlFor="main-financial-year-select" className="text-sm text-gray-500 mr-2">Financial Year:</label>
              <select
                id="main-financial-year-select"
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="text-sm border-gray-300 rounded-md shadow-sm focus:border-[#262760] focus:ring-[#262760] py-1 pl-2 pr-8"
              >
                {financialYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleEditOpen}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#262760] hover:bg-[#1e2050] focus:outline-none"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </button>
        </div>

        {renderViewTable()}
    </div>

      {/* Edit Matrix Modal */}
      {isEditMode && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[95%] max-w-7xl max-h-[90vh] flex flex-col border border-gray-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Edit Increment Matrix</h3>
                <div className="flex items-center mt-2">
                  <label htmlFor="financial-year-select" className="text-sm text-gray-500 mr-2">Financial Year:</label>
                  <select
                    id="financial-year-select"
                    value={editFinancialYear}
                    onChange={(e) => setEditFinancialYear(e.target.value)}
                    className="text-sm border-gray-300 rounded-md shadow-sm focus:border-[#262760] focus:ring-[#262760] py-1 pl-2 pr-8"
                  >
                    {financialYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button 
                onClick={handleEditClose}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="bg-white shadow overflow-hidden border border-gray-200 sm:rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border-collapse border border-gray-300">
                  <thead className="bg-white">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100" style={{width: '20%'}}>Category</th>
                      <th className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100" style={{width: '20%'}}>Ratings</th>
                      <th colSpan="5" className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100">Annual Increment %</th>
                    </tr>
                    <tr>
                      <th className="border border-gray-300 bg-white"></th>
                      <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900">Company Performance</th>
                      <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#fff2cc]">
                        <div className="flex flex-col items-center gap-1">
                          Below Target
                          <button
                            onClick={() => toggleEditColumn('belowTarget')}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${editEnabledColumns.belowTarget ? 'bg-[#262760]' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${editEnabledColumns.belowTarget ? 'translate-x-4.5' : 'translate-x-1'}`} style={{transform: editEnabledColumns.belowTarget ? 'translateX(1.1rem)' : 'translateX(0.15rem)'}} />
                          </button>
                        </div>
                      </th>
                      <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#deebf7]">
                        <div className="flex flex-col items-center gap-1">
                          Met Target
                          <button
                            onClick={() => toggleEditColumn('metTarget')}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${editEnabledColumns.metTarget ? 'bg-[#262760]' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`} style={{transform: editEnabledColumns.metTarget ? 'translateX(1.1rem)' : 'translateX(0.15rem)'}} />
                          </button>
                        </div>
                      </th>
                      <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#deebf7]">
                        <div className="flex flex-col items-center gap-1">
                          1.1 X Target
                          <button
                            onClick={() => toggleEditColumn('target1_1')}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${editEnabledColumns.target1_1 ? 'bg-[#262760]' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`} style={{transform: editEnabledColumns.target1_1 ? 'translateX(1.1rem)' : 'translateX(0.15rem)'}} />
                          </button>
                        </div>
                      </th>
                      <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#fce4d6]">
                        <div className="flex flex-col items-center gap-1">
                          1.25 X Target
                          <button
                            onClick={() => toggleEditColumn('target1_25')}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${editEnabledColumns.target1_25 ? 'bg-[#262760]' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`} style={{transform: editEnabledColumns.target1_25 ? 'translateX(1.1rem)' : 'translateX(0.15rem)'}} />
                          </button>
                        </div>
                      </th>
                      <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#e2efda]">
                        <div className="flex flex-col items-center gap-1">
                          1.5 X Target
                          <button
                            onClick={() => toggleEditColumn('target1_5')}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${editEnabledColumns.target1_5 ? 'bg-[#262760]' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`} style={{transform: editEnabledColumns.target1_5 ? 'translateX(1.1rem)' : 'translateX(0.15rem)'}} />
                          </button>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {editMatrixData.map((category) => (
                      <tr key={category.id}>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 align-top bg-white relative">
                          <button
                            type="button"
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
                        <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-900 font-bold align-top">
                          <div className="space-y-1">
                            {category.ratings.map((rating, index) => (
                              <div key={index} className="py-1 border-b last:border-b-0 border-dashed border-gray-200">
                                {getGradeDisplay(rating.grade)}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className={`border border-gray-300 px-2 py-1 align-top ${editEnabledColumns.belowTarget ? 'bg-[#fff2cc]' : 'bg-gray-100'}`}>
                          <div className="space-y-1">
                            {category.ratings.map((rating, index) => (
                              <div key={index} className="py-1 border-b last:border-b-0 border-dashed border-gray-200">
                                <input
                                  type="text"
                                  value={rating.belowTarget}
                                  onChange={(e) => handleEditInputChange(category.id, index, 'belowTarget', e.target.value)}
                                  className={`w-full text-center border-none bg-transparent focus:ring-0 text-sm p-1 ${!editEnabledColumns.belowTarget ? 'cursor-not-allowed text-gray-400' : ''}`}
                                  disabled={!editEnabledColumns.belowTarget}
                                />
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className={`border border-gray-300 px-2 py-1 align-top ${editEnabledColumns.metTarget ? 'bg-[#deebf7]' : 'bg-gray-100'}`}>
                          <div className="space-y-1">
                            {category.ratings.map((rating, index) => (
                              <div key={index} className="py-1 border-b last:border-b-0 border-dashed border-gray-200">
                                <input
                                  type="text"
                                  value={rating.metTarget}
                                  onChange={(e) => handleEditInputChange(category.id, index, 'metTarget', e.target.value)}
                                  className={`w-full text-center border-none bg-transparent focus:ring-0 text-sm p-1 ${!editEnabledColumns.metTarget ? 'cursor-not-allowed text-gray-400' : ''}`}
                                  disabled={!editEnabledColumns.metTarget}
                                />
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className={`border border-gray-300 px-2 py-1 align-top ${editEnabledColumns.target1_1 ? 'bg-[#deebf7]' : 'bg-gray-100'}`}>
                          <div className="space-y-1">
                            {category.ratings.map((rating, index) => (
                              <div key={index} className="py-1 border-b last:border-b-0 border-dashed border-gray-200">
                                <input
                                  type="text"
                                  value={rating.target1_1}
                                  onChange={(e) => handleEditInputChange(category.id, index, 'target1_1', e.target.value)}
                                  className={`w-full text-center border-none bg-transparent focus:ring-0 text-sm p-1 ${!editEnabledColumns.target1_1 ? 'cursor-not-allowed text-gray-400' : ''}`}
                                  disabled={!editEnabledColumns.target1_1}
                                />
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className={`border border-gray-300 px-2 py-1 align-top ${editEnabledColumns.target1_25 ? 'bg-[#fce4d6]' : 'bg-gray-100'}`}>
                          <div className="space-y-1">
                            {category.ratings.map((rating, index) => (
                              <div key={index} className="py-1 border-b last:border-b-0 border-dashed border-gray-200">
                                <input
                                  type="text"
                                  value={rating.target1_25}
                                  onChange={(e) => handleEditInputChange(category.id, index, 'target1_25', e.target.value)}
                                  className={`w-full text-center border-none bg-transparent focus:ring-0 text-sm p-1 ${!editEnabledColumns.target1_25 ? 'cursor-not-allowed text-gray-400' : ''}`}
                                  disabled={!editEnabledColumns.target1_25}
                                />
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className={`border border-gray-300 px-2 py-1 align-top ${editEnabledColumns.target1_5 ? 'bg-[#e2efda]' : 'bg-gray-100'}`}>
                          <div className="space-y-1">
                            {category.ratings.map((rating, index) => (
                              <div key={index} className="py-1 border-b last:border-b-0 border-dashed border-gray-200">
                                <input
                                  type="text"
                                  value={rating.target1_5}
                                  onChange={(e) => handleEditInputChange(category.id, index, 'target1_5', e.target.value)}
                                  className={`w-full text-center border-none bg-transparent focus:ring-0 text-sm p-1 ${!editEnabledColumns.target1_5 ? 'cursor-not-allowed text-gray-400' : ''}`}
                                  disabled={!editEnabledColumns.target1_5}
                                />
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Changes will be applied only after clicking Save</span>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleEditClose}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={saving}
                  className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                    saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#262760] hover:bg-[#1e2050]'
                  } focus:outline-none`}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="mt-4 text-lg leading-6 font-medium text-gray-900">Success</h3>
            <p className="mt-2 text-sm text-gray-500">{successModal.message}</p>
            <div className="mt-5">
              <button
                onClick={() => setSuccessModal({ isOpen: false, message: '' })}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-[#262760] hover:bg-[#1e2050] focus:outline-none"
              >
                OK
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
                      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        isDisabled 
                          ? 'bg-gray-50 text-gray-400 cursor-not-allowed' 
                          : tempSelectedDesignations.includes(designation)
                            ? 'bg-indigo-50 text-[#262760]' 
                            : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="text-sm">{designation}</span>
                      {!isDisabled && (
                        <input
                          type="checkbox"
                          checked={tempSelectedDesignations.includes(designation)}
                          onChange={() => handleDesignationToggle(designation)}
                          className="h-4 w-4 text-[#262760] border-gray-300 rounded focus:ring-[#262760]"
                        />
                      )}
                      {isDisabled && (
                        <span className="text-[10px] text-gray-400 ml-2">Already used</span>
                      )}
                    </label>
                  )})}
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

export default AppraisalMaster;
