import React, { useEffect, useState } from "react";
import axios from "axios";

export default function TimesheetHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all, in, out
  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });

  const empId = localStorage.getItem("empId");

  useEffect(() => {
    fetchLogs();
  }, [filter, dateRange]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter !== "all") params.direction = filter;
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;

      const res = await axios.get(`/api/access/my-logs/${empId}`, { params });
      setLogs(res.data);
      setError("");
    } catch (err) {
      setError("Failed to fetch logs. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (direction) => {
    return direction === "in" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800";
  };

  const getStatusIcon = (direction) => {
    return direction === "in" ? "→ IN" : "← OUT";
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const filteredLogs = logs.filter(log => {
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Timesheet History</h1>
          <p className="text-gray-600">View your IN/OUT punch records and attendance history</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{logs.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <span className="text-blue-600 text-lg">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">IN Punches</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {logs.filter(log => log.direction === "in").length}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <span className="text-green-600 text-lg">→</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">OUT Punches</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {logs.filter(log => log.direction === "out").length}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <span className="text-blue-600 text-lg">←</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Direction Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Direction:</label>
                <select 
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="in">IN Only</option>
                  <option value="out">OUT Only</option>
                </select>
              </div>

              {/* Date Range Filters */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">From:</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">To:</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Reset Button */}
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Logs Table */}
        {!loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Device
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Day
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-12 px-6 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <span className="text-4xl mb-2">📊</span>
                          <p className="text-lg font-medium mb-1">No records found</p>
                          <p className="text-sm">Try adjusting your filters or check back later</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const { date, time } = formatDateTime(log.punchTime);
                      const day = new Date(log.punchTime).toLocaleDateString('en-US', { weekday: 'long' });
                      
                      return (
                        <tr 
                          key={log._id} 
                          className="hover:bg-gray-50 transition-colors duration-150"
                        >
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">{date}</span>
                              <span className="text-sm text-gray-500">{time}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(log.direction)}`}>
                              {getStatusIcon(log.direction)}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center">
                              <span className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                                {log.deviceId}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-600 capitalize">{day}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            {filteredLogs.length > 0 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
                  <span>
                    Showing <span className="font-semibold">{filteredLogs.length}</span> of{" "}
                    <span className="font-semibold">{logs.length}</span> records
                  </span>
                  <span className="mt-2 sm:mt-0">
                    Last updated: {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        {!loading && filteredLogs.length > 0 && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => window.print()}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <span className="mr-2">🖨️</span>
              Print Report
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          table {
            font-size: 0.875rem;
          }
          th, td {
            padding: 0.75rem 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}