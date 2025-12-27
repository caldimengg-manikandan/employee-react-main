import React, { useEffect, useState } from "react";
import { internAPI } from "../../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  PlusIcon,
  UserIcon,
  BriefcaseIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/outline";

const InternReference = () => {
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    internID: "",
    fullName: "",
    collegeName: "",
    degree: "",
    department: "",
    internshipType: "Internship",
    mentor: "",
    referenceNote: "",
    startDate: "",
    endDate: "",
    status: "Completed",
    contactEmail: "",
    contactPhone: ""
  });

  const [errors, setErrors] = useState({});

  // Show notification
  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await internAPI.getAll();
      
      // Handle different response formats
      let internsData = [];
      
      if (Array.isArray(response.data)) {
        internsData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        internsData = response.data.data;
      } else if (Array.isArray(response)) {
        internsData = response;
      } else if (response && response.data && typeof response.data === 'object') {
        internsData = [response.data];
      }
      
      setInterns(internsData);
    } catch (error) {
      console.error('Error loading interns:', error);
      showNotification("Failed to load intern data", "error");
      setInterns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.internID.trim()) newErrors.internID = "Intern ID is required";
    if (!form.fullName.trim()) newErrors.fullName = "Full Name is required";
    if (!form.collegeName.trim()) newErrors.collegeName = "College Name is required";
    if (!form.degree.trim()) newErrors.degree = "Degree is required";
    if (!form.department.trim()) newErrors.department = "Department is required";
    if (!form.mentor.trim()) newErrors.mentor = "Mentor is required";
    if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
      newErrors.contactEmail = "Invalid email format";
    }
    if (form.contactPhone && !/^[0-9]{10}$/.test(form.contactPhone)) {
      newErrors.contactPhone = "Phone must be 10 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showNotification("Please fix the errors in the form", "error");
      return;
    }

    try {
      const internData = {
        ...form,
        startDate: form.startDate || new Date().toISOString().split('T')[0],
        endDate: form.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      if (editingId) {
        await internAPI.update(editingId, internData);
        showNotification("Intern details updated successfully!");
      } else {
        await internAPI.create(internData);
        showNotification("Intern added successfully!");
      }
      
      loadData();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving intern:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to save intern details";
      showNotification(errorMessage, "error");
    }
  };

  const handleEdit = (intern) => {
    setEditingId(intern._id || intern.id);
    setForm({
      internID: intern.internID || "",
      fullName: intern.fullName || "",
      collegeName: intern.collegeName || "",
      degree: intern.degree || "",
      department: intern.department || "",
      internshipType: intern.internshipType || "Internship",
      mentor: intern.mentor || "",
      referenceNote: intern.referenceNote || "",
      startDate: intern.startDate ? new Date(intern.startDate).toISOString().split('T')[0] : "",
      endDate: intern.endDate ? new Date(intern.endDate).toISOString().split('T')[0] : "",
      status: intern.status || "Completed",
      contactEmail: intern.contactEmail || "",
      contactPhone: intern.contactPhone || ""
    });
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await internAPI.remove(id);
        showNotification("Intern deleted successfully!");
        loadData();
      } catch (error) {
        console.error('Error deleting intern:', error);
        showNotification("Failed to delete intern", "error");
      }
    }
  };

  const resetForm = () => {
    setForm({
      internID: "",
      fullName: "",
      collegeName: "",
      degree: "",
      department: "",
      internshipType: "Internship",
      mentor: "",
      referenceNote: "",
      startDate: "",
      endDate: "",
      status: "Completed",
      contactEmail: "",
      contactPhone: ""
    });
    setEditingId(null);
    setErrors({});
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  // Ensure interns is always an array before filtering
  const safeInterns = Array.isArray(interns) ? interns : [];
  
  const filteredInterns = safeInterns.filter(intern => {
    if (!intern) return false;
    
    const matchesSearch = 
      (intern.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (intern.collegeName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (intern.department?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (intern.mentor?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === "all" || intern.internshipType === filterType;
    const matchesStatus = filterStatus === "all" || intern.status === filterStatus;
    
    return matchesSearch && matchesFilter && matchesStatus;
  });

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text("Intern Reference List", 14, 20);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

    const tableColumn = ["S.No", "Full Name", "Degree", "Internship Type", "Company Mentor", "Contact No", "Status"];
    const tableRows = [];

    filteredInterns.forEach((intern, index) => {
      const internData = [
        index + 1,
        intern.fullName || "N/A",
        intern.degree || "N/A",
        intern.internshipType || "N/A",
        intern.mentor || "N/A",
        intern.contactPhone || "N/A",
        intern.status || "N/A"
      ];
      tableRows.push(internData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      headStyles: { fillColor: [30, 58, 138] }, // Dark Blue (blue-900)
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 15 }, // S.No
        // Adjust other widths if necessary, autoTable does a decent job usually
      }
    });

    doc.save("intern_reference_list.pdf");
  };

  // Notification component
  const Notification = () => {
    if (!notification.show) return null;

    const bgColor = notification.type === "error" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200";
    const textColor = notification.type === "error" ? "text-red-800" : "text-green-800";
    const iconColor = notification.type === "error" ? "text-red-500" : "text-green-500";
    const Icon = notification.type === "error" ? ExclamationCircleIcon : InformationCircleIcon;

    return (
      <div className={`fixed top-4 right-4 z-50 border rounded-lg p-4 ${bgColor} shadow-lg flex items-center gap-3 max-w-md animate-fade-in`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
        <p className={`font-medium ${textColor}`}>{notification.message}</p>
        <button
          onClick={() => setNotification({ show: false, message: "", type: "" })}
          className="ml-auto text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Notification Component */}
      <Notification />
      
      {/* Header with Add Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur opacity-20"></div>
             
            </div>
           
          </div>
          
        </div>
        
        <div className="flex gap-3 mt-4 md:mt-0">
          
        </div>
      </div>

      {/* Debug info (remove in production) */}
      <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-gray-600 hidden">
        <div className="flex items-center gap-2">
          <InformationCircleIcon className="h-4 w-4 text-yellow-600" />
          <span>Loaded {safeInterns.length} interns</span>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75 backdrop-blur-sm" 
              onClick={() => setShowModal(false)}
            />
            
            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-gradient-to-r from-blue-600 to-purple-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AcademicCapIcon className="h-8 w-8 text-white" />
                    <h3 className="text-xl font-bold text-white">
                      {editingId ? "Edit Intern Details" : "Add New Intern"}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-white hover:text-blue-100 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="px-6 py-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Personal Information */}
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                      <h4 className="flex items-center gap-2 text-blue-800 font-semibold mb-4">
                        <UserIcon className="h-5 w-5" />
                        Personal Information
                      </h4>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Intern ID *
                          </label>
                          <input
                            placeholder="Enter Intern ID"
                            className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.internID ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                            value={form.internID}
                            onChange={e => {
                              setForm({ ...form, internID: e.target.value });
                              if (errors.internID) setErrors({...errors, internID: null});
                            }}
                          />
                          {errors.internID && <p className="text-red-500 text-sm mt-1">{errors.internID}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Full Name *
                          </label>
                          <input
                            placeholder="Enter full name"
                            className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.fullName ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                            value={form.fullName}
                            onChange={e => {
                              setForm({ ...form, fullName: e.target.value });
                              if (errors.fullName) setErrors({...errors, fullName: null});
                            }}
                          />
                          {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            College Name *
                          </label>
                          <input
                            placeholder="Enter college name"
                            className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.collegeName ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                            value={form.collegeName}
                            onChange={e => {
                              setForm({ ...form, collegeName: e.target.value });
                              if (errors.collegeName) setErrors({...errors, collegeName: null});
                            }}
                          />
                          {errors.collegeName && <p className="text-red-500 text-sm mt-1">{errors.collegeName}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Degree *
                          </label>
                          <input
                            placeholder="e.g., B.Tech, B.Sc, MCA"
                            className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.degree ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                            value={form.degree}
                            onChange={e => {
                              setForm({ ...form, degree: e.target.value });
                              if (errors.degree) setErrors({...errors, degree: null});
                            }}
                          />
                          {errors.degree && <p className="text-red-500 text-sm mt-1">{errors.degree}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Department *
                          </label>
                          <input
                            placeholder="e.g., Computer Science, Mechanical"
                            className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.department ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                            value={form.department}
                            onChange={e => {
                              setForm({ ...form, department: e.target.value });
                              if (errors.department) setErrors({...errors, department: null});
                            }}
                          />
                          {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                      <h4 className="flex items-center gap-2 text-purple-800 font-semibold mb-4">
                        <PhoneIcon className="h-5 w-5" />
                        Contact Information
                      </h4>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Contact Email
                          </label>
                          <div className="relative">
                            <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type="email"
                              placeholder="student@college.edu"
                              className={`w-full border rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${errors.contactEmail ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                              value={form.contactEmail}
                              onChange={e => {
                                setForm({ ...form, contactEmail: e.target.value });
                                if (errors.contactEmail) setErrors({...errors, contactEmail: null});
                              }}
                            />
                          </div>
                          {errors.contactEmail && <p className="text-red-500 text-sm mt-1">{errors.contactEmail}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Contact Phone
                          </label>
                          <div className="relative">
                            <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type="tel"
                              placeholder="10-digit mobile number"
                              className={`w-full border rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${errors.contactPhone ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                              value={form.contactPhone}
                              onChange={e => {
                                setForm({ ...form, contactPhone: e.target.value });
                                if (errors.contactPhone) setErrors({...errors, contactPhone: null});
                              }}
                            />
                          </div>
                          {errors.contactPhone && <p className="text-red-500 text-sm mt-1">{errors.contactPhone}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Internship Details */}
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                      <h4 className="flex items-center gap-2 text-indigo-800 font-semibold mb-4">
                        <BriefcaseIcon className="h-5 w-5" />
                        Internship Details
                      </h4>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Internship Type
                          </label>
                          <select
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                            value={form.internshipType}
                            onChange={e => setForm({ ...form, internshipType: e.target.value })}
                          >
                            <option value="Internship">Internship</option>
                            <option value="Inplant Training">Inplant Training</option>
                            <option value="Project Internship">Project Internship</option>
                            <option value="Summer Internship">Summer Internship</option>
                            <option value="Winter Internship">Winter Internship</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Company Mentor *
                          </label>
                          <input
                            placeholder="Enter mentor name"
                            className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${errors.mentor ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                            value={form.mentor}
                            onChange={e => {
                              setForm({ ...form, mentor: e.target.value });
                              if (errors.mentor) setErrors({...errors, mentor: null});
                            }}
                          />
                          {errors.mentor && <p className="text-red-500 text-sm mt-1">{errors.mentor}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Status
                          </label>
                          <select
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                            value={form.status}
                            onChange={e => setForm({ ...form, status: e.target.value })}
                          >
                            <option value="Completed">Completed</option>
                            <option value="Ongoing">Ongoing</option>
                            <option value="Terminated">Terminated</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Duration & Dates */}
                    <div className="bg-cyan-50 p-4 rounded-xl border border-cyan-200">
                      <h4 className="flex items-center gap-2 text-cyan-800 font-semibold mb-4">
                        <CalendarDaysIcon className="h-5 w-5" />
                        Duration & Dates
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Start Date *
                          </label>
                          <input
                            type="date"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                            value={form.startDate}
                            onChange={e => setForm({ ...form, startDate: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            End Date *
                          </label>
                          <input
                            type="date"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                            value={form.endDate}
                            onChange={e => setForm({ ...form, endDate: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Reference Notes */}
                    <div className="bg-pink-50 p-4 rounded-xl border border-pink-200">
                      <h4 className="flex items-center gap-2 text-pink-800 font-semibold mb-4">
                        <DocumentTextIcon className="h-5 w-5" />
                        Reference Notes / Remarks
                      </h4>
                      
                      <textarea
                        placeholder="Enter any notes, feedback, or remarks about the intern..."
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all min-h-[120px] resize-y"
                        value={form.referenceNote}
                        onChange={e => setForm({ ...form, referenceNote: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-end mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                    {editingId ? "Update Intern" : "Save Intern"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-md p-2 mb-2 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, college, department, or mentor..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-3">
            <select
              className="border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="Internship">Internship</option>
              <option value="Inplant Training">Inplant Training</option>
              <option value="Project Internship">Project Internship</option>
            </select>

            <select
              className="border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="Completed">Completed</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Terminated">Terminated</option>
            </select>
            <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 shadow-sm"
          >
            <ArrowDownTrayIcon className="h-5 w-5 text-gray-500" />
            Download PDF
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200"
          >
            <PlusIcon className="h-5 w-5" />
            Add New Intern
          </button>
            
            {(searchTerm || filterType !== 'all' || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterType("all");
                  setFilterStatus("all");
                }}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg font-medium transition-colors duration-200"
              >
                <XMarkIcon className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
          
        </div>
        </div>
      </div>

      {/* Interns Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">
              Internship List ({filteredInterns.length})
            </h3>
            {loading && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Loading...</span>
              </div>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading intern data...</p>
          </div>
        ) : filteredInterns.length === 0 ? (
          <div className="p-8 text-center">
            <AcademicCapIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No interns found. Add your first intern using the button above!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-900 text-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">S.No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Intern ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Full Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Degree</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Internship Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Company Mentor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Contact No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInterns.map((intern, index) => (
                  <tr key={intern._id || intern.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {intern.internID || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{intern.fullName || 'N/A'}</div>
                      {intern.referenceNote && (
                        <p className="text-xs text-gray-500 italic mt-1">"{intern.referenceNote}"</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {intern.degree || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {intern.internshipType || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {intern.mentor || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {intern.contactPhone || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full inline-block font-medium ${
                        intern.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        intern.status === 'Ongoing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {intern.status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(intern)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(intern._id || intern.id, intern.fullName)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      {/* <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-700">Total Interns</p>
          <p className="text-2xl font-bold text-blue-900">{safeInterns.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          <p className="text-sm text-green-700">Completed</p>
          <p className="text-2xl font-bold text-green-900">
            {safeInterns.filter(i => i?.status === 'Completed').length}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
          <p className="text-sm text-yellow-700">Ongoing</p>
          <p className="text-2xl font-bold text-yellow-900">
            {safeInterns.filter(i => i?.status === 'Ongoing').length}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
          <p className="text-sm text-purple-700">Unique Colleges</p>
          <p className="text-2xl font-bold text-purple-900">
            {[...new Set(safeInterns.map(i => i?.collegeName).filter(Boolean))].length}
          </p>
        </div>
      </div> */}

      {/* Add CSS animation for notification */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default InternReference;