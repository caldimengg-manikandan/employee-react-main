import React, { useState } from "react";
import { Calendar, Filter } from "lucide-react";
import { monthlyPayrollAPI } from "../../services/api";

const CostToTheCompany = () => {
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [location, setLocation] = useState(""); // New state for location
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState([]);
  const [employees, setEmployees] = useState([]);

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

  const fetchCTCSummary = async () => {
    if (!month || !year) {
      alert("Please select month and year");
      return;
    }
    try {
      setLoading(true);
      const monthStr = String(month).padStart(2, "0");
      const salaryMonth = `${year}-${monthStr}`;
      const res = await monthlyPayrollAPI.list({ month: salaryMonth });
      let records = Array.isArray(res.data) ? res.data : [];
      if (location) {
        records = records.filter((r) => (r.location || "").toLowerCase() === location.toLowerCase());
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
      setEmployees(records);
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
    setSummary([]);
    setEmployees([]);
  };

  return (
    <div className="p-6">
      

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-end">
        {/* Month Selector */}
        <div>
          <label className="block text-sm font-medium mb-1">Month</label>
          <select
            className="border rounded px-3 py-2 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            <option value="">Select Month</option>
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

        {/* Year Selector */}
        <div>
          <label className="block text-sm font-medium mb-1">Year</label>
          <select
            className="border rounded px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="">Select Year</option>
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>
                {y}
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
            <option value="Hosur">Hosur</option>
            <option value="Chennai">Chennai</option>
            
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-[#262760]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
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
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{row.location}</td>
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
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap font-bold">Total</td>
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
          <div className="px-6 py-4 border-b">
            <div className="text-lg font-semibold">Employee CTC Details</div>
            <div className="text-sm text-gray-500">Based on monthly payroll data</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#262760]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Designation</th>
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
                    <tr key={`${e.employeeId}-${e.salaryMonth}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{e.employeeName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{e.designation || "-"}</td>
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
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap font-bold" colSpan={3}>Totals</td>
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
