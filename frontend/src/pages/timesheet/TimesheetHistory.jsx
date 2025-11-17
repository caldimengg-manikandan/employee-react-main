import React, { useState, useEffect } from 'react';
import { timesheetAPI } from '../../services/api';
import { Eye, Filter, Calendar, FileText, X } from 'lucide-react';

const TimesheetHistory = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [filteredTimesheets, setFilteredTimesheets] = useState([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({
    year: new Date().getFullYear().toString(),
    month: '',
    status: ''
  });

  // Fetch real timesheet history from backend including drafts
  useEffect(() => {
    const fetchTimesheets = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await timesheetAPI.getMyTimesheets();
        const data = Array.isArray(res.data) ? res.data : [];
        
        // Get session storage drafts and merge with backend data
        const sessionDrafts = getSessionStorageDrafts();
        const allTimesheets = [...data, ...sessionDrafts];
        
        setTimesheets(allTimesheets);
        setFilteredTimesheets(allTimesheets);
      } catch (err) {
        console.error('Failed to fetch timesheets:', err);
        setError(
          err.response?.data?.message || 'Unable to load timesheet history. Please try again.'
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchTimesheets();
  }, []);

  // Get drafts from sessionStorage
  const getSessionStorageDrafts = () => {
    const drafts = [];
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('timesheet_draft_')) {
          const draftData = JSON.parse(sessionStorage.getItem(key));
          if (draftData && draftData.rows) {
            drafts.push({
              _id: `session_${key}`, // Generate unique ID for session drafts
              weekStartDate: draftData.weekStart,
              weekEndDate: draftData.weekEnd,
              entries: draftData.rows.map(row => ({
                project: row.project,
                task: row.task,
                type: row.type,
                hours: row.hours
              })),
              totalHours: (() => {
                const workSum = draftData.rows.reduce((total, row) =>
                  total + row.hours.reduce((sum, hour) => sum + (Number(hour) || 0), 0), 0
                );
                let breakSum = 0;
                for (let i = 0; i < 7; i++) {
                  const hasProjectWork = draftData.rows.some(r => r.type === 'project' && ((r.hours?.[i] ?? 0) > 0));
                  const isFullDayLeaveOrHoliday = draftData.rows.some(r => (r.type === 'leave' || r.type === 'holiday') && ((r.hours?.[i] ?? 0) >= 8));
                  if (hasProjectWork && !isFullDayLeaveOrHoliday) {
                    breakSum += 1.25;
                  }
                }
                return Number((workSum + breakSum).toFixed(1));
              })(),
              status: 'Draft',
              updatedAt: draftData.savedAt,
              isSessionDraft: true // Flag to identify session storage drafts
            });
          }
        }
      }
    } catch (error) {
      console.error('Error reading drafts from sessionStorage:', error);
    }
    return drafts;
  };

  // Apply filters whenever filter criteria changes
  useEffect(() => {
    let filtered = timesheets;

    // Filter by year
    if (filter.year) {
      filtered = filtered.filter((t) => {
        const timesheetYear = new Date(t.weekStartDate).getFullYear().toString();
        return timesheetYear === filter.year;
      });
    }

    // Filter by month
    if (filter.month !== '') {
      filtered = filtered.filter((t) => {
        const timesheetMonth = new Date(t.weekStartDate).getMonth().toString();
        return timesheetMonth === filter.month;
      });
    }

    // Filter by status
    if (filter.status) {
      filtered = filtered.filter((t) =>
        (t.status || '').toLowerCase() === filter.status.toLowerCase()
      );
    }

    setFilteredTimesheets(filtered);
  }, [filter, timesheets]);

  const getStatusBadge = (status) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-semibold";
    
    switch ((status || '').toLowerCase()) {
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'submitted':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'draft':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatWeekRange = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const handleViewDetails = (timesheet) => {
    setSelectedTimesheet(timesheet);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedTimesheet(null);
  };

  const clearFilters = () => {
    setFilter({
      year: new Date().getFullYear().toString(),
      month: '',
      status: ''
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Timesheet History</h1>
        <p className="text-gray-600">View your submitted timesheets and drafts</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Filter Timesheets</h3>
          </div>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            Clear Filters
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select 
              value={filter.year}
              onChange={(e) => setFilter({...filter, year: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select 
              value={filter.month}
              onChange={(e) => setFilter({...filter, month: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Months</option>
              <option value="0">January</option>
              <option value="1">February</option>
              <option value="2">March</option>
              <option value="3">April</option>
              <option value="4">May</option>
              <option value="5">June</option>
              <option value="6">July</option>
              <option value="7">August</option>
              <option value="8">September</option>
              <option value="9">October</option>
              <option value="10">November</option>
              <option value="11">December</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select 
              value={filter.status}
              onChange={(e) => setFilter({...filter, status: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        
        {/* Results count */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredTimesheets.length} of {timesheets.length} timesheets
          {timesheets.some(t => t.isSessionDraft) && (
            <span className="ml-2 text-blue-600">
              • {timesheets.filter(t => t.isSessionDraft).length} draft(s) from current session
            </span>
          )}
        </div>
      </div>

      {/* Timesheet History Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-800">Timesheets & Drafts</h2>
          </div>
        </div>
        {isLoading && (
          <div className="p-6 text-sm text-gray-600">Loading timesheets…</div>
        )}
        {error && (
          <div className="p-6 text-sm text-red-600">{error}</div>
        )}
        
        {filteredTimesheets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Week</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Projects</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Total Hours</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Last Updated</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTimesheets.map((t) => {
                  const projectList = Array.from(new Set((t.entries || []).map((e) => e.project))).filter(Boolean);
                  const isDraft = (t.status || '').toLowerCase() === 'draft';
                  const isSessionDraft = t.isSessionDraft;
                  
                  return (
                    <tr key={t._id} className="hover:bg-gray-50 border-b">
                      <td className="p-4 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatWeekRange(t.weekStartDate, t.weekEndDate)}
                          {isSessionDraft && (
                            <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              Session
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        <div className="space-y-1">
                          {projectList.length === 0 && <span className="text-gray-500">—</span>}
                          {projectList.map((project, index) => (
                            <div key={index} className="flex items-center">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              {project}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-sm font-semibold text-gray-900">
                        {t.totalHours} hours
                      </td>
                      <td className="p-4">
                        <span className={getStatusBadge(t.status)}>
                          {t.status || '—'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {isDraft 
                          ? (t.updatedAt 
                              ? new Date(t.updatedAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : '—')
                          : (t.submittedAt
                              ? new Date(t.submittedAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })
                              : '—')
                        }
                      </td>
                      <td className="p-4">
                        <button 
                          onClick={() => handleViewDetails(t)}
                          className="text-blue-600 hover:text-blue-800 transition-colors duration-200 flex items-center gap-1"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Timesheets Found</h3>
            <p className="text-gray-600 mb-4">No timesheets match your current filters.</p>
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear filters to see all timesheets
            </button>
          </div>
        )}
      </div>

      {/* Timesheet Details Modal */}
      {showDetailsModal && selectedTimesheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <h2 className="text-xl font-semibold text-gray-800">
                    Timesheet Details - {formatWeekRange(selectedTimesheet.weekStartDate, selectedTimesheet.weekEndDate)}
                    {selectedTimesheet.isSessionDraft && (
                      <span className="ml-2 text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        Session Draft
                      </span>
                    )}
                  </h2>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  title="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Status:</span>{' '}
                  <span className={getStatusBadge(selectedTimesheet.status)}>
                    {selectedTimesheet.status || '—'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Total Hours:</span>{' '}
                  {selectedTimesheet.totalHours} hours
                </div>
                <div>
                  <span className="font-medium">
                    {selectedTimesheet.status === 'Draft' ? 'Last Updated:' : 'Submitted:'}
                  </span>{' '}
                  {selectedTimesheet.status === 'Draft' 
                    ? (selectedTimesheet.updatedAt 
                        ? new Date(selectedTimesheet.updatedAt).toLocaleDateString() 
                        : '—')
                    : (selectedTimesheet.submittedAt 
                        ? new Date(selectedTimesheet.submittedAt).toLocaleDateString() 
                        : '—')
                  }
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Time Entries (Project/Task with Mon–Sun hours) */}
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Time Entries</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Project</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Task</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Mon</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Tue</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Wed</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Thu</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Fri</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Sat</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Sun</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedTimesheet.entries || []).map((entry, index) => {
                      const hours = entry.hours || [0,0,0,0,0,0,0];
                      const rowTotal = hours.reduce((sum, h) => sum + (Number(h) || 0), 0);
                      return (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-sm font-medium text-gray-900">{entry.project}</td>
                          <td className="p-3 text-sm text-gray-700">{entry.task}</td>
                          {hours.map((h, i) => (
                            <td key={i} className="p-3 text-sm text-gray-700">{Number(h) || 0}</td>
                          ))}
                          <td className="p-3 text-sm font-semibold text-gray-900">{rowTotal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-800">Total Hours:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {selectedTimesheet.totalHours} hours
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
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

export default TimesheetHistory;