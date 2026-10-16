import React, { useEffect, useState } from 'react';
import { contactDiaryAPI } from '../../services/api';
import {
  PlusIcon,
  PencilSquareIcon,
  EyeIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const CATEGORIES = [
  'Cleaning Service',
  'Milk Supplier',
  'Water Supplier',
  'Tea / Coffee Supplier',
  'Newspaper',
  'Stationery Supplier',
  'Printer / Photocopier Service',
  'Computer / Laptop Service',
  'Internet / Network Service',
  'Electrical Service',
  'Plumbing Service',
  'AC Service',
  'Pest Control',
  'Security Service',
  'Courier Service',
  'Cab / Transport',
  'Office Maintenance',
  'Nearby Hospital',
  'Ambulance',
  'Police',
  'Fire & Rescue',
  'Other'
];

// Validate Indian phone number (mobile or landline)
const isValidPhoneNumber = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Mobile: 10 digits starting with 6-9
  if (/^[6-9]\d{9}$/.test(cleaned)) return true;
  // Landline: 0 + 2-4 digit STD code + 6-8 digit number (total 10-12 digits)
  if (/^0\d{9,11}$/.test(cleaned)) return true;
  // Landline with hyphen format already cleaned: allow it if original had proper format
  // Also allow formats like 044-12345678
  if (/^0\d{2,4}\d{6,8}$/.test(cleaned)) return true;
  return false;
};

const OfficeContactDiary = () => {
  // Current user info
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const userRole = String(user.role || '').toLowerCase();
  const isAdminOrHr = ['admin', 'hr', 'director', 'manager'].includes(userRole);

  // Data states
  const [contacts, setContacts] = useState([]);
  const [locations, setLocations] = useState(['All']);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('Active');

  // Custom category states
  const [customCategories, setCustomCategories] = useState([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const allCategories = [...CATEGORIES.filter(c => c !== 'Other'), ...customCategories, 'Other'];

  // Modal states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected contact for view or edit
  const [selectedContact, setSelectedContact] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const initialFormState = {
    serviceName: '',
    category: 'Cleaning Service',
    contactPerson: '',
    contactNumber: '',
    alternateContactNumber: '',
    location: '',
    description: '',
    status: 'Active'
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});

  // Fetch contacts
  const fetchContacts = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const params = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedLocation !== 'All') params.location = selectedLocation;
      if (selectedStatus !== 'All') params.status = selectedStatus;
      if (search.trim()) params.search = search.trim();

      const res = await contactDiaryAPI.list(params);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setContacts(res.data.data);
      } else {
        setContacts([]);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load contacts.');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch locations
  const fetchLocations = async () => {
    try {
      const res = await contactDiaryAPI.getLocations();
      if (res.data?.success && Array.isArray(res.data.data)) {
        const unique = Array.from(new Set(['All', ...res.data.data.filter(Boolean)]));
        setLocations(unique);
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [selectedCategory, selectedLocation, selectedStatus]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    fetchContacts();
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setIsEditing(false);
    setSelectedContact(null);
    setFormData(initialFormState);
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (contact) => {
    setIsEditing(true);
    setSelectedContact(contact);
    setFormData({
      serviceName: contact.serviceName || '',
      category: contact.category || 'Other',
      contactPerson: contact.contactPerson || '',
      contactNumber: contact.contactNumber || '',
      alternateContactNumber: contact.alternateContactNumber || '',
      location: contact.location || '',
      description: contact.description || '',
      status: contact.status || 'Active'
    });
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  // Open View Modal
  const handleOpenViewModal = (contact) => {
    setSelectedContact(contact);
    setIsViewModalOpen(true);
  };

  // Handle adding a custom category
  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    // Check duplicates
    if (allCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setFormErrors(prev => ({ ...prev, category: 'Category already exists' }));
      return;
    }
    setCustomCategories(prev => [...prev, trimmed]);
    setFormData(prev => ({ ...prev, category: trimmed }));
    setNewCategoryName('');
    setIsAddingCategory(false);
    setFormErrors(prev => ({ ...prev, category: undefined }));
  };

  // Form validation
  const validateForm = () => {
    const errors = {};
    if (!formData.serviceName.trim()) {
      errors.serviceName = 'Service Name is required';
    }
    if (!formData.category.trim()) {
      errors.category = 'Category is required';
    }
    if (!formData.contactNumber.trim()) {
      errors.contactNumber = 'Contact Number is required';
    } else if (!isValidPhoneNumber(formData.contactNumber)) {
      errors.contactNumber = 'Enter a valid mobile (e.g. 9876543210) or landline (e.g. 044-12345678)';
    }
    if (formData.alternateContactNumber.trim() && !isValidPhoneNumber(formData.alternateContactNumber)) {
      errors.alternateContactNumber = 'Enter a valid mobile (e.g. 9876543210) or landline (e.g. 044-12345678)';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Save (Add or Edit)
  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      if (isEditing && selectedContact?._id) {
        await contactDiaryAPI.update(selectedContact._id, formData);
        setSuccessMsg('Contact updated successfully!');
      } else {
        await contactDiaryAPI.create(formData);
        setSuccessMsg('Contact added successfully!');
      }

      setIsAddEditModalOpen(false);
      await fetchContacts();
      await fetchLocations();

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving contact:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to save contact.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Activate / Deactivate status toggle
  const handleToggleStatus = async (contact) => {
    const newStatus = contact.status === 'Active' ? 'Inactive' : 'Active';
    const confirmMsg = `Are you sure you want to mark "${contact.serviceName}" as ${newStatus}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await contactDiaryAPI.toggleStatus(contact._id, newStatus);
      setSuccessMsg(`Contact marked as ${newStatus}!`);
      await fetchContacts();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error updating status:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update contact status.');
    }
  };

  // Helper for Category badge colors
  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'Cleaning Service':
      case 'Office Maintenance':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Milk Supplier':
      case 'Water Supplier':
      case 'Tea / Coffee Supplier':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Electrical Service':
      case 'Plumbing Service':
      case 'AC Service':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Computer / Laptop Service':
      case 'Internet / Network Service':
      case 'Printer / Photocopier Service':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Security Service':
      case 'Pest Control':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Cab / Transport':
      case 'Courier Service':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Police':
      case 'Fire & Rescue':
      case 'Ambulance':
      case 'Nearby Hospital':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Top Banner Alert Messages */}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg flex items-center justify-between text-sm shadow-sm transition-all">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-green-600 hover:text-green-800">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center justify-between text-sm shadow-sm transition-all">
          <div className="flex items-center gap-2">
            <XCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-600 hover:text-red-800">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-5 mb-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#262760] text-white flex items-center justify-center shadow">
              <BuildingOffice2Icon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 tracking-tight">
                Office Contact Diary
              </h1>
              <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                Centralized registry for office services, vendors, and suppliers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Add Contact Button (Only Admin / HR) */}
          {isAdminOrHr && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-[#262760] hover:bg-[#1a1b44] text-white text-xs md:text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <PlusIcon className="w-4 h-4 md:w-5 md:h-5" />
              Add Contact
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by Service, Person, Phone, or Location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#262760] focus:border-[#262760]"
              />
            </div>

            {/* Category Filter */}
            <div className="w-full sm:w-56">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#262760] bg-white"
              >
                <option value="All">All Categories</option>
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div className="w-full sm:w-44">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#262760] bg-white"
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc === 'All' ? 'All Locations' : loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter (Active / Inactive / All) */}
            <div className="w-full sm:w-36">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#262760] bg-white"
              >
                <option value="Active">Active Only</option>
                {isAdminOrHr && <option value="Inactive">Inactive</option>}
                {isAdminOrHr && <option value="All">All Status</option>}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-[#262760] text-white rounded-lg text-sm font-medium hover:bg-[#1a1b44] transition-colors"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedCategory('All');
                setSelectedLocation('All');
                setSelectedStatus('Active');
              }}
              className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              title="Reset Filters"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">
              Directory Contacts
            </span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
              {contacts.length} record{contacts.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-4 border-[#262760] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading contacts...</span>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <BuildingOffice2Icon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p className="text-base font-semibold text-gray-700">No contacts found</p>
            <p className="text-xs text-gray-500 mt-1">
              Try adjusting your search criteria or filters, or add a new office service contact.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead className="bg-[#262760] text-white">
                <tr>
                  <th className="p-3 border border-gray-600 text-center text-xs md:text-sm font-semibold tracking-wider w-14">
                    S.No
                  </th>
                  <th className="p-3 border border-gray-600 text-left text-xs md:text-sm font-semibold tracking-wider">
                    Category
                  </th>
                  <th className="p-3 border border-gray-600 text-left text-xs md:text-sm font-semibold tracking-wider">
                    Service Name
                  </th>
                  <th className="p-3 border border-gray-600 text-left text-xs md:text-sm font-semibold tracking-wider">
                    Contact Person
                  </th>
                  <th className="p-3 border border-gray-600 text-left text-xs md:text-sm font-semibold tracking-wider">
                    Contact Number
                  </th>
                  <th className="p-3 border border-gray-600 text-left text-xs md:text-sm font-semibold tracking-wider">
                    Location
                  </th>
                  {isAdminOrHr && (
                    <th className="p-3 border border-gray-600 text-left text-xs md:text-sm font-semibold tracking-wider">
                      Status
                    </th>
                  )}
                  <th className="p-3 border border-gray-600 text-center text-xs md:text-sm font-semibold tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {contacts.map((contact, idx) => {
                  const badgeClass = getCategoryBadgeClass(contact.category);
                  const isInactive = contact.status === 'Inactive';

                  return (
                    <tr
                      key={contact._id}
                      className={`hover:bg-gray-50 transition-colors ${isInactive ? 'bg-gray-50/60 opacity-75' : ''}`}
                    >
                      {/* S.No */}
                      <td className="p-3 border border-gray-200 text-sm text-center font-medium text-gray-600 whitespace-nowrap">
                        {idx + 1}
                      </td>

                      {/* Category */}
                      <td className="p-3 border border-gray-200 text-sm whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border ${badgeClass}`}>
                          {contact.category}
                        </span>
                      </td>

                      {/* Service Name */}
                      <td className="p-3 border border-gray-200 text-sm font-semibold text-gray-900">
                        <span>{contact.serviceName}</span>
                      </td>

                      {/* Contact Person */}
                      <td className="p-3 border border-gray-200 text-sm text-gray-700">
                        {contact.contactPerson || '-'}
                      </td>

                      {/* Contact Number (Plain text without call links) */}
                      <td className="p-3 border border-gray-200 text-sm">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-gray-900">
                            {contact.contactNumber}
                          </span>
                          {contact.alternateContactNumber && (
                            <span className="text-xs text-gray-500">
                              <span className="text-[10px] text-gray-400 font-medium">Alt: </span>
                              {contact.alternateContactNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="p-3 border border-gray-200 text-sm text-gray-700 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 font-medium text-gray-800">
                          {contact.location || '-'}
                        </span>
                      </td>

                      {/* Status (Admin / HR) */}
                      {isAdminOrHr && (
                        <td className="p-3 border border-gray-200 text-sm whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${
                              contact.status === 'Active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {contact.status || 'Active'}
                          </span>
                        </td>
                      )}

                      {/* Actions (View, Edit, Activate/Deactivate - Call removed) */}
                      <td className="p-3 border border-gray-200 text-sm text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 👁️ View Button */}
                          <button
                            onClick={() => handleOpenViewModal(contact)}
                            className="p-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-[#262760] hover:text-white transition-colors"
                            title="View Contact Details"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>

                          {/* ✏️ Edit Button (Admin / HR) */}
                          {isAdminOrHr && (
                            <button
                              onClick={() => handleOpenEditModal(contact)}
                              className="p-1.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white transition-colors"
                              title="Edit Contact"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                          )}

                          {/* 🔄 Activate / Deactivate (Admin / HR) */}
                          {isAdminOrHr && (
                            <button
                              onClick={() => handleToggleStatus(contact)}
                              className={`p-1.5 rounded-md text-xs font-semibold transition-colors ${
                                contact.status === 'Active'
                                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-600 hover:text-white'
                                  : 'bg-green-100 text-green-700 hover:bg-green-600 hover:text-white'
                              }`}
                              title={contact.status === 'Active' ? 'Deactivate Contact' : 'Activate Contact'}
                            >
                              {contact.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ----------------- MODAL: Add / Edit Contact ----------------- */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 animate-fadeIn">
            {/* Header */}
            <div className="px-6 py-4 bg-[#262760] text-white flex items-center justify-between">
              <h2 className="text-base md:text-lg font-bold tracking-wide">
                {isEditing ? 'Edit Contact' : 'Add New Office Contact'}
              </h2>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="text-white hover:text-gray-300 p-1 rounded-full hover:bg-white/10"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveContact} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Service Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                    Service / Vendor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC Cleaning Services, Kumar Milk Supply"
                    value={formData.serviceName}
                    onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                    className={`w-full p-2.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#262760] ${
                      formErrors.serviceName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.serviceName && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.serviceName}</p>
                  )}
                </div>

                {/* Category with Add Button */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                    Category <span className="text-red-500">*</span>
                  </label>
                  {isAddingCategory ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Enter new category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); }
                          if (e.key === 'Escape') { setIsAddingCategory(false); setNewCategoryName(''); }
                        }}
                        className="flex-1 p-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#262760]"
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        className="px-3 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); }}
                        className="px-2.5 py-2 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="flex-1 p-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#262760] bg-white"
                      >
                        {allCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="px-3 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1a1b44] transition-colors flex items-center gap-1"
                        title="Add new category"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {formErrors.category && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.category}</p>
                  )}
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh, Suresh, John Doe"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#262760]"
                  />
                </div>

                {/* Contact Number */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210 or 044-12345678"
                    value={formData.contactNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9\-\s()]/g, '');
                      setFormData({ ...formData, contactNumber: val });
                      if (formErrors.contactNumber) setFormErrors(prev => ({ ...prev, contactNumber: undefined }));
                    }}
                    maxLength={15}
                    className={`w-full p-2.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#262760] ${
                      formErrors.contactNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.contactNumber && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.contactNumber}</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-0.5">Mobile: 9876543210 | Landline: 044-12345678</p>
                </div>

                {/* Alternate Contact Number */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                    Alternate Contact Number
                  </label>
                  <input
                    type="text"
                    placeholder="Optional secondary phone number"
                    value={formData.alternateContactNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9\-\s()]/g, '');
                      setFormData({ ...formData, alternateContactNumber: val });
                      if (formErrors.alternateContactNumber) setFormErrors(prev => ({ ...prev, alternateContactNumber: undefined }));
                    }}
                    maxLength={15}
                    className={`w-full p-2.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#262760] ${
                      formErrors.alternateContactNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.alternateContactNumber && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.alternateContactNumber}</p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chennai, Hosur"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#262760]"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#262760] bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#262760] text-white rounded-lg text-sm font-semibold hover:bg-[#1a1b44] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : isEditing ? 'Update Contact' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: View Contact Details ----------------- */}
      {isViewModalOpen && selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 animate-fadeIn">
            {/* Header */}
            <div className="px-6 py-4 bg-[#262760] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BuildingOffice2Icon className="w-5 h-5 text-gray-200" />
                <h2 className="text-base md:text-lg font-bold tracking-wide">
                  Contact Details
                </h2>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-white hover:text-gray-300 p-1 rounded-full hover:bg-white/10"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-2 border-b pb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedContact.serviceName}</h3>
                  <span className="inline-block mt-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                    {selectedContact.category}
                  </span>
                </div>
                <span
                  className={`px-2.5 py-1 text-xs font-bold rounded ${
                    selectedContact.status === 'Active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {selectedContact.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Contact Person</p>
                  <p className="text-gray-800 font-medium">{selectedContact.contactPerson || '-'}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Location</p>
                  <p className="text-gray-800 font-medium">{selectedContact.location || '-'}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 space-y-2.5">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Primary Contact Number</p>
                  <p className="text-base font-bold text-gray-900 mt-0.5">{selectedContact.contactNumber}</p>
                </div>

                {selectedContact.alternateContactNumber && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500 font-semibold uppercase">Alternate Number</p>
                    <p className="text-sm font-semibold text-gray-700 mt-0.5">{selectedContact.alternateContactNumber}</p>
                  </div>
                )}
              </div>


              {selectedContact.createdAt && (
                <div className="pt-2 text-xs text-gray-400 flex justify-between">
                  <span>Created: {new Date(selectedContact.createdAt).toLocaleDateString()}</span>
                  {selectedContact.createdByName && <span>By: {selectedContact.createdByName}</span>}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium rounded-lg transition-colors"
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

export default OfficeContactDiary;
