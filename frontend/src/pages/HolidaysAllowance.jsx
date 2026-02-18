import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeeAPI, holidayAllowanceAPI } from '../services/api';
import { 
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  DevicePhoneMobileIcon,
  CalendarDaysIcon,
  MapPinIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

const HolidaysAllowance = () => {
  const navigate = useNavigate();

  // Filters
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Data
  const [employees, setEmployees] = useState([]); // All employees
  const [tableData, setTableData] = useState([]); // Merged data for table
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState([]);

  // Constants
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  useEffect(() => {
    // Initial load of employees to get locations
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedLocation && selectedMonth && selectedYear) {
      loadData();
    }
  }, [selectedLocation, selectedMonth, selectedYear]);

  const fetchInitialData = async () => {
    try {
      const response = await employeeAPI.getAllEmployees();
      const emps = response.data || [];
      // Extract unique locations
      const locs = [...new Set(emps.map(e => e.location).filter(Boolean))];
      setLocations(locs);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const calculatePerDayAmount = (grossSalary, year, month) => {
    if (!grossSalary) {
      return 0;
    }
    const daysInMonth = new Date(year, month, 0).getDate();
    if (!daysInMonth) {
      return 0;
    }
    return Math.round(grossSalary / daysInMonth);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 2. Filter employees by location
      // Note: getAllEmployees fetches all, we filter client side if API doesn't support it
      const empResponse = await employeeAPI.getAllEmployees();
      let filteredEmps = empResponse.data || [];

      const params = {
        month: selectedMonth,
        year: selectedYear,
      };

      if (selectedLocation) {
        filteredEmps = filteredEmps.filter(e => e.location === selectedLocation);
        params.location = selectedLocation;
      }

      let savedRecords = [];
      try {
        const savedRes = await holidayAllowanceAPI.list(params);
        if (savedRes && savedRes.data) {
          savedRecords = savedRes.data.data || savedRes.data;
        }
      } catch (err) {
        console.error("Error fetching saved holiday allowances:", err);
      }

      const savedMap = new Map();
      savedRecords.forEach(item => {
        if (item && item.employeeId) {
          savedMap.set(item.employeeId, item);
        }
      });

      // 3. Create Table Data
      const merged = filteredEmps.map((emp, index) => {
        const gross = emp.totalEarnings || emp.ctc || 0;
        const saved = savedMap.get(emp.employeeId);
        const defaultPerDay = calculatePerDayAmount(gross, selectedYear, selectedMonth);

        return {
          id: emp._id, // Employee DB ID
          sNo: index + 1,
          employeeId: emp.employeeId,
          employeeName: emp.name || emp.employeename,
          location: emp.location || '-',
          accountNumber: emp.bankAccount || emp.bankDetails?.accountNumber || '-',
          grossSalary: saved?.grossSalary ?? gross,
          
          // Holiday Working Fields
          holidayDays: saved?.holidayDays ?? 0,
          perDayAmount: saved?.perDayAmount ?? defaultPerDay,
          holidayTotal: saved?.holidayTotal ?? 0,

          // Shift Allowance Fields
          shiftAllottedAmount: saved?.shiftAllottedAmount ?? 50,
          shiftDays: saved?.shiftDays ?? 0,
          shiftTotal: saved?.shiftTotal ?? 0,

          // Combined Total
          totalAmount: saved?.totalAmount ?? 0,
          
          status: saved ? 'Saved' : 'Draft'
        };
      });

      setTableData(merged);

    } catch (error) {
      console.error("Error loading data:", error);
      const msg = error.response?.data?.message || error.message || "Unknown error";
      alert(`Failed to load data: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (index, field, value) => {
    const newData = [...tableData];
    const row = newData[index];

    const recalcTotals = () => {
      row.holidayTotal = Math.round((row.holidayDays || 0) * (row.perDayAmount || 0));
      row.shiftTotal = Math.round((row.shiftAllottedAmount || 0) * (row.shiftDays || 0));
      row.totalAmount = row.holidayTotal + row.shiftTotal;
    };

    if (field === 'holidayDays') {
      const days = parseFloat(value) || 0;
      row.holidayDays = days;
      recalcTotals();
    } else if (field === 'perDayAmount') {
      const amount = parseFloat(value) || 0;
      row.perDayAmount = amount;
      recalcTotals();
    } else if (field === 'shiftAllottedAmount') {
      const amount = parseFloat(value) || 0;
      row.shiftAllottedAmount = amount;
      recalcTotals();
    } else if (field === 'shiftDays') {
      const days = parseFloat(value) || 0;
      row.shiftDays = days;
      recalcTotals();
    }

    setTableData(newData);
  };

  const saveData = async () => {
    try {
      const payload = {
        month: selectedMonth,
        year: selectedYear,
        allowances: tableData.map(row => ({
          employeeId: row.employeeId,
          employeeName: row.employeeName,
          location: row.location,
          accountNumber: row.accountNumber,
          grossSalary: row.grossSalary,
          holidayDays: row.holidayDays,
          perDayAmount: row.perDayAmount,
          holidayTotal: row.holidayTotal,
          shiftAllottedAmount: row.shiftAllottedAmount,
          shiftDays: row.shiftDays,
          shiftTotal: row.shiftTotal,
          totalAmount: row.totalAmount
        }))
      };

      const res = await holidayAllowanceAPI.saveBulk(payload);
      const message = res?.data?.message || 'Holiday allowances saved successfully';
      alert(message);
      
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Failed to save data");
    }
  };

  const handleViewSummary = () => {
    const params = new URLSearchParams();
    if (selectedLocation) {
      params.set('location', selectedLocation);
    }
    params.set('month', String(selectedMonth));
    params.set('year', String(selectedYear));
    navigate(`/holidays-allowance/summary?${params.toString()}`);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center mb-6">
        
        <h1 className="text-2xl font-bold text-[#1e2050]">Employee Allowance System</h1>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-center">
        {/* Location */}
        <div className="flex items-center bg-white border rounded-md px-3 py-2 w-64">
          <MapPinIcon className="h-5 w-5 text-[#1e2050] mr-2" />
          <select 
            className="w-full outline-none text-gray-700 bg-transparent"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="">Select Location</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        {/* Month */}
        <div className="flex items-center bg-white border rounded-md px-3 py-2 w-48">
          <CalendarDaysIcon className="h-5 w-5 text-[#1e2050] mr-2" />
          <select 
            className="w-full outline-none text-gray-700 bg-transparent"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div className="flex items-center bg-white border rounded-md px-2 py-2">
          <button 
            onClick={() => setSelectedYear(selectedYear - 1)}
            className="p-1 hover:bg-gray-100 rounded text-[#1e2050]"
          >
            &lt;
          </button>
          <span className="mx-3 font-medium text-gray-700">{selectedYear}</span>
          <button 
            onClick={() => setSelectedYear(selectedYear + 1)}
            className="p-1 hover:bg-gray-100 rounded text-[#1e2050]"
          >
            &gt;
          </button>
        </div>

        {/* Buttons */}
        <button 
          onClick={loadData}
          className="flex items-center bg-[#1e2050] text-white px-4 py-2 rounded-md hover:bg-[#262760] transition-colors"
        >
          <ArrowPathIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Load Employees
        </button>

        <button 
          onClick={saveData}
          className="flex items-center bg-[#1e2050] text-white px-4 py-2 rounded-md hover:bg-[#262760] transition-colors"
        >
          <DevicePhoneMobileIcon className="h-5 w-5 mr-2" /> {/* Using generic icon as 'Save' */}
          Save Data
        </button>

        <button 
          onClick={handleViewSummary}
          className="flex items-center bg-[#1e2050] text-white px-4 py-2 rounded-md hover:bg-[#262760] transition-colors"
        >
          <UserGroupIcon className="h-5 w-5 mr-2" />
          View Summary
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Table Header Title */}
        

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-white uppercase bg-[#1e2050]">
              <tr>
                <th rowSpan="2" className="px-4 py-3 border-r border-gray-500">S.No</th>
                <th rowSpan="2" className="px-4 py-3 border-r border-gray-500">Employee ID</th>
                <th rowSpan="2" className="px-4 py-3 border-r border-gray-500">Employee Name</th>
                <th rowSpan="2" className="px-4 py-3 border-r border-gray-500">Location</th>
                <th rowSpan="2" className="px-4 py-3 border-r border-gray-500">Account Number</th>
                <th rowSpan="2" className="px-4 py-3 border-r border-gray-500">Gross Salary</th>
                <th colSpan="3" className="px-4 py-2 text-center border-r border-gray-500 border-b border-gray-500">
                  Holiday Working
                </th>
                <th colSpan="3" className="px-4 py-2 text-center border-r border-gray-500 border-b border-gray-500">
                  Shift Allowance
                </th>
                <th rowSpan="2" className="px-4 py-3">Total Amount</th>
              </tr>
              <tr>
                <th className="px-4 py-2 border-r border-gray-500 text-center">No. of Days</th>
                <th className="px-4 py-2 border-r border-gray-500 text-center">Per Day Amount</th>
                <th className="px-4 py-2 border-r border-gray-500 text-center">Total</th>
                <th className="px-4 py-2 border-r border-gray-500 text-center">Allotted Amount</th>
                <th className="px-4 py-2 border-r border-gray-500 text-center">No. of Days</th>
                <th className="px-4 py-2 border-r border-gray-500 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan="13" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-4xl mb-2">📋</span>
                      <p>Select location and click "Load Employees" to load data</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tableData.map((row, index) => (
                  <tr key={row.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-4 py-3 border-r">{row.sNo}</td>
                    <td className="px-4 py-3 border-r font-medium text-gray-900">{row.employeeId}</td>
                    <td className="px-4 py-3 border-r">{row.employeeName}</td>
                    <td className="px-4 py-3 border-r">{row.location}</td>
                    <td className="px-4 py-3 border-r font-mono">{row.accountNumber}</td>
                    <td className="px-4 py-3 border-r text-right">{row.grossSalary?.toLocaleString()}</td>
                    
                    {/* Holiday Working Inputs */}
                    <td className="px-2 py-2 border-r">
                      <input 
                        type="number" 
                        min="0"
                        className="w-full px-2 py-1 border rounded focus:ring-[#1e2050] focus:border-[#1e2050] text-center"
                        value={row.holidayDays}
                        onChange={(e) => handleInputChange(index, 'holidayDays', e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2 border-r">
                      <input 
                        type="number"
                        min="0" 
                        className="w-full px-2 py-1 border rounded focus:ring-[#1e2050] focus:border-[#1e2050] text-right"
                        value={row.perDayAmount}
                        onChange={(e) => handleInputChange(index, 'perDayAmount', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3 border-r text-right font-medium text-gray-700 bg-gray-50">
                      {row.holidayTotal?.toLocaleString()}
                    </td>

                    {/* Shift Allowance Inputs */}
                    <td className="px-2 py-2 border-r">
                      <input 
                        type="number"
                        min="0"
                        className="w-full px-2 py-1 border rounded focus:ring-[#1e2050] focus:border-[#1e2050] text-right"
                        value={row.shiftAllottedAmount}
                        onChange={(e) => handleInputChange(index, 'shiftAllottedAmount', e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2 border-r">
                      <input 
                        type="number"
                        min="0"
                        className="w-full px-2 py-1 border rounded focus:ring-[#1e2050] focus:border-[#1e2050] text-center"
                        value={row.shiftDays}
                        onChange={(e) => handleInputChange(index, 'shiftDays', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3 border-r text-right font-medium text-gray-700 bg-gray-50">
                      {row.shiftTotal?.toLocaleString()}
                    </td>
                    
                    {/* Final Total */}
                    <td className="px-4 py-3 text-right font-bold text-[#1e2050]">
                      {row.totalAmount?.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HolidaysAllowance;
