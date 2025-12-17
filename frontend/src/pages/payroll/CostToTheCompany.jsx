import React, { useState } from "react";
import { Calendar, Filter } from "lucide-react";

const CostToTheCompany = () => {
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [location, setLocation] = useState(""); // New state for location
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState([]);

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
    // Option 1: Require all three filters
    if (!month || !year || !location) {
      alert("Please select month, year, and location");
      return;
    }

    // Option 2: Make location optional (choose one approach)
    // if (!month || !year) {
    //   alert("Please select month and year");
    //   return;
    // }

    try {
      setLoading(true);

      // 🔗 Replace with backend API later
      // const response = await fetch(
      //   `/api/payroll/ctc-summary?month=${month}&year=${year}&location=${location}`
      // );
      // const data = await response.json();

      setTimeout(() => {
        // Filter mock data based on selected location
        let filteredData = mockData;
        if (location && location !== "all") {
          filteredData = mockData.filter(item => item.location === location);
        }
        
        setSummary(filteredData);
        setLoading(false);
      }, 800);
    } catch (error) {
      console.error("Error fetching CTC summary", error);
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setMonth("");
    setYear("");
    setLocation("");
    setSummary([]);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Cost To The Company – Location Wise
      </h1>

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

      {/* Summary Stats */}
      {summary.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-4 text-sm">
            <div className="font-medium">Filters Applied:</div>
            <div className="flex items-center gap-2">
              {month && (
                <span className="bg-white border px-3 py-1 rounded">
                  Month: {["January", "February", "March", "April", "May", "June", 
                    "July", "August", "September", "October", "November", "December"][month - 1]}
                </span>
              )}
              {year && (
                <span className="bg-white border px-3 py-1 rounded">
                  Year: {year}
                </span>
              )}
              {location && (
                <span className="bg-white border px-3 py-1 rounded">
                  Location: {location === "all" ? "All Locations" : location}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#262760]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Total PF Deduction (₹)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Total Tax Deduction (₹)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
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
    </div>
  );
};

export default CostToTheCompany;