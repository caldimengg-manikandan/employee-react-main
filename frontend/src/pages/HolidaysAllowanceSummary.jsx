import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { employeeAPI, holidayAllowanceAPI } from '../services/api';
import { CalendarDaysIcon, MapPinIcon } from '@heroicons/react/24/outline';

const HolidaysAllowanceSummary = () => {
  const navigate = useNavigate();
  const locationHook = useLocation();

  const queryParams = new URLSearchParams(locationHook.search);
  const initialLocation = queryParams.get('location') || '';
  const initialMonth = parseInt(queryParams.get('month'), 10) || new Date().getMonth() + 1;
  const initialYear = parseInt(queryParams.get('year'), 10) || new Date().getFullYear();

  const [locationFilter, setLocationFilter] = useState(initialLocation);
  const [monthFilter, setMonthFilter] = useState(initialMonth);
  const [yearFilter, setYearFilter] = useState(initialYear);
  const [locations, setLocations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

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
    { value: 12, label: 'December' },
  ];

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const res = await employeeAPI.getAllEmployees();
        const emps = res.data || [];
        const locs = [...new Set(emps.map(e => e.location).filter(Boolean))];
        setLocations(locs);
      } catch (error) {
        console.error('Error loading locations for summary:', error);
      }
    };
    loadLocations();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const params = {
        month: monthFilter,
        year: yearFilter,
      };
      if (locationFilter) {
        params.location = locationFilter;
      }
      const res = await holidayAllowanceAPI.getSummary(params);
      if (res && res.data && res.data.summary) {
        setSummary(res.data.summary);
      } else {
        setSummary(null);
      }
    } catch (error) {
      console.error('Error fetching allowance summary:', error);
      alert('Failed to load allowance summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleApplyFilter = () => {
    const searchParams = new URLSearchParams();
    if (locationFilter) {
      searchParams.set('location', locationFilter);
    }
    searchParams.set('month', String(monthFilter));
    searchParams.set('year', String(yearFilter));
    navigate({
      pathname: '/holidays-allowance/summary',
      search: `?${searchParams.toString()}`,
    });
    loadSummary();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-[#1e2050] flex items-center gap-2">
          <span className="inline-block">Allowance Summary Report</span>
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap items-end gap-4">
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-600 mb-1">Filter by Location:</label>
          <div className="flex items-center bg-white border rounded-md px-3 py-2 min-w-[200px]">
            <MapPinIcon className="h-5 w-5 text-[#1e2050] mr-2" />
            <select
              className="w-full outline-none text-gray-700 bg-transparent"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="">All Locations</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-600 mb-1">Month:</label>
          <div className="flex items-center bg-white border rounded-md px-3 py-2 min-w-[160px]">
            <CalendarDaysIcon className="h-5 w-5 text-[#1e2050] mr-2" />
            <select
              className="w-full outline-none text-gray-700 bg-transparent"
              value={monthFilter}
              onChange={(e) => setMonthFilter(parseInt(e.target.value, 10))}
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-600 mb-1">Year:</label>
          <div className="flex items-center bg-white border rounded-md px-3 py-2 min-w-[120px]">
            <input
              type="number"
              className="w-full outline-none text-gray-700 bg-transparent"
              value={yearFilter}
              onChange={(e) => setYearFilter(parseInt(e.target.value, 10) || new Date().getFullYear())}
            />
          </div>
        </div>

        <button
          onClick={handleApplyFilter}
          className="ml-auto flex items-center bg-[#1e2050] text-white px-5 py-2.5 rounded-md hover:bg-[#262760] transition-colors text-sm font-medium"
        >
          {loading ? 'Applying...' : 'Apply Filter'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="text-2xl font-bold text-blue-700">
            {summary?.totalEmployees ?? 0}
          </div>
          <div className="mt-1 text-xs font-medium text-gray-600 uppercase tracking-wide">
            Total Employees
          </div>
        </div>
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
          <div className="text-2xl font-bold text-emerald-700">
            ₹{(summary?.totalHolidayAmount || 0).toFixed(2)}
          </div>
          <div className="mt-1 text-xs font-medium text-gray-600 uppercase tracking-wide">
            Holiday Working Amount
          </div>
        </div>
        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
          <div className="text-2xl font-bold text-indigo-700">
            ₹{(summary?.totalShiftAmount || 0).toFixed(2)}
          </div>
          <div className="mt-1 text-xs font-medium text-gray-600 uppercase tracking-wide">
            Shift Allowance Amount
          </div>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
          <div className="text-2xl font-bold text-purple-700">
            ₹{(summary?.totalAmount || 0).toFixed(2)}
          </div>
          <div className="mt-1 text-xs font-medium text-gray-600 uppercase tracking-wide">
            Grand Total Amount
          </div>
        </div>
      </div>
    </div>
  );
};

export default HolidaysAllowanceSummary;

