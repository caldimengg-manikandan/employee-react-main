import React, { useEffect, useState } from 'react';
import { specialPermissionAPI, BASE_URL } from '../../services/api';

const AdminSpecialPermission = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('All');
  const [location, setLocation] = useState('All');
  const [division, setDivision] = useState('All');

  // Audit Log Modal states
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditStatusFilter, setAuditStatusFilter] = useState('All');

  const load = async () => {
    try {
      setLoading(true);
      const res = await specialPermissionAPI.list({ status });
      setItems(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (_) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const approve = async (id) => {
    await specialPermissionAPI.approve(id);
    await load();
  };
  const reject = async (id) => {
    const reason = window.prompt('Rejection reason (optional)') || '';
    await specialPermissionAPI.reject(id, reason);
    await load();
  };

  const openAuditModal = async () => {
    setShowAuditModal(true);
    setAuditLoading(true);
    try {
      const res = await specialPermissionAPI.getAuditLogs();
      setAuditLogs(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const formatPermissionDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatActionDateTime = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr}, ${timeStr}`;
  };

  const locations = ['All', ...new Set(items.map(i => i.location).filter(l => l && l !== '-'))];
  const divisions = ['All', ...new Set(items.map(i => i.division).filter(d => d && d !== '-'))];

  const filteredItems = items.filter(it => {
    const matchLoc = location === 'All' || it.location === location;
    const matchDiv = division === 'All' || it.division === division;
    return matchLoc && matchDiv;
  });

  const filteredAuditLogs = auditLogs.filter(log => {
    const query = auditSearch.trim().toLowerCase();
    const matchesSearch = !query ||
      (log.employeeName && log.employeeName.toLowerCase().includes(query)) ||
      (log.employeeId && log.employeeId.toLowerCase().includes(query));
    const matchesStatus = auditStatusFilter === 'All' || log.status === auditStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex items-center gap-4 flex-wrap">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="p-2 border border-gray-300 rounded text-sm"
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="All">All Status</option>
        </select>

        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="p-2 border border-gray-300 rounded text-sm"
        >
          {locations.map(l => <option key={l} value={l}>{l === 'All' ? 'All Locations' : l}</option>)}
        </select>

        <select
          value={division}
          onChange={(e) => setDivision(e.target.value)}
          className="p-2 border border-gray-300 rounded text-sm"
        >
          {divisions.map(d => <option key={d} value={d}>{d === 'All' ? 'All Divisions' : d}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm font-semibold text-gray-800">Requests</div>
          <button
            onClick={openAuditModal}
            className="px-3 py-1.5 bg-[#262760] text-white text-xs md:text-sm font-medium rounded hover:bg-[#1d1e4b] transition flex items-center gap-1.5 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Audit Log
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-sm text-gray-500">No requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse">
                <thead className="bg-[#262760] text-white">
                  <tr>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Employee</th>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Location</th>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Division</th>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Prev Day On-Premises</th>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Date</th>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Shift</th>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Shortage Hours</th>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Reason</th>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Status</th>
                    <th className="p-2 border border-gray-600 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredItems.map((it) => {
                    const d = new Date(it.date);
                    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    return (
                      <tr key={it._id} className="hover:bg-gray-50">
                        <td className="p-2 border text-sm">{it.employeeName} ({it.employeeId})</td>
                        <td className="p-2 border text-sm">{it.location || '-'}</td>
                        <td className="p-2 border text-sm">{it.division || '-'}</td>
                        <td className="p-2 border text-sm">
                          {(() => {
                            const val = Number(it.onPremisesHours || 0);
                            const hh = String(Math.floor(val)).padStart(2, '0');
                            const mm = String(Math.round((val - Math.floor(val)) * 60)).padStart(2, '0');
                            return `${hh}:${mm}`;
                          })()}
                        </td>
                        <td className="p-2 border text-sm">{dateStr}</td>
                        <td className="p-2 border text-sm">{it.shift || '-'}</td>
                        <td className="p-2 border text-sm">
                          {(() => {
                            const val = Number(it.totalHours || 0);
                            const hh = String(Math.floor(val)).padStart(2, '0');
                            const mm = String(Math.round((val - Math.floor(val)) * 60)).padStart(2, '0');
                            return `${hh}:${mm}`;
                          })()}
                        </td>
                        <td className="p-2 border text-sm">{it.reason}</td>
                        <td className="p-2 border text-sm">
                          <span className={`font-semibold ${it.status === 'APPROVED' ? 'text-green-600' : it.status === 'REJECTED' ? 'text-red-600' : 'text-yellow-600'}`}>{it.status}</span>
                        </td>
                        <td className="p-2 border text-sm space-x-2">
                          {it.status === 'PENDING' ? (
                            <>
                              <button onClick={() => approve(it._id)} className="px-3 py-1 rounded bg-green-600 text-white">Approve</button>
                              <button onClick={() => reject(it._id)} className="px-3 py-1 rounded bg-red-600 text-white">Reject</button>
                            </>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Audit Log Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#262760] text-white flex items-center justify-between">
              <h2 className="text-base md:text-lg font-bold tracking-wide">Special Permission Audit Log</h2>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-white hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-white/10"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Filters */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Search by Employee Name or ID..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="p-2 border border-gray-300 rounded text-sm w-64 focus:outline-none focus:ring-1 focus:ring-[#262760]"
                />
                <select
                  value={auditStatusFilter}
                  onChange={(e) => setAuditStatusFilter(e.target.value)}
                  className="p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#262760]"
                >
                  <option value="All">All Status</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
              <div className="text-xs text-gray-500 font-medium">
                Showing {filteredAuditLogs.length} record{filteredAuditLogs.length === 1 ? '' : 's'}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              {auditLoading ? (
                <div className="py-8 text-center text-sm text-gray-500">Loading audit logs...</div>
              ) : filteredAuditLogs.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">No audit log records found.</div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded">
                  <table className="min-w-full table-auto border-collapse">
                    <thead className="bg-[#262760] text-white">
                      <tr>
                        <th className="p-2.5 border border-gray-600 text-left text-xs md:text-sm font-semibold">Employee</th>
                        <th className="p-2.5 border border-gray-600 text-left text-xs md:text-sm font-semibold">Permission Date</th>
                        <th className="p-2.5 border border-gray-600 text-left text-xs md:text-sm font-semibold">Status</th>
                        <th className="p-2.5 border border-gray-600 text-left text-xs md:text-sm font-semibold">Approved By / Rejected By</th>
                        <th className="p-2.5 border border-gray-600 text-left text-xs md:text-sm font-semibold">Approved On / Rejected On</th>
                        <th className="p-2.5 border border-gray-600 text-left text-xs md:text-sm font-semibold">Rejection Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAuditLogs.map((log) => {
                        return (
                          <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-2.5 border text-sm font-medium text-gray-900">
                              {log.employeeName} ({log.employeeId})
                            </td>
                            <td className="p-2.5 border text-sm text-gray-700">
                              {formatPermissionDate(log.permissionDate)}
                            </td>
                            <td className="p-2.5 border text-sm">
                              <span className={`font-semibold ${log.status === 'APPROVED' ? 'text-green-600' : log.status === 'REJECTED' ? 'text-red-600' : 'text-yellow-600'}`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="p-2.5 border text-sm text-gray-700">
                              {log.status === 'APPROVED'
                                ? (log.approvedBy || log.actionByName || '-')
                                : (log.rejectedBy || log.actionByName || '-')}
                            </td>
                            <td className="p-2.5 border text-sm text-gray-700">
                              {formatActionDateTime(log.status === 'APPROVED'
                                ? (log.approvedOn || log.actionAt)
                                : (log.rejectedOn || log.actionAt))}
                            </td>
                            <td className="p-2.5 border text-sm text-gray-700">
                              {log.status === 'REJECTED' ? (log.rejectionReason || '-') : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium rounded transition-colors"
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

export default AdminSpecialPermission;

