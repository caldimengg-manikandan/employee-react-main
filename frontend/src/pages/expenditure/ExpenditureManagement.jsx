import React, { useState, useEffect } from 'react';

const ExpenditureManagement = () => {
  const [expenditures, setExpenditures] = useState([]);
  const [disbursements, setDisbursements] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [budget, setBudget] = useState('');
  const [budgetNote, setBudgetNote] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [customCategory, setCustomCategory] = useState(''); 
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  // API base URL
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000/api';
  const FILE_BASE = API_BASE.replace(/\/api$/, '');
  
  // Predefined expenditure categories
  const expenditureCategories = [
    'Milk', 'Food', 'Maid Salary', 'Bakery', 
    'Intern Stipend', 'LinkedIn Subscription', 
    'The Cake Home', 'Flower Bill', 'Others'
  ];

  // Locations
  const locations = ['Chennai', 'Hosur'];

  // Initialize new expenditure and disbursement
  const [newExpenditure, setNewExpenditure] = useState({
    description: '',
    amount: ''
  });

  const [newDisbursement, setNewDisbursement] = useState({
    description: '',
    amount: ''
  });

  // Calculate totals
  const totalExpenditure = expenditures.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const totalDisbursement = disbursements.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const totalCombined = totalExpenditure + totalDisbursement;
  const disbursementRemaining = parseFloat(budget || 0) - totalDisbursement;

  // Fetch records from backend
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(filterMonth && { month: filterMonth }),
        ...(filterYear && { year: filterYear }),
        ...(filterLocation && { location: filterLocation })
      });

      console.log('Fetching records with params:', Object.fromEntries(params));
      
      const response = await fetch(`${API_BASE}/expenditures?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch records');
      }
      
      const data = await response.json();
      
      if (!data || !data.records) {
        console.error('Invalid data format received:', data);
        throw new Error('Invalid data format received from server');
      }
      
      console.log(`Received ${data.records.length} records from server`);
      setFilteredData(data.records);
      setTotalRecords(data.pagination.totalRecords);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching records:', error);
      setFilteredData([]);
      alert(`Error fetching records: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch single record
  const fetchRecord = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/expenditures/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch record');
      }
      return await response.json();
    } catch (error) {
      alert('Error fetching record');
      throw error;
    }
  };

  // Handle adding new expenditure
  const addExpenditure = () => {
    let description = newExpenditure.description;
    
    if (description === 'Others' && customCategory.trim()) {
      description = customCategory;
    }
    
    if (description && newExpenditure.amount) {
      const newItem = { 
        description, 
        amount: newExpenditure.amount, 
        id: Date.now(),
        timestamp: new Date().toISOString()
      };
      
      setExpenditures([...expenditures, newItem]);
      setNewExpenditure({ description: '', amount: '' });
      setCustomCategory('');
    }
  };

  // Handle removing expenditure
  const removeExpenditure = (id) => {
    setExpenditures(expenditures.filter(item => item.id !== id));
  };

  // Handle adding new disbursement
  const addDisbursement = () => {
    if (newDisbursement.description && newDisbursement.amount) {
      const newItem = { 
        ...newDisbursement, 
        id: Date.now(),
        timestamp: new Date().toISOString()
      };
      
      setDisbursements([...disbursements, newItem]);
      setNewDisbursement({ description: '', amount: '' });
    }
  };

  // Handle removing disbursement
  const removeDisbursement = (id) => {
    setDisbursements(disbursements.filter(item => item.id !== id));
  };

  // Handle saving the entire record to backend
  const saveRecord = async () => {
    if (!selectedMonth || !selectedYear || !selectedLocation) {
      alert('Please select month, year, and location');
      return;
    }

    setLoading(true);
    try {
      console.log('Preparing to save record with data:', {
        month: selectedMonth,
        year: selectedYear,
        location: selectedLocation,
        budget,
        expenditures: expenditures.length,
        disbursements: disbursements.length
      });
      
      const formData = new FormData();
      formData.append('month', selectedMonth);
      formData.append('year', selectedYear);
      formData.append('location', selectedLocation);
      formData.append('budget', budget);
      formData.append('budgetNote', budgetNote);
      formData.append('expenditures', JSON.stringify(expenditures));
      formData.append('disbursements', JSON.stringify(disbursements));
      
      if (documentFile) {
        formData.append('document', documentFile);
        console.log('Document file attached:', documentFile.name);
      }

      console.log(`Sending POST request to ${API_BASE}/expenditures`);
      
      const response = await fetch(`${API_BASE}/expenditures`, {
        method: 'POST',
        body: formData
      });

      console.log('Save record response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from server:', errorText);
        throw new Error(`Failed to save record: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Record saved successfully:', result);
      
      alert('Record saved successfully!');
      setShowAddForm(false);
      resetForm();
      fetchRecords();
    } catch (error) {
      console.error('Error saving record:', error);
      alert(`Error saving record: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setExpenditures([]);
    setDisbursements([]);
    setSelectedMonth('');
    setSelectedYear('');
    setSelectedLocation('');
    setDocumentFile(null);
    setBudget('');
    setBudgetNote('');
    setNewExpenditure({ description: '', amount: '' });
    setNewDisbursement({ description: '', amount: '' });
    setCustomCategory('');
  };

  // Load record for editing
  const loadRecordForEdit = async (record) => {
    try {
      const recordData = await fetchRecord(record.id);
      setEditingRecord(recordData);
      setSelectedMonth(recordData.month);
      setSelectedYear(recordData.year.toString());
      setSelectedLocation(recordData.location);
      setBudget(recordData.budget.toString());
      setBudgetNote(recordData.budget_note || '');
      setExpenditures(recordData.expenditures || []);
      setDisbursements(recordData.disbursements || []);
      setShowEditForm(true);
    } catch (error) {
      alert('Error loading record for editing');
    }
  };

  // Update record
  const updateRecord = async () => {
    if (!selectedMonth || !selectedYear || !selectedLocation) {
      alert('Please select month, year, and location');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('month', selectedMonth);
      formData.append('year', selectedYear);
      formData.append('location', selectedLocation);
      formData.append('budget', budget);
      formData.append('budgetNote', budgetNote);
      formData.append('expenditures', JSON.stringify(expenditures));
      formData.append('disbursements', JSON.stringify(disbursements));
      
      if (documentFile) {
        formData.append('document', documentFile);
      }

      const response = await fetch(`${API_BASE}/expenditures/${editingRecord.id}`, {
        method: 'PUT',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to update record');
      }

      alert('Record updated successfully!');
      setShowEditForm(false);
      resetForm();
      setEditingRecord(null);
      fetchRecords();
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Error updating record');
    } finally {
      setLoading(false);
    }
  };

  // Delete record
  const deleteRecord = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;

    try {
      const response = await fetch(`${API_BASE}/expenditures/${id}`, { 
        method: 'DELETE' 
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete record');
      }
      
      alert('Record deleted successfully!');
      fetchRecords();
    } catch (error) {
      alert('Error deleting record');
    }
  };

  // View document
  const viewDocument = (documentUrl) => {
    if (!documentUrl) {
      alert('No document attached to this record');
      return;
    }

    // Build absolute URL for files served from /uploads (not under /api)
    const buildFileUrl = (path) => {
      if (!path) return null;
      if (/^https?:\/\//i.test(path)) return path; // already absolute
      if (path.startsWith('/uploads/')) return `${FILE_BASE}${path}`; // served by express static
      // Fallback: treat as filename stored under uploads/expenditures
      return `${FILE_BASE}/uploads/expenditures/${path}`;
    };

    const name = (documentUrl.split('/').pop()) || 'document';
    const ext = (name.split('.').pop() || '').toLowerCase();

    setCurrentDocument({
      name,
      type: ext,
      url: buildFileUrl(documentUrl)
    });
    setShowDocumentViewer(true);
  };

  // Export to CSV
  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams({
        ...(filterMonth && { month: filterMonth }),
        ...(filterYear && { year: filterYear }),
        ...(filterLocation && { location: filterLocation })
      });

      const response = await fetch(`${API_BASE}/expenditures/export?${params}`);

      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'expenditures.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting CSV');
    }
  };

  // Toggle record expansion for card view
  const toggleRecordExpansion = (id) => {
    if (expandedRecord === id) {
      setExpandedRecord(null);
    } else {
      setExpandedRecord(id);
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchRecords();
  }, [currentPage, filterMonth, filterYear, filterLocation]);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      {/* Loading indicator */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            <p>Loading...</p>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Expenditure Management</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm md:text-base"
        >
          Add Expenditure
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Months</option>
              {['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'].map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Years</option>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Locations</option>
              {locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">View Mode</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="table">Table View</option>
              <option value="card">Card View</option>
            </select>
          </div>
          <div className="flex items-end space-x-2">
            <button
              onClick={exportToCSV}
              className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {showDocumentViewer && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-semibold">Document Viewer</h3>
              <button
                onClick={() => setShowDocumentViewer(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 h-96 flex items-center justify-center">
              {currentDocument?.type === 'pdf' ? (
                <iframe 
                  src={currentDocument.url} 
                  className="w-full h-full border rounded"
                  title={currentDocument.name}
                />
              ) : (["jpg","jpeg","png","gif","webp","bmp"].includes(currentDocument?.type || '') ? (
                <img 
                  src={currentDocument.url} 
                  alt={currentDocument.name} 
                  className="max-h-full max-w-full object-contain border rounded"
                />
              ) : (
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-4 text-gray-600">Preview not available for this file type</p>
                  <p className="text-sm text-gray-500">Download the file to view it</p>
                  <a
                    href={currentDocument.url}
                    download
                    className="mt-4 inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                  >
                    Download Document
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Expenditure Form Modal */}
      {(showAddForm || showEditForm) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">
                  {showEditForm ? 'Edit Expenditure Record' : 'Add New Expenditure Record'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setShowEditForm(false);
                    resetForm();
                    setEditingRecord(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month *</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Month</option>
                    {['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'].map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Year</option>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Location</option>
                    {locations.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Document</label>
                <input
                  type="file"
                  onChange={(e) => setDocumentFile(e.target.files[0])}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Expenditure Table */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">Expenditure</h4>
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border-b border-gray-300 p-3 text-left">Description</th>
                          <th className="border-b border-gray-300 p-3 text-left">Amount (₹)</th>
                          <th className="border-b border-gray-300 p-3 text-left w-16">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenditures.map((item) => (
                          <tr key={item.id}>
                            <td className="border-b border-gray-200 p-3">{item.description}</td>
                            <td className="border-b border-gray-200 p-3">{parseFloat(item.amount).toFixed(2)}</td>
                            <td className="border-b border-gray-200 p-3">
                              <button
                                onClick={() => removeExpenditure(item.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Remove"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td className="border-b border-gray-200 p-3">
                            <select
                              value={newExpenditure.description}
                              onChange={(e) => setNewExpenditure({...newExpenditure, description: e.target.value})}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                              <option value="">Select Category</option>
                              {expenditureCategories.map(category => (
                                <option key={category} value={category}>{category}</option>
                              ))}
                            </select>
                            {newExpenditure.description === 'Others' && (
                              <input
                                type="text"
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                                placeholder="Enter custom category"
                                className="w-full mt-2 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              />
                            )}
                          </td>
                          <td className="border-b border-gray-200 p-3">
                            <input
                              type="number"
                              value={newExpenditure.amount}
                              onChange={(e) => setNewExpenditure({...newExpenditure, amount: e.target.value})}
                              placeholder="Amount"
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="border-b border-gray-200 p-3">
                            <button
                              onClick={addExpenditure}
                              className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 text-sm disabled:bg-gray-300"
                              disabled={!newExpenditure.description || !newExpenditure.amount}
                            >
                              Add
                            </button>
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50">
                          <td className="border-t border-gray-300 p-3 font-semibold">Total Expenditure</td>
                          <td className="border-t border-gray-300 p-3 font-semibold">₹{totalExpenditure.toFixed(2)}</td>
                          <td className="border-t border-gray-300 p-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Disbursement Table */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">Disbursement Cash</h4>
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border-b border-gray-300 p-3 text-left">Description</th>
                          <th className="border-b border-gray-300 p-3 text-left">Amount (₹)</th>
                          <th className="border-b border-gray-300 p-3 text-left w-16">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {disbursements.map((item) => (
                          <tr key={item.id}>
                            <td className="border-b border-gray-200 p-3">{item.description}</td>
                            <td className="border-b border-gray-200 p-3">{parseFloat(item.amount).toFixed(2)}</td>
                            <td className="border-b border-gray-200 p-3">
                              <button
                                onClick={() => removeDisbursement(item.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Remove"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td className="border-b border-gray-200 p-3">
                            <input
                              type="text"
                              value={newDisbursement.description}
                              onChange={(e) => setNewDisbursement({...newDisbursement, description: e.target.value})}
                              placeholder="Description"
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                          </td>
                          <td className="border-b border-gray-200 p-3">
                            <input
                              type="number"
                              value={newDisbursement.amount}
                              onChange={(e) => setNewDisbursement({...newDisbursement, amount: e.target.value})}
                              placeholder="Amount"
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="border-b border-gray-200 p-3">
                            <button
                              onClick={addDisbursement}
                              className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 text-sm disabled:bg-gray-300"
                              disabled={!newDisbursement.description || !newDisbursement.amount}
                            >
                              Add
                            </button>
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50">
                          <td className="border-t border-gray-300 p-3 font-semibold">Total Disbursement</td>
                          <td className="border-t border-gray-300 p-3 font-semibold">₹{totalDisbursement.toFixed(2)}</td>
                          <td className="border-t border-gray-300 p-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="mb-3">
                      <span className="font-semibold text-gray-700">Total Combined (Exp + Disbursement):</span>
                      <span className="ml-2 text-lg font-bold text-gray-900">₹{totalCombined.toFixed(2)}</span>
                    </div>
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Disbursement Budget:</label>
                      <input
                        type="number"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        placeholder="Enter budget amount"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Budget Note:</label>
                      <input
                        type="text"
                        value={budgetNote}
                        onChange={(e) => setBudgetNote(e.target.value)}
                        placeholder="Enter budget note (optional)"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    
                    {budget && (
                      <div className={`text-lg font-semibold ${disbursementRemaining >= 0 ? "text-green-600" : "text-red-600"}`}>
                        Disbursement Remaining: ₹{disbursementRemaining.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setShowEditForm(false);
                    resetForm();
                    setEditingRecord(null);
                  }}
                  className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={showEditForm ? updateRecord : saveRecord}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
                  disabled={!selectedMonth || !selectedYear || !selectedLocation}
                >
                  {showEditForm ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expenditure Records Display */}
      <div className="overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Expenditure Records</h3>
          <div className="text-sm text-gray-600">
            Total Records: {totalRecords}
          </div>
        </div>
        
        {filteredData && Array.isArray(filteredData) && filteredData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg">No records found</p>
            <p className="text-sm">Try adjusting your filters or add a new record</p>
          </div>
        ) : viewMode === 'table' ? (
          <>
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Expenditure</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData && Array.isArray(filteredData) && filteredData.map((record, index) => (
                    <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{record.month} {record.year}</div>
                        <div className="text-sm text-gray-500">By: {record.created_by_name || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {record.location}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{parseFloat(record.total_expenditure || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{parseFloat(record.budget || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{parseFloat(record.disbursement_spent || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          parseFloat(record.disbursement_remaining || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ₹{parseFloat(record.disbursement_remaining || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {record.budget_note || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {(record.document || record.document_url) && (
                            <button
                              onClick={() => viewDocument(record.document || record.document_url)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Document"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => loadRecordForEdit(record)}
                            className="text-green-600 hover:text-green-900"
                            title="Edit Record"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteRecord(record.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Record"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} records
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentPage === 1 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        currentPage === pageNum 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                {totalPages > 5 && (
                  <span className="px-2 py-2 text-sm text-gray-500">...</span>
                )}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentPage === totalPages 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          // Card View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredData.map((record) => (
              <div key={record.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <div className="bg-indigo-600 text-white p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">{record.month} {record.year}</h3>
                      <p className="text-indigo-100 text-sm">{record.location}</p>
                    </div>
                    <span className="bg-indigo-700 text-xs px-2 py-1 rounded-full">
                      {record.created_by_name || 'N/A'}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Total Expenditure</p>
                      <p className="font-semibold">₹{parseFloat(record.total_expenditure || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Budget</p>
                      <p className="font-semibold">₹{parseFloat(record.budget || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Spent</p>
                      <p className="font-semibold">₹{parseFloat(record.disbursement_spent || 0).toFixed(2)}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${
                      parseFloat(record.disbursement_remaining || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <p className="text-xs text-gray-500">Remaining</p>
                      <p className={`font-semibold ${
                        parseFloat(record.disbursement_remaining || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ₹{parseFloat(record.disbursement_remaining || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  {record.budget_note && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1">Note</p>
                      <p className="text-sm">{record.budget_note}</p>
                    </div>
                  )}
                  
                  <button
                    onClick={() => toggleRecordExpansion(record.id)}
                    className="text-indigo-600 text-sm font-medium flex items-center"
                  >
                    {expandedRecord === record.id ? 'Hide Details' : 'View Details'}
                    <svg 
                      className={`w-4 h-4 ml-1 transition-transform ${expandedRecord === record.id ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {expandedRecord === record.id && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="font-medium text-sm mb-2">Expenditure Items</h4>
                      <ul className="text-sm space-y-1 mb-4">
                        {(Array.isArray(record.expenditures) ? record.expenditures : []).map((item, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span>{item.description}</span>
                            <span>₹{parseFloat(item.amount || 0).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                      <h4 className="font-medium text-sm mb-2">Disbursement Items</h4>
                      <ul className="text-sm space-y-1">
                        {(Array.isArray(record.disbursements) ? record.disbursements : []).map((item, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span>{item.description}</span>
                            <span>₹{parseFloat(item.amount || 0).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="px-4 py-3 bg-gray-50 flex justify-end space-x-2">
                  {(record.document || record.document_url) && (
                    <button
                      onClick={() => viewDocument(record.document || record.document_url)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Document"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => loadRecordForEdit(record)}
                    className="text-green-600 hover:text-green-800 p-1"
                    title="Edit Record"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteRecord(record.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Delete Record"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenditureManagement;