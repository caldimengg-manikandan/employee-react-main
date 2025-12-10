import React, { useState } from 'react';
import { UserPlus, Mail, Phone, Calendar, GraduationCap, Edit, Eye, Trash2, CheckCircle, XCircle } from 'lucide-react';

const TraineeManagement = () => {
  const [trainees, setTrainees] = useState([
    {
      id: 1,
      name: 'Alex Johnson',
      traineeId: 'TRN001',
      department: 'Software Development',
      joinDate: '2024-01-15',
      endDate: '2024-07-14',
      duration: '6 months',
      mentor: 'John Doe',
      contact: 'alex.j@company.com',
      phone: '+91 9876543210',
      status: 'active'
    },
    {
      id: 2,
      name: 'Priya Sharma',
      traineeId: 'TRN002',
      department: 'Digital Marketing',
      joinDate: '2024-01-20',
      endDate: '2024-07-19',
      duration: '6 months',
      mentor: 'Jane Smith',
      contact: 'priya.s@company.com',
      phone: '+91 9876543211',
      status: 'active'
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
      contact: 'rahul.v@company.com',
      phone: '+91 9876543212',
      status: 'completed'
    }
  ]);

  const [newTrainee, setNewTrainee] = useState({
    name: '',
    department: '',
    joinDate: '',
    mentor: '',
    contact: '',
    phone: ''
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTrainee, setSelectedTrainee] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  // Calculate end date (6 months from join date)
  const calculateEndDate = (joinDate) => {
    if (!joinDate) return '';
    const date = new Date(joinDate);
    date.setMonth(date.getMonth() + 6);
    return date.toISOString().split('T')[0];
  };

  // Add new trainee
  const handleAddTrainee = (e) => {
    e.preventDefault();
    if (!newTrainee.name || !newTrainee.department || !newTrainee.joinDate) {
      alert('Please fill all required fields');
      return;
    }

    const endDate = calculateEndDate(newTrainee.joinDate);
    const newId = trainees.length > 0 ? Math.max(...trainees.map(t => t.id)) + 1 : 1;
    const traineeId = `TRN${String(newId).padStart(3, '0')}`;

    const trainee = {
      id: newId,
      traineeId,
      name: newTrainee.name,
      department: newTrainee.department,
      joinDate: newTrainee.joinDate,
      endDate,
      duration: '6 months',
      mentor: newTrainee.mentor || 'Not Assigned',
      contact: newTrainee.contact || '',
      phone: newTrainee.phone || '',
      status: 'active'
    };

    setTrainees([...trainees, trainee]);
    setNewTrainee({
      name: '',
      department: '',
      joinDate: '',
      mentor: '',
      contact: '',
      phone: ''
    });
    setShowAddForm(false);
  };

  // Remove trainee after 6 months
  const handleRemoveTrainee = (id) => {
    if (window.confirm('Are you sure you want to remove this trainee?')) {
      setTrainees(trainees.filter(t => t.id !== id));
    }
  };

  // Mark trainee as completed
  const handleCompleteTrainee = (id) => {
    setTrainees(trainees.map(t => 
      t.id === id ? { ...t, status: 'completed' } : t
    ));
  };

  // Filter trainees by status
  const filteredTrainees = trainees.filter(trainee => {
    if (activeTab === 'all') return true;
    return trainee.status === activeTab;
  });

  // Stats
  const stats = {
    total: trainees.length,
    active: trainees.filter(t => t.status === 'active').length,
    completed: trainees.filter(t => t.status === 'completed').length
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Trainee Management</h1>
          <p className="text-gray-600">Manage trainee information and duration</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus size={18} />
          Add New Trainee
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Trainees</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-600">Active Trainees</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'active' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('active')}
        >
          Active ({stats.active})
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'completed' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed ({stats.completed})
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'all' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('all')}
        >
          All ({stats.total})
        </button>
      </div>

      {/* Add Trainee Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Trainee</h2>
              <form onSubmit={handleAddTrainee} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newTrainee.name}
                    onChange={(e) => setNewTrainee({...newTrainee, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                  <input
                    type="text"
                    required
                    value={newTrainee.department}
                    onChange={(e) => setNewTrainee({...newTrainee, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Software Development"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Join Date *</label>
                  <input
                    type="date"
                    required
                    value={newTrainee.joinDate}
                    onChange={(e) => setNewTrainee({...newTrainee, joinDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mentor</label>
                  <input
                    type="text"
                    value={newTrainee.mentor}
                    onChange={(e) => setNewTrainee({...newTrainee, mentor: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newTrainee.contact}
                    onChange={(e) => setNewTrainee({...newTrainee, contact: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newTrainee.phone}
                    onChange={(e) => setNewTrainee({...newTrainee, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Trainee
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Trainees List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTrainees.map((trainee) => (
          <div key={trainee.id} className="bg-white rounded-lg shadow border p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                  {trainee.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{trainee.name}</h3>
                  <p className="text-sm text-gray-500">{trainee.traineeId}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    trainee.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {trainee.status.charAt(0).toUpperCase() + trainee.status.slice(1)}
                  </span>
                </div>
              </div>
              <div className="flex space-x-1">
                <button 
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  onClick={() => setSelectedTrainee(trainee)}
                  title="View"
                >
                  <Eye size={16} />
                </button>
                <button 
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                  onClick={() => handleRemoveTrainee(trainee.id)}
                  title="Remove"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <GraduationCap size={14} />
                <span>{trainee.department}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={14} />
                <span>{trainee.joinDate} to {trainee.endDate}</span>
              </div>
              {trainee.contact && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={14} />
                  <span>{trainee.contact}</span>
                </div>
              )}
              {trainee.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={14} />
                  <span>{trainee.phone}</span>
                </div>
              )}
              <div className="text-sm text-gray-600">
                Mentor: <span className="font-medium">{trainee.mentor}</span>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Duration:</span>
                <span className="font-medium">{trainee.duration}</span>
              </div>
              
              {trainee.status === 'active' && (
                <button
                  onClick={() => handleCompleteTrainee(trainee.id)}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  <CheckCircle size={14} />
                  Mark as Completed
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTrainees.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            {activeTab === 'active' ? 'No active trainees' : 'No completed trainees'}
          </h3>
          <p className="text-gray-500">
            {activeTab === 'active' 
              ? 'Add a new trainee to get started' 
              : 'No trainees have completed their training yet'}
          </p>
        </div>
      )}

      {/* View Trainee Details Modal */}
      {selectedTrainee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-800">Trainee Details</h2>
                <button 
                  onClick={() => setSelectedTrainee(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedTrainee.name}</h3>
                  <p className="text-gray-500">{selectedTrainee.traineeId}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-sm text-gray-600">Department</span>
                    <p className="font-medium">{selectedTrainee.department}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Status</span>
                    <p className="font-medium capitalize">{selectedTrainee.status}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Join Date</span>
                    <p className="font-medium">{selectedTrainee.joinDate}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">End Date</span>
                    <p className="font-medium">{selectedTrainee.endDate}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Duration</span>
                    <p className="font-medium">{selectedTrainee.duration}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Mentor</span>
                    <p className="font-medium">{selectedTrainee.mentor}</p>
                  </div>
                </div>
                
                {selectedTrainee.contact && (
                  <div>
                    <span className="text-sm text-gray-600">Email</span>
                    <p className="font-medium">{selectedTrainee.contact}</p>
                  </div>
                )}
                
                {selectedTrainee.phone && (
                  <div>
                    <span className="text-sm text-gray-600">Phone</span>
                    <p className="font-medium">{selectedTrainee.phone}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedTrainee(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TraineeManagement;