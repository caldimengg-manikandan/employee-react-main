import React, { useState, useEffect, useMemo } from 'react';
import { Phone, Search, Plus, Edit2, Trash2, CheckCircle, XCircle, User, Building, Briefcase, RefreshCw, MapPin } from 'lucide-react';
import { extensionAPI, employeeAPI } from '../../services/api';

export default function ExtensionMaster() {
  const [extensions, setExtensions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExtension, setEditingExtension] = useState(null);

  // Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    designation: '',
    extensionNumber: '',
    location: 'Chennai',
    status: 'Active'
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Check authorization
  const isAuthorized = useMemo(() => {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const role = String(user.role || '').trim().toLowerCase();
    const designation = String(user.designation || '').trim().toLowerCase();
    return role === 'admin' || role === 'super_admin' || role === 'it_admin' || designation.includes('it admin') || designation.includes('super admin');
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [extRes, empRes] = await Promise.all([
        extensionAPI.getAll(),
        employeeAPI.getAllEmployees ? employeeAPI.getAllEmployees('all') : (employeeAPI.getAll ? employeeAPI.getAll('all') : Promise.resolve({ data: [] }))
      ]);
      setExtensions(Array.isArray(extRes.data) ? extRes.data : []);
      
      const empData = Array.isArray(empRes?.data) ? empRes.data : (Array.isArray(empRes) ? empRes : []);
      const sortedEmp = [...empData].sort((a, b) => 
        (a.name || a.employeename || '').localeCompare(b.name || b.employeename || '')
      );
      setEmployees(sortedEmp);
    } catch (error) {
      console.error('Error loading extension master data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadData();
    }
  }, [isAuthorized]);

  // When an employee is selected from Employee Master, auto populate Name, Dept, Designation, Location
  const handleEmployeeSelect = (empId) => {
    setSelectedEmployeeId(empId);
    if (!empId) {
      setFormData(prev => ({
        ...prev,
        employeeId: '',
        employeeName: '',
        department: '',
        designation: '',
        location: 'Chennai'
      }));
      return;
    }

    const selected = employees.find(e => 
      String(e.employeeId || e._id) === String(empId) ||
      String(e._id) === String(empId)
    );

    if (selected) {
      const empLoc = selected.location || selected.branch || 'Chennai';
      const normalizedLoc = String(empLoc).toLowerCase().includes('hosur') ? 'Hosur' : 'Chennai';

      setFormData(prev => ({
        ...prev,
        employeeId: selected.employeeId || selected._id,
        employeeName: selected.name || selected.employeename || '',
        department: selected.department || selected.division || '',
        designation: selected.designation || selected.position || '',
        location: normalizedLoc
      }));
    }
  };

  const handleOpenAddModal = () => {
    setEditingExtension(null);
    setSelectedEmployeeId('');
    setFormData({
      employeeId: '',
      employeeName: '',
      department: '',
      designation: '',
      extensionNumber: '',
      location: 'Chennai',
      status: 'Active'
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ext) => {
    setEditingExtension(ext);
    setSelectedEmployeeId(ext.employeeId);
    setFormData({
      employeeId: ext.employeeId,
      employeeName: ext.employeeName,
      department: ext.department || '',
      designation: ext.designation || '',
      extensionNumber: ext.extensionNumber || '',
      location: ext.location || 'Chennai',
      status: ext.status || 'Active'
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employeeId) {
      setErrorMsg('Please select an employee from Employee Master');
      return;
    }
    if (!formData.extensionNumber.trim()) {
      setErrorMsg('Extension Number is required');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      if (editingExtension) {
        await extensionAPI.update(editingExtension._id, formData);
      } else {
        await extensionAPI.create(formData);
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving extension:', error);
      setErrorMsg(error.response?.data?.message || 'Failed to save extension number');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (ext) => {
    const newStatus = ext.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await extensionAPI.updateStatus(ext._id, newStatus);
      setExtensions(prev => prev.map(item => item._id === ext._id ? { ...item, status: newStatus } : item));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update extension status');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the extension record for ${name}?`)) {
      try {
        await extensionAPI.delete(id);
        setExtensions(prev => prev.filter(item => item._id !== id));
      } catch (error) {
        console.error('Error deleting extension:', error);
        alert('Failed to delete extension record');
      }
    }
  };

  const filteredExtensions = useMemo(() => {
    return extensions.filter(ext => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        (ext.employeeName || '').toLowerCase().includes(q) ||
        (ext.department || '').toLowerCase().includes(q) ||
        (ext.designation || '').toLowerCase().includes(q) ||
        (ext.extensionNumber || '').toLowerCase().includes(q) ||
        (ext.location || '').toLowerCase().includes(q);

      const matchStatus = statusFilter === 'All' || ext.status === statusFilter;
      const matchLocation = locationFilter === 'All' || ext.location === locationFilter;
      return matchSearch && matchStatus && matchLocation;
    });
  }, [extensions, searchQuery, statusFilter, locationFilter]);

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md border border-slate-200">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">🚫</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
          <p className="text-slate-600 text-sm">Extension Master is accessible only by Super Admin and IT Admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-[#262760] rounded-xl">
              <Phone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#262760]">Phone Extension Master</h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Manage official employee phone extension numbers</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 text-slate-600 hover:text-[#262760] hover:bg-slate-100 rounded-xl transition-all"
            title="Refresh list"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-[#262760] hover:bg-indigo-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Add Extension
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Employee Name, Department, Designation, or Extension..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Location:</label>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Locations</option>
            <option value="Chennai">🏢 Chennai</option>
            <option value="Hosur">🏭 Hosur</option>
          </select>

          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ml-2">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#262760] text-white">
                <th className="p-4 font-bold text-center w-14">S.No</th>
                <th className="p-4 font-bold">Employee Name</th>
                <th className="p-4 font-bold">Location</th>
                <th className="p-4 font-bold">Department</th>
                <th className="p-4 font-bold">Designation</th>
                <th className="p-4 font-bold">Extension Number</th>
                <th className="p-4 font-bold text-center">Status</th>
                <th className="p-4 font-bold text-center w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && extensions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
                      <span>Loading extension directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredExtensions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400 font-medium">
                    No extension records found matching your search.
                  </td>
                </tr>
              ) : (
                filteredExtensions.map((ext, idx) => (
                  <tr key={ext._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-center font-semibold text-slate-500">{idx + 1}</td>
                    <td className="p-4 font-bold text-slate-800">{ext.employeeName}</td>
                    <td className="p-4 font-semibold text-slate-700">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        ext.location === 'Hosur' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}>
                        {ext.location === 'Hosur' ? '🏭 Hosur' : '🏢 Chennai'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">{ext.department || 'N/A'}</td>
                    <td className="p-4 text-slate-600">{ext.designation || 'N/A'}</td>
                    <td className="p-4 font-mono font-bold text-indigo-700 bg-indigo-50/50 px-3 py-1 rounded-lg inline-block my-2">
                      ☎ {ext.extensionNumber}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                        ext.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}>
                        {ext.status === 'Active' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {ext.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(ext)}
                          className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                            ext.status === 'Active'
                              ? 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
                              : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                          title={ext.status === 'Active' ? 'Deactivate Extension' : 'Activate Extension'}
                        >
                          {ext.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(ext)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Extension"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ext._id, ext.employeeName)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Extension"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Extension Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-[#262760] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-bold">
                  {editingExtension ? 'Edit Phone Extension' : 'Add New Phone Extension'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-300 hover:text-white text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Employee from Employee Master *
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                  required
                  disabled={Boolean(editingExtension)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map(emp => (
                    <option key={emp._id || emp.employeeId} value={emp.employeeId || emp._id}>
                      {emp.name || emp.employeename} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-populated Employee Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Employee Name (Auto-populated)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.employeeName}
                    readOnly
                    placeholder="Auto-filled from Employee Master"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Auto-populated Department */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Department (Auto-populated)
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.department}
                    readOnly
                    placeholder="Auto-filled from Employee Master"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Auto-populated Designation */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Designation (Auto-populated)
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.designation}
                    readOnly
                    placeholder="Auto-filled from Employee Master"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Office Location Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Office Location *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-600" />
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                  >
                    <option value="Chennai">🏢 Chennai</option>
                    <option value="Hosur">🏭 Hosur</option>
                  </select>
                </div>
              </div>

              {/* Manual Entry: Extension Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Extension Number (Manual Entry) *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-600" />
                  <input
                    type="text"
                    value={formData.extensionNumber}
                    onChange={(e) => setFormData({ ...formData, extensionNumber: e.target.value })}
                    required
                    placeholder="e.g. 101, 204, 550"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-indigo-300 rounded-xl text-sm font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Submit / Cancel buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#262760] hover:bg-indigo-900 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingExtension ? 'Update Extension' : 'Save Extension')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
