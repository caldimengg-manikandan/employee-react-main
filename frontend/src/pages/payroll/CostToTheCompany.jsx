import React, { useState, useEffect } from "react";
import { Calendar, Filter, ChevronDown, ChevronRight, Download } from "lucide-react";
import { monthlyPayrollAPI, employeeAPI } from "../../services/api";
import * as XLSX from "xlsx";

const CostToTheCompany = () => {
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [location, setLocation] = useState(""); // New state for location
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterDesignation, setFilterDesignation] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [employeeDirectory, setEmployeeDirectory] = useState([]); // Cache for employee details
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    const init = async () => {
      const emps = await fetchFilterOptions();
      fetchCTCSummary(emps);
    };
    init();
  }, []);

  useEffect(() => {
    if (!employeeDirectory.length) return;

    let filteredData = employeeDirectory;
    if (filterDepartment) {
      filteredData = filteredData.filter(e => (e.department || e.division) === filterDepartment);
    }

    const uniqueDesigs = [...new Set(filteredData.map(e => e.designation || e.position).filter(Boolean))];
    setDesignations(uniqueDesigs);

    // If currently selected designation is not in the new list, clear it
    if (filterDesignation && !uniqueDesigs.includes(filterDesignation)) {
      setFilterDesignation("");
    }
  }, [filterDepartment, employeeDirectory]);

  useEffect(() => {
    if (!employeeDirectory.length) return;

    let filteredData = employeeDirectory;
    if (filterDesignation) {
      filteredData = filteredData.filter(e => (e.designation || e.position) === filterDesignation);
    }

    const uniqueDepts = [...new Set(filteredData.map(e => e.department || e.division).filter(Boolean))];
    setDepartments(uniqueDepts);

    // If currently selected department is not in the new list, clear it
    if (filterDepartment && !uniqueDepts.includes(filterDepartment)) {
      setFilterDepartment("");
    }
  }, [filterDesignation, employeeDirectory]);

  const fetchFilterOptions = async () => {
    try {
      const res = await employeeAPI.getAllEmployees();
      const data = Array.isArray(res.data) ? res.data : [];
      
      const uniqueDepts = [...new Set(data.map(e => e.department || e.division).filter(Boolean))];
      // uniqueDesigs will be handled by the useEffect above
      
      setDepartments(uniqueDepts);
      setEmployeeDirectory(data);
      return data;
    } catch (error) {
      console.error("Error fetching filter options", error);
      return [];
    }
  };

  // Example locations data
  const mockData = [
    {
      location: "Chennai",
      totalPF: 125000,
      totalTax: 98000,
      totalCTC: 1250000,
    },
    {
      location: "Bangalore",
      totalPF: 98000,
      totalTax: 76000,
      totalCTC: 980000,
    },
    {
      location: "Hyderabad",
      totalPF: 87000,
      totalTax: 65000,
      totalCTC: 870000,
    },
    {
      location: "Hosur", // Added Hosur to mock data
      totalPF: 75000,
      totalTax: 62000,
      totalCTC: 850000,
    },
  ];

  const fetchCTCSummary = async (empDir = null) => {
    try {
      setLoading(true);
      
      let params = {};
      if (year && month) {
        const monthStr = String(month).padStart(2, "0");
        params.month = `${year}-${monthStr}`;
      }

      const res = await monthlyPayrollAPI.list(params);
      let records = Array.isArray(res.data) ? res.data : [];

      // Use passed directory or state
      const dir = (Array.isArray(empDir) ? empDir : null) || employeeDirectory;
      
      // Enrich records with employee details (Location, Dept, Desig)
      records = records.map(r => {
        // If the record already has these fields, keep them, otherwise lookup
        const emp = dir.find(e => String(e.employeeId || '').toLowerCase() === String(r.employeeId || '').toLowerCase());
        return {
          ...r,
          location: r.location || emp?.location || emp?.address || "Unknown",
          department: r.department || emp?.department || emp?.division || "Unknown",
          designation: r.designation || emp?.designation || emp?.position || "Unknown"
        };
      });

      // Filter by Year if selected but Month is not
      if (year && !month) {
        records = records.filter(r => r.salaryMonth?.startsWith(`${year}-`));
      }
      // Filter by Month if selected but Year is not
      if (!year && month) {
        const monthStr = String(month).padStart(2, "0");
        records = records.filter(r => r.salaryMonth?.endsWith(`-${monthStr}`));
      }

      if (location) {
        records = records.filter((r) => (r.location || "").toLowerCase() === location.toLowerCase());
      }
      if (filterDepartment) {
        records = records.filter((r) => (r.department || "") === filterDepartment);
      }
      if (filterDesignation) {
        records = records.filter((r) => (r.designation || "") === filterDesignation);
      }
      const group = new Map();
      for (const r of records) {
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
      setSummary(Array.from(group.values()));

      // Aggregate employees
      const empMap = new Map();
      for (const r of records) {
        const empId = r.employeeId;
        const totalEarnings = Number(r.totalEarnings || 0);
        const pf = Number(r.pf || 0);
        const tax = Number(r.tax || 0);
        const gratuity = Number(r.gratuity || 0);
        const netSalary = Number(r.netSalary || 0);
        const ctc = r.ctc != null ? Number(r.ctc || 0) : totalEarnings + gratuity;

        if (!empMap.has(empId)) {
          empMap.set(empId, {
            employeeId: empId,
            employeeName: r.employeeName,
            designation: r.designation,
            location: r.location,
            totalEarnings: 0,
            pf: 0,
            tax: 0,
            gratuity: 0,
            netSalary: 0,
            ctc: 0,
            history: []
          });
        }
        const agg = empMap.get(empId);
        agg.totalEarnings += totalEarnings;
        agg.pf += pf;
        agg.tax += tax;
        agg.gratuity += gratuity;
        agg.netSalary += netSalary;
        agg.ctc += ctc;
        agg.history.push(r);
      }
      
      const sortedEmployees = Array.from(empMap.values()).sort((a, b) => {
        return (a.employeeId || "").localeCompare(b.employeeId || "", undefined, { numeric: true });
      });
      setEmployees(sortedEmployees);
    } catch (error) {
      console.error("Error fetching CTC summary", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setMonth("");
    setYear("");
    setLocation("");
    setFilterDepartment("");
    setFilterDesignation("");
    setSummary([]);
    setEmployees([]);
  };

  const handleDownloadExcel = () => {
    if (summary.length === 0 && employees.length === 0) {
      alert("No data available to download.");
      return;
    }

    const workbook = XLSX.utils.book_new();

    if (summary.length > 0) {
      const summaryData = summary.map((row) => ({
        Location: row.location,
        "Total PF Deduction": Number(row.totalPF || 0),
        "Total Tax Deduction": Number(row.totalTax || 0),
        "Total CTC": Number(row.totalCTC || 0),
      }));

      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      wsSummary["!cols"] = [
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(workbook, wsSummary, "Summary");
    }

    if (employees.length > 0) {
      const employeesData = employees.map((e, index) => ({
        "S.No": index + 1,
        "Employee ID": e.employeeId,
        "Employee Name": e.employeeName,
        Designation: e.designation || "",
        Location: e.location || "",
        "Total Earnings": Number(e.totalEarnings || 0),
        PF: Number(e.pf || 0),
        Tax: Number(e.tax || 0),
        Gratuity: Number(e.gratuity || 0),
        "Net Salary": Number(e.netSalary || 0),
        CTC: Number(e.ctc || 0),
      }));

      const wsEmployees = XLSX.utils.json_to_sheet(employeesData);
      wsEmployees["!cols"] = [
        { wch: 6 },
        { wch: 12 },
        { wch: 22 },
        { wch: 18 },
        { wch: 16 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 18 },
        { wch: 18 },
      ];
      XLSX.utils.book_append_sheet(workbook, wsEmployees, "Employees");
    }

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    let periodLabel = "All";
    const monthIndex = Number(month);
    if (year && monthIndex >= 1 && monthIndex <= 12) {
      periodLabel = `${monthNames[monthIndex - 1]}_${year}`;
    } else if (year) {
      periodLabel = `${year}`;
    } else if (monthIndex >= 1 && monthIndex <= 12) {
      periodLabel = `${monthNames[monthIndex - 1]}`;
    }

    const today = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `CTC_Report_${periodLabel}_${today}.xlsx`);
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

  return (
    <div className="p-4 space-y-6">
      {/* Filters Section */}
      <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Year Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Year</label>
            <select
              className="border border-slate-200 rounded-xl px-3 py-2 w-32 text-sm bg-slate-50/50 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
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
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Month</label>
            <select
              className="border border-slate-200 rounded-xl px-3 py-2 w-40 text-sm bg-slate-50/50 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
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

          {/* Location Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Location</label>
            <select
              className="border border-slate-200 rounded-xl px-3 py-2 w-40 text-sm bg-slate-50/50 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">All Locations</option>
              <option value="Hosur">Hosur</option>
              <option value="Chennai">Chennai</option>
            </select>
          </div>

          {/* Department Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Division</label>
            <select
              className="border border-slate-200 rounded-xl px-3 py-2 w-44 text-sm bg-slate-50/50 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <option value="">All Divisions</option>
              {departments.map((dept, index) => (
                <option key={index} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Designation Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Designation</label>
            <select
              className="border border-slate-200 rounded-xl px-3 py-2 w-44 text-sm bg-slate-50/50 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
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
          <div className="flex gap-2.5 ml-auto">
            <button
              onClick={fetchCTCSummary}
              className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 py-2 text-sm font-semibold rounded-xl flex items-center gap-2 hover:from-slate-800 hover:to-indigo-900 transition-all shadow-sm hover:shadow-md"
            >
              <Filter size={16} />
              Apply
            </button>
            
            <button
              onClick={handleClearFilters}
              className="border border-slate-200 text-slate-700 bg-white px-4 py-2 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              Clear
            </button>

            <button
              onClick={handleDownloadExcel}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 text-sm font-semibold rounded-xl flex items-center gap-2 hover:from-emerald-700 hover:to-teal-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={summary.length === 0 && employees.length === 0}
            >
              <Download size={16} />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Summary Location Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-auto max-h-96">
          <table className="min-w-full divide-y divide-slate-100 table-fixed">
            <thead className="bg-[#262760] sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  Total PF Deduction (₹)
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  Total Tax Deduction (₹)
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  Total CTC (₹)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-8">
                    <div className="flex justify-center items-center font-medium text-slate-600 text-sm">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-2.5"></div>
                      Loading CTC Summary...
                    </div>
                  </td>
                </tr>
              ) : summary.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-slate-500 text-sm font-medium">
                    No CTC summary data available. Select filters and click "Apply".
                  </td>
                </tr>
              ) : (
                summary.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-900 text-sm">{row.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-700">
                      ₹{row.totalPF.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-700">
                      ₹{row.totalTax.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-indigo-700">
                      ₹{row.totalCTC.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {summary.length > 0 && (
              <tfoot className="bg-slate-900 text-white">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-sm">Total</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-sm">
                    ₹{summary.reduce((sum, row) => sum + row.totalPF, 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-sm">
                    ₹{summary.reduce((sum, row) => sum + row.totalTax, 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-sm text-emerald-400">
                    ₹{summary.reduce((sum, row) => sum + row.totalCTC, 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Employee Breakdown Table */}
      {employees.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-auto max-h-[600px]">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-[#262760] sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3.5 w-10"></th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Employee ID</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Employee Name</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Designation</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-white uppercase tracking-wider">Total Earnings</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-white uppercase tracking-wider">PF</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-white uppercase tracking-wider">Tax</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-white uppercase tracking-wider">Gratuity</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-white uppercase tracking-wider">Net Salary</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-white uppercase tracking-wider">CTC</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {employees.map((e) => {
                  return (
                    <React.Fragment key={e.employeeId}>
                      <tr 
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${expandedRows.has(e.employeeId) ? 'bg-indigo-50/40' : ''}`}
                        onClick={() => toggleRow(e.employeeId)}
                      >
                        <td className="px-6 py-4 text-slate-400">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            {expandedRows.has(e.employeeId) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                            {e.employeeId}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-900 text-sm">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                              {(e.employeeName || 'E').charAt(0).toUpperCase()}
                            </div>
                            {e.employeeName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">{e.designation || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">{e.location || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-800">₹{e.totalEarnings.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-700">₹{e.pf.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-700">₹{e.tax.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-700">₹{e.gratuity.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-slate-800">₹{e.netSalary.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            ₹{e.ctc.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                      {expandedRows.has(e.employeeId) && (
                        <tr className="bg-slate-50/60">
                          <td colSpan="11" className="px-6 py-4">
                            <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-inner p-3">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-100/70">
                                  <tr>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-left">Month</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Earnings</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">PF</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Tax</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Gratuity</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Net Salary</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">CTC</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {e.history.map((record, idx) => {
                                      const rTotalEarnings = Number(record.totalEarnings || 0);
                                      const rPf = Number(record.pf || 0);
                                      const rTax = Number(record.tax || 0);
                                      const rGratuity = Number(record.gratuity || 0);
                                      const rNetSalary = Number(record.netSalary || 0);
                                      const rCtc = record.ctc != null ? Number(record.ctc || 0) : rTotalEarnings + rGratuity;
                                      
                                      return (
                                        <tr key={idx} className="hover:bg-slate-50/60">
                                          <td className="px-4 py-2 text-slate-700 font-medium">{record.salaryMonth}</td>
                                          <td className="px-4 py-2 text-right text-slate-700">₹{rTotalEarnings.toLocaleString()}</td>
                                          <td className="px-4 py-2 text-right text-slate-700">₹{rPf.toLocaleString()}</td>
                                          <td className="px-4 py-2 text-right text-slate-700">₹{rTax.toLocaleString()}</td>
                                          <td className="px-4 py-2 text-right text-slate-700">₹{rGratuity.toLocaleString()}</td>
                                          <td className="px-4 py-2 text-right text-slate-700">₹{rNetSalary.toLocaleString()}</td>
                                          <td className="px-4 py-2 text-right font-semibold text-indigo-600">₹{rCtc.toLocaleString()}</td>
                                        </tr>
                                      );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-bold">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" colSpan={5}>Totals</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    ₹{employees.reduce((sum, e) => sum + Number(e.totalEarnings || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    ₹{employees.reduce((sum, e) => sum + Number(e.pf || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    ₹{employees.reduce((sum, e) => sum + Number(e.tax || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    ₹{employees.reduce((sum, e) => sum + Number(e.gratuity || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    ₹{employees.reduce((sum, e) => sum + Number(e.netSalary || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-emerald-400">
                    ₹{employees.reduce((sum, e) => sum + Number(e.ctc || 0), 0).toLocaleString()}
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
