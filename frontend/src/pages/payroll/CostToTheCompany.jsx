import React, { useState, useEffect } from "react";
import { Filter, Search } from "lucide-react";
import { monthlyPayrollAPI, employeeAPI } from "../../services/api";

const CostToTheCompany = () => {
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [location, setLocation] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterDesignation, setFilterDesignation] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const res = await employeeAPI.getAllEmployees();
      const data = Array.isArray(res.data) ? res.data : [];
      
      const uniqueDepts = [...new Set(data.map(e => e.department || e.division).filter(Boolean))];
      const uniqueDesigs = [...new Set(data.map(e => e.designation).filter(Boolean))];
      const uniqueLocs = [...new Set(data.map(e => e.location || e.address || e.currentAddress).filter(Boolean))];
      
      setDepartments(uniqueDepts);
      setDesignations(uniqueDesigs);
      setLocations(uniqueLocs);
    } catch (error) {
      console.error("Error fetching filter options", error);
    }
  };

  const fetchCTCSummary = async () => {
    try {
      setLoading(true);
      
      let params = {};
      if (year && month) {
        const monthStr = String(month).padStart(2, "0");
        params.month = `${year}-${monthStr}`;
      }

      const res = await monthlyPayrollAPI.list(params);
      let records = Array.isArray(res.data) ? res.data : [];

      // Filter by Year if selected but Month is not
      if (year && !month) {
        records = records.filter(r => r.salaryMonth?.startsWith(`${year}-`));
      }
      // Filter by Month if selected but Year is not
      if (!year && month) {
        const monthStr = String(month).padStart(2, "0");
        records = records.filter(r => r.salaryMonth?.endsWith(`-${monthStr}`));
      }

      setRecords(records);
    } catch (error) {
      console.error("Error fetching CTC summary", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCTCSummary();
  }, []);

  useEffect(() => {
    let filtered = Array.isArray(records) ? records : [];

    if (location) {
      filtered = filtered.filter((r) => String(r.location || "").toLowerCase() === String(location).toLowerCase());
    }
    if (filterDepartment) {
      filtered = filtered.filter((r) => String(r.department || "") === String(filterDepartment));
    }
    if (filterDesignation) {
      filtered = filtered.filter((r) => String(r.designation || "") === String(filterDesignation));
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      filtered = filtered.filter((r) => {
        const name = String(r.employeeName || "").toLowerCase();
        const id = String(r.employeeId || "").toLowerCase();
        return name.includes(q) || id.includes(q);
      });
    }

    const group = new Map();
    for (const r of filtered) {
      const loc = r.location || "Unknown";
      const pf = Number(r.pf || 0);
      const tax = Number(r.tax || 0);
      const gratuity = Number(r.gratuity || 0);
      const totalEarnings = Number(r.totalEarnings || 0);
      const ctc = r.ctc != null ? Number(r.ctc || 0) : totalEarnings + gratuity;
      if (!group.has(loc)) {
        group.set(loc, { location: loc, totalPF: 0, totalTax: 0, totalCTC: 0 });
      }
      const agg = group.get(loc);
      agg.totalPF += pf;
      agg.totalTax += tax;
      agg.totalCTC += ctc;
    }

    setEmployees(filtered);
    setSummary(Array.from(group.values()));
  }, [records, location, filterDepartment, filterDesignation, searchTerm]);

  const handleClearFilters = () => {
    setMonth("");
    setYear("");
    setLocation("");
    setFilterDepartment("");
    setFilterDesignation("");
    setSearchTerm("");
    setRecords([]);
    setSummary([]);
    setEmployees([]);
  };

  return (
    <div className="p-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        {/* <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by Employee Name, ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div> */}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-end">
        {/* Year Selector */}
        <div>
          <label className="block text-sm font-medium mb-1">Year</label>
          <select
            className="border rounded px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="">All Years</option>
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        {/* Month Selector */}
        <div>
          <label className="block text-sm font-medium mb-1">Month</label>
          <select
            className="border rounded px-3 py-2 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            <option value="">All Months</option>
            {[
              "January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"
            ].map((m, index) => (
              <option key={index} value={index + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>

        

        {/* Location Selector - NEW */}
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <select
            className="border rounded px-3 py-2 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Department Selector */}
        <div>
          <label className="block text-sm font-medium mb-1">Department</label>
          <select
            className="border rounded px-3 py-2 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((dept, index) => (
              <option key={index} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Designation Selector */}
        <div>
          <label className="block text-sm font-medium mb-1">Designation</label>
          <select
            className="border rounded px-3 py-2 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filterDesignation}
            onChange={(e) => setFilterDesignation(e.target.value)}
          >
            <option value="">All Designations</option>
            {designations.map((desig, index) => (
              <option key={index} value={desig}>
                {desig}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={fetchCTCSummary}
            className="bg-[#262760] text-white px-5 py-2 rounded flex items-center gap-2 hover:bg-[#1e2050] transition-colors"
          >
            <Filter size={18} />
            Apply
          </button>
          
          <button
            onClick={handleClearFilters}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

     

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-auto max-h-[45vh]">
          <table className="min-w-[720px] w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-[#262760] sticky top-0 z-30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider sticky left-0 z-40 bg-[#262760] w-[220px] min-w-[220px] max-w-[220px]">
                  Location
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                  Total PF Deduction (₹)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                  Total Tax Deduction (₹)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                  Total CTC (₹)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-6">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : summary.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-500">
                    No data available. Please select filters and click "Apply".
                  </td>
                </tr>
              ) : (
                summary.map((row, index) => (
                  <tr key={index} className="group hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium sticky left-0 z-20 bg-white group-hover:bg-gray-50 w-[220px] min-w-[220px] max-w-[220px]">
                      {row.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      ₹{row.totalPF.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      ₹{row.totalTax.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-blue-700">
                      ₹{row.totalCTC.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {summary.length > 0 && (
              <tfoot className="bg-gray-50 sticky bottom-0 z-20">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap font-bold sticky left-0 z-30 bg-gray-50 w-[220px] min-w-[220px] max-w-[220px]">
                    Total
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold">
                    ₹{summary.reduce((sum, row) => sum + row.totalPF, 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold">
                    ₹{summary.reduce((sum, row) => sum + row.totalTax, 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-green-700">
                    ₹{summary.reduce((sum, row) => sum + row.totalCTC, 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {employees.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
          
          <div className="overflow-auto max-h-[70vh]">
            <table className="min-w-[1200px] w-full divide-y divide-gray-200">
              <thead className="bg-[#262760] sticky top-0 z-30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider sticky left-0 z-40 bg-[#262760] w-[260px] min-w-[260px] max-w-[260px]">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider sticky left-[260px] z-40 bg-[#262760] w-[200px] min-w-[200px] max-w-[200px]">
                    Designation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Total Earnings</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">PF</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Tax</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Gratuity</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Net Salary</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">CTC</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((e) => {
                  const totalEarnings = Number(e.totalEarnings || 0);
                  const gratuity = Number(e.gratuity || 0);
                  const ctc = e.ctc != null ? Number(e.ctc || 0) : totalEarnings + gratuity;
                  return (
                    <tr key={`${e.employeeId}-${e.salaryMonth}`} className="group hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium sticky left-0 z-20 bg-white group-hover:bg-gray-50 w-[260px] min-w-[260px] max-w-[260px]">
                        {e.employeeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap sticky left-[260px] z-20 bg-white group-hover:bg-gray-50 w-[200px] min-w-[200px] max-w-[200px]">
                        {e.designation || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{e.location || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">₹{totalEarnings.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">₹{Number(e.pf || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">₹{Number(e.tax || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">₹{gratuity.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">₹{Number(e.netSalary || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-blue-700">₹{ctc.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 sticky bottom-0 z-20">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap font-bold sticky left-0 z-30 bg-gray-50 w-[260px] min-w-[260px] max-w-[260px]">
                    Totals
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold sticky left-[260px] z-30 bg-gray-50 w-[200px] min-w-[200px] max-w-[200px]">
                    —
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold">—</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold">
                    ₹{employees.reduce((sum, e) => sum + Number(e.totalEarnings || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold">
                    ₹{employees.reduce((sum, e) => sum + Number(e.pf || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold">
                    ₹{employees.reduce((sum, e) => sum + Number(e.tax || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold">
                    ₹{employees.reduce((sum, e) => sum + Number(e.gratuity || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold">
                    ₹{employees.reduce((sum, e) => sum + Number(e.netSalary || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-green-700">
                    ₹{employees.reduce((sum, e) => {
                      const te = Number(e.totalEarnings || 0);
                      const gr = Number(e.gratuity || 0);
                      const c = e.ctc != null ? Number(e.ctc || 0) : te + gr;
                      return sum + c;
                    }, 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostToTheCompany;
