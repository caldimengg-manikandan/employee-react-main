import React, { useEffect, useState } from "react";
import { accessAPI } from "../../services/api";

export default function EmployeeAttendance() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });
  const [employeeFilter, setEmployeeFilter] = useState({
    id: "",
    name: ""
  });
  const [employees, setEmployees] = useState([]);
  
  // 🎯 HIKVISION STATE
  const [hikvisionStatus, setHikvisionStatus] = useState({
    connected: false,
    lastSync: null,
    deviceInfo: null
  });
  const [syncingHikvision, setSyncingHikvision] = useState(false);
  const [dataSource, setDataSource] = useState('local'); // 'local' or 'hikvision'

  useEffect(() => {
    fetchLogs();
    fetchEmployees();
    checkHikvisionStatus();
  }, [dateRange, employeeFilter]);

  const fetchEmployees = async () => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) return;

      const res = await accessAPI.getEmployees();
      setEmployees(res.data);
    } catch (err) {
      console.error("Error fetching employees:", err);
      if (err.response?.status === 403) {
        console.warn("Access denied to employee list - users may not be able to filter by employee");
      }
    }
  };

  const fetchLogs = async () => {
    // Use appropriate data source
    if (dataSource === 'hikvision') {
      await fetchHikvisionLogs();
    } else {
      await fetchLocalLogs();
    }
  };

  const fetchLocalLogs = async () => {
    try {
      setLoading(true);
      setError("");

      const token = sessionStorage.getItem("token");
      if (!token) {
        setError("No authentication token found. Please login again.");
        setLoading(false);
        return;
      }

      const params = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      if (employeeFilter.id) params.employeeId = employeeFilter.id;
      if (employeeFilter.name) params.employeeName = employeeFilter.name;

      const res = await accessAPI.getLocalAttendance(params);
      setLogs(res.data.attendance || res.data);
    } catch (err) {
      console.error("Error fetching logs:", err);
      if (err.response?.status === 401) {
        setError("Authentication failed. Please login again.");
      } else if (err.response?.status === 403) {
        setError("Access denied. You don't have permission to view employee logs.");
      } else {
        setError("Failed to fetch logs. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkDuration = (log) => {
    // Calculate work duration based on IN/OUT pairs
    if (log.direction === 'out' && log.correspondingInTime) {
      const inTime = new Date(log.correspondingInTime);
      const outTime = new Date(log.punchTime);
      const diffMs = outTime - inTime;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    }
    return "-";
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
    };
  };

  const resetFilters = () => {
    setDateRange({ start: "", end: "" });
    setEmployeeFilter({ id: "", name: "" });
  };

  // 📝 MANUAL ATTENDANCE ENTRY
  const addManualAttendance = async (employeeId, direction) => {
    try {
      const response = await accessAPI.createAttendanceRecord({
        employeeId,
        direction,
        source: 'manual'
      });
      
      if (response.data.success) {
        alert(`Attendance recorded: ${employeeId} - ${direction}`);
        // Refresh the logs
        await fetchLogs();
      }
    } catch (err) {
      console.error("Manual attendance error:", err);
      alert("Failed to record attendance. Please try again.");
    }
  };

  // 🎯 HIKVISION FUNCTIONS
  const checkHikvisionStatus = async () => {
    try {
      const response = await accessAPI.getHikvisionConnectionStatus();
      if (response.data.success) {
        setHikvisionStatus({
          connected: true,
          lastSync: new Date(),
          deviceInfo: response.data.deviceInfo
        });
      }
    } catch (err) {
      console.error("Hikvision status check failed:", err);
      setHikvisionStatus(prev => ({
        ...prev,
        connected: false,
        deviceInfo: null
      }));
      // Automatically fallback to local data source if Hikvision fails
      if (dataSource === 'hikvision') {
        setDataSource('local');
      }
    }
  };

  const syncHikvisionData = async () => {
    try {
      setSyncingHikvision(true);
      setError("");
      
      // Pull events from Hikvision
      const response = await accessAPI.pullHikvisionEvents();
      
      if (response.data.success) {
        setHikvisionStatus(prev => ({
          ...prev,
          lastSync: new Date()
        }));
        
        // Refresh logs after sync
        await fetchLogs();
        
        alert(`Successfully synced ${response.data.savedCount} attendance records from Hikvision`);
      } else {
        setError("Failed to sync Hikvision data: " + response.data.message);
      }
    } catch (err) {
      console.error("Hikvision sync error:", err);
      setError("Failed to sync Hikvision attendance data. Please check device connection.");
    } finally {
      setSyncingHikvision(false);
    }
  };

  const fetchHikvisionLogs = async () => {
    try {
      setLoading(true);
      setError("");

      const token = sessionStorage.getItem("token");
      if (!token) {
        setError("No authentication token found. Please login again.");
        setLoading(false);
        return;
      }

      const params = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      if (employeeFilter.id) params.employeeId = employeeFilter.id;
      if (employeeFilter.name) params.employeeName = employeeFilter.name;

      // Try to get Hikvision attendance data
      const res = await accessAPI.getHikvisionAttendance(params);
      setLogs(res.data.attendance || []);
      
    } catch (err) {
      console.error("Error fetching Hikvision logs:", err);
      // Fallback to local data when Hikvision fails
      setError("Hikvision device unavailable. Falling back to local attendance data.");
      setDataSource('local');
      await fetchLocalLogs();
    }
  };

  // Get unique employee IDs and names for dropdowns
  const uniqueEmployeeIds = [...new Set(employees.map(emp => emp.id))].filter(Boolean);
  const uniqueEmployeeNames = [...new Set(employees.map(emp => emp.name))].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Attendance</h1>
          <p className="text-gray-600">
            View employee attendance records and work duration.
          </p>
        </div>

        {/* 🎯 HIKVISION STATUS & CONTROLS */}
        <div className="bg-white shadow rounded-lg p-6 border mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${hikvisionStatus.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium text-gray-700">
                  Hikvision: {hikvisionStatus.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {hikvisionStatus.lastSync && (
                <span className="text-xs text-gray-500">
                  Last sync: {new Date(hikvisionStatus.lastSync).toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={syncHikvisionData}
                disabled={syncingHikvision || !hikvisionStatus.connected}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  syncingHikvision || !hikvisionStatus.connected
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {syncingHikvision ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Syncing...</span>
                  </div>
                ) : (
                  'Sync Hikvision Data'
                )}
              </button>
              <select
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value)}
                className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="local">Local Database</option>
                <option value="hikvision">Hikvision Device</option>
              </select>
            </div>
          </div>
          {!hikvisionStatus.connected && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Hikvision device is not connected. Please check your configuration or contact your administrator.
              </p>
            </div>
          )}
        </div>

    
        {/* Filters Section */}
        <div className="bg-white shadow rounded-lg p-6 border mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Employee ID Filter Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee ID
              </label>
              <select
                value={employeeFilter.id}
                onChange={(e) => setEmployeeFilter(prev => ({ ...prev, id: e.target.value }))}
                className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Employee IDs</option>
                {uniqueEmployeeIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>

            {/* Employee Name Filter Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee Name
              </label>
              <select
                value={employeeFilter.name}
                onChange={(e) => setEmployeeFilter(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Employee Names</option>
                {uniqueEmployeeNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Reset Filters Button */}
          <div className="flex justify-end mt-4">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        )}

        {/* Attendance Records Table */}
        {!loading && (
          <div className="bg-white shadow rounded-lg border overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Attendance Records {dataSource === 'hikvision' && '(Hikvision Device)'}
                </h3>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    dataSource === 'hikvision' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {dataSource === 'hikvision' ? 'Hikvision' : 'Local Database'}
                  </span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-50 border-b">
                  <tr>
                    <th className="p-4 text-left text-sm font-medium text-blue-700">Employee ID</th>
                    <th className="p-4 text-left text-sm font-medium text-blue-700">Employee Name</th>
                    <th className="p-4 text-left text-sm font-medium text-blue-700">Date</th>
                    <th className="p-4 text-left text-sm font-medium text-blue-700">Actual Time</th>
                    <th className="p-4 text-left text-sm font-medium text-blue-700">Work Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-gray-500">
                        {dataSource === 'hikvision' 
                          ? 'No Hikvision attendance records found for the selected filters' 
                          : 'No records found for the selected filters'}
                        {dataSource === 'hikvision' && !hikvisionStatus.connected && (
                          <div className="mt-2 text-sm text-yellow-600">
                            Hikvision device appears to be disconnected
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const { date, time } = formatDateTime(log.punchTime);
                      const workDuration = calculateWorkDuration(log);

                      return (
                        <tr key={log._id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                              {log.employeeId}
                            </code>
                          </td>
                          <td className="p-4 font-medium text-gray-900">
                            {log.employeeName}
                          </td>
                          <td className="p-4">
                            <div className="font-medium">{date}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-gray-900">{time}</div>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              workDuration !== "-" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                            }`}>
                              {workDuration}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}