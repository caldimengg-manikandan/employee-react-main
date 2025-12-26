import React, { useEffect, useState } from 'react';
import { monthlyPayrollAPI } from '../../services/api';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';

export default function GratuitySummary() {
  const [gratuityData, setGratuityData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterDesignation, setFilterDesignation] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');

  useEffect(() => {
    fetchGratuityData();
  }, []);

  const fetchGratuityData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch all monthly payroll records
      const response = await monthlyPayrollAPI.list();
      const records = Array.isArray(response.data) ? response.data : [];

      // Group by employee
      const grouped = {};
      
      records.forEach(record => {
        const gratuity = Number(record.gratuity || 0);
        
        // Only consider records with positive gratuity
        if (gratuity > 0) {
           if (!grouped[record.employeeId]) {
             grouped[record.employeeId] = {
               employeeId: record.employeeId,
               employeeName: record.employeeName,
               designation: record.designation,
               department: record.department,
               location: record.location || 'Unknown',
               totalGratuity: 0,
               history: []
             };
           }
           grouped[record.employeeId].totalGratuity += gratuity;
           grouped[record.employeeId].history.push({
             month: record.salaryMonth,
             amount: gratuity,
             date: record.createdAt,
             status: record.status
           });
        }
      });

      // Sort history by month for each employee
      Object.values(grouped).forEach(emp => {
        emp.history.sort((a, b) => b.month.localeCompare(a.month));
      });

      // Convert to array
      const data = Object.values(grouped);
      setGratuityData(data);

    } catch (err) {
      console.error("Failed to fetch gratuity data", err);
      setError('Failed to load gratuity data');
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (employeeId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedRows(newExpanded);
  };

  const exportCSV = () => {
    const header = ['Employee ID', 'Name', 'Location', 'Designation', 'Total Gratuity Accrued'];
    const rows = gratuityData.map(emp => [
      emp.employeeId,
      emp.employeeName,
      emp.location || 'Unknown',
      emp.designation,
      emp.totalGratuity.toFixed(2)
    ]);

    const csvContent = [header, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'gratuity_summary.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const departments = ['all', ...new Set(gratuityData.map(item => item.department).filter(Boolean))];
  const designations = ['all', ...new Set(gratuityData.map(item => item.designation).filter(Boolean))];
  const locations = ['all', ...new Set(gratuityData.map(item => item.location).filter(Boolean))];

  const filteredData = gratuityData.filter(item => {
    const matchesSearch = 
      item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || item.department === filterDepartment;
    const matchesDesignation = filterDesignation === 'all' || item.designation === filterDesignation;
    const matchesLocation = filterLocation === 'all' || item.location === filterLocation;
    return matchesSearch && matchesDepartment && matchesDesignation && matchesLocation;
  });

  const resetFilters = () => {
    setSearchTerm('');
    setFilterDepartment('all');
    setFilterDesignation('all');
    setFilterLocation('all');
  };

  if (loading) return <div className="p-6">Loading gratuity data...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="w-full">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gratuity Summary</h1>
            <p className="text-gray-500 mt-1">Monthly gratuity additions per employee</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Employee</label>
              <input
                type="text"
                placeholder="Search by name or ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Departments</option>
                {departments.filter(d => d !== 'all').map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Designation Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
              <select
                value={filterDesignation}
                onChange={(e) => setFilterDesignation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Designations</option>
                {designations.filter(d => d !== 'all').map(desig => (
                  <option key={desig} value={desig}>{desig}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Locations</option>
                {locations.filter(l => l !== 'all').map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4 flex justify-end">
              <button
                onClick={resetFilters}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-auto max-h-[70vh]">
            <table className="min-w-[980px] w-full text-left border-collapse">
              <thead className="sticky top-0 z-30">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-4 text-sm font-semibold text-gray-600 sticky left-0 z-40 bg-gray-50 w-[56px] min-w-[56px] max-w-[56px]"></th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 sticky left-[56px] z-40 bg-gray-50 w-[140px] min-w-[140px] max-w-[140px]">Employee ID</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 sticky left-[196px] z-40 bg-gray-50 w-[240px] min-w-[240px] max-w-[240px]">Name</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Location</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Designation</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Total Accrued (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No gratuity records found.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((emp) => {
                    const isExpanded = expandedRows.has(emp.employeeId);
                    const stickyRowBg = isExpanded ? 'bg-blue-50/30' : 'bg-white';
                    return (
                    <React.Fragment key={emp.employeeId}>
                      <tr 
                        className={`group hover:bg-gray-50 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/30' : ''}`}
                        onClick={() => toggleRow(emp.employeeId)}
                      >
                        <td className={`px-4 py-4 text-gray-400 sticky left-0 z-20 ${stickyRowBg} group-hover:bg-gray-50 w-[56px] min-w-[56px] max-w-[56px]`}>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>
                        <td className={`px-6 py-4 text-sm font-medium text-gray-900 sticky left-[56px] z-20 ${stickyRowBg} group-hover:bg-gray-50 w-[140px] min-w-[140px] max-w-[140px]`}>{emp.employeeId}</td>
                        <td className={`px-6 py-4 text-sm text-gray-700 sticky left-[196px] z-20 ${stickyRowBg} group-hover:bg-gray-50 w-[240px] min-w-[240px] max-w-[240px]`}>{emp.employeeName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{emp.location || 'Unknown'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{emp.designation}</td>
                        <td className="px-6 py-4 text-sm font-medium text-green-600 text-right">
                          {emp.totalGratuity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50/50">
                          <td colSpan="6" className="px-6 py-4">
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Month</th>
                                    <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {emp.history.map((record, idx) => (
                                    <tr key={idx}>
                                      <td className="px-4 py-2 text-gray-700">{record.month}</td>
                                      <td className="px-4 py-2">
                                        <span className={`px-2 py-0.5 rounded text-xs ${
                                          record.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {record.status}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 text-right text-gray-700">
                                        ₹{record.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
