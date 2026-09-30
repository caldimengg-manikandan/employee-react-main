import React, { useState, useMemo } from "react";
import { 
  X, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar, 
  Briefcase, 
  Users, 
  FileText, 
  Download, 
  Search, 
  Building2, 
  UserCheck, 
  UserX, 
  Award, 
  MessageSquare,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import api from "../../services/api";
import { exportSingleHolidayRequestToExcel } from "../../utils/holidayWorkingExcelExport";

const HolidayRequestDetailsModal = ({ isOpen, onClose, request, onStatusChange }) => {
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [empSearch, setEmpSearch] = useState("");

  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const userRole = user.role?.toLowerCase() || "";
  const isHR = ["hr", "admin"].includes(userRole);
  const isGM = ["manager", "director"].includes(userRole);

  const formatDate = (dateInput) => {
    if (!dateInput) return "N/A";
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return String(dateInput);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return String(dateInput);
    }
  };

  const formatDateTime = (dateInput) => {
    if (!dateInput) return "N/A";
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return String(dateInput);
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return String(dateInput);
    }
  };

  const employees = request?.employees || [];

  const empStats = useMemo(() => {
    const total = employees.length;
    const present = employees.filter(e => e.attendanceStatus === "Present").length;
    const absent = employees.filter(e => e.attendanceStatus === "Absent").length;
    const eligible = employees.filter(e => e.allowanceEligibility === "Eligible").length;
    const totalHours = employees.reduce((sum, e) => sum + (Number(e.workedHours) || 0), 0);
    return { total, present, absent, eligible, totalHours };
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    if (!empSearch.trim()) return employees;
    const q = empSearch.toLowerCase();
    return employees.filter(e => 
      (e.employeeId || "").toLowerCase().includes(q) ||
      (e.employeeName || "").toLowerCase().includes(q) ||
      (e.division || "").toLowerCase().includes(q) ||
      (e.location || "").toLowerCase().includes(q) ||
      (e.attendanceStatus || "").toLowerCase().includes(q) ||
      (e.allowanceEligibility || "").toLowerCase().includes(q)
    );
  }, [employees, empSearch]);

  if (!isOpen || !request) return null;

  const handleStatusUpdate = async (newStatus) => {
    try {
      setLoading(true);
      setError("");
      const res = await api.put(`/holiday-working-requests/${request._id}/status`, {
        status: newStatus,
        remarks: remarks
      });
      if (res.data.success) {
        onStatusChange();
      } else {
        setError(res.data.message || "Failed to update status.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved": return "bg-green-100 text-green-800 border-green-300";
      case "Rejected": return "bg-red-100 text-red-800 border-red-300";
      case "Pending HR Approval": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Pending General Manager Approval": return "bg-blue-100 text-blue-800 border-blue-300";
      case "Attendance Pending": return "bg-amber-100 text-amber-800 border-amber-300";
      case "Attendance Verified": return "bg-indigo-100 text-indigo-800 border-indigo-300";
      case "Completed": return "bg-emerald-100 text-emerald-800 border-emerald-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const canApprove = () => {
    if (request.status === "Pending HR Approval" && isHR) return true;
    if (request.status === "Pending General Manager Approval" && isGM) return true;
    return false;
  };

  const nextApproveStatus = request.status === "Pending HR Approval" ? "Pending General Manager Approval" : "Approved";

  const getStepStatus = (stepName) => {
    if (stepName === 'Submitted') {
      const event = request.timeline?.find(t => t.status === "Created" || t.status === "Submitted" || t.status === "Draft");
      return { 
        status: 'completed', 
        by: event?.updatedBy || request.createdByName || request.createdBy, 
        date: event?.updatedAt || request.createdAt,
        remarks: event?.remarks
      };
    }

    if (stepName === 'HR Approval') {
      const approvedEvent = request.timeline?.find(t => t.status === "Pending General Manager Approval" || t.status === "Approved" || t.status === "Attendance Pending" || t.status === "Completed");
      const rejectedEvent = request.timeline?.find(t => t.status === "Rejected");
      
      if (request.hrApprovedBy || approvedEvent) {
        return { 
          status: 'completed', 
          by: request.hrApprovedBy || approvedEvent?.updatedBy || 'HR/Admin', 
          date: request.hrApprovedAt || approvedEvent?.updatedAt, 
          remarks: approvedEvent?.remarks || "" 
        };
      }
      if (rejectedEvent && !request.hrApprovedBy) {
        return { status: 'rejected', by: rejectedEvent.updatedBy, date: rejectedEvent.updatedAt, remarks: rejectedEvent.remarks };
      }
      if (request.status === "Pending HR Approval") {
        return { status: 'current', by: 'Pending HR' };
      }
      return { status: 'upcoming', by: 'Pending HR' };
    }

    if (stepName === 'GM Approval') {
      const approvedEvent = request.timeline?.find(t => t.status === "Approved" || t.status === "Attendance Pending" || t.status === "Completed");
      const rejectedEvent = request.timeline?.find(t => t.status === "Rejected");

      if (request.gmApprovedBy || approvedEvent) {
        const gmEvent = request.timeline?.find(t => t.status === "Approved" || t.status === "Attendance Pending" || t.status === "Completed") || approvedEvent;
        return { 
          status: 'completed', 
          by: request.gmApprovedBy || gmEvent?.updatedBy || 'General Manager', 
          date: request.gmApprovedAt || gmEvent?.updatedAt, 
          remarks: gmEvent?.remarks || "" 
        };
      }
      if (rejectedEvent && request.hrApprovedBy) {
        return { status: 'rejected', by: rejectedEvent.updatedBy, date: rejectedEvent.updatedAt, remarks: rejectedEvent.remarks };
      }
      if (request.status === "Pending General Manager Approval") {
        return { status: 'current', by: 'Pending General Manager' };
      }
      return { status: 'upcoming', by: 'Pending General Manager' };
    }

    if (stepName === 'Attendance Verification') {
      const completedEvent = request.timeline?.find(t => t.status === "Completed" || t.status === "Attendance Verified");
      if (request.status === "Completed" || request.status === "Attendance Verified" || completedEvent) {
        return {
          status: 'completed',
          by: completedEvent?.updatedBy || 'HR / Attendance System',
          date: completedEvent?.updatedAt,
          remarks: completedEvent?.remarks || "Attendance punches verified"
        };
      }
      if (request.status === "Attendance Pending") {
        return { status: 'current', by: 'Pending Attendance Check' };
      }
      return { status: 'upcoming', by: 'Pending Attendance Check' };
    }

    if (stepName === 'Processed') {
      const completedEvent = request.timeline?.find(t => t.status === "Completed");
      if (request.status === "Completed" || completedEvent) {
        return {
          status: 'completed',
          by: completedEvent?.updatedBy || 'Payroll System',
          date: completedEvent?.updatedAt,
          remarks: "Allowance calculated and processed"
        };
      }
      return { status: 'upcoming', by: 'Pending Processing' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center p-5 bg-gradient-to-r from-[#1e2050] via-[#2a2c6e] to-[#1e2050] text-white shadow-md z-10 border-b border-indigo-900 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-wide">{request.requestId}</h2>
                <span className={`px-3 py-0.5 rounded-full text-xs font-bold border shadow-sm ${getStatusColor(request.status)}`}>
                  {request.status}
                </span>
              </div>
              <p className="text-indigo-200 text-xs mt-0.5 font-medium">
                Holiday Working Request Details & Employee Master View
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportSingleHolidayRequestToExcel(request)}
              className="flex items-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-xs font-semibold shadow-sm cursor-pointer gap-1.5"
              title="Export this request and all employee details to formatted Excel"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
            <button 
              onClick={onClose} 
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-6 bg-slate-50">
          
          {/* Top KPI Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Total Employees</p>
                <p className="text-lg font-bold text-gray-900">{empStats.total}</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Present</p>
                <p className="text-lg font-bold text-emerald-700">{empStats.present}</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-rose-100 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Absent</p>
                <p className="text-lg font-bold text-rose-700">{empStats.absent}</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Eligible</p>
                <p className="text-lg font-bold text-blue-700">{empStats.eligible}</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="p-2.5 bg-teal-50 text-teal-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Worked Hours</p>
                <p className="text-lg font-bold text-teal-700">{empStats.totalHours.toFixed(1)} hrs</p>
              </div>
            </div>
          </div>

          {/* Stepper Progress */}
          <div className="w-full bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <h3 className="text-xs font-bold text-indigo-900 mb-5 text-center uppercase tracking-widest flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Approval & Verification Flow
            </h3>
            <div className="relative flex items-start justify-between w-full max-w-4xl mx-auto overflow-x-auto pb-2">
              {['Submitted', 'HR Approval', 'GM Approval', 'Attendance Verification', 'Processed'].map((stepName, index) => {
                const stepInfo = getStepStatus(stepName);
                
                let iconBg = "bg-white border-gray-200 text-gray-300";
                let textColor = "text-gray-400";
                let Icon = Clock;
                let lineColor = "bg-gray-100";

                if (stepInfo.status === 'completed') {
                  iconBg = "bg-emerald-600 text-white shadow-md shadow-emerald-200";
                  textColor = "text-emerald-700";
                  Icon = CheckCircle;
                  lineColor = "bg-emerald-500";
                } else if (stepInfo.status === 'current') {
                  iconBg = "bg-indigo-600 text-white shadow-md shadow-indigo-200 animate-pulse";
                  textColor = "text-indigo-700";
                  Icon = Clock;
                  lineColor = "bg-gray-200";
                } else if (stepInfo.status === 'rejected') {
                  iconBg = "bg-rose-600 text-white shadow-md shadow-rose-200";
                  textColor = "text-rose-700";
                  Icon = XCircle;
                  lineColor = "bg-rose-500";
                }

                return (
                  <div key={index} className="flex flex-col items-center relative flex-1 min-w-[120px]">
                    {index > 0 && (
                      <div className={`absolute right-[50%] top-5 h-1 w-full ${lineColor}`} style={{ zIndex: 0 }}></div>
                    )}
                    
                    <div className={`h-10 w-10 rounded-full border-2 border-white flex items-center justify-center ${iconBg} transition-all duration-300 relative z-10`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    <div className="text-center mt-3 px-1">
                      <p className={`text-xs font-bold ${textColor}`}>
                        {stepName}
                      </p>
                      <p className="text-[11px] text-gray-600 mt-1 font-medium truncate max-w-[120px]">
                        {stepInfo.status === 'upcoming' ? 'Pending' : stepInfo.by}
                      </p>
                      {stepInfo.date && (
                        <p className="text-[10px] text-gray-400 mt-0.5 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200 inline-block">
                          {formatDateTime(stepInfo.date)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* General Info */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Work & Request Information
              </h3>
              <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs">
                <div>
                  <p className="text-gray-500 font-medium">Request ID</p>
                  <p className="font-bold text-indigo-700 mt-0.5">{request.requestId}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Created By (TL/PM)</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{request.createdByName || request.createdBy}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Working Date</p>
                  <p className="font-semibold text-gray-900 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {formatDate(request.workingDate)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Holiday Type</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{request.holidayType || "Saturday"}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Shift Timing</p>
                  <p className="font-semibold text-gray-900 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {request.shiftTiming || "General Shift"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Project Name</p>
                  <p className="font-bold text-blue-700 mt-0.5 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                    {request.projectName || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Division</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{request.division || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Department</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{request.department || request.division || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Approvers & Justifications */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Approvals & Submission
                </h3>
                <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs mb-4">
                  <div>
                    <p className="text-gray-500 font-medium">HR Approved By</p>
                    <p className="font-semibold text-indigo-900 mt-0.5">{request.hrApprovedBy || "Pending"}</p>
                    {request.hrApprovedAt && (
                      <p className="text-[10px] text-gray-400">{formatDateTime(request.hrApprovedAt)}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">GM Approved By</p>
                    <p className="font-semibold text-purple-900 mt-0.5">{request.gmApprovedBy || "Pending"}</p>
                    {request.gmApprovedAt && (
                      <p className="text-[10px] text-gray-400">{formatDateTime(request.gmApprovedAt)}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Reason for Working:</p>
                    <div className="bg-indigo-50/60 border border-indigo-100 rounded-lg p-2.5 text-xs text-gray-800 leading-relaxed">
                      {request.reason || "N/A"}
                    </div>
                  </div>

                  {request.remarks && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Creator Remarks:</p>
                      <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-2.5 text-xs text-amber-900 italic">
                        "{request.remarks}"
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Complete Employee List Table Gathered in One Place */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-600" />
                  Assigned Employees List ({employees.length})
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Complete breakdown of employees, punch attendance, worked hours, and holiday allowance eligibility
                </p>
              </div>

              {/* Employee search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search in employee list..."
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1e2050] text-white">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold text-center w-12">#</th>
                    <th className="py-2.5 px-4 font-semibold">Emp ID</th>
                    <th className="py-2.5 px-4 font-semibold">Employee Name</th>
                    <th className="py-2.5 px-4 font-semibold">Division / Location</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Attendance</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Worked Hours</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Allowance Eligibility</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Days Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-6 text-center text-gray-500">
                        No employees found matching "{empSearch}"
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp, idx) => (
                      <tr key={emp.employeeId || idx} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="py-2.5 px-3 text-center text-gray-400 font-medium">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-bold text-indigo-700">{emp.employeeId}</td>
                        <td className="py-2.5 px-4 font-semibold text-gray-900">{emp.employeeName}</td>
                        <td className="py-2.5 px-4 text-gray-600">
                          {emp.location || emp.branch || emp.division || request.division || "—"}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            emp.attendanceStatus === 'Present'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : emp.attendanceStatus === 'Absent'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            {emp.attendanceStatus || "Pending"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-teal-700">
                          {emp.workedHours !== undefined ? `${Number(emp.workedHours).toFixed(1)} hrs` : "0.0 hrs"}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            emp.allowanceEligibility === 'Eligible'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-gray-100 text-gray-600 border-gray-300'
                          }`}>
                            {emp.allowanceEligibility || "Not Eligible"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-emerald-700">
                          {emp.holidayDaysValue !== undefined ? emp.holidayDaysValue : (emp.allowanceEligibility === 'Eligible' ? '1.0' : '0.0')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredEmployees.length > 0 && (
                  <tfoot className="bg-slate-900 text-white font-semibold">
                    <tr>
                      <td className="py-2.5 px-3 text-center text-indigo-300">TOTAL</td>
                      <td colSpan="3" className="py-2.5 px-4 text-indigo-200">
                        {employees.length} Employees Total
                      </td>
                      <td className="py-2.5 px-4 text-center text-emerald-400 font-bold">
                        {empStats.present} Present
                      </td>
                      <td className="py-2.5 px-4 text-center text-teal-300 font-bold">
                        {empStats.totalHours.toFixed(1)} hrs
                      </td>
                      <td className="py-2.5 px-4 text-center text-blue-300 font-bold">
                        {empStats.eligible} Eligible
                      </td>
                      <td className="py-2.5 px-4 text-center text-emerald-400 font-bold">
                        {employees.reduce((acc, e) => acc + (Number(e.holidayDaysValue) || (e.allowanceEligibility === 'Eligible' ? 1 : 0)), 0).toFixed(1)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Approval Actions */}
          {canApprove() && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                Approval Decision Action
              </h3>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Approval / Rejection Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks for approval or rejection..."
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
                  rows="2"
                />
              </div>
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => handleStatusUpdate("Rejected")}
                  disabled={loading}
                  className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg transition-colors font-semibold text-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Request
                </button>
                <button
                  onClick={() => handleStatusUpdate(nextApproveStatus)}
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold text-xs shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve Request ({nextApproveStatus})
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
          <span>Created on {formatDateTime(request.createdAt)}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HolidayRequestDetailsModal;

