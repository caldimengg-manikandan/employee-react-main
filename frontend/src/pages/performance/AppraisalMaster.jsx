import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, X, Search, Check, Edit, Settings, Trash2 } from 'lucide-react';
import { performanceAPI, employeeAPI } from '../../services/api';

const getPreviousFinancialYearFull = () => {
  const now = new Date();
  const currentStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const prevStartYear = currentStartYear - 1;
  const prevEndYear = prevStartYear + 1;
  return `${prevStartYear}-${prevEndYear}`;
};

const getCurrentFinancialYearFull = () => {
  const now = new Date();
  const currentStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const currentEndYear = currentStartYear + 1;
  return `${currentStartYear}-${currentEndYear}`;
};

const deriveNextFinancialYearFull = (financialYear) => {
  const parts = String(financialYear || '').split(/[-/]/);
  const startYear = parseInt(parts[0], 10);
  if (Number.isNaN(startYear)) return '';
  const nextStart = startYear + 1;
  return `${nextStart}-${nextStart + 1}`;
};

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

  const [financialYear, setFinancialYear] = useState(getPreviousFinancialYearFull());
  const [editFinancialYear, setEditFinancialYear] = useState(getPreviousFinancialYearFull());
  const financialYears = [getPreviousFinancialYearFull(), getCurrentFinancialYearFull()];

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

  // Attribute Modal State
  const [showAttributesModal, setShowAttributesModal] = useState(false);
  const [selectedAttributeDesignation, setSelectedAttributeDesignation] = useState(null);
  const [attributeSections, setAttributeSections] = useState({
    selfAppraisal: true,
    knowledgeSharing: true,
    knowledgeSubItems: {
      knowledgeSharing: true,
      leadership: true
    },
    processAdherence: true,
    processSubItems: {
      timesheet: true,
      reportStatus: true,
      meeting: true
    },
    technicalAssessment: true,
    technicalSubItems: {},
    growthAssessment: true,
    growthSubItems: {
      learningNewTech: true,
      certifications: true
    }
  });
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [attributeSearchTerm, setAttributeSearchTerm] = useState('');
  const [showSubItemPicker, setShowSubItemPicker] = useState(false);
  const [attributesOnly, setAttributesOnly] = useState(false);
  const [showAddAttributesModal, setShowAddAttributesModal] = useState(false);
  const [showChildPanel, setShowChildPanel] = useState({
    knowledgeSharing: false,
    processAdherence: false,
    technicalAssessment: false,
    growthAssessment: false
  });

  const [availableKnowledge, setAvailableKnowledge] = useState([]);
  const [newKnowledgeLabel, setNewKnowledgeLabel] = useState('');
  const [availableProcess, setAvailableProcess] = useState([]);
  const [newProcessLabel, setNewProcessLabel] = useState('');
  const [availableTechnical, setAvailableTechnical] = useState([]);
  const [newTechnicalLabel, setNewTechnicalLabel] = useState('');
  const [availableGrowth, setAvailableGrowth] = useState([]);
  const [newGrowthLabel, setNewGrowthLabel] = useState('');

  const [deleteConfirmationModal, setDeleteConfirmationModal] = useState({
    isOpen: false,
    section: null,
    key: null
  });

  useEffect(() => {
    fetchMasterAttributes();
  }, []);

  const fetchMasterAttributes = async () => {
    try {
      const response = await performanceAPI.getMasterAttributes();
      if (response.data) {
        setAvailableKnowledge(response.data.knowledgeSubItems || []);
        setAvailableProcess(response.data.processSubItems || []);
        setAvailableTechnical(response.data.technicalSubItems || []);
        setAvailableGrowth(response.data.growthSubItems || []);
      }
    } catch (error) {
      console.error("Error fetching master attributes", error);
    }
  };

  const handleAddMasterAttribute = async (section, label, setLabel, setList) => {
    if (!label.trim()) return;

    // Create camelCase key
    const key = label
      .replace(/[^a-zA-Z0-9 ]/g, ' ')
      .trim()
      .split(/\s+/)
      .map((w, i) => i === 0 ? w.toLowerCase() : (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
      .join('');

    try {
      await performanceAPI.addMasterAttribute({
        section, // e.g. 'knowledgeSubItems'
        key,
        label
      });

      // Refresh master list
      fetchMasterAttributes();
      setLabel('');
      setSuccessModal({ isOpen: true, message: 'Attribute added successfully!' });

      // If we are currently editing a designation, we might need to refresh its attributes to ensure consistency, 
      // though fetchMasterAttributes handles the list. 
      // The new attribute will appear unchecked (false) by default.
    } catch (error) {
      console.error("Error adding master attribute", error);
    }
  };

  const handleDeleteMasterAttribute = (section, key) => {
    setDeleteConfirmationModal({
      isOpen: true,
      section,
      key
    });
  };

  const confirmDeleteMasterAttribute = async () => {
    const { section, key } = deleteConfirmationModal;
    if (!section || !key) return;

    try {
      await performanceAPI.deleteMasterAttribute(section, key);

      // Refresh master list
      fetchMasterAttributes();
      setSuccessModal({ isOpen: true, message: 'Attribute deleted successfully!' });
    } catch (error) {
      console.error("Error deleting master attribute", error);
      alert("Failed to delete attribute");
    } finally {
      setDeleteConfirmationModal({ isOpen: false, section: null, key: null });
    }
  };


  const handleAttributesOpen = () => {
    setShowAttributesModal(true);
    setSelectedAttributeDesignation(null);
    setAttributeSearchTerm('');
  };

  const handleDesignationSelect = async (designation) => {
    setSelectedAttributeDesignation(designation);
    setLoadingAttributes(true);
    try {
      const response = await performanceAPI.getAttributes(designation);
      if (response.data && response.data.sections) {
        const s = response.data.sections;
        setAttributeSections({
          selfAppraisal: s.selfAppraisal ?? true,
          knowledgeSharing: s.knowledgeSharing ?? true,
          knowledgeSubItems: s?.knowledgeSubItems || {},
          processAdherence: s.processAdherence ?? true,
          processSubItems: s?.processSubItems || {},
          technicalAssessment: s.technicalAssessment ?? true,
          technicalSubItems: s?.technicalSubItems || {},
          growthAssessment: s.growthAssessment ?? true,
          growthSubItems: s?.growthSubItems || {}
        });
      } else {
        setAttributeSections({
          selfAppraisal: true,
          knowledgeSharing: true,
          knowledgeSubItems: {
            knowledgeSharing: true,
            leadership: true
          },
          processAdherence: true,
          processSubItems: {
            timesheet: true,
            reportStatus: true,
            meeting: true
          },
          technicalAssessment: true,
          technicalSubItems: {},
          growthAssessment: true,
          growthSubItems: {
            learningNewTech: true,
            certifications: true
          }
        });
      }
    } catch (error) {
      console.error("Error fetching attributes", error);
    } finally {
      setLoadingAttributes(false);
    }
  };

  const handleSaveAttributes = async () => {
    if (!selectedAttributeDesignation) return;
    setLoadingAttributes(true);
    try {
      await performanceAPI.saveAttributes({
        designation: selectedAttributeDesignation,
        sections: attributeSections
      });
      try {
        const response = await performanceAPI.getAttributes(selectedAttributeDesignation);
        if (response.data && response.data.sections) {
          const s = response.data.sections;
          setAttributeSections({
            selfAppraisal: s.selfAppraisal ?? true,
            knowledgeSharing: s.knowledgeSharing ?? true,
            knowledgeSubItems: s?.knowledgeSubItems || {},
            processAdherence: s.processAdherence ?? true,
            processSubItems: s?.processSubItems || {},
            technicalAssessment: s.technicalAssessment ?? true,
            technicalSubItems: s?.technicalSubItems || {},
            growthAssessment: s.growthAssessment ?? true,
            growthSubItems: s?.growthSubItems || {}
          });
        }
      } catch (e) {
        console.error("Error refreshing attributes after save", e);
      }
      setSuccessModal({ isOpen: true, message: 'Attributes saved successfully!' });
    } catch (error) {
      console.error("Error saving attributes", error);
    } finally {
      setLoadingAttributes(false);
    }
  };

  const saveAttributesImmediate = async (sections) => {
    if (!selectedAttributeDesignation) return;
    try {
      await performanceAPI.saveAttributes({
        designation: selectedAttributeDesignation,
        sections
      });
      setAttributeSections(sections);
    } catch (error) {
      console.error("Immediate save failed", error);
    }
  };

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

      const readMatrixFromResponse = (res) => {
        const d = res?.data;
        if (!d) return { matrix: [], enabledColumns: null };
        if (d.matrix && Array.isArray(d.matrix) && d.matrix.length > 0) {
          return { matrix: d.matrix, enabledColumns: d.enabledColumns || null };
        }
        if (Array.isArray(d) && d.length > 0) {
          return { matrix: d, enabledColumns: null };
        }
        return { matrix: [], enabledColumns: d.enabledColumns || null };
      };

      let { matrix, enabledColumns: enabled } = readMatrixFromResponse(response);

      if (matrix.length === 0) {
        const fallbackYear = deriveNextFinancialYearFull(financialYear);
        const shouldFallback =
          financialYear === getPreviousFinancialYearFull() &&
          fallbackYear === getCurrentFinancialYearFull();
        if (shouldFallback) {
          const fallbackResponse = await performanceAPI.getIncrementMatrix({ financialYear: fallbackYear });
          const fallback = readMatrixFromResponse(fallbackResponse);
          if (fallback.matrix.length > 0) {
            matrix = fallback.matrix;
            enabled = fallback.enabledColumns || enabled;
          }
        }
      }

      setMatrixData(matrix);
      if (enabled) {
        setEnabledColumns(enabled);
      } else {
        setEnabledColumns({
          belowTarget: false,
          metTarget: true,
          target1_1: false,
          target1_25: false,
          target1_5: false
        });
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
            <th className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100" style={{ width: '20%' }}>Category</th>
            <th className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100" style={{ width: '20%' }}>Ratings</th>
            <th colSpan={Object.values(enabledColumns).filter(Boolean).length} className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100">Annual Increment %</th>
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
          <div className="flex space-x-2">
            <button
              onClick={handleAttributesOpen}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#262760] hover:bg-[#1e2050] focus:outline-none"
            >
              <Settings className="h-4 w-4 mr-2" />
              Attributes
            </button>
            <button
              onClick={handleEditOpen}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#262760] hover:bg-[#1e2050] focus:outline-none"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
          </div>
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
                      <th className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100" style={{ width: '20%' }}>Category</th>
                      <th className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100" style={{ width: '20%' }}>Ratings</th>
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
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${editEnabledColumns.belowTarget ? 'translate-x-4.5' : 'translate-x-1'}`} style={{ transform: editEnabledColumns.belowTarget ? 'translateX(1.1rem)' : 'translateX(0.15rem)' }} />
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
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`} style={{ transform: editEnabledColumns.metTarget ? 'translateX(1.1rem)' : 'translateX(0.15rem)' }} />
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
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`} style={{ transform: editEnabledColumns.target1_1 ? 'translateX(1.1rem)' : 'translateX(0.15rem)' }} />
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
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`} style={{ transform: editEnabledColumns.target1_25 ? 'translateX(1.1rem)' : 'translateX(0.15rem)' }} />
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
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`} style={{ transform: editEnabledColumns.target1_5 ? 'translateX(1.1rem)' : 'translateX(0.15rem)' }} />
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
                  className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#262760] hover:bg-[#1e2050]'
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

      {/* Attributes Modal */}
      {showAttributesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Appraisal Attributes</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddAttributesModal(true)}
                  className={`px-3 py-1.5 rounded-md text-sm border ${attributesOnly ? 'bg-[#262760] text-white border-[#262760]' : 'bg-white text-gray-700 border-gray-300'
                    }`}
                >
                  Add Attributes
                </button>
                <button
                  onClick={() => setShowAttributesModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left Column: Designation List */}
              <div className="w-1/2 flex flex-col bg-white border-r border-gray-200">
                <div className="p-4 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search designations..."
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-transparent"
                      value={attributeSearchTerm}
                      onChange={(e) => setAttributeSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  <div className="space-y-1">
                    {designations
                      .filter(d => d.toLowerCase().includes(attributeSearchTerm.toLowerCase()))
                      .map((designation) => (
                        <button
                          key={designation}
                          onClick={() => handleDesignationSelect(designation)}
                          className={`w-full text-left px-4 py-3 rounded-md text-sm transition-all duration-200 flex items-center justify-between group ${selectedAttributeDesignation === designation
                            ? 'bg-[#262760] text-white shadow-md'
                            : 'hover:bg-gray-100 text-gray-700 hover:pl-5'
                            }`}
                        >
                          <span className="font-medium truncate mr-2">{designation}</span>
                          {selectedAttributeDesignation === designation ? (
                            <Edit className="h-4 w-4 opacity-100" />
                          ) : (
                            <Edit className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                          )}
                        </button>
                      ))}
                    {designations.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No designations found.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Configuration */}
              <div className="w-1/2 p-6 overflow-y-auto bg-gray-50">
                {selectedAttributeDesignation ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-semibold text-[#262760] mb-1">{selectedAttributeDesignation}</h4>
                      <p className="text-sm text-gray-500">Configure visible appraisal sections for this designation.</p>
                    </div>

                    {loadingAttributes ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-[#262760]" />
                      </div>
                    ) : (
                      <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        {/* Knowledge Sharing Sub Items */}
                        <div className="mt-2 border border-purple-100 rounded-md p-3 bg-purple-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-semibold text-purple-700">Knowledge Sharing Sub Items</div>

                          </div>
                          {/* Iterate over Master List */}
                          {availableKnowledge.length > 0 ? (
                            availableKnowledge.map((sub) => (
                              <div key={sub.key} className="flex items-center justify-between p-2 hover:bg-white rounded-md transition-colors border border-purple-100 bg-white mb-1">
                                <label htmlFor={`attr-ks-${sub.key}`} className="text-sm text-gray-700 cursor-pointer select-none flex-1">
                                  {sub.label}
                                </label>
                                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                  <input
                                    type="checkbox"
                                    name={sub.key}
                                    id={`attr-ks-${sub.key}`}
                                    checked={attributeSections?.knowledgeSubItems?.[sub.key] ?? false}
                                    onChange={(e) => setAttributeSections({
                                      ...attributeSections,
                                      knowledgeSubItems: {
                                        ...(attributeSections.knowledgeSubItems || {}),
                                        [sub.key]: e.target.checked
                                      }
                                    })}
                                    className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                    style={{
                                      right: (attributeSections?.knowledgeSubItems?.[sub.key] ?? false) ? '0' : 'auto',
                                      left: (attributeSections?.knowledgeSubItems?.[sub.key] ?? false) ? 'auto' : '0',
                                      borderColor: (attributeSections?.knowledgeSubItems?.[sub.key] ?? false) ? '#262760' : '#E5E7EB'
                                    }}
                                  />
                                  <label
                                    htmlFor={`attr-ks-${sub.key}`}
                                    className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${(attributeSections?.knowledgeSubItems?.[sub.key] ?? false) ? 'bg-[#262760]' : 'bg-gray-300'}`}
                                  ></label>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-gray-500 italic p-2">No attributes found. Add some globally.</div>
                          )}
                        </div>

                        {/* Process Adherence Sub Items */}
                        <div className="mt-3 border border-orange-100 rounded-md p-3 bg-orange-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-semibold text-orange-700">Process Adherence Sub Items</div>
                          </div>
                          {availableProcess.length > 0 ? (
                            availableProcess.map((sub) => (
                              <div key={sub.key} className="flex items-center justify-between p-2 hover:bg-white rounded-md transition-colors border border-orange-100 bg-white mb-1">
                                <label htmlFor={`attr-pa-${sub.key}`} className="text-sm text-gray-700 cursor-pointer select-none flex-1">
                                  {sub.label}
                                </label>
                                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                  <input
                                    type="checkbox"
                                    id={`attr-pa-${sub.key}`}
                                    checked={attributeSections?.processSubItems?.[sub.key] ?? false}
                                    onChange={(e) => setAttributeSections(prev => ({
                                      ...prev,
                                      processSubItems: {
                                        ...(prev.processSubItems || {}),
                                        [sub.key]: e.target.checked
                                      }
                                    }))}
                                    className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                    style={{
                                      right: (attributeSections?.processSubItems?.[sub.key] ?? false) ? '0' : 'auto',
                                      left: (attributeSections?.processSubItems?.[sub.key] ?? false) ? 'auto' : '0',
                                      borderColor: (attributeSections?.processSubItems?.[sub.key] ?? false) ? '#262760' : '#E5E7EB'
                                    }}
                                  />
                                  <label
                                    htmlFor={`attr-pa-${sub.key}`}
                                    className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${(attributeSections?.processSubItems?.[sub.key] ?? false) ? 'bg-[#262760]' : 'bg-gray-300'}`}
                                  ></label>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-gray-500 italic p-2">No attributes found. Add some globally.</div>
                          )}
                        </div>

                        {/* Technical Assessment Sub Items */}
                        <div className="mt-3 border border-blue-100 rounded-md p-3 bg-blue-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-semibold text-blue-700">Technical Assessment Sub Items</div>
                          </div>
                          {availableTechnical.length > 0 ? (
                            availableTechnical.map((sub) => (
                              <div key={sub.key} className="flex items-center justify-between p-2 hover:bg-white rounded-md transition-colors border border-blue-100 bg-white mb-1">
                                <label htmlFor={`attr-ta-${sub.key}`} className="text-sm text-gray-700 cursor-pointer select-none flex-1">
                                  {sub.label}
                                </label>
                                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                  <input
                                    type="checkbox"
                                    id={`attr-ta-${sub.key}`}
                                    checked={attributeSections?.technicalSubItems?.[sub.key] ?? false}
                                    onChange={(e) => setAttributeSections(prev => ({
                                      ...prev,
                                      technicalSubItems: {
                                        ...(prev.technicalSubItems || {}),
                                        [sub.key]: e.target.checked
                                      }
                                    }))}
                                    className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                    style={{
                                      right: (attributeSections?.technicalSubItems?.[sub.key] ?? false) ? '0' : 'auto',
                                      left: (attributeSections?.technicalSubItems?.[sub.key] ?? false) ? 'auto' : '0',
                                      borderColor: (attributeSections?.technicalSubItems?.[sub.key] ?? false) ? '#262760' : '#E5E7EB'
                                    }}
                                  />
                                  <label
                                    htmlFor={`attr-ta-${sub.key}`}
                                    className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${(attributeSections?.technicalSubItems?.[sub.key] ?? false) ? 'bg-[#262760]' : 'bg-gray-300'}`}
                                  ></label>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-gray-500 italic p-2">No attributes found. Add some globally.</div>
                          )}
                        </div>

                        {/* Growth Assessment Sub Items */}
                        <div className="mt-3 border border-green-100 rounded-md p-3 bg-green-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-semibold text-green-700">Growth Assessment Sub Items</div>
                          </div>
                          {availableGrowth.length > 0 ? (
                            availableGrowth.map((sub) => (
                              <div key={sub.key} className="flex items-center justify-between p-2 hover:bg-white rounded-md transition-colors border border-green-100 bg-white mb-1">
                                <label htmlFor={`attr-ga-${sub.key}`} className="text-sm text-gray-700 cursor-pointer select-none flex-1">
                                  {sub.label}
                                </label>
                                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                  <input
                                    type="checkbox"
                                    id={`attr-ga-${sub.key}`}
                                    checked={attributeSections?.growthSubItems?.[sub.key] ?? false}
                                    onChange={(e) => setAttributeSections(prev => ({
                                      ...prev,
                                      growthSubItems: {
                                        ...(prev.growthSubItems || {}),
                                        [sub.key]: e.target.checked
                                      }
                                    }))}
                                    className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                    style={{
                                      right: (attributeSections?.growthSubItems?.[sub.key] ?? false) ? '0' : 'auto',
                                      left: (attributeSections?.growthSubItems?.[sub.key] ?? false) ? 'auto' : '0',
                                      borderColor: (attributeSections?.growthSubItems?.[sub.key] ?? false) ? '#262760' : '#E5E7EB'
                                    }}
                                  />
                                  <label
                                    htmlFor={`attr-ga-${sub.key}`}
                                    className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${(attributeSections?.growthSubItems?.[sub.key] ?? false) ? 'bg-[#262760]' : 'bg-gray-300'}`}
                                  ></label>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-gray-500 italic p-2">No attributes found. Add some globally.</div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 flex justify-end">
                      <button
                        onClick={handleSaveAttributes}
                        disabled={loadingAttributes}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#262760] hover:bg-[#1e2050] focus:outline-none disabled:opacity-50"
                      >
                        {loadingAttributes ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center p-8">
                    <Edit className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No Designation Selected</p>
                    <p className="text-sm mt-2">Select a designation from the list on the left to configure its attributes.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Add Attributes Popup */}
            {showAddAttributesModal && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] border border-gray-200 flex flex-col">
                  <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <h4 className="text-lg font-semibold text-gray-900">Manage Master Attributes</h4>
                    <button
                      onClick={() => setShowAddAttributesModal(false)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="p-4 bg-blue-50 text-blue-800 text-xs mb-0">
                    <p>Attributes added here will be available for all designations. Use the checkboxes in the main window to enable them for specific designations.</p>
                  </div>

                  <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                    {/* Knowledge Sharing */}
                    <div className="mt-2 border border-purple-100 rounded-md p-3 bg-purple-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-purple-700">Knowledge Sharing ({availableKnowledge.length})</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newKnowledgeLabel}
                          onChange={(e) => setNewKnowledgeLabel(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddMasterAttribute('knowledgeSubItems', newKnowledgeLabel, setNewKnowledgeLabel, setAvailableKnowledge)}
                          placeholder="Add new attribute..."
                          className="flex-1 px-2 h-9 border rounded text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddMasterAttribute('knowledgeSubItems', newKnowledgeLabel, setNewKnowledgeLabel, setAvailableKnowledge)}
                          className="px-3 h-9 rounded bg-[#262760] text-white text-xs whitespace-nowrap"
                        >
                          Add
                        </button>
                      </div>
                      <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                        {availableKnowledge.map(sub => (
                          <div key={sub.key} className="flex justify-between items-center text-xs text-gray-600 px-2 py-1 bg-white border border-purple-100 rounded group">
                            <span>{sub.label}</span>
                            <button
                              onClick={() => handleDeleteMasterAttribute('knowledgeSubItems', sub.key)}
                              className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                              title="Delete attribute"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Process Adherence */}
                    <div className="mt-3 border border-orange-100 rounded-md p-3 bg-orange-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-orange-700">Process Adherence ({availableProcess.length})</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newProcessLabel}
                          onChange={(e) => setNewProcessLabel(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddMasterAttribute('processSubItems', newProcessLabel, setNewProcessLabel, setAvailableProcess)}
                          placeholder="Add new attribute..."
                          className="flex-1 px-2 h-9 border rounded text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddMasterAttribute('processSubItems', newProcessLabel, setNewProcessLabel, setAvailableProcess)}
                          className="px-3 h-9 rounded bg-[#262760] text-white text-xs whitespace-nowrap"
                        >
                          Add
                        </button>
                      </div>
                      <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                        {availableProcess.map(sub => (
                          <div key={sub.key} className="flex justify-between items-center text-xs text-gray-600 px-2 py-1 bg-white border border-orange-100 rounded group">
                            <span>{sub.label}</span>
                            <button
                              onClick={() => handleDeleteMasterAttribute('processSubItems', sub.key)}
                              className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                              title="Delete attribute"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Technical Assessment */}
                    <div className="mt-3 border border-blue-100 rounded-md p-3 bg-blue-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-blue-700">Technical Assessment ({availableTechnical.length})</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newTechnicalLabel}
                          onChange={(e) => setNewTechnicalLabel(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddMasterAttribute('technicalSubItems', newTechnicalLabel, setNewTechnicalLabel, setAvailableTechnical)}
                          placeholder="Add new attribute..."
                          className="flex-1 px-2 h-9 border rounded text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddMasterAttribute('technicalSubItems', newTechnicalLabel, setNewTechnicalLabel, setAvailableTechnical)}
                          className="px-3 h-9 rounded bg-[#262760] text-white text-xs whitespace-nowrap"
                        >
                          Add
                        </button>
                      </div>
                      <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                        {availableTechnical.map(sub => (
                          <div key={sub.key} className="flex justify-between items-center text-xs text-gray-600 px-2 py-1 bg-white border border-blue-100 rounded group">
                            <span>{sub.label}</span>
                            <button
                              onClick={() => handleDeleteMasterAttribute('technicalSubItems', sub.key)}
                              className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                              title="Delete attribute"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Growth Assessment */}
                    <div className="mt-3 border border-green-100 rounded-md p-3 bg-green-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-green-700">Growth Assessment ({availableGrowth.length})</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newGrowthLabel}
                          onChange={(e) => setNewGrowthLabel(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddMasterAttribute('growthSubItems', newGrowthLabel, setNewGrowthLabel, setAvailableGrowth)}
                          placeholder="Add new attribute..."
                          className="flex-1 px-2 h-9 border rounded text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddMasterAttribute('growthSubItems', newGrowthLabel, setNewGrowthLabel, setAvailableGrowth)}
                          className="px-3 h-9 rounded bg-[#262760] text-white text-xs whitespace-nowrap"
                        >
                          Add
                        </button>
                      </div>
                      <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                        {availableGrowth.map(sub => (
                          <div key={sub.key} className="flex justify-between items-center text-xs text-gray-600 px-2 py-1 bg-white border border-green-100 rounded group">
                            <span>{sub.label}</span>
                            <button
                              onClick={() => handleDeleteMasterAttribute('growthSubItems', sub.key)}
                              className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                              title="Delete attribute"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
                    <button
                      onClick={() => setShowAddAttributesModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${isDisabled
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
                    );
                  })}
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

      {/* Confirmation Modal */}
      {confirmationModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Enable Column</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to enable "{confirmationModal.columnName}" column? Only one column can be enabled at a time.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmationModal({ isOpen: false, columnKey: null, columnName: '' })}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmEnableEditColumn}
                className="px-4 py-2 bg-[#262760] text-white rounded-md text-sm font-medium hover:bg-[#1e2050]"
              >
                Enable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmationModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 z-[60]">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Delete Attribute</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this attribute? It will be removed from all designations and cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
              <button
                type="button"
                className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm sm:w-auto"
                onClick={() => setDeleteConfirmationModal({ isOpen: false, section: null, key: null })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:text-sm sm:w-auto"
                onClick={confirmDeleteMasterAttribute}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppraisalMaster;
