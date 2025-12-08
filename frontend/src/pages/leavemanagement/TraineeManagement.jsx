import React, { useState } from 'react';
import { Search, Filter, UserPlus, Mail, Phone, Calendar, GraduationCap, AlertCircle, Edit, Eye, CheckCircle } from 'lucide-react';

const TraineeManagement = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTrainee, setSelectedTrainee] = useState(null);

  const trainees = [
    {
      id: 1,
      name: 'Alex Johnson',
      traineeId: 'TRN001',
      department: 'Software Development',
      joinDate: '2024-01-15',
      endDate: '2024-07-14',
      duration: '6 months',
      mentor: 'John Doe',
      mentorId: 'EMP001',
      contact: 'alex.j@company.com',
      phone: '+91 9876543210',
      status: 'active',
      attendance: '95%',
      performance: 'Excellent',
      leaves: {
        annual: { allocated: 12, used: 2, balance: 10 },
        sick: { allocated: 5, used: 0, balance: 5 },
        casual: { allocated: 3, used: 1, balance: 2 },
        totalUsed: 3,
        totalBalance: 17
      }
    },
    {
      id: 2,
      name: 'Priya Sharma',
      traineeId: 'TRN002',
      department: 'Digital Marketing',
      joinDate: '2024-01-20',
      endDate: '2024-04-19',
      duration: '3 months',
      mentor: 'Jane Smith',
      mentorId: 'EMP002',
      contact: 'priya.s@company.com',
      phone: '+91 9876543211',
      status: 'active',
      attendance: '92%',
      performance: 'Good',
      leaves: {
        annual: { allocated: 6, used: 1, balance: 5 },
        sick: { allocated: 3, used: 0, balance: 3 },
        casual: { allocated: 2, used: 2, balance: 0 },
        totalUsed: 3,
        totalBalance: 8
      }
    },
    {
      id: 3,
      name: 'Rahul Verma',
      traineeId: 'TRN003',
      department: 'Data Analytics',
      joinDate: '2023-12-01',
      endDate: '2024-05-31',
      duration: '6 months',
      mentor: 'Mike Johnson',
      mentorId: 'EMP003',
      contact: 'rahul.v@company.com',
      phone: '+91 9876543212',
      status: 'active',
      attendance: '98%',
      performance: 'Excellent',
      leaves: {
        annual: { allocated: 12, used: 4, balance: 8 },
        sick: { allocated: 5, used: 2, balance: 3 },
        casual: { allocated: 3, used: 2, balance: 1 },
        totalUsed: 8,
        totalBalance: 12
      }
    },
    {
      id: 4,
      name: 'Sneha Patel',
      traineeId: 'TRN004',
      department: 'UI/UX Design',
      joinDate: '2024-02-01',
      endDate: '2024-07-31',
      duration: '6 months',
      mentor: 'Sarah Wilson',
      mentorId: 'EMP004',
      contact: 'sneha.p@company.com',
      phone: '+91 9876543213',
      status: 'active',
      attendance: '89%',
      performance: 'Average',
      leaves: {
        annual: { allocated: 12, used: 0, balance: 12 },
        sick: { allocated: 5, used: 0, balance: 5 },
        casual: { allocated: 3, used: 0, balance: 3 },
        totalUsed: 0,
        totalBalance: 20
      }
    },
    {
      id: 5,
      name: 'Karan Singh',
      traineeId: 'TRN005',
      department: 'Business Analysis',
      joinDate: '2023-11-15',
      endDate: '2024-05-14',
      duration: '6 months',
      mentor: 'David Brown',
      mentorId: 'EMP005',
      contact: 'karan.s@company.com',
      phone: '+91 9876543214',
      status: 'completed',
      attendance: '96%',
      performance: 'Excellent',
      leaves: {
        annual: { allocated: 12, used: 6, balance: 6 },
        sick: { allocated: 5, used: 2, balance: 3 },
        casual: { allocated: 3, used: 1, balance: 2 },
        totalUsed: 9,
        totalBalance: 11
      }
    }
  ];

  const leaveRequests = [
    {
      id: 1,
      trainee: 'Alex Johnson',
      traineeId: 'TRN001',
      type: 'Casual Leave',
      dates: '2024-01-25 to 2024-01-25',
      days: 1,
      reason: 'Family function',
      appliedOn: '2024-01-20',
      mentor: 'John Doe',
      status: 'pending'
    },
    {
      id: 2,
      trainee: 'Priya Sharma',
      traineeId: 'TRN002',
      type: 'Sick Leave',
      dates: '2024-01-22 to 2024-01-22',
      days: 1,
      reason: 'Medical appointment',
      appliedOn: '2024-01-21',
      mentor: 'Jane Smith',
      status: 'approved'
    },
    {
      id: 3,
      trainee: 'Rahul Verma',
      traineeId: 'TRN003',
      type: 'Annual Leave',
      dates: '2024-02-05 to 2024-02-07',
      days: 3,
      reason: 'Personal vacation',
      appliedOn: '2024-01-30',
      mentor: 'Mike Johnson',
      status: 'pending'
    }
  ];

  const filteredTrainees = trainees.filter(trainee => {
    if (activeTab === 'all') return true;
    return trainee.status === activeTab;
  });

  const stats = {
    total: trainees.length,
    active: trainees.filter(t => t.status === 'active').length,
    completed: trainees.filter(t => t.status === 'completed').length,
    pendingLeaves: leaveRequests.filter(l => l.status === 'pending').length,
    avgAttendance: '94%',
    avgPerformance: 'Good'
  };

  const handleApproveLeave = (id) => {
    alert(`Leave request ${id} approved`);
  };

  const handleRejectLeave = (id) => {
    const remarks = prompt('Enter reason for rejection:');
    if (remarks) {
      alert(`Leave request ${id} rejected: ${remarks}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Trainees Management</h1>
          <p className="page-subtitle">Manage trainee leaves and performance</p>
        </div>
        <button className="btn btn-primary">
          <UserPlus size={18} />
          Add New Trainee
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Trainees</div>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-600">Active Trainees</div>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingLeaves}</div>
            <div className="text-sm text-gray-600">Pending Leaves</div>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats.avgAttendance}</div>
            <div className="text-sm text-gray-600">Avg Attendance</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {['all', 'active', 'completed'].map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 font-medium capitalize ${activeTab === tab ? 'border-b-2 border-primary text-primary' : 'text-gray-600'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab} ({tab === 'all' ? stats.total : tab === 'active' ? stats.active : stats.completed})
          </button>
        ))}
      </div>

      {/* Trainees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrainees.map((trainee) => (
          <div key={trainee.id} className="card">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-semibold">
                  {trainee.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-semibold">{trainee.name}</h3>
                  <p className="text-sm text-gray-500">{trainee.traineeId}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    trainee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {trainee.status.charAt(0).toUpperCase() + trainee.status.slice(1)}
                  </span>
                </div>
              </div>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => setSelectedTrainee(trainee)}
              >
                <Eye size={14} />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <GraduationCap size={16} />
                <span>{trainee.department}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} />
                <span>{trainee.joinDate} to {trainee.endDate}</span>
              </div>
              <div className="text-sm text-gray-600">
                Mentor: <span className="font-medium">{trainee.mentor}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail size={16} />
                <span>{trainee.contact}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={16} />
                <span>{trainee.phone}</span>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="text-lg font-bold text-blue-600">{trainee.attendance}</div>
                <div className="text-xs text-gray-600">Attendance</div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="text-lg font-bold text-green-600">{trainee.performance}</div>
                <div className="text-xs text-gray-600">Performance</div>
              </div>
            </div>

            {/* Leave Balance */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-medium">Leave Balance</div>
                <div className="font-bold">{trainee.leaves.totalBalance} days</div>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: `${(trainee.leaves.totalUsed / (trainee.leaves.totalUsed + trainee.leaves.totalBalance)) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Used: {trainee.leaves.totalUsed} days
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button className="btn btn-outline btn-sm flex-1">
                <Edit size={14} />
                Edit
              </button>
              <button className="btn btn-primary btn-sm flex-1">
                Manage Leaves
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Leave Requests */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Pending Leave Requests</h2>
          <div className="text-sm text-gray-500">
            {leaveRequests.filter(l => l.status === 'pending').length} pending requests
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Trainee</th>
                <th>Leave Details</th>
                <th>Mentor</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests
                .filter(request => request.status === 'pending')
                .map((request) => (
                  <tr key={request.id}>
                    <td>
                      <div>
                        <div className="font-medium">{request.trainee}</div>
                        <div className="text-sm text-gray-500">{request.traineeId}</div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div className="font-medium">{request.type}</div>
                        <div className="text-sm text-gray-500">{request.dates} ({request.days} days)</div>
                        <div className="text-xs text-gray-400">{request.reason}</div>
                      </div>
                    </td>
                    <td>{request.mentor}</td>
                    <td>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                        Pending Mentor Approval
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          className="btn btn-success btn-sm"
                          onClick={() => handleApproveLeave(request.id)}
                        >
                          <CheckCircle size={14} />
                          Approve
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRejectLeave(request.id)}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trainee Leave Policy */}
      <div className="card">
        <h2 className="card-title mb-4">Trainee Leave Policy</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3 text-purple-700">Leave Allocation</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span>Annual Leave</span>
                <span className="font-semibold">12 days per 6 months</span>
              </li>
              <li className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span>Sick Leave</span>
                <span className="font-semibold">5 days per 6 months</span>
              </li>
              <li className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span>Casual Leave</span>
                <span className="font-semibold">3 days per 6 months</span>
              </li>
              <li className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span>Emergency Leave</span>
                <span className="font-semibold">2 days per 6 months</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-purple-700">Important Guidelines</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <AlertCircle size={16} className="text-purple-600 mt-0.5" />
                <span>All leaves require mentor approval before submission</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle size={16} className="text-purple-600 mt-0.5" />
                <span>Maximum 5 consecutive leave days allowed</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle size={16} className="text-purple-600 mt-0.5" />
                <span>Medical certificate required for sick leave beyond 2 days</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle size={16} className="text-purple-600 mt-0.5" />
                <span>Unused leaves will not be carried forward after training period</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TraineeManagement;