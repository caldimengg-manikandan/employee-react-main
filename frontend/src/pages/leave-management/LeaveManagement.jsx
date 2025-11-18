import React from 'react';

const LeaveManagement = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
      <p className="text-gray-600">This module is under construction.</p>
    </div>
  );
};

export default LeaveManagement;
//
// // src/pages/leave-management/LeaveManagement.jsx
// import React, { useState, useEffect } from 'react';
// import { Calendar, Plus, Download, Filter, RefreshCw } from 'lucide-react';
// import { leaveAPI } from '../../services/api';

// const LeaveManagement = () => {
//   const user = JSON.parse(sessionStorage.getItem('user') || '{}');
//   const [activeTab, setActiveTab] = useState('myLeaves');
//   const [leaves, setLeaves] = useState([]);
//   const [leaveBalance, setLeaveBalance] = useState({});
//   const [loading, setLoading] = useState(false);
//   const [showApplyModal, setShowApplyModal] = useState(false);
//   const [filters, setFilters] = useState({
//     status: 'all',
//     type: 'all',
//     year: new Date().getFullYear()
//   });

//   // Leave types
//   const leaveTypes = [
//     'Casual Leave',
//     'Sick Leave',
//     'Earned Leave',
//     'Maternity Leave',
//     'Paternity Leave',
//     'Bereavement Leave',
//     'Marriage Leave',
//     'Optional Holiday'
//   ];

//   // Sample leave balance data
//   const initialLeaveBalance = {
//     'Casual Leave': { total: 12, taken: 3, balance: 9 },
//     'Sick Leave': { total: 10, taken: 2, balance: 8 },
//     'Earned Leave': { total: 30, taken: 15, balance: 15 },
//     'Maternity Leave': { total: 180, taken: 0, balance: 180 },
//     'Paternity Leave': { total: 15, taken: 0, balance: 15 },
//     'Bereavement Leave': { total: 7, taken: 0, balance: 7 },
//     'Marriage Leave': { total: 7, taken: 0, balance: 7 },
//     'Optional Holiday': { total: 3, taken: 1, balance: 2 }
//   };

//   // Sample leave data
//   const sampleLeaves = [
//     {
//       id: 1,
//       employeeId: user.employeeId || 'EMP001',
//       employeeName: user.name || 'John Doe',
//       leaveType: 'Casual Leave',
//       startDate: '2024-12-20',
//       endDate: '2024-12-22',
//       numberOfDays: 3,
//       reason: 'Family function',
//       status: 'approved',
//       appliedDate: '2024-12-15',
//       approvedBy: 'Manager Name',
//       approvedDate: '2024-12-16',
//       contactNumber: '+91-9876543210',
//       addressDuringLeave: 'Home Town'
//     },
//     {
//       id: 2,
//       employeeId: user.employeeId || 'EMP001',
//       employeeName: user.name || 'John Doe',
//       leaveType: 'Sick Leave',
//       startDate: '2024-12-10',
//       endDate: '2024-12-10',
//       numberOfDays: 1,
//       reason: 'Fever and cold',
//       status: 'approved',
//       appliedDate: '2024-12-09',
//       approvedBy: 'Manager Name',
//       approvedDate: '2024-12-09',
//       contactNumber: '+91-9876543210',
//       addressDuringLeave: 'Home'
//     },
//     {
//       id: 3,
//       employeeId: user.employeeId || 'EMP001',
//       employeeName: user.name || 'John Doe',
//       leaveType: 'Optional Holiday',
//       startDate: '2024-12-25',
//       endDate: '2024-12-25',
//       numberOfDays: 1,
//       reason: 'Christmas celebration',
//       status: 'pending',
//       appliedDate: '2024-12-18',
//       approvedBy: '',
//       approvedDate: '',
//       contactNumber: '+91-9876543210',
//       addressDuringLeave: 'Home'
//     }
//   ];

//   useEffect(() => {
//     // Load leave data
//     setLeaves(sampleLeaves);
//     setLeaveBalance(initialLeaveBalance);
//   }, []);

//   // Filter leaves based on selected filters
//   const filteredLeaves = leaves.filter(leave => {
//     if (filters.status !== 'all' && leave.status !== filters.status) return false;
//     if (filters.type !== 'all' && leave.leaveType !== filters.type) return false;
//     if (filters.year && new Date(leave.startDate).getFullYear() !== parseInt(filters.year)) return false;
//     return true;
//   });

//   const getStatusBadge = (status) => {
//     const baseClasses = "px-3 py-1 rounded-full text-xs font-semibold";
//     switch (status) {
//       case 'approved': return `${baseClasses} bg-green-100 text-green-800`;
//       case 'pending': return `${baseClasses} bg-yellow-100 text-yellow-800`;
//       case 'rejected': return `${baseClasses} bg-red-100 text-red-800`;
//       case 'cancelled': return `${baseClasses} bg-gray-100 text-gray-800`;
//       default: return `${baseClasses} bg-gray-100 text-gray-800`;
//     }
//   };

//   const formatDate = (dateString) => {
//     return new Date(dateString).toLocaleDateString('en-US', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric'
//     });
//   };

//   const calculateBusinessDays = (startDate, endDate) => {
//     const start = new Date(startDate);
//     const end = new Date(endDate);
//     let count = 0;
    
//     while (start <= end) {
//       const day = start.getDay();
//       if (day !== 0 && day !== 6) { // Skip weekends
//         count++;
//       }
//       start.setDate(start.getDate() + 1);
//     }
    
//     return count;
//   };

//   const handleApplyLeave = async (leaveData) => {
//     try {
//       setLoading(true);
//       // API call to apply for leave
//       const response = await leaveAPI.applyLeave(leaveData);
      
//       // Add new leave to the list
//       const newLeave = {
//         ...leaveData,
//         id: Date.now(),
//         status: 'pending',
//         appliedDate: new Date().toISOString().split('T')[0]
//       };
      
//       setLeaves(prev => [newLeave, ...prev]);
//       setShowApplyModal(false);
//       alert('Leave application submitted successfully!');
//     } catch (error) {
//       console.error('Error applying leave:', error);
//       alert('Failed to apply for leave. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCancelLeave = async (leaveId) => {
//     if (!window.confirm('Are you sure you want to cancel this leave application?')) return;
    
//     try {
//       setLoading(true);
//       await leaveAPI.cancelLeave(leaveId);
      
//       setLeaves(prev => prev.map(leave => 
//         leave.id === leaveId ? { ...leave, status: 'cancelled' } : leave
//       ));
      
//       alert('Leave application cancelled successfully!');
//     } catch (error) {
//       console.error('Error cancelling leave:', error);
//       alert('Failed to cancel leave. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="p-6">
//       <div className="mb-6">
//         <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
//         <p className="text-gray-600">Manage your leaves and track balances</p>
//       </div>

//       {/* Quick Stats */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
//         {Object.entries(leaveBalance).slice(0, 4).map(([type, data]) => (
//           <div key={type} className="bg-white rounded-lg border border-gray-200 p-4">
//             <h3 className="text-sm font-medium text-gray-600">{type}</h3>
//             <div className="mt-2 flex items-baseline">
//               <span className="text-2xl font-bold text-blue-600">{data.balance}</span>
//               <span className="ml-2 text-sm text-gray-500">/ {data.total}</span>
//             </div>
//             <div className="mt-2 text-xs text-gray-500">
//               Taken: {data.taken} days
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Tab Navigation */}
//       <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
//         <div className="flex justify-between items-center">
//           <div className="flex space-x-2">
//             <button
//               onClick={() => setActiveTab('myLeaves')}
//               className={`px-4 py-2 rounded-lg font-medium transition-colors ${
//                 activeTab === 'myLeaves'
//                   ? 'bg-blue-600 text-white'
//                   : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
//               }`}
//             >
//               📋 My Leaves
//             </button>
//             <button
//               onClick={() => setActiveTab('balance')}
//               className={`px-4 py-2 rounded-lg font-medium transition-colors ${
//                 activeTab === 'balance'
//                   ? 'bg-blue-600 text-white'
//                   : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
//               }`}
//             >
//               💰 Leave Balance
//             </button>
//             <button
//               onClick={() => setActiveTab('calendar')}
//               className={`px-4 py-2 rounded-lg font-medium transition-colors ${
//                 activeTab === 'calendar'
//                   ? 'bg-blue-600 text-white'
//                   : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
//               }`}
//             >
//               📅 Calendar
//             </button>
//           </div>
          
//           <div className="flex space-x-3">
//             <button
//               onClick={() => setShowApplyModal(true)}
//               className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
//             >
//               <Plus className="w-4 h-4" />
//               Apply Leave
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* My Leaves Tab */}
//       {activeTab === 'myLeaves' && (
//         <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
//           {/* Filters */}
//           <div className="p-4 border-b border-gray-200 bg-gray-50">
//             <div className="flex flex-wrap gap-4 items-center">
//               <div className="flex items-center gap-2">
//                 <Filter className="w-4 h-4 text-gray-500" />
//                 <span className="text-sm font-medium text-gray-700">Filter:</span>
//               </div>
              
//               <select
//                 value={filters.status}
//                 onChange={(e) => setFilters(prev => ({...prev, status: e.target.value}))}
//                 className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//               >
//                 <option value="all">All Status</option>
//                 <option value="pending">Pending</option>
//                 <option value="approved">Approved</option>
//                 <option value="rejected">Rejected</option>
//               </select>
              
//               <select
//                 value={filters.type}
//                 onChange={(e) => setFilters(prev => ({...prev, type: e.target.value}))}
//                 className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//               >
//                 <option value="all">All Types</option>
//                 {leaveTypes.map(type => (
//                   <option key={type} value={type}>{type}</option>
//                 ))}
//               </select>
              
//               <select
//                 value={filters.year}
//                 onChange={(e) => setFilters(prev => ({...prev, year: e.target.value}))}
//                 className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//               >
//                 <option value="2024">2024</option>
//                 <option value="2025">2025</option>
//               </select>
              
//               <button
//                 onClick={() => setFilters({ status: 'all', type: 'all', year: new Date().getFullYear() })}
//                 className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
//               >
//                 <RefreshCw className="w-4 h-4" />
//                 Reset
//               </button>
//             </div>
//           </div>

//           {/* Leaves Table */}
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead>
//                 <tr className="bg-gray-50">
//                   <th className="p-3 text-left text-sm font-semibold border-b">Leave Type</th>
//                   <th className="p-3 text-left text-sm font-semibold border-b">Dates</th>
//                   <th className="p-3 text-left text-sm font-semibold border-b">Duration</th>
//                   <th className="p-3 text-left text-sm font-semibold border-b">Reason</th>
//                   <th className="p-3 text-left text-sm font-semibold border-b">Applied On</th>
//                   <th className="p-3 text-left text-sm font-semibold border-b">Status</th>
//                   <th className="p-3 text-left text-sm font-semibold border-b">Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filteredLeaves.map((leave) => (
//                   <tr key={leave.id} className="hover:bg-gray-50 border-b">
//                     <td className="p-3">
//                       <div className="font-medium text-gray-900">{leave.leaveType}</div>
//                     </td>
//                     <td className="p-3">
//                       <div className="text-sm text-gray-600">
//                         {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
//                       </div>
//                     </td>
//                     <td className="p-3">
//                       <div className="text-sm font-semibold text-blue-600">
//                         {leave.numberOfDays} day{leave.numberOfDays > 1 ? 's' : ''}
//                       </div>
//                     </td>
//                     <td className="p-3">
//                       <div className="text-sm text-gray-600 max-w-xs truncate" title={leave.reason}>
//                         {leave.reason}
//                       </div>
//                     </td>
//                     <td className="p-3">
//                       <div className="text-sm text-gray-600">{formatDate(leave.appliedDate)}</div>
//                     </td>
//                     <td className="p-3">
//                       <span className={getStatusBadge(leave.status)}>
//                         {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
//                       </span>
//                     </td>
//                     <td className="p-3">
//                       <div className="flex space-x-2">
//                         {leave.status === 'pending' && (
//                           <button
//                             onClick={() => handleCancelLeave(leave.id)}
//                             className="px-3 py-1 text-red-600 border border-red-300 rounded text-sm hover:bg-red-50 transition-colors"
//                           >
//                             Cancel
//                           </button>
//                         )}
//                         <button
//                           onClick={() => {/* View details */}}
//                           className="px-3 py-1 text-blue-600 border border-blue-300 rounded text-sm hover:bg-blue-50 transition-colors"
//                         >
//                           View
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
            
//             {filteredLeaves.length === 0 && (
//               <div className="text-center py-8 text-gray-500">
//                 No leaves found matching your filters.
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* Leave Balance Tab */}
//       {activeTab === 'balance' && (
//         <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
//           <div className="p-6">
//             <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Balance Summary</h3>
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//               {Object.entries(leaveBalance).map(([type, data]) => (
//                 <div key={type} className="border border-gray-200 rounded-lg p-4">
//                   <h4 className="font-medium text-gray-900 mb-3">{type}</h4>
//                   <div className="space-y-2">
//                     <div className="flex justify-between text-sm">
//                       <span className="text-gray-600">Total:</span>
//                       <span className="font-medium">{data.total} days</span>
//                     </div>
//                     <div className="flex justify-between text-sm">
//                       <span className="text-gray-600">Taken:</span>
//                       <span className="font-medium text-orange-600">{data.taken} days</span>
//                     </div>
//                     <div className="flex justify-between text-sm">
//                       <span className="text-gray-600">Balance:</span>
//                       <span className="font-medium text-green-600">{data.balance} days</span>
//                     </div>
//                   </div>
//                   <div className="mt-3 bg-gray-200 rounded-full h-2">
//                     <div 
//                       className="bg-green-500 h-2 rounded-full" 
//                       style={{ width: `${(data.balance / data.total) * 100}%` }}
//                     ></div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Calendar Tab */}
//       {activeTab === 'calendar' && (
//         <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
//           <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Calendar</h3>
//           <div className="text-center py-8 text-gray-500">
//             <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
//             <p>Leave calendar view will be implemented here</p>
//             <p className="text-sm">Showing approved leaves for team members</p>
//           </div>
//         </div>
//       )}

//       {/* Apply Leave Modal */}
//       {showApplyModal && (
//         <ApplyLeaveModal
//           leaveTypes={leaveTypes}
//           leaveBalance={leaveBalance}
//           onClose={() => setShowApplyModal(false)}
//           onSubmit={handleApplyLeave}
//           calculateBusinessDays={calculateBusinessDays}
//         />
//       )}
//     </div>
//   );
// };

// // Apply Leave Modal Component
// const ApplyLeaveModal = ({ leaveTypes, leaveBalance, onClose, onSubmit, calculateBusinessDays }) => {
//   const [formData, setFormData] = useState({
//     leaveType: '',
//     startDate: '',
//     endDate: '',
//     reason: '',
//     contactNumber: '',
//     addressDuringLeave: '',
//     isHalfDay: false,
//     halfDayType: 'first' // first or second half
//   });

//   const [calculatedDays, setCalculatedDays] = useState(0);

//   const handleSubmit = (e) => {
//     e.preventDefault();
    
//     if (formData.leaveType && formData.startDate && formData.endDate && formData.reason) {
//       const numberOfDays = formData.isHalfDay ? 0.5 : calculatedDays;
      
//       if (numberOfDays <= 0) {
//         alert('Please select valid dates');
//         return;
//       }

//       // Check leave balance
//       const balance = leaveBalance[formData.leaveType]?.balance || 0;
//       if (numberOfDays > balance) {
//         alert(`Insufficient ${formData.leaveType} balance. Available: ${balance} days`);
//         return;
//       }

//       onSubmit({
//         ...formData,
//         numberOfDays: numberOfDays
//       });
//     } else {
//       alert('Please fill all required fields');
//     }
//   };

//   const handleDateChange = () => {
//     if (formData.startDate && formData.endDate) {
//       const start = new Date(formData.startDate);
//       const end = new Date(formData.endDate);
      
//       if (start > end) {
//         alert('End date cannot be before start date');
//         setFormData(prev => ({ ...prev, endDate: '' }));
//         setCalculatedDays(0);
//         return;
//       }
      
//       const days = calculateBusinessDays(formData.startDate, formData.endDate);
//       setCalculatedDays(days);
//     }
//   };

//   useEffect(() => {
//     handleDateChange();
//   }, [formData.startDate, formData.endDate, formData.isHalfDay]);

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
//         <div className="p-6 border-b border-gray-200">
//           <h3 className="text-xl font-semibold text-gray-900">Apply for Leave</h3>
//         </div>
        
//         <form onSubmit={handleSubmit} className="p-6 space-y-4">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Leave Type *
//               </label>
//               <select
//                 value={formData.leaveType}
//                 onChange={(e) => setFormData(prev => ({...prev, leaveType: e.target.value}))}
//                 className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               >
//                 <option value="">Select Leave Type</option>
//                 {leaveTypes.map(type => (
//                   <option key={type} value={type}>
//                     {type} (Balance: {leaveBalance[type]?.balance || 0} days)
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div className="flex items-center space-x-4">
//               <label className="flex items-center space-x-2">
//                 <input
//                   type="checkbox"
//                   checked={formData.isHalfDay}
//                   onChange={(e) => setFormData(prev => ({...prev, isHalfDay: e.target.checked}))}
//                   className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
//                 />
//                 <span className="text-sm font-medium text-gray-700">Half Day</span>
//               </label>
              
//               {formData.isHalfDay && (
//                 <select
//                   value={formData.halfDayType}
//                   onChange={(e) => setFormData(prev => ({...prev, halfDayType: e.target.value}))}
//                   className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 >
//                   <option value="first">First Half</option>
//                   <option value="second">Second Half</option>
//                 </select>
//               )}
//             </div>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Start Date *
//               </label>
//               <input
//                 type="date"
//                 value={formData.startDate}
//                 onChange={(e) => setFormData(prev => ({...prev, startDate: e.target.value}))}
//                 className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//                 min={new Date().toISOString().split('T')[0]}
//               />
//             </div>
            
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 End Date *
//               </label>
//               <input
//                 type="date"
//                 value={formData.endDate}
//                 onChange={(e) => setFormData(prev => ({...prev, endDate: e.target.value}))}
//                 className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//                 min={formData.startDate || new Date().toISOString().split('T')[0]}
//                 disabled={formData.isHalfDay}
//               />
//             </div>
//           </div>

//           {calculatedDays > 0 && (
//             <div className="bg-blue-50 p-3 rounded-lg">
//               <p className="text-sm text-blue-700">
//                 <strong>Duration:</strong> {formData.isHalfDay ? '0.5' : calculatedDays} day(s)
//                 {formData.leaveType && (
//                   <span className="ml-4">
//                     <strong>Balance:</strong> {leaveBalance[formData.leaveType]?.balance || 0} days
//                   </span>
//                 )}
//               </p>
//             </div>
//           )}

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Reason for Leave *
//             </label>
//             <textarea
//               value={formData.reason}
//               onChange={(e) => setFormData(prev => ({...prev, reason: e.target.value}))}
//               rows="3"
//               className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//               placeholder="Please provide a reason for your leave..."
//               required
//             />
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Contact Number during Leave
//               </label>
//               <input
//                 type="tel"
//                 value={formData.contactNumber}
//                 onChange={(e) => setFormData(prev => ({...prev, contactNumber: e.target.value}))}
//                 className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 placeholder="+91-9876543210"
//               />
//             </div>
            
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Address during Leave
//               </label>
//               <input
//                 type="text"
//                 value={formData.addressDuringLeave}
//                 onChange={(e) => setFormData(prev => ({...prev, addressDuringLeave: e.target.value}))}
//                 className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 placeholder="Where will you be during your leave?"
//               />
//             </div>
//           </div>

//           <div className="flex justify-end space-x-3 pt-4">
//             <button
//               type="button"
//               onClick={onClose}
//               className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
//             >
//               Cancel
//             </button>
//             <button
//               type="submit"
//               className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
//             >
//               Apply for Leave
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default LeaveManagement;