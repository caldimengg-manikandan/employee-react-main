import React, { useState, useMemo } from 'react';
import { 
  IndianRupee, 
  Filter, 
  Search, 
  Download, 
  Users, 
  TrendingUp, 
  Briefcase, 
  MapPin,
  Calendar,
  X,
  CheckCircle
} from 'lucide-react';

const IncrementSummary = () => {
  // Mock Data
  const MOCK_DATA = [
    { 
      id: 1, 
      empId: 'EMP001', 
      name: 'Anita Rao', 
      designation: 'Senior Detailer', 
      division: 'SDS', 
      location: 'Chennai', 
      currentSalary: 50000, 
      revisedSalary: 56000, 
      incrementAmount: 6000, 
      incrementPercentage: 12, 
      effectiveDate: '01 May 2026', 
      status: 'Approved',
      financialYear: '2025-2026'
    },
    { 
      id: 2, 
      empId: 'EMP002', 
      name: 'Rahul Verma', 
      designation: 'Project Manager', 
      division: 'TEKLA', 
      location: 'Hosur', 
      currentSalary: 80000, 
      revisedSalary: 86400, 
      incrementAmount: 6400, 
      incrementPercentage: 8, 
      effectiveDate: '01 May 2026', 
      status: 'Pending',
      financialYear: '2025-2026'
    },
    { 
      id: 3, 
      empId: 'EMP003', 
      name: 'Vikram Singh', 
      designation: 'Team Lead', 
      division: 'DAS(software)', 
      location: 'Chennai', 
      currentSalary: 70000, 
      revisedSalary: 77000, 
      incrementAmount: 7000, 
      incrementPercentage: 10, 
      effectiveDate: '01 May 2026', 
      status: 'Released',
      financialYear: '2025-2026'
    },
    { 
      id: 4, 
      empId: 'EMP004', 
      name: 'Priya Sharma', 
      designation: 'Software Engineer', 
      division: 'DAS(software)', 
      location: 'Chennai', 
      currentSalary: 60000, 
      revisedSalary: 69000, 
      incrementAmount: 9000, 
      incrementPercentage: 15, 
      effectiveDate: '01 May 2026', 
      status: 'Released',
      financialYear: '2025-2026'
    },
    { 
      id: 5, 
      empId: 'EMP005', 
      name: 'Karthik R', 
      designation: 'Detailer', 
      division: 'SDS', 
      location: 'Hosur', 
      currentSalary: 30000, 
      revisedSalary: 33000, 
      incrementAmount: 3000, 
      incrementPercentage: 10, 
      effectiveDate: '01 May 2026', 
      status: 'Approved',
      financialYear: '2024-2025'
    },
  ];

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    financialYear: '2025-2026',
    division: 'All',
    designation: 'All',
    location: 'All',
    status: 'All'
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Dropdown Options
  const financialYears = ['2023-2024', '2024-2025', '2025-2026', '2026-2027'];
  const divisions = ['SDS', 'TEKLA', 'DAS(software)'];
  const locations = ['Chennai', 'Hosur'];
  const statuses = ['Pending', 'Approved', 'Released'];
  const designations = [...new Set(MOCK_DATA.map(item => item.designation))]; // Extract unique designations

  // Handlers
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      financialYear: '2025-2026',
      division: 'All',
      designation: 'All',
      location: 'All',
      status: 'All'
    });
    setSearchTerm('');
  };

  // Derived Data
  const filteredData = useMemo(() => {
    return MOCK_DATA.filter(item => {
      const matchYear = filters.financialYear === 'All' || item.financialYear === filters.financialYear;
      const matchDivision = filters.division === 'All' || item.division === filters.division;
      const matchDesignation = filters.designation === 'All' || item.designation === filters.designation;
      const matchLocation = filters.location === 'All' || item.location === filters.location;
      const matchStatus = filters.status === 'All' || item.status === filters.status;
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.empId.toLowerCase().includes(searchTerm.toLowerCase());

      return matchYear && matchDivision && matchDesignation && matchLocation && matchStatus && matchSearch;
    });
  }, [filters, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const totalEmployees = filteredData.length;
    const totalIncrementAmount = filteredData.reduce((sum, item) => sum + item.incrementAmount, 0);
    const avgIncrementPct = totalEmployees > 0 
      ? (filteredData.reduce((sum, item) => sum + item.incrementPercentage, 0) / totalEmployees).toFixed(2) 
      : 0;
    
    return {
      totalEmployees,
      totalIncrementAmount,
      avgIncrementPct
    };
  }, [filteredData]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Released': return 'bg-green-100 text-green-800';
      case 'Approved': return 'bg-blue-100 text-blue-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[98%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                  isFilterOpen 
                    ? 'bg-indigo-50 border-[#262760] text-[#262760]' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </button>
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
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[98%] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
            <div className="p-3 bg-blue-50 rounded-full mr-4">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Employees</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</h3>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
            <div className="p-3 bg-green-50 rounded-full mr-4">
              <IndianRupee className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Increment Amount</p>
              <h3 className="text-2xl font-bold text-gray-900">₹{stats.totalIncrementAmount.toLocaleString()}</h3>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
            <div className="p-3 bg-purple-50 rounded-full mr-4">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Avg Increment %</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.avgIncrementPct}%</h3>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {isFilterOpen && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Filter Records</h3>
              <button onClick={clearFilters} className="text-xs text-red-600 hover:text-red-800 font-medium">
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Financial Year */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Financial Year</label>
                <select
                  value={filters.financialYear}
                  onChange={(e) => handleFilterChange('financialYear', e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-[#262760] focus:border-[#262760]"
                >
                  {financialYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
                </select>
              </div>

              {/* Division */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Division</label>
                <select
                  value={filters.division}
                  onChange={(e) => handleFilterChange('division', e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-[#262760] focus:border-[#262760]"
                >
                  <option value="All">All Divisions</option>
                  {divisions.map(div => <option key={div} value={div}>{div}</option>)}
                </select>
              </div>

              {/* Designation */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Designation</label>
                <select
                  value={filters.designation}
                  onChange={(e) => handleFilterChange('designation', e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-[#262760] focus:border-[#262760]"
                >
                  <option value="All">All Designations</option>
                  {designations.map(des => <option key={des} value={des}>{des}</option>)}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                <select
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-[#262760] focus:border-[#262760]"
                >
                  <option value="All">All Locations</option>
                  {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-[#262760] focus:border-[#262760]"
                >
                  <option value="All">All Statuses</option>
                  {statuses.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-auto max-h-[70vh]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#262760] sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.No</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Employee ID</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Employee Name</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Division</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white uppercase tracking-wider">Current Salary</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white uppercase tracking-wider">Revised Salary</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white uppercase tracking-wider">Increment Amount</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">Increment %</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">Effective Date</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.length > 0 ? (
                  filteredData.map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.empId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium">{row.name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.division}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                        ₹{row.currentSalary.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#262760] text-right">
                        ₹{row.revisedSalary.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-right">
                        +₹{row.incrementAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {row.incrementPercentage}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{row.effectiveDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-3 py-1 text-xs rounded-full font-medium ${getStatusColor(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="px-6 py-10 text-center text-gray-500">
                      No records found matching the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Footer / Pagination (Mock) */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">Showing {filteredData.length} records</span>
            <div className="flex space-x-2">
              <button className="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white text-gray-700 disabled:opacity-50" disabled>Previous</button>
              <button className="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white text-gray-700 disabled:opacity-50" disabled>Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncrementSummary;
