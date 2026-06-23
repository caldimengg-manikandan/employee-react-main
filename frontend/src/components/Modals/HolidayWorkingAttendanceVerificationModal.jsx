import React, { useState, useEffect } from "react";
import { X, CheckCircle, XCircle, Clock, Calendar, Briefcase, Users, FileText, RefreshCw, AlertTriangle, UserCheck } from "lucide-react";
import api from "../../services/api";

const HolidayWorkingAttendanceVerificationModal = ({ isOpen, onClose, request, onSuccess }) => {
  const [employees, setEmployees] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (request && request.employees) {
      // Initialize with existing values from the request object
      setEmployees(request.employees.map(emp => ({
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        department: emp.department || "",
        location: emp.location || "",
        division: emp.division || "",
        attendanceStatus: emp.attendanceStatus || "Pending",
        workedHours: typeof emp.workedHours === "number" ? emp.workedHours : 0,
        allowanceEligibility: emp.allowanceEligibility || "Not Eligible",
        holidayDaysValue: typeof emp.holidayDaysValue === "number" ? emp.holidayDaysValue : 0
      })));
    }
    setError("");
    setSuccessMsg("");
    setRemarks("");
  }, [request, isOpen]);

  if (!isOpen || !request) return null;

  const handleAutoVerify = async () => {
    try {
      setVerifyLoading(true);
      setError("");
      setSuccessMsg("");
      const response = await api.get(`/holiday-working-requests/${request._id}/verify-attendance`);
      if (response.data.success && response.data.data) {
        setEmployees(response.data.data);
        setSuccessMsg("Successfully fetched and calculated attendance punches from logs!");
      } else {
        setError(response.data.message || "Failed to auto-verify punches.");
      }
    } catch (err) {
      console.error("Error auto-verifying punches:", err);
      setError(err.response?.data?.message || "Error retrieving attendance punch records.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleFieldChange = (employeeId, field, value) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.employeeId === employeeId) {
        const updated = { ...emp, [field]: value };

        // Auto-update eligibility if attendanceStatus or workedHours is modified
        if (field === "attendanceStatus" || field === "workedHours") {
          const status = field === "attendanceStatus" ? value : emp.attendanceStatus;
          const hours = field === "workedHours" ? Number(value) : emp.workedHours;

          let minHours = 4.0;
          const shift = (request.shiftTiming || "").toLowerCase();
          let shiftMultiplier = 1.0;
          if (shift.includes("first") || shift.includes("second")) {
            minHours = 7.25;
            shiftMultiplier = 1.0;
          } else if (shift.includes("general")) {
            minHours = 8.0;
            shiftMultiplier = 1.0;
          } else if (shift.includes("half")) {
            minHours = 4.0;
            shiftMultiplier = 0.5;
          }

          if (status === "Present" && hours >= minHours) {
            updated.allowanceEligibility = "Eligible";
            updated.holidayDaysValue = shiftMultiplier;
          } else {
            updated.allowanceEligibility = "Not Eligible";
            updated.holidayDaysValue = 0;
          }
        }
        return updated;
      }
      return emp;
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccessMsg("");

      const payload = {
        employees: employees.map(e => ({
          employeeId: e.employeeId,
          attendanceStatus: e.attendanceStatus,
          workedHours: Number(e.workedHours) || 0,
          allowanceEligibility: e.allowanceEligibility,
          holidayDaysValue: e.holidayDaysValue
        })),
        remarks: remarks || "Attendance verified manually and request completed"
      };

      const response = await api.post(`/holiday-working-requests/${request._id}/finalize-attendance`, payload);
      if (response.data.success) {
        onSuccess();
      } else {
        setError(response.data.message || "Failed to finalize attendance verification.");
      }
    } catch (err) {
      console.error("Error submitting attendance verification:", err);
      setError(err.response?.data?.message || "An error occurred while finalising attendance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col transform transition-all border border-gray-100">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Attendance Verification</h2>
              <p className="text-xs text-gray-500 mt-0.5">Verify and finalize employee holiday working attendance & eligibility</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-200 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">

          {/* General Information Grid */}
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl p-5 border border-indigo-100/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Request ID</p>
              <p className="font-semibold text-gray-900 text-sm mt-1">{request.requestId}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Working Date</p>
              <p className="font-semibold text-gray-900 text-sm mt-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-500" />
                {new Date(request.workingDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Shift Timing</p>
              <p className="font-semibold text-gray-900 text-sm mt-1 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" />
                {request.shiftTiming}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Project / Division</p>
              <p className="font-semibold text-gray-900 text-sm mt-1 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-indigo-500" />
                {request.projectName || "N/A"} ({request.division || "N/A"})
              </p>
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm flex items-center gap-2 animate-fadeIn">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="text-xs text-gray-600 font-medium max-w-[60%]">
              Click <strong className="text-indigo-600">Auto-Verify Punches</strong> to scan the attendance database logs for punch intervals and work hours matching the scheduled date.
            </div>
            <button
              type="button"
              onClick={handleAutoVerify}
              disabled={verifyLoading || loading}
              className="flex items-center px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-850 disabled:opacity-50 transition-all font-semibold text-sm shadow-sm hover:shadow"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${verifyLoading ? "animate-spin" : ""}`} />
              {verifyLoading ? "Verifying..." : "Auto-Verify Punches"}
            </button>
          </div>

          {/* Table */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Employee Attendance Details ({employees.length})
            </h3>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#1e2050] text-white text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Emp ID</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Division / Department</th>
                    <th className="py-3 px-4 w-40">Attendance Status</th>
                    <th className="py-3 px-4 w-32">Worked Hours</th>
                    <th className="py-3 px-4 w-40">Allowance Eligibility</th>
                    <th className="py-3 px-4 w-24">Earned Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-gray-500 font-medium">
                        No employees found in request.
                      </td>
                    </tr>
                  ) : (
                    employees.map(emp => {
                      const isEligible = emp.allowanceEligibility === "Eligible";
                      return (
                        <tr key={emp.employeeId} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-gray-900">{emp.employeeId}</td>
                          <td className="py-3 px-4 font-medium text-gray-700">{emp.employeeName}</td>
                          <td className="py-3 px-4 text-gray-500 text-xs font-medium">
                            {emp.division || request.division || "N/A"}
                            <span className="block text-[10px] text-gray-400 mt-0.5">{emp.department || "N/A"}</span>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={emp.attendanceStatus}
                              onChange={(e) => handleFieldChange(emp.employeeId, "attendanceStatus", e.target.value)}
                              disabled={loading || verifyLoading}
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white transition-shadow"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Present">Present</option>
                              <option value="Absent">Absent</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="24"
                              value={emp.workedHours}
                              onChange={(e) => handleFieldChange(emp.employeeId, "workedHours", e.target.value === "" ? "" : Number(e.target.value))}
                              disabled={loading || verifyLoading || emp.attendanceStatus === "Absent"}
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white transition-shadow disabled:bg-gray-100 disabled:text-gray-400"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={emp.allowanceEligibility}
                              onChange={(e) => handleFieldChange(emp.employeeId, "allowanceEligibility", e.target.value)}
                              disabled={loading || verifyLoading}
                              className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition-shadow ${isEligible
                                  ? "border-emerald-200 text-emerald-800 bg-emerald-50/30 focus:border-emerald-500"
                                  : "border-rose-200 text-rose-800 bg-rose-50/30 focus:border-rose-500"
                                }`}
                            >
                              <option value="Eligible" className="text-emerald-800 font-semibold bg-white">Eligible</option>
                              <option value="Not Eligible" className="text-rose-800 font-semibold bg-white">Not Eligible</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-bold text-gray-800">{emp.holidayDaysValue || 0}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Remarks */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              Verification Remarks / Comments
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Provide comments regarding attendance check or manual overrides..."
              disabled={loading || verifyLoading}
              rows="3"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm transition-shadow bg-white placeholder-gray-400"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end gap-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading || verifyLoading}
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-all font-semibold text-sm shadow-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || verifyLoading || employees.length === 0}
            className="flex items-center px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:bg-emerald-850 disabled:opacity-50 transition-all font-semibold text-sm shadow-sm hover:shadow"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {loading ? "Processing..." : "Finalize & Process Allowances"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default HolidayWorkingAttendanceVerificationModal;
