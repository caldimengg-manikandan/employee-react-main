import React, { useEffect, useState } from "react";
import { accessAPI } from "../../services/api";

export default function EmployeeAttendance() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });
  const [stats, setStats] = useState({ total: 0, in: 0, out: 0 });
  const [punchLoading, setPunchLoading] = useState(false);
  const [hikStatus, setHikStatus] = useState("");
  const [hikLoading, setHikLoading] = useState(false);
  const [hikConnectionStatus, setHikConnectionStatus] = useState("");
  const [hikConnectionSuggestions, setHikConnectionSuggestions] = useState([]);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [filter, dateRange]);

  const testHikvisionConnection = async () => {
    try {
      setHikConnectionStatus("Testing connection...");
      
      const token = sessionStorage.getItem("token");
      if (!token) {
        setHikConnectionStatus("No authentication token found. Please login again.");
        return;
      }

      const res = await accessAPI.testHikvisionConnection();
      
      if (res.data?.success) {
        setHikConnectionStatus("✅ Connected to Hikvision device successfully");
      } else {
        setHikConnectionStatus("❌ Failed to connect to Hikvision device");
      }
    } catch (err) {
      console.error("Error testing Hikvision connection:", err);
      
      let errorMessage = "❌ Cannot connect to Hikvision device.";
      let suggestions = [];
      
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = "❌ Connection timeout. Device may be offline or network issue.";
        suggestions = [
          "Check if the device is powered on",
          "Verify network connectivity",
          "Check firewall settings"
        ];
      } else if (err.response?.status === 401) {
        errorMessage = "Authentication failed. Please login again.";
      } else if (err.response?.data?.error) {
        errorMessage = `❌ ${err.response.data.error}`;
        suggestions = err.response.data.suggestions || [];
      } else if (err.response?.status === 500) {
        errorMessage = "❌ Server error. Please check device configuration.";
        suggestions = err.response.data?.suggestions || [];
      }
      
      setHikConnectionStatus(errorMessage);
      
      // Store suggestions for display
      if (suggestions.length > 0) {
        setHikConnectionSuggestions(suggestions);
      }
    }
  };

  const pullHikvisionEvents = async () => {
    try {
      setHikLoading(true);
      setHikStatus("");
      
      const token = sessionStorage.getItem("token");
      if (!token) {
        setHikStatus("No authentication token found. Please login again.");
        return;
      }

      const res = await accessAPI.pullHikvisionEvents();
      
      if (res.data?.success) {
        const eventCount = res.data.events?.length || 0;
        setHikStatus(`Successfully pulled ${eventCount} events from Hikvision`);
        fetchLogs();
        fetchStats();
      } else {
        setHikStatus("Failed to pull events from Hikvision");
      }
    } catch (err) {
      console.error("Error pulling Hikvision events:", err);
      
      let errorMessage = "Failed to connect to Hikvision system.";
      
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = "Connection timeout. Device may be offline or network issue.";
      } else if (err.response?.status === 401) {
        errorMessage = "Authentication failed. Please login again.";
      } else if (err.response?.status === 503) {
        errorMessage = "Hikvision device is not reachable. Please check device status.";
      } else if (err.response?.status === 504) {
        errorMessage = "Hikvision device is not responding. Please check network connectivity.";
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setHikStatus(errorMessage);
    } finally {
      setHikLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) return;

      const params = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;

      const res = await accessAPI.getStats(params);
      setStats(res.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const handlePunch = async (direction) => {
    try {
      setPunchLoading(true);
      const token = sessionStorage.getItem("token");
      if (!token) {
        setError("No authentication token found. Please login again.");
        return;
      }

      await accessAPI.punch({ direction, deviceId: "web" });

      fetchLogs();
      fetchStats();
      
      alert(`${direction === 'in' ? 'Punch In' : 'Punch Out'} recorded successfully!`);
    } catch (err) {
      console.error("Error recording punch:", err);
      if (err.response?.status === 401) {
        setError("Authentication failed. Please login again.");
      } else {
        setError("Failed to record attendance. Please try again.");
      }
    } finally {
      setPunchLoading(false);
    }
  };

  const fetchLogs = async () => {
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
      if (filter !== "all") params.direction = filter;
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;

      const res = await accessAPI.getMyLogs(params);
      setLogs(res.data);
    } catch (err) {
      console.error("Error fetching logs:", err);
      if (err.response?.status === 401) {
        setError("Authentication failed. Please login again.");
      } else {
        setError("Failed to fetch logs. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (direction) => {
    return direction === "in"
      ? "bg-green-100 text-green-800"
      : "bg-blue-100 text-blue-800";
  };

  const getStatusIcon = (direction) => {
    return direction === "in" ? "→ IN" : "← OUT";
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
      }),
    };
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true;
    return log.direction === filter;
  });

  const resetFilters = () => {
    setFilter("all");
    setDateRange({ start: "", end: "" });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Attendance History</h1>
          <p className="text-gray-600">
            View your IN/OUT access entries synced from Hikvision.
          </p>
        </div>

        {/* Punch In/Out Buttons */}
        <div className="bg-white shadow rounded-lg p-6 border mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => handlePunch("in")}
              disabled={punchLoading}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {punchLoading ? "Processing..." : "Punch In"}
            </button>
            <button
              onClick={() => handlePunch("out")}
              disabled={punchLoading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {punchLoading ? "Processing..." : "Punch Out"}
            </button>
          </div>
        </div>

        {/* Hikvision Sync Section */}
        <div className="bg-white shadow rounded-lg p-6 border mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Hikvision Integration</h3>
              <p className="text-sm text-gray-600">Sync attendance data from Hikvision access control system</p>
              <p className="text-xs text-gray-500 mt-1">
                Device: {process.env.HIK_BASE_URL || '192.168.1.144:8080'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={testHikvisionConnection}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
              >
                Test Connection
              </button>
              <button
                onClick={pullHikvisionEvents}
                disabled={hikLoading}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {hikLoading ? "Syncing..." : "Sync from Hikvision"}
              </button>
            </div>
          </div>
          
          {hikConnectionStatus && (
            <div className={`mt-4 p-3 rounded-lg ${
              hikConnectionStatus.includes('✅') 
                ? 'bg-green-100 text-green-800' 
                : hikConnectionStatus.includes('❌') 
                ? 'bg-red-100 text-red-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {hikConnectionStatus}
            </div>
          )}
          
          {hikConnectionSuggestions.length > 0 && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Troubleshooting Suggestions:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {hikConnectionSuggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {hikStatus && (
            <div className={`mt-2 p-3 rounded-lg ${
              hikStatus.includes('Successfully') 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {hikStatus}
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white shadow rounded-lg p-5 border">
            <p className="text-sm text-gray-600">Total Records</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-5 border">
            <p className="text-sm text-gray-600">Total IN</p>
            <p className="text-2xl font-bold text-green-600">{stats.in}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-5 border">
            <p className="text-sm text-gray-600">Total OUT</p>
            <p className="text-2xl font-bold text-blue-600">{stats.out}</p>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white shadow rounded-lg p-6 border mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Direction:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="in">IN</option>
                <option value="out">OUT</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">From:</span>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">To:</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-4 text-left text-sm font-medium text-gray-700">Date & Time</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-700">Direction</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-700">Device</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-700">Day</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-gray-500">
                        No records found for the selected filters
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const { date, time } = formatDateTime(log.punchTime);
                      const day = new Date(log.punchTime).toLocaleDateString("en-US", { weekday: "long" });

                      return (
                        <tr key={log._id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <div className="font-medium">{date}</div>
                            <div className="text-sm text-gray-500">{time}</div>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(log.direction)}`}>
                              {getStatusIcon(log.direction)}
                            </span>
                          </td>
                          <td className="p-4">
                            <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                              {log.deviceId}
                            </code>
                          </td>
                          <td className="p-4 text-gray-600">{day}</td>
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