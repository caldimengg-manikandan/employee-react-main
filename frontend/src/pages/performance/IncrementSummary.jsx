import React, { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
import { performanceAPI, employeeAPI } from '../../services/api';

const IncrementSummary = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState([]);
  const [showReleaseLetter, setShowReleaseLetter] = useState(false);
  const [letterData, setLetterData] = useState(null);

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    financialYear: '2025-2026',
    division: 'All',
    designation: 'All',
    location: 'All',
    status: 'All'
  });
  const [appliedFilters, setAppliedFilters] = useState({
    financialYear: '2025-2026',
    division: 'All',
    designation: 'All',
    location: 'All',
    status: 'All'
  });
  const [searchTerm, setSearchTerm] = useState('');

  const statuses = ['Pending', 'Approved', 'Released'];

  const mapStatus = (status) => {
    if (!status) return 'Pending';
    if (status === 'DIRECTOR_APPROVED') return 'Approved';
    if (status === 'Released' || status === 'RELEASED') return 'Released';
    return 'Pending';
  };

  const deriveEffectiveDate = (financialYear, updatedAt) => {
    if (updatedAt) {
      const d = new Date(updatedAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
    if (financialYear && financialYear.includes('-')) {
      const parts = financialYear.split(/[-/]/);
      const yearStart = parseInt(parts[0], 10);
      if (!isNaN(yearStart)) {
        const d = new Date(yearStart, 3, 1);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
    return '-';
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const [reviewerRes, employeesRes] = await Promise.all([
          performanceAPI.getReviewerAppraisals(),
          employeeAPI.getAllEmployees()
        ]);

        const data = Array.isArray(reviewerRes.data) ? reviewerRes.data : [];
        const mapped = data
          .map((app) => {
            const status = mapStatus(app.status);
            return {
              id: app.id,
              empId: app.empId || '',
              name: app.name || '',
              designation: app.designation || '',
              division: app.department || '',
              location: app.location || '',
              currentSalary: Number(app.currentSalary || 0),
              revisedSalary: Number(app.revisedSalary || 0),
              incrementAmount: Number(app.incrementAmount || 0),
              incrementPercentage: Number(app.incrementPercentage || 0),
              financialYear: app.financialYr || '',
              status,
              effectiveDate: deriveEffectiveDate(app.financialYr, app.updatedAt)
            };
          })
          .filter(item => item.status === 'Approved' || item.status === 'Released');

        const employeesData = Array.isArray(employeesRes.data) ? employeesRes.data : [];

        setRecords(mapped);
        setEmployees(employeesData);
      } catch (e) {
        console.error('Failed to load increment summary', e);
        setError('Failed to load increment summary records');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const financialYears = useMemo(() => {
    const yearsFromData = Array.from(new Set(records.map(r => r.financialYear).filter(Boolean)));
    const base = ['2023-2024', '2024-2025', '2025-2026', '2026-2027'];
    return Array.from(new Set([...yearsFromData, ...base]));
  }, [records]);

  const divisions = useMemo(() => {
    return Array.from(
      new Set(
        employees.map(e => e.division).filter(Boolean)
      )
    );
  }, [employees]);

  const locations = useMemo(() => {
    return Array.from(
      new Set(
        employees.map(e => (e.location || e.branch)).filter(Boolean)
      )
    );
  }, [employees]);

  const designations = useMemo(() => {
    return Array.from(
      new Set(
        employees
          .map(e => e.designation || e.role || e.position)
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSimulate = async () => {
    try {
      setLoading(true);
      setError('');
      setAppliedFilters(filters);

      const params = {
        financialYear: filters.financialYear,
        division: filters.division,
        designation: filters.designation,
        location: filters.location,
        status: filters.status,
        search: searchTerm,
      };

      const res = await performanceAPI.getIncrementSummary(params);
      const data = Array.isArray(res.data) ? res.data : [];

      const mapped = data.map((item) => {
        const mappedStatus = mapStatus(item.status);
        return {
          id: item.id,
          empId: item.empId || '',
          name: item.name || '',
          designation: item.designation || '',
          division: item.division || '',
          location: item.location || '',
          currentSalary: Number(item.currentSalary || 0),
          revisedSalary: Number(item.revisedSalary || 0),
          incrementAmount: Number(item.incrementAmount || 0),
          incrementPercentage: Number(item.incrementPercentage || 0),
          financialYear: item.financialYr || item.financialYear || '',
          status: mappedStatus,
          effectiveDate: deriveEffectiveDate(item.financialYr || item.financialYear, item.updatedAt),
        };
      });

      setRecords(mapped);
    } catch (e) {
      console.error('Failed to simulate increment summary', e);
      setError('Failed to simulate increment summary records');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    const base = {
      financialYear: '2025-2026',
      division: 'All',
      designation: 'All',
      location: 'All',
      status: 'All'
    };
    setFilters(base);
    setAppliedFilters(base);
    setSearchTerm('');
  };

  const filteredData = useMemo(() => {
    return records.filter(item => {
      const f = appliedFilters;
      const matchYear = f.financialYear === 'All' || item.financialYear === f.financialYear;
      const matchDivision = f.division === 'All' || item.division === f.division;
      const matchDesignation = f.designation === 'All' || item.designation === f.designation;
      const matchLocation = f.location === 'All' || item.location === f.location;
      const matchStatus = f.status === 'All' || item.status === f.status;
      const name = (item.name || '').toLowerCase();
      const empId = (item.empId || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      const matchSearch = name.includes(term) || empId.includes(term);

      return matchYear && matchDivision && matchDesignation && matchLocation && matchStatus && matchSearch;
    });
  }, [appliedFilters, searchTerm, records]);

  const handleDownloadLetter = async (row) => {
    try {
      let employeeDetails = {};

      try {
        const emp = employees.find(e => e.employeeId === row.empId);
        if (emp) {
          employeeDetails = emp;
        } else {
          const res = await employeeAPI.getMyProfile();
          employeeDetails = res.data;
        }
      } catch (err) {
        console.error('Failed to fetch employee details for letter', err);
        employeeDetails = { ...row };
      }

      const current = Number(row.currentSalary || 0);
      const revised = Number(row.revisedSalary || 0);

      const data = {
        date: row.effectiveDate || '',
        employeeName: employeeDetails.name || employeeDetails.fullName || row.name,
        employeeId: employeeDetails.employeeId || employeeDetails.empId || row.empId || 'EMP-001',
        designation: employeeDetails.designation || employeeDetails.role || row.designation,
        location: employeeDetails.location || employeeDetails.branch || 'Chennai',
        effectiveDate: row.effectiveDate || '',
        salary: {
          old: {
            basic: 0,
            hra: 0,
            special: 0,
            gross: current,
            empPF: 0,
            employerPF: 0,
            net: current,
            gratuity: 0,
            ctc: current
          },
          new: {
            basic: 0,
            hra: 0,
            special: 0,
            gross: revised,
            empPF: 0,
            employerPF: 0,
            net: revised,
            gratuity: 0,
            ctc: revised
          }
        }
      };

      setLetterData(data);
      setShowReleaseLetter(true);
    } catch (error) {
      console.error('Error preparing letter', error);
      alert('Failed to prepare release letter.');
    }
  };

  const downloadReleaseLetter = async () => {
    try {
      const page1 = document.getElementById('release-letter-page-1');
      const page2 = document.getElementById('release-letter-page-2');

      if (!page1 || !page2) {
        alert('Template not found.');
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;

      const captureElement = async (element) => {
        const clone = element.cloneNode(true);
        clone.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 794px;
          min-height: 1123px;
          z-index: -9999;
          background-color: white;
          transform: none;
          margin: 0;
          padding: 0;
          overflow: visible;
        `;

        document.body.appendChild(clone);

        try {
          const canvas = await html2canvas(clone, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
          });
          const imgData = canvas.toDataURL('image/png');
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          return { imgData, imgHeight };
        } finally {
          document.body.removeChild(clone);
        }
      };

      const page1Capture = await captureElement(page1);
      pdf.addImage(page1Capture.imgData, 'PNG', 0, 0, imgWidth, Math.min(pageHeight, page1Capture.imgHeight));

      const page2Capture = await captureElement(page2);
      pdf.addPage();
      pdf.addImage(page2Capture.imgData, 'PNG', 0, 0, imgWidth, Math.min(pageHeight, page2Capture.imgHeight));

      pdf.save(`Release_Letter_${letterData.employeeId}.pdf`);
    } catch (error) {
      console.error('Error generating PDF', error);
      alert('Failed to download release letter.');
    }
  };

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
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSimulate}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#262760] text-white hover:bg-[#1e2050]"
                >
                  Simulate
                </button>
                <button onClick={clearFilters} className="text-xs text-red-600 hover:text-red-800 font-medium">
                  Clear All
                </button>
              </div>
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
                  <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">Release Letter</th>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {row.status === 'Approved' || row.status === 'Released' ? (
                          <button
                            onClick={() => handleDownloadLetter(row)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Pending Release</span>
                        )}
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

      {showReleaseLetter && letterData && (
        <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto backdrop-blur-sm flex justify-center items-start py-8">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl relative mx-4">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-20 rounded-t-lg">
              <h2 className="text-xl font-bold text-gray-800">Release Letter Preview</h2>
              <div className="flex gap-3">
                <button
                  onClick={downloadReleaseLetter}
                  className="flex items-center gap-2 px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  onClick={() => setShowReleaseLetter(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8 bg-gray-100 overflow-x-auto flex flex-col items-center gap-8">
              <div id="release-letter-page-1" className="bg-white relative min-h-[1120px] w-[794px] shadow-lg flex-shrink-0 flex flex-col">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                  <img
                    src="/images/steel-logo.png"
                    alt=""
                    className="w-[500px] opacity-[0.05] grayscale"
                  />
                </div>

                <div className="relative z-10 flex flex-col h-full justify-between flex-grow">
                  <div className="w-full flex h-32 relative overflow-hidden">
                    <div className="absolute inset-0 z-0">
                      <svg width="100%" height="100%" viewBox="0 0 794 128" preserveAspectRatio="none">
                        <path d="M0,0 L400,0 L340,128 L0,128 Z" fill="#1e2b58" />
                        <path d="M400,0 L430,0 L370,128 L340,128 Z" fill="#f37021" />
                      </svg>
                    </div>

                    <div className="relative w-[60%] flex items-center pl-8 pr-12 z-10">
                      <div className="flex items-center gap-4">
                        <img src="/images/steel-logo.png" alt="CALDIM" className="h-16 w-auto brightness-0 invert" crossOrigin="anonymous" style={{ display: 'block' }} />
                        <div className="text-white">
                          <h1 className="text-3xl font-bold leading-none tracking-wide">CALDIM</h1>
                          <p className="text-[10px] tracking-[0.2em] mt-1 text-orange-400 font-semibold">ENGINEERING PRIVATE LIMITED</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-end pr-8 pt-2 z-10">
                      <div className="flex items-center mb-2">
                        <span className="font-bold text-gray-800 mr-3 text-lg">044-47860455</span>
                        <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs shadow-md">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-12 py-6 flex-grow">
                    <div className="flex justify-between mb-6">
                      <div />
                      <div className="text-gray-700">Date: <span className="font-bold">{letterData.date}</span></div>
                    </div>

                    <div className="mb-6">
                      <div className="font-bold text-gray-800 mb-4">To:</div>
                      <div className="inline-block min-w-[300px]">
                        <div className="grid grid-cols-[100px_1fr] gap-y-1">
                          <div className="text-gray-500 font-medium">Name</div>
                          <div className="text-gray-900 font-bold">: {letterData.employeeName}</div>

                          <div className="text-gray-500 font-medium">Employee ID</div>
                          <div className="text-gray-900 font-bold">: {letterData.employeeId}</div>

                          <div className="text-gray-500 font-medium">Designation</div>
                          <div className="text-gray-900 font-bold">: {letterData.designation}</div>

                          <div className="text-gray-500 font-medium">Location</div>
                          <div className="text-gray-900 font-bold">: {letterData.location}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-8 text-center">
                      <div className="font-bold text-xl underline decoration-1 underline-offset-4">PERFORMANCE APPRAISAL LETTER</div>
                    </div>

                    <div className="mb-6">
                      <div className="mb-4">Dear <span className="font-semibold">{letterData.employeeName}</span>,</div>
                      <p className="text-justify text-[14px] leading-6 mb-4">
                        The Performance Review for the financial year 2023-24 has been completed.
                      </p>
                      <p className="text-justify text-[14px] leading-6 mb-4">
                        We are pleased to inform you that based on the available benchmarks in the industry and your performance appraisal, we have revised your compensation effective 1st August 2024 .
                      </p>
                      <p className="text-justify text-[14px] leading-6 mb-4">
                        Details are provided in the attached Annexure.
                      </p>
                      <p className="text-justify text-[14px] leading-6 mb-4">
                        We draw your attention to the fact that your compensation is personal to you.
                        As this information is confidential, we expect you to refrain from sharing the same with your colleagues.
                        I take this opportunity to thank you for the contribution made by you during the year of review and wish you success for the year ahead.
                      </p>
                    </div>

                    <div className="mb-8 text-justify text-[14px] leading-6">
                      <p>
                        We look forward to your continued dedication and commitment to the organization.
                      </p>
                      <p className="mt-4">
                        All other terms and conditions of your employment remain unchanged.
                      </p>
                    </div>

                    <div className="mt-12 flex justify-end">
                      <div className="text-right">
                        <div className="mb-2 text-sm text-gray-700">For CALDIM ENGINEERING PRIVATE LIMITED</div>
                        <div className="mt-16">
                          <div className="font-bold">Authorized Signatory</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-24 relative mt-auto overflow-hidden">
                    <div className="absolute inset-0 z-0">
                      <svg width="100%" height="100%" viewBox="0 0 794 96" preserveAspectRatio="none">
                        <rect x="0" y="84" width="350" height="12" fill="#f37021" />
                        <path d="M350,0 L794,0 L794,96 L290,96 Z" fill="#1e2b58" />
                      </svg>
                    </div>

                    <div className="relative z-10 w-full h-full flex items-center justify-end pr-10 pt-4">
                      <div className="text-white text-right">
                        <div className="text-sm font-medium tracking-wide">Website : www.caldimengg.com</div>
                        <div className="text-sm font-medium tracking-wide mt-1">CIN U74999TN2016PTC110683</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div id="release-letter-page-2" className="bg-white relative min-h-[1120px] w-[794px] shadow-lg flex-shrink-0 flex flex-col">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                  <img
                    src="/images/steel-logo.png"
                    alt=""
                    className="w-[500px] opacity-[0.05] grayscale"
                  />
                </div>

                <div className="relative z-10 flex flex-col h-full justify-between flex-grow">
                  <div className="w-full flex h-32 relative overflow-hidden">
                    <div className="absolute inset-0 z-0">
                      <svg width="100%" height="100%" viewBox="0 0 794 128" preserveAspectRatio="none">
                        <path d="M0,0 L400,0 L340,128 L0,128 Z" fill="#1e2b58" />
                        <path d="M400,0 L430,0 L370,128 L340,128 Z" fill="#f37021" />
                      </svg>
                    </div>

                    <div className="relative w-[60%] flex items-center pl-8 pr-12 z-10">
                      <div className="flex items-center gap-4">
                        <img src="/images/steel-logo.png" alt="CALDIM" className="h-16 w-auto brightness-0 invert" crossOrigin="anonymous" style={{ display: 'block' }} />
                        <div className="text-white">
                          <h1 className="text-3xl font-bold leading-none tracking-wide">CALDIM</h1>
                          <p className="text-[10px] tracking-[0.2em] mt-1 text-orange-400 font-semibold">ENGINEERING PRIVATE LIMITED</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-12 py-6 flex-grow">
                    <div className="mb-6">
                      <p className="text-sm text-gray-700">
                        Name: <span className="font-semibold">{letterData.employeeName}</span><br />
                        Employee ID: <span className="font-semibold">{letterData.employeeId}</span>
                      </p>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-700">
                        Revised compensation details with effect from <span className="font-semibold">{letterData.effectiveDate}</span>:
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300 text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-3 py-2 text-left">Component</th>
                            <th className="border border-gray-300 px-3 py-2 text-right">Existing (₹)</th>
                            <th className="border border-gray-300 px-3 py-2 text-right">Revised (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: 'basic', label: 'Basic + DA' },
                            { key: 'hra', label: 'House Rent Allowance' },
                            { key: 'special', label: 'Special Allowance' },
                            { key: 'gross', label: 'Gross Salary' },
                            { key: 'empPF', label: 'Employee PF Contribution' },
                            { key: 'employerPF', label: 'Employer PF Contribution' },
                            { key: 'net', label: 'Net Take Home' },
                            { key: 'gratuity', label: 'Gratuity' },
                            { key: 'ctc', label: 'Cost to Company (CTC)' },
                          ].map((row) => (
                            <tr key={row.key}>
                              <td className="border border-gray-300 px-3 py-2">{row.label}</td>
                              <td className="border border-gray-300 px-3 py-2 text-right">
                                {letterData.salary.old[row.key]?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-right">
                                {letterData.salary.new[row.key]?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-8 text-sm text-gray-700">
                      <p className="mb-2">
                        All other terms and conditions remain unchanged.
                      </p>
                      <p>
                        Please sign and return a copy of this letter as a token of your acceptance.
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-24 relative mt-auto overflow-hidden">
                    <div className="absolute inset-0 z-0">
                      <svg width="100%" height="100%" viewBox="0 0 794 96" preserveAspectRatio="none">
                        <rect x="0" y="84" width="350" height="12" fill="#f37021" />
                        <path d="M350,0 L794,0 L794,96 L290,96 Z" fill="#1e2b58" />
                      </svg>
                    </div>

                    <div className="relative z-10 w-full h-full flex items-center justify-end pr-10 pt-4">
                      <div className="text-white text-right">
                        <div className="text-sm font-medium tracking-wide">Website : www.caldimengg.com</div>
                        <div className="text-sm font-medium tracking-wide mt-1">CIN U74999TN2016PTC110683</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncrementSummary;
