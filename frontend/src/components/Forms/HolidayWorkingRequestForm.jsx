import React, { useState, useEffect } from "react";
import { X, Send } from "lucide-react";
import api from "../../services/api";

const HolidayWorkingRequestForm = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [formData, setFormData] = useState({
    workingDate: "",
    holidayType: "Saturday",
    division: "",
    projectName: "",
    reason: "",
    shiftTiming: "",
    remarks: "",
  });

  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [error, setError] = useState("");

  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  useEffect(() => {
    fetchEmployees();
    fetchProjectsAndAllocations();
    if (initialData) {
      setFormData({
        workingDate: initialData.workingDate ? new Date(initialData.workingDate).toISOString().split('T')[0] : "",
        holidayType: initialData.holidayType || "Saturday",
        division: initialData.division || "",
        projectName: initialData.projectName || "",
        reason: initialData.reason || "",
        shiftTiming: initialData.shiftTiming || "",
        remarks: initialData.remarks || "",
      });
      setSelectedEmployees(initialData.employees || []);
    } else {
      // Auto-fill division/dept from creator if possible
      setFormData(prev => ({
        ...prev,
        division: user.division || "",
      }));
    }
  }, [initialData]);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      // Fetching all employees or employees under this TL
      const isPrivileged = ["hr", "admin", "manager", "director"].includes(user.role?.toLowerCase());
      const endpoint = isPrivileged ? "/employees?status=Active" : "/teams/my-team";
      const response = await api.get(endpoint);
      if (response.data.success || Array.isArray(response.data)) {
        const emps = response.data.data || response.data;
        setAllEmployees(emps || []);
      } else {
        setAllEmployees([]);
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err);
      setAllEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchProjectsAndAllocations = async () => {
    try {
      const [projRes, allocRes] = await Promise.allSettled([
        api.get("/projects"),
        api.get("/allocations")
      ]);

      const projectsList = projRes.status === "fulfilled" ? projRes.value.data : [];
      const allocationsList = allocRes.status === "fulfilled" ? allocRes.value.data : [];

      const list = [];
      const seen = new Set();

      if (Array.isArray(projectsList)) {
        projectsList.forEach(p => {
          if (p.name && p.division) {
            const key = `${p.name.trim()}|${p.division.trim()}`;
            if (!seen.has(key)) {
              seen.add(key);
              list.push({ name: p.name.trim(), division: p.division.trim() });
            }
          }
        });
      }

      if (Array.isArray(allocationsList)) {
        allocationsList.forEach(a => {
          const div = a.projectDivision || a.division;
          if (a.projectName && div) {
            const key = `${a.projectName.trim()}|${div.trim()}`;
            if (!seen.has(key)) {
              seen.add(key);
              list.push({ name: a.projectName.trim(), division: div.trim() });
            }
          }
        });
      }

      // Ensure editing project is in the list
      if (initialData && initialData.projectName && initialData.division) {
        const key = `${initialData.projectName.trim()}|${initialData.division.trim()}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({ name: initialData.projectName.trim(), division: initialData.division.trim() });
        }
      }

      setAllProjects(list);
    } catch (err) {
      console.error("Failed to fetch projects and allocations:", err);
    }
  };

  const handleEmployeeToggle = (empId) => {
    const isSelected = selectedEmployees.find(e => e.employeeId === empId);
    if (isSelected) {
      setSelectedEmployees(selectedEmployees.filter(e => e.employeeId !== empId));
    } else {
      const emp = allEmployees.find(e => e.employeeId === empId);
      if (emp) {
        setSelectedEmployees([...selectedEmployees, {
          employeeId: emp.employeeId,
          employeeName: emp.name,
          department: emp.department,
          location: emp.location,
          division: emp.division
        }]);
      }
    }
  };

  const handleDivisionChange = (e) => {
    const selectedDivision = e.target.value;
    setFormData(prev => ({
      ...prev,
      division: selectedDivision,
      projectName: ""
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedEmployees.length === 0) {
      setError("Please select at least one employee.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const payload = {
        ...formData,
        employees: selectedEmployees
      };

      let res;
      if (initialData && initialData._id) {
        res = await api.put(`/holiday-working-requests/${initialData._id}`, payload);
      } else {
        res = await api.post("/holiday-working-requests", payload);
      }

      if (res.data.success) {
        onSuccess();
      } else {
        setError(res.data.message || "Failed to submit request.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const uniqueDivisions = Array.from(new Set(allEmployees.map(e => e.division).filter(Boolean))).sort();

  const uniqueFilteredProjects = Array.from(
    new Set(
      allProjects
        .filter(p => p.division === formData.division)
        .map(p => p.name)
        .filter(Boolean)
    )
  ).sort();

  const displayedEmployees = formData.division
    ? allEmployees.filter(emp => emp.division === formData.division)
    : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {initialData ? "Edit Holiday Working Request" : "New Holiday Working Request"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Working Date *</label>
                <input
                  type="date"
                  required
                  value={formData.workingDate}
                  onChange={(e) => setFormData({ ...formData, workingDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Holiday Type *</label>
                <select
                  required
                  value={formData.holidayType}
                  onChange={(e) => setFormData({ ...formData, holidayType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                  <option value="Public Holiday">Public Holiday</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Division *</label>
                <select
                  required
                  value={formData.division}
                  onChange={handleDivisionChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="">Select Division</option>
                  {uniqueDivisions.map(div => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
                <select
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  disabled={!formData.division}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">{formData.division ? "Select Project" : "Select Division First"}</option>
                  {uniqueFilteredProjects.map(proj => (
                    <option key={proj} value={proj}>{proj}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shift Timing *</label>
                <select
                  required
                  value={formData.shiftTiming}
                  onChange={(e) => setFormData({ ...formData, shiftTiming: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="">Select Shift Timing</option>
                  <option value="First Shift: 7:00 AM - 3:30 PM">First Shift: 7:00 AM - 3:30 PM</option>
                  <option value="Second Shift: 3:00 PM - 11:30 PM">Second Shift: 3:00 PM - 11:30 PM</option>
                  <option value="General Shift: 9:30 AM - 7:00 PM">General Shift: 9:30 AM - 7:00 PM</option>
                  <option value="Half Day">Half Day</option>
                </select>
                {formData.shiftTiming && (
                  <p className="mt-1 text-xs text-indigo-600 font-medium">
                    * Minimum required time: {
                      formData.shiftTiming.includes("Half Day") ? "4h 00m" :
                      formData.shiftTiming.includes("General") ? "8h 00m" : "7h 15m"
                    }
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Working *</label>
              <textarea
                required
                rows="2"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                placeholder="Explain why holiday working is required..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Employees *</label>
              <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto bg-gray-50">
                {loadingEmployees ? (
                  <p className="text-sm text-gray-500 text-center">Loading employees...</p>
                ) : allEmployees.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">No employees found in your team.</p>
                ) : !formData.division ? (
                  <p className="text-sm text-gray-500 text-center">Please select a division to view employees.</p>
                ) : displayedEmployees.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">No employees found in this division.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {displayedEmployees.map((emp) => (
                      <label key={emp.employeeId} className="flex items-center space-x-2 bg-white p-2 rounded border border-gray-200 cursor-pointer hover:bg-indigo-50">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.some(e => e.employeeId === emp.employeeId)}
                          onChange={() => handleEmployeeToggle(emp.employeeId)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700 truncate" title={emp.name}>{emp.name} ({emp.employeeId})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {selectedEmployees.length > 0 && (
                <p className="mt-2 text-sm text-indigo-600 font-medium">
                  {selectedEmployees.length} employee(s) selected
                </p>
              )}
            </div>


            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100 mt-8 shadow-sm">
              <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-purple-700 mb-4 uppercase tracking-wide flex items-center">
                <Send className="w-4 h-4 mr-2 text-indigo-600" />
                Approval Workflow
              </h3>
              <div className="flex items-center justify-between px-2">
                <div className="flex flex-col items-center relative z-10">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm mb-2 shadow-md">1</div>
                  <span className="text-xs font-bold text-indigo-900">Submit</span>
                </div>
                <div className="flex-1 h-1 bg-indigo-200 mx-2 rounded-full -mt-5"></div>
                <div className="flex flex-col items-center relative z-10">
                  <div className="w-8 h-8 rounded-full bg-white text-indigo-600 flex items-center justify-center font-bold text-sm mb-2 border-2 border-indigo-300 shadow-sm">2</div>
                  <span className="text-xs font-semibold text-gray-600">HR Approval</span>
                </div>
                <div className="flex-1 h-1 bg-indigo-200 mx-2 rounded-full -mt-5"></div>
                <div className="flex flex-col items-center relative z-10">
                  <div className="w-8 h-8 rounded-full bg-white text-indigo-600 flex items-center justify-center font-bold text-sm mb-2 border-2 border-indigo-300 shadow-sm">3</div>
                  <span className="text-xs font-semibold text-gray-600">GM Approval</span>
                </div>
                <div className="flex-1 h-1 bg-indigo-200 mx-2 rounded-full -mt-5"></div>
                <div className="flex flex-col items-center relative z-10">
                  <div className="w-8 h-8 rounded-full bg-white text-indigo-600 flex items-center justify-center font-bold text-sm mb-2 border-2 border-indigo-300 shadow-sm">4</div>
                  <span className="text-xs font-semibold text-gray-600">Attendance</span>
                </div>
                <div className="flex-1 h-1 bg-indigo-200 mx-2 rounded-full -mt-5"></div>
                <div className="flex flex-col items-center relative z-10">
                  <div className="w-8 h-8 rounded-full bg-white text-emerald-600 flex items-center justify-center font-bold text-sm mb-2 border-2 border-emerald-300 shadow-sm">5</div>
                  <span className="text-xs font-semibold text-gray-600">Processed</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-4 text-center italic">
                Once submitted, this request will follow the above sequence before days are credited to the allowance.
              </p>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-4 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center px-6 py-2 bg-[#1e2050] text-white rounded-lg hover:bg-[#2c2f6d] transition-colors font-medium disabled:opacity-50"
          >
            <Send className="w-4 h-4 mr-2" />
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HolidayWorkingRequestForm;
