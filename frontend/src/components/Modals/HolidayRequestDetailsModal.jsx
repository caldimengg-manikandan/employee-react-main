import React, { useState } from "react";
import { X, CheckCircle, XCircle, Clock, Calendar, Briefcase, Users, FileText } from "lucide-react";
import api from "../../services/api";

const HolidayRequestDetailsModal = ({ isOpen, onClose, request, onStatusChange }) => {
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const isHR = ["hr", "admin"].includes(user.role);
  const isGM = ["manager", "director", "admin"].includes(user.role);

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
      case "Approved": return "text-green-600 bg-green-50 border-green-200";
      case "Rejected": return "text-red-600 bg-red-50 border-red-200";
      case "Pending HR Approval": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "Pending General Manager Approval": return "text-blue-600 bg-blue-50 border-blue-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
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
      const completedEvent = request.timeline?.find(t => t.status === "Completed");
      if (request.status === "Completed" || completedEvent) {
        return {
          status: 'completed',
          by: completedEvent?.updatedBy || 'System',
          date: completedEvent?.updatedAt,
          remarks: completedEvent?.remarks || "Attendance punches checked"
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
          by: completedEvent?.updatedBy || 'System',
          date: completedEvent?.updatedAt,
          remarks: "Allowance calculated and eligible"
        };
      }
      return { status: 'upcoming', by: 'Pending Processing' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-t-xl text-white shadow-md z-10 relative border-b border-indigo-800">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-wide shadow-sm">Request Details</h2>
              <p className="text-indigo-100 text-xs mt-0.5 font-medium">Manage Holiday Working Request</p>
            </div>
            <span className={`ml-2 px-3 py-1.5 rounded-full text-xs font-bold border bg-white/20 text-white border-white/40 shadow-sm backdrop-blur-md uppercase tracking-wider`}>
              {request.status}
            </span>
          </div>
          <button onClick={onClose} className="text-white hover:text-rose-200 transition-colors bg-white/10 hover:bg-rose-500 hover:border-transparent p-2 rounded-full shadow-sm backdrop-blur-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-8 bg-gradient-to-b from-slate-50 to-white">
          {/* Horizontal Stepper */}
          <div className="w-full bg-white rounded-xl p-6 shadow-sm border border-indigo-100">
            <h3 className="text-sm font-bold text-indigo-900 mb-6 text-center uppercase tracking-widest">Approval Progress</h3>
            <div className="relative flex items-start justify-between w-full max-w-4xl mx-auto">
              {['Submitted', 'HR Approval', 'GM Approval', 'Attendance Verification', 'Processed'].map((stepName, index) => {
                const stepInfo = getStepStatus(stepName);
                
                let iconBg = "bg-white border-gray-200 text-gray-300";
                let textColor = "text-gray-400";
                let Icon = Clock;
                let lineColor = "bg-gray-100";

                if (stepInfo.status === 'completed') {
                  iconBg = "bg-gradient-to-br from-emerald-400 to-emerald-600 border-none text-white shadow-lg shadow-emerald-200";
                  textColor = "text-emerald-700";
                  Icon = CheckCircle;
                  lineColor = "bg-emerald-400";
                } else if (stepInfo.status === 'current') {
                  iconBg = "bg-gradient-to-br from-indigo-500 to-purple-600 border-none text-white shadow-lg shadow-indigo-200 animate-pulse";
                  textColor = "text-indigo-700";
                  Icon = Clock;
                  lineColor = "bg-gray-100";
                } else if (stepInfo.status === 'rejected') {
                  iconBg = "bg-gradient-to-br from-rose-500 to-red-600 border-none text-white shadow-lg shadow-rose-200";
                  textColor = "text-rose-700";
                  Icon = XCircle;
                  lineColor = "bg-rose-500";
                }

                return (
                  <div key={index} className="flex flex-col items-center relative flex-1">
                    {/* Connecting Line */}
                    {index > 0 && (
                      <div className={`absolute right-[50%] top-6 h-1 w-full ${lineColor}`} style={{ zIndex: 0 }}></div>
                    )}
                    
                    {/* Icon */}
                    <div className={`h-12 w-12 rounded-full border-4 flex items-center justify-center ${iconBg} transition-all duration-300 relative`} style={{ zIndex: 1 }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    {/* Text Details */}
                    <div className="text-center mt-4 px-2">
                      <p className={`text-sm font-bold ${textColor}`}>
                        {stepName}
                      </p>
                      
                      <p className="text-xs text-gray-600 mt-1.5 font-medium">
                        {stepInfo.status === 'upcoming' ? 'Pending' : stepInfo.by}
                      </p>
                      
                      {stepInfo.date && (
                        <p className="text-[11px] text-gray-400 mt-0.5 bg-gray-50 px-2 py-0.5 rounded-full inline-block border border-gray-100">
                          {new Date(stepInfo.date).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
            <div className="space-y-8">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* General Info */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-white rounded-xl p-6 shadow-sm border border-white">
                  <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-6 flex items-center">
                    <div className="p-1.5 bg-indigo-50 rounded-lg mr-3">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    General Information
                  </h3>
                  <div className="grid grid-cols-2 gap-y-6 gap-x-6">
                    <div>
                      <p className="text-sm text-gray-500">Request ID</p>
                      <p className="font-medium text-gray-900">{request.requestId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Created By</p>
                      <p className="font-medium text-gray-900">{request.createdByName || request.createdBy}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Working Date</p>
                      <p className="font-medium text-gray-900 flex items-center">
                        <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                        {new Date(request.workingDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Holiday Type</p>
                      <p className="font-medium text-gray-900">{request.holidayType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Shift Timing</p>
                      <p className="font-medium text-gray-900 flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-gray-400" />
                        {request.shiftTiming}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Project Name</p>
                      <p className="font-medium text-gray-900 flex items-center">
                        <Briefcase className="w-4 h-4 mr-1 text-gray-400" />
                        {request.projectName || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-white rounded-xl p-6 shadow-sm border border-white">
                  <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-600 mb-4">Reason for Working</h3>
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 text-gray-700 font-medium shadow-inner">
                    {request.reason}
                  </div>
                </div>
              </div>

              {/* Employees */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-white rounded-xl p-6 shadow-sm border border-white">
                  <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 mb-4 flex items-center">
                    <div className="p-1.5 bg-emerald-50 rounded-lg mr-3">
                      <Users className="w-5 h-5 text-emerald-600" />
                    </div>
                    Selected Employees ({request.employees?.length || 0})
                  </h3>
                  <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                        <tr>
                          <th className="py-2 px-4 font-medium">Emp ID</th>
                          <th className="py-2 px-4 font-medium">Name</th>
                          <th className="py-2 px-4 font-medium">Division</th>
                          {request.status === "Completed" && (
                            <>
                              <th className="py-2 px-4 font-medium">Attendance</th>
                              <th className="py-2 px-4 font-medium">Worked Hrs</th>
                              <th className="py-2 px-4 font-medium">Eligibility</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {request.employees?.map(emp => (
                          <tr key={emp.employeeId} className="hover:bg-gray-50">
                            <td className="py-2 px-4 font-medium">{emp.employeeId}</td>
                            <td className="py-2 px-4">{emp.employeeName}</td>
                            <td className="py-2 px-4 text-gray-500">{emp.division || request.division || "-"}</td>
                            {request.status === "Completed" && (
                              <>
                                <td className="py-2 px-4">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${emp.attendanceStatus === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {emp.attendanceStatus || "-"}
                                  </span>
                                </td>
                                <td className="py-2 px-4 text-gray-600 font-medium">{emp.workedHours || 0}</td>
                                <td className="py-2 px-4">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${emp.allowanceEligibility === 'Eligible' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                    {emp.allowanceEligibility || "-"}
                                  </span>
                                </td>
                              </>
                            )}
                          </tr>

                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              {request.remarks && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-amber-800 mb-2 uppercase tracking-wide">Creator Remarks</h3>
                  <div className="text-amber-900 italic font-medium">
                    "{request.remarks}"
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HolidayRequestDetailsModal;
