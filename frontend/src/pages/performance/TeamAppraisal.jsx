import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Edit, 
  Eye, 
  Save, 
  X,
  MessageSquare,
  CheckCircle,
  FileText,
  Star,
  TrendingUp,
  Clock,
  ChevronRight,
  DollarSign
} from 'lucide-react';

// Dropdown Options
const APPRAISERS = ['BalaSubiramaniyam', 'Uvaraj', 'Arunkumar.P', 'Harisankar', 'arunkumar.D', 'gopinath'];
const REVIEWERS = ['Arunkumar.p'];
const DIRECTORS = ['Balasubiramaniyam', 'Uvaraj'];

// Users allowed to view Compensation details (normalized to lowercase for comparison)
const ALLOWED_COMPENSATION_VIEWERS = ['arunkumar.p', 'balasubiramaniyam', 'uvaraj'];

import { performanceAPI } from '../../services/api';

const TeamAppraisal = () => {
  // Get current user from session
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const currentUser = user.name || '';

  // Helper to check if current user has access
  const hasCompensationAccess = ALLOWED_COMPENSATION_VIEWERS.includes(currentUser.toLowerCase());

  // State for employees list
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // State for modal
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isEditable, setIsEditable] = useState(false);

  // Effect to fetch employees
  React.useEffect(() => {
    fetchTeamAppraisals();
  }, []);

  const fetchTeamAppraisals = async () => {
    try {
      setLoading(true);
      const response = await performanceAPI.getTeamAppraisals();
      setEmployees(response.data || []);
    } catch (error) {
      console.error("Failed to fetch team appraisals", error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleView = (emp) => {
    setSelectedEmployee(emp);
    setIsEditable(false);
  };

  const handleEdit = (emp) => {
    setSelectedEmployee(emp);
    setIsEditable(true);

    // Auto-calculate for existing records with rating but no percentage
    if (emp.appraiserRating && (!emp.incrementPercentage || emp.incrementPercentage === 0)) {
      // Use a timeout to ensure state is set or just pass emp directly (which we do)
      calculateIncrementPercentage(emp, emp.appraiserRating);
    }
  };

  const handleInputChange = (id, field, value) => {
    // Update local state for immediate feedback
    setSelectedEmployee(prev => ({ ...prev, [field]: value }));
    
    // Also update the list view
    setEmployees(prev => prev.map(emp => 
      emp.id === id ? { ...emp, [field]: value } : emp
    ));

    // Auto-calculate Increment % if rating changes
    if (field === 'appraiserRating') {
      // Create a temporary object for calculation
      // We use the current selectedEmployee for static fields like designation
      const employeeForCalc = { ...selectedEmployee, [field]: value };
      calculateIncrementPercentage(employeeForCalc, value);
    }
  };

  const calculateIncrementPercentage = async (employee, rating) => {
    // If rating is cleared, reset percentage
    if (!rating) {
       updateIncrementState(employee.id, 0);
       return;
    }

    try {
      const response = await performanceAPI.calculateIncrement({
         financialYear: employee.financialYear || employee.financialYr || '2025-2026',
         designation: employee.designation,
         rating: rating
      });
      
      if (response.data && response.data.success) {
         updateIncrementState(employee.id, response.data.percentage);
      } else {
         // Optionally handle error (e.g., matrix not found)
         console.warn("Could not calculate increment:", response.data.message);
         // If calculation fails (e.g., no matrix rule), reset to 0 to avoid confusion
         updateIncrementState(employee.id, 0);
      }
    } catch (err) {
      console.error('Error calculating increment:', err);
      // Fail safe
      updateIncrementState(employee.id, 0);
    }
  };

  const updateIncrementState = (id, percentage) => {
    setSelectedEmployee(prev => ({ ...prev, incrementPercentage: percentage }));
    setEmployees(prev => prev.map(emp => 
      emp.id === id ? { ...emp, incrementPercentage: percentage } : emp
    ));
  };

  const handleSave = async () => {
    try {
      await performanceAPI.updateTeamAppraisal(selectedEmployee.id, selectedEmployee);
      alert('Review saved successfully!');
      fetchTeamAppraisals(); // Refresh list
    } catch (error) {
      console.error("Failed to save review", error);
      alert("Failed to save review");
    }
  };

  const handleSubmit = async () => {
    if (window.confirm('Are you sure you want to submit this review? This will mark it as Completed.')) {
      try {
        const payload = { ...selectedEmployee, status: 'APPRAISER_COMPLETED' };
        await performanceAPI.updateTeamAppraisal(selectedEmployee.id, payload);
        alert('Review submitted successfully!');
        setSelectedEmployee(null);
        fetchTeamAppraisals(); // Refresh list
      } catch (error) {
        console.error("Failed to submit review", error);
        alert("Failed to submit review");
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPRAISER_COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
      case 'Submitted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.empId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-8 font-sans p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
         
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employee..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#262760] w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

        <div className="bg-white shadow border-b border-gray-200 sm:rounded-lg overflow-auto max-h-[75vh]">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading team appraisals...</div>
            ) : (
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#262760] sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  S.No
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Financial Yr
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Employee ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Employee Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Self Appraisee Comments
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Manager Comments
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((emp, index) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {emp.financialYr}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {emp.empId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {emp.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {emp.selfAppraiseeComments}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {emp.managerComments}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex justify-center items-center space-x-2">
                      <button 
                        onClick={() => handleView(emp)}
                        className="text-gray-400 hover:text-gray-600" 
                        title="View"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleEdit(emp)}
                        className="text-blue-600 hover:text-blue-800" 
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleEdit(emp)}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-[#262760] hover:bg-[#1e2050] focus:outline-none shadow-sm"
                      >
                        Review
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
            )}
          </div>

      {/* Detail Modal (Centered) */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-50 backdrop-blur-sm" onClick={() => setSelectedEmployee(null)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
              <div className="flex flex-col max-h-[85vh] overflow-y-auto">
                  
                  {/* Modal Header */}
                  <div className="px-6 py-6 bg-gradient-to-r from-[#262760] to-indigo-800 text-white">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold text-xl mr-4 border-2 border-white/30">
                          {selectedEmployee.avatar}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">{selectedEmployee.name}</h2>
                          <div className="flex items-center text-indigo-100 text-sm mt-1">
                            <span className="bg-white/20 px-2 py-0.5 rounded text-xs mr-2">{selectedEmployee.designation}</span>
                            <span>{selectedEmployee.department} • {selectedEmployee.empId}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedEmployee(null)}
                        className="bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-colors focus:outline-none"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Modal Content */}
                  <div className="flex-1 px-6 py-6 space-y-8">
                    
                    {/* Status & Actions Bar */}
                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                       <div className="flex items-center">
                          <span className="text-sm text-gray-500 mr-2">Current Status:</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(selectedEmployee.status)}`}>
                            {selectedEmployee.status}
                          </span>
                       </div>
                       <select
                         value={selectedEmployee.status}
                         onChange={(e) => handleInputChange(selectedEmployee.id, 'status', e.target.value)}
                         disabled={!isEditable}
                         className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-[#262760] focus:border-[#262760] disabled:bg-gray-100 disabled:text-gray-500"
                       >
                         <option value="Pending Review">Mark as Pending</option>
                         <option value="In Progress">Mark as In Progress</option>
                         <option value="Reviewed">Mark as Completed</option>
                       </select>
                    </div>

                    {/* Employee Self-Assessment Review */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2 flex items-center">
                        <Users className="h-4 w-4 mr-2 text-gray-500" /> Self Assessment Highlights
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                          <p className="text-xs text-gray-500 font-bold uppercase mb-1">Key Achievements</p>
                          <p className="text-sm text-gray-800 leading-relaxed">{selectedEmployee.keyPerformance}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                          <p className="text-xs text-gray-500 font-bold uppercase mb-1">Employee Comments</p>
                          <p className="text-sm text-gray-800 italic mb-3">"{selectedEmployee.appraiseeComments}"</p>
                          
                          <p className="text-xs text-gray-500 font-bold uppercase mb-1">Self Appraisee Comments</p>
                          <p className="text-sm text-gray-800 italic">"{selectedEmployee.selfAppraiseeComments}"</p>
                        </div>
                      </div>
                    </div>

                    {/* Appraiser Rating Section */}
                    <div className="space-y-6">
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2 flex items-center">
                        <Star className="h-4 w-4 mr-2 text-[#262760]" /> Manager Review
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                           <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Performance Rating</label>
                           <select 
                             value={selectedEmployee.appraiserRating}
                             onChange={(e) => handleInputChange(selectedEmployee.id, 'appraiserRating', e.target.value)}
                             disabled={!isEditable}
                             className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#262760] focus:border-[#262760] sm:text-sm p-2.5 bg-white border disabled:bg-gray-100 disabled:text-gray-500"
                           >
                             <option value="">Select Rating...</option>
                             <option value="ES">Exceeds Expectations (ES)</option>
                             <option value="ME">Meets Expectations (ME)</option>
                             <option value="BE">Below Expectations (BE)</option>
                           </select>
                         </div>
                          
                      </div>
                      
                      {/* Increment Percentage Display (Read-Only for Manager) */}
                      {selectedEmployee.incrementPercentage > 0 && (
                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mt-4 flex items-center">
                           <DollarSign className="h-5 w-5 text-indigo-600 mr-3" />
                           <div>
                             <p className="text-xs font-bold text-indigo-800 uppercase">Calculated Increment</p>
                             <p className="text-lg font-bold text-indigo-900">{selectedEmployee.incrementPercentage}%</p>
                           </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Leadership Potential</label>
                            <select 
                              value={selectedEmployee.leadership}
                              onChange={(e) => handleInputChange(selectedEmployee.id, 'leadership', e.target.value)}
                              disabled={!isEditable}
                              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#262760] focus:border-[#262760] sm:text-sm p-2.5 bg-white border disabled:bg-gray-100 disabled:text-gray-500"
                            >
                              <option value="Ready to Lead">Ready to Lead</option>
                              <option value="Under Development">Under Development</option>
                              <option value="Not yet reach the level">Not yet reach the level</option>
                            </select>
                         </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Attitude</label>
                           <select 
                             value={selectedEmployee.attitude}
                             onChange={(e) => handleInputChange(selectedEmployee.id, 'attitude', e.target.value)}
                             disabled={!isEditable}
                             className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#262760] focus:border-[#262760] sm:text-sm p-2.5 bg-white border disabled:bg-gray-100 disabled:text-gray-500"
                           >
                             <option value="Excellent">Excellent</option>
                             <option value="Average">Average</option>
                             <option value="Poor">Poor</option>
                           </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                           <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Communication</label>
                           <select 
                             value={selectedEmployee.communication}
                             onChange={(e) => handleInputChange(selectedEmployee.id, 'communication', e.target.value)}
                             disabled={!isEditable}
                             className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#262760] focus:border-[#262760] sm:text-sm p-2.5 bg-white border disabled:bg-gray-100 disabled:text-gray-500"
                           >
                             <option value="Excellent">Excellent</option>
                             <option value="Average">Average</option>
                             <option value="Poor">Poor</option>
                           </select>
                        </div>
                      </div>

                      {/* Manager Comments (New Section) */}
                      <div className="pt-2">
                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase flex items-center">
                          <MessageSquare className="h-4 w-4 mr-2 text-[#262760]" /> Manager Comments (Feedback)
                        </label>
                        <textarea
                          value={selectedEmployee.managerComments}
                          onChange={(e) => handleInputChange(selectedEmployee.id, 'managerComments', e.target.value)}
                          rows={4}
                          disabled={!isEditable}
                          className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-[#262760] focus:border-[#262760] sm:text-sm p-3 disabled:bg-gray-100 disabled:text-gray-500"
                          placeholder="Enter your feedback or comments here..."
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Modal Footer */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                    <button
                      onClick={() => setSelectedEmployee(null)}
                      className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm text-sm font-medium hover:bg-gray-50 focus:outline-none"
                    >
                      Close
                    </button>
                    {isEditable && (
                      <>
                        <button
                          onClick={handleSave}
                          className="px-4 py-2 bg-white text-[#262760] border border-[#262760] rounded-md shadow-sm text-sm font-medium hover:bg-gray-50 focus:outline-none"
                        >
                          Save Draft
                        </button>
                        <button
                          onClick={handleSubmit}
                          className="px-4 py-2 bg-[#262760] text-white rounded-md shadow-sm text-sm font-medium hover:bg-[#1e2050] focus:outline-none"
                        >
                          Submit Review
                        </button>
                      </>
                    )}
                  </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeamAppraisal;
