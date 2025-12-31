import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  TrashIcon,
  UserCircleIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  PaperClipIcon,
  BuildingOfficeIcon,
  CheckIcon,
  XMarkIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { exitFormalityAPI, employeeAPI } from '../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ExitApproval = () => {
  const [loading, setLoading] = useState(true);
  const [exitForms, setExitForms] = useState([]);
  const [filteredForms, setFilteredForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [showRelievingLetter, setShowRelievingLetter] = useState(false);
  const [letterData, setLetterData] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({ 
    employeeName: '',
    employeeId: '',
    division: '',
    status: 'all',
    location: ''
  });
  const [employees, setEmployees] = useState([]);

  // Get current user role
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const userRole = user.role || '';
  const companyName = sessionStorage.getItem('companyName') || 'Your Company Name';
  const companyAddress = sessionStorage.getItem('companyAddress') || 'Your Company Address';
  const hrManager = sessionStorage.getItem('hrManager') || 'HR Manager';

  // Divisions list
  const divisions = ['Engineering', 'HR', 'Sales', 'Marketing', 'Finance', 'Operations'];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'clearance_in_progress', label: 'Clearance In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' }
  ];

  useEffect(() => {
    fetchExitForms();
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterForms();
  }, [exitForms, filters]);

  const fetchExitForms = async () => {
    setLoading(true);
    try {
      const res = await exitFormalityAPI.getAll();
      setExitForms(res.data.data || []);
    } catch (error) {
      console.error('Error fetching exit forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.getAllEmployees();
      setEmployees(res.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const filterForms = () => {
    let result = [...exitForms];
    
    if (filters.status !== 'all') {
      result = result.filter(form => form.status === filters.status);
    }

    if (filters.employeeName) {
      result = result.filter(form => form.employeeName === filters.employeeName);
    }

    if (filters.employeeId) {
      result = result.filter(form => (form.employeeId?.employeeId || '') === filters.employeeId);
    }

    if (filters.division) {
      result = result.filter(form => form.department === filters.division || form.division === filters.division);
    }

    if (filters.location) {
      const loc = filters.location.toLowerCase();
      result = result.filter(form => {
        const formLoc = (form.location || '').toLowerCase();
        if (formLoc) return formLoc === loc;
        const empCode = form.employeeId?.employeeId;
        const emp = employees.find(e => e.employeeId === empCode);
        const empLoc = (emp?.location || '').toLowerCase();
        return empLoc === loc;
      });
    }

    setFilteredForms(result);
  };

  const handleGenerateRelievingLetter = (form) => {
    if (form.status !== 'completed') {
      alert("Relieving letter can only be generated for completed exit requests.");
      return;
    }

    // Calculate years of service
    const joinDate = new Date(form.employeeDetails?.dateOfJoining || form.joinDate);
    const lwd = new Date(form.proposedLastWorkingDay);
    const years = Math.floor((lwd - joinDate) / (365 * 24 * 60 * 60 * 1000));
    const months = Math.floor(((lwd - joinDate) % (365 * 24 * 60 * 60 * 1000)) / (30 * 24 * 60 * 60 * 1000));

    const letterData = {
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      employeeName: form.employeeName,
      employeeAddress: form.employeeDetails?.address || 'Not specified',
      employeePhone: form.employeeDetails?.phone || 'Not specified',
      employeeId: form.employeeId?.employeeId || form.employeeDetails?.employeeId,
      designation: form.employeeDetails?.position || form.position,
      department: form.employeeDetails?.department || form.department,
      joinDate: joinDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      lastWorkingDate: lwd.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      yearsOfService: years,
      monthsOfService: months,
      companyName: companyName,
      companyAddress: companyAddress,
      hrManager: hrManager,
      resignationDate: new Date(form.createdAt || form.resignationDate || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      finalSettlement: 'Full and final settlement has been processed.',
      assetsReturned: 'All company assets have been returned.',
      formalityCompleted: 'All exit formalities have been completed.'
    };

    setLetterData(letterData);
    setShowRelievingLetter(true);
  };

  const downloadRelievingLetter = async () => {
    try {
      const element = document.getElementById('relieving-letter-template');
      if (!element) {
        alert("Error generating letter. Please try again.");
        return;
      }
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      let imgWidth = 210;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let imgHeight = (canvas.height * imgWidth) / canvas.width;
      if (imgHeight > pageHeight) {
        imgHeight = pageHeight;
        imgWidth = (canvas.width * imgHeight) / canvas.height;
      }
      const pageWidth = pdf.internal.pageSize.getWidth();
      const x = (pageWidth - imgWidth) / 2;
      pdf.addImage(imgData, 'PNG', x, 0, imgWidth, imgHeight);
      const filename = `Relieving_Letter_${letterData.employeeId}_${letterData.employeeName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleManagerApprove = async (formId) => {
    if (!window.confirm("Are you sure you want to approve this exit request?")) return;
    setActionLoading(true);
    try {
      await exitFormalityAPI.managerApprove(formId);
      alert("Manager approval recorded.");
      fetchExitForms();
      setSelectedForm(null);
    } catch (error) {
      console.error("Manager approval failed:", error);
      alert("Failed to approve: " + (error.response?.data?.error || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleHRApprove = async (formId) => {
    if (!window.confirm("Confirm FINAL approval and completion of exit?")) return;
    setActionLoading(true);
    try {
      await exitFormalityAPI.approve(formId);
      alert("Exit process completed successfully.");
      fetchExitForms();
      setSelectedForm(null);
    } catch (error) {
      console.error("HR approval failed:", error);
      alert("Failed to complete: " + (error.response?.data?.error || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (formId) => {
    if (!window.confirm("Are you sure you want to delete this exit request? This cannot be undone.")) return;
    setActionLoading(true);
    try {
      await exitFormalityAPI.remove(formId);
      alert("Exit request deleted.");
      fetchExitForms();
      if (selectedForm?._id === formId) setSelectedForm(null);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete: " + (error.response?.data?.error || error.message));
    } finally {
      setActionLoading(false);
    }
  };
  const handleReject = async (formId) => {
    const reason = prompt("Please enter reason for rejection:");
    if (!reason) return;
    
    setActionLoading(true);
    try {
      await exitFormalityAPI.reject(formId, reason);
      alert("Exit request rejected/cancelled.");
      fetchExitForms();
      setSelectedForm(null);
    } catch (error) {
      console.error("Rejection failed:", error);
      alert("Failed to reject: " + (error.response?.data?.error || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearanceUpdate = async (formId, department, status) => {
    const remarks = prompt(`Enter remarks for ${department} clearance (${status}):`, "");
    if (remarks === null) return; // Cancelled

    setActionLoading(true);
    try {
      await exitFormalityAPI.updateClearance(formId, department, status, remarks);
      const updatedForm = await exitFormalityAPI.getExitById(formId);
      setSelectedForm(updatedForm.data.data);
      fetchExitForms();
    } catch (error) {
      console.error("Clearance update failed:", error);
      alert("Failed to update clearance");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': 
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'clearance_in_progress': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
          <div className="w-full">
             <label className="block text-sm font-medium text-gray-600 mb-2">Employee Name</label>
             <select
               value={filters.employeeName}
               onChange={(e) => setFilters(prev => ({ ...prev, employeeName: e.target.value }))}
               className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4"
             >
               <option value="">All</option>
               {employees.map(emp => (
                 <option key={emp._id} value={emp.name}>{emp.name}</option>
               ))}
             </select>
          </div>
          <div className="w-full">
             <label className="block text-sm font-medium text-gray-600 mb-2">Employee ID</label>
             <select
               value={filters.employeeId}
               onChange={(e) => setFilters(prev => ({ ...prev, employeeId: e.target.value }))}
               className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4"
             >
               <option value="">All</option>
               {employees.map(emp => (
                 <option key={emp._id} value={emp.employeeId}>{emp.employeeId}</option>
               ))}
             </select>
          </div>
          <div className="w-full">
             <label className="block text-sm font-medium text-gray-600 mb-2">Division</label>
             <select
               value={filters.division}
               onChange={(e) => setFilters(prev => ({ ...prev, division: e.target.value }))}
               className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4"
             >
               <option value="">All Divisions</option>
               {divisions.map(div => (
                 <option key={div} value={div}>{div}</option>
               ))}
             </select>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-600 mb-2">Location</label>
            <select
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4"
            >
              <option value="">All Locations</option>
              <option value="hosur">Hosur</option>
              <option value="chennai">Chennai</option>
            </select>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-600 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#1e2050]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Employee ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Employee Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Division</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">LWD</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-4 text-center">Loading...</td></tr>
              ) : filteredForms.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-4 text-center text-gray-500">No requests found</td></tr>
              ) : (
                filteredForms.map((form) => (
                  <tr key={form._id} className="hover:bg-indigo-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {form.employeeId?.employeeId || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {form.employeeName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {form.department || form.division || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {form.proposedLastWorkingDay ? new Date(form.proposedLastWorkingDay).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs" title={form.reasonForLeaving}>
                      {form.reasonForLeaving?.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(form.status)}`}>
                        {form.status?.toUpperCase().replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedForm(form)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-indigo-50"
                          title="View Details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        
                        {/* Inline Approve Action */}
                        {(['projectmanager', 'teamlead', 'admin'].includes(userRole) && !form.approvedByManager && form.status !== 'completed' && form.status !== 'rejected') && (
                          <button
                            onClick={() => handleManagerApprove(form._id)}
                            className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50"
                            title="Manager Approve"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                        )}
                        {(['hr', 'admin'].includes(userRole) && form.status !== 'completed' && form.status !== 'rejected') && (
                           <button
                             onClick={() => handleHRApprove(form._id)}
                             className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50"
                             title="HR Approve / Complete"
                           >
                             <CheckIcon className="h-5 w-5" />
                           </button>
                        )}

                        {/* Inline Reject Action */}
                        {(form.status !== 'completed' && form.status !== 'rejected' && form.status !== 'cancelled') && (
                          <button
                            onClick={() => handleReject(form._id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                            title="Reject"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        )}

                        {/* Delete */}
                        {(['admin','hr'].includes(userRole)) && (
                          <button
                            onClick={() => handleDelete(form._id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}

                        {/* Download Relieving Letter */}
                        {form.status === 'completed' && (
                          <button
                            onClick={() => handleGenerateRelievingLetter(form)}
                            className="text-purple-600 hover:text-purple-900 p-1 rounded-full hover:bg-purple-50"
                            title="Generate Relieving Letter"
                          >
                            <DocumentTextIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Relieving Letter Modal */}
      {showRelievingLetter && letterData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Relieving Letter</h2>
                <p className="text-sm text-gray-500">Preview and download</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadRelievingLetter}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  Download PDF
                </button>
                <button 
                  onClick={() => setShowRelievingLetter(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-8 w-8" />
                </button>
              </div>
            </div>
            
            <div id="relieving-letter-template" className="bg-white relative min-h-[1120px] w-[794px] mx-auto shadow-lg">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                <img 
                  src="/images/steel-logo.png" 
                  alt="" 
                  className="w-[500px] opacity-[0.05] grayscale"
                />
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between min-h-[1120px]">
                <div className="w-full flex h-32 relative overflow-hidden">
                  <div className="relative w-[60%] bg-[#1e2b58] flex items-center pl-8 pr-12" style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)' }}>
                    <div className="flex items-center gap-4">
                      <img src="/images/steel-logo.png" alt="CALDIM" className="h-16 w-auto brightness-0 invert" />
                      <div className="text-white">
                        <h1 className="text-3xl font-bold leading-none tracking-wide">CALDIM</h1>
                        <p className="text-[10px] tracking-[0.2em] mt-1 text-orange-400 font-semibold">ENGINEERING PRIVATE LIMITED</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute left-[50%] top-0 h-32 w-16 bg-[#f37021] z-[-1]" style={{ clipPath: 'polygon(40% 0, 100% 0, 60% 100%, 0% 100%)' }}></div>
                  <div className="flex-1 flex flex-col justify-center items-end pr-8 pt-2">
                    <div className="flex items-center mb-2">
                      <span className="font-bold text-gray-800 mr-3 text-lg">044-47860455</span>
                      <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
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
                  <div className="mb-8">
                    <div className="font-bold">To:</div>
                    <div className="mt-3 font-bold text-lg">{letterData.employeeName}</div>
                    <div className="text-gray-800">{letterData.designation}</div>
                  </div>
                  <div className="mb-8">
                    <div className="font-bold">SUBJECT: <span className="font-normal">Relieving Order</span></div>
                  </div>
                  <div className="mb-6">
                    <div className="mb-2">Dear <span className="font-semibold">{letterData.employeeName}</span>,</div>
                  </div>
                  <div className="space-y-6 mb-10 text-justify text-[14px] leading-7">
                    <p>This is acknowledge the receipt of your resignation letter dated <span className="font-semibold">{letterData.resignationDate}</span>.</p>
                    <p>While accepting the Same, we thank you very much for close association you had with us during the tenure from <span className="font-semibold">{letterData.joinDate}</span> to <span className="font-semibold">{letterData.lastWorkingDate}</span> as a <span className="font-semibold">{letterData.designation}</span>. You have been relieved from your service with effect from the closing working hours of <span className="font-semibold">{letterData.lastWorkingDate}</span> and your work with us is found to be satisfactory.</p>
                    <p>We wish you all the best in your future career.</p>
                  </div>
                  <div className="mt-12 flex justify-end">
                    <div className="text-right">
                      <div className="mb-2 text-sm text-gray-700">For {companyName}</div>
                      <div className="mt-8">
                        <div className="w-56 border-t border-gray-900 mb-2"></div>
                        <div className="font-bold">{letterData.hrManager}</div>
                        <div className="text-gray-600">Authorized Signatory</div>
                        <div className="text-gray-600">{companyName}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-full flex items-end mt-auto">
                  <div className="h-3 bg-[#f37021] flex-1 mb-0"></div>
                  <div className="bg-[#1e2b58] text-white py-3 px-10 pl-16 flex flex-col items-end justify-center" style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)', minWidth: '450px' }}>
                    <div className="text-sm font-medium tracking-wide">Website : www.caldimengg.com</div>
                    <div className="text-sm font-medium tracking-wide mt-1">CIN U74999TN2016PTC110683</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedForm && !showRelievingLetter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Exit Request</h2>
                <p className="text-sm text-gray-500">{selectedForm.employeeName} • {selectedForm.employeeId?.employeeId || '-'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedForm(null)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-8 w-8" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Division</p>
                  <p className="font-semibold">{selectedForm.division || selectedForm.department || '-'}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Position</p>
                  <p className="font-semibold">{selectedForm.position || '-'}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Proposed LWD</p>
                  <p className="font-semibold">{selectedForm.proposedLastWorkingDay ? new Date(selectedForm.proposedLastWorkingDay).toLocaleDateString() : '-'}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-semibold">{selectedForm.status}</p>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-500">Reason</p>
                <p className="font-semibold">{selectedForm.reasonForLeaving?.replace(/_/g,' ') || '-'}</p>
                <p className="text-sm mt-2">{selectedForm.reasonDetails || '-'}</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-sm font-semibold mb-3">Clearance</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(selectedForm.clearanceDepartments || []).map((c, i) => (
                    <div key={i} className="flex items-center justify-between border rounded-md px-3 py-2">
                      <span className="text-sm capitalize">{c.department}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100">{c.status}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                {(['projectmanager','teamlead','admin'].includes(userRole) && !selectedForm.approvedByManager && selectedForm.status !== 'completed' && selectedForm.status !== 'rejected') && (
                  <button
                    onClick={() => handleManagerApprove(selectedForm._id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    disabled={actionLoading}
                  >
                    Manager Approve
                  </button>
                )}
                {(['hr','admin'].includes(userRole) && selectedForm.status !== 'completed' && selectedForm.status !== 'rejected') && (
                  <button
                    onClick={() => handleHRApprove(selectedForm._id)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    disabled={actionLoading}
                  >
                    HR Approve
                  </button>
                )}
                {(selectedForm.status !== 'completed' && selectedForm.status !== 'rejected' && selectedForm.status !== 'cancelled') && (
                  <button
                    onClick={() => handleReject(selectedForm._id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    disabled={actionLoading}
                  >
                    Reject
                  </button>
                )}
                {(['admin','hr'].includes(userRole)) && (
                  <button
                    onClick={() => handleDelete(selectedForm._id)}
                    className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100"
                    disabled={actionLoading}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExitApproval;
