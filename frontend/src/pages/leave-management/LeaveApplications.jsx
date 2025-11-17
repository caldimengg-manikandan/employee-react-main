// src/pages/leave-management/LeaveApplications.jsx
import React, { useState, useEffect } from 'react';
import { Check, X, Eye, Filter, Calendar } from 'lucide-react';

const LeaveApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: 'pending',
    department: 'all'
  });

  // Sample data for pending applications
  const sampleApplications = [
    {
      id: 1,
      employeeId: 'EMP002',
      employeeName: 'Priya Sharma',
      department: 'Engineering',
      leaveType: 'Casual Leave',
      startDate: '2024-12-26',
      endDate: '2024-12-28',
      numberOfDays: 3,
      reason: 'Family wedding',
      status: 'pending',
      appliedDate: '2024-12-18',
      contactNumber: '+91-9876543210'
    },
    {
      id: 2,
      employeeId: 'EMP003',
      employeeName: 'Amit Patel',
      department: 'IT',
      leaveType: 'Sick Leave',
      startDate: '2024-12-24',
      endDate: '2024-12-24',
      numberOfDays: 1,
      reason: 'Medical appointment',
      status: 'pending',
      appliedDate: '2024-12-23',
      contactNumber: '+91-9876543211'
    }
  ];

  useEffect(() => {
    // Simulate API call
    setApplications(sampleApplications);
  }, []);

  const handleApprove = async (applicationId) => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setApplications(prev => prev.filter(app => app.id !== applicationId));
      alert('Leave application approved successfully!');
    } catch (error) {
      console.error('Error approving leave:', error);
      alert('Failed to approve leave application.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (applicationId) => {
    if (!window.confirm('Are you sure you want to reject this leave application?')) return;
    
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setApplications(prev => prev.filter(app => app.id !== applicationId));
      alert('Leave application rejected.');
    } catch (error) {
      console.error('Error rejecting leave:', error);
      alert('Failed to reject leave application.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leave Applications</h1>
        <p className="text-gray-600">Review and manage team leave requests</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({...prev, status: e.target.value}))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="pending">Pending</option>
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 text-left text-sm font-semibold border-b">Employee</th>
                <th className="p-3 text-left text-sm font-semibold border-b">Department</th>
                <th className="p-3 text-left text-sm font-semibold border-b">Leave Type</th>
                <th className="p-3 text-left text-sm font-semibold border-b">Dates</th>
                <th className="p-3 text-left text-sm font-semibold border-b">Duration</th>
                <th className="p-3 text-left text-sm font-semibold border-b">Reason</th>
                <th className="p-3 text-left text-sm font-semibold border-b">Applied On</th>
                <th className="p-3 text-left text-sm font-semibold border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id} className="hover:bg-gray-50 border-b">
                  <td className="p-3">
                    <div className="font-medium text-gray-900">{application.employeeName}</div>
                    <div className="text-sm text-gray-500">{application.employeeId}</div>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {application.department}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-gray-900">{application.leaveType}</div>
                  </td>
                  <td className="p-3">
                    <div className="text-sm text-gray-600">
                      {formatDate(application.startDate)} to {' '}
                      {formatDate(application.endDate)}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-sm font-semibold text-blue-600">
                      {application.numberOfDays} day{application.numberOfDays > 1 ? 's' : ''}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-sm text-gray-600 max-w-xs truncate">
                      {application.reason}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-sm text-gray-600">
                      {formatDate(application.appliedDate)}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApprove(application.id)}
                        disabled={loading}
                        className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReject(application.id)}
                        disabled={loading}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {applications.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No pending leave applications found.</p>
              <p className="text-sm mt-2">All leave requests have been processed.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveApplications;