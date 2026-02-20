import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Calendar, RefreshCw, Users, MapPin } from 'lucide-react';
import { employeeAPI, attendanceAPI } from '../../services/api';

const FINANCIAL_YEARS = ['2023-24', '2024-25', '2025-26'];

const getFinancialYearRange = (financialYear) => {
  const parts = String(financialYear || '').split('-');
  const startYear = parseInt(parts[0], 10) || new Date().getFullYear();
  const start = new Date(startYear, 3, 1);
  const end = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);
  return { start, end };
};

const getWorkingDaysBetween = (start, end) => {
  let count = 0;
  const current = new Date(start.getTime());
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const getTotalDaysBetween = (start, end) => {
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
};

const AttendanceSummary = () => {
  const [financialYear, setFinancialYear] = useState(() => {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const defaultLabel = `${currentYear}-${String(nextYear).slice(-2)}`;
    if (FINANCIAL_YEARS.includes(defaultLabel)) return defaultLabel;
    return FINANCIAL_YEARS[FINANCIAL_YEARS.length - 1];
  });

  const [employees, setEmployees] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    division: 'all',
    location: 'all',
  });

  const [refreshToken, setRefreshToken] = useState(0);
  const [rowOverrides, setRowOverrides] = useState({});
  const [savingMap, setSavingMap] = useState({});
  const [editMap, setEditMap] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { start, end } = getFinancialYearRange(financialYear);
        const startDate = start.toISOString().slice(0, 10);
        const endDate = end.toISOString().slice(0, 10);

        const summaryParams =
          financialYear === '2025-26'
            ? { financialYear }
            : { startDate, endDate, financialYear };

        const [empRes, summaryRes] = await Promise.all([
          employeeAPI.getAllEmployees(),
          attendanceAPI.getSummary(summaryParams),
        ]);

        const empData = Array.isArray(empRes.data) ? empRes.data : [];
        const summaryData = Array.isArray(summaryRes.data?.summary)
          ? summaryRes.data.summary
          : [];

        setEmployees(empData);
        setAttendanceSummary(summaryData);
      } catch (error) {
        setEmployees([]);
        setAttendanceSummary([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [financialYear, refreshToken]);

  const divisionOptions = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => {
      if (e.division) set.add(e.division);
    });
    return Array.from(set).sort();
  }, [employees]);

  const locationOptions = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => {
      if (e.location || e.branch) set.add(e.location || e.branch);
    });
    return Array.from(set).sort();
  }, [employees]);

  const { workingDaysYear, officeHolidaysYear, rows } = useMemo(() => {
    const range = getFinancialYearRange(financialYear);
    const workingYear = getWorkingDaysBetween(range.start, range.end);
    const totalDaysYear = getTotalDaysBetween(range.start, range.end);
    const officeHolidays = Math.max(0, totalDaysYear - workingYear);

    const attendanceMap = {};
    attendanceSummary.forEach((item) => {
      const rawId = item.employeeId || item.employeeCode || '';
      const key = String(rawId || '').toLowerCase();
      if (!key) return;
      const present =
        financialYear === '2025-26'
          ? Number(item.yearlyPresent || 0)
          : Number(item.inCount || 0);
      if (!attendanceMap[key]) {
        attendanceMap[key] = { yearlyPresent: 0, hasManual: false };
      }
      attendanceMap[key].yearlyPresent += present;
      if (financialYear === '2025-26') {
        attendanceMap[key].hasManual = true;
      }
    });

    const computedRows = employees
      .map((emp) => {
        const rawEmpId = emp.employeeId || emp.empId || emp.id || '';
        const empId = rawEmpId ? String(rawEmpId) : '';
        if (!empId) {
          return null;
        }
        const key = empId.toLowerCase();
        const attInfo = attendanceMap[key] || { yearlyPresent: 0, hasManual: false };

        const basePresent = Math.max(0, Math.min(workingYear, attInfo.yearlyPresent));
        let baseAbsent;
        if (financialYear === '2025-26') {
          baseAbsent = 0;
        } else {
          baseAbsent = Math.max(0, workingYear - basePresent);
        }

        const yearlyPct =
          workingYear > 0 ? Math.max(0, Math.min(100, (basePresent / workingYear) * 100)) : 0;

        return {
          empId,
          name: emp.name || emp.employeeName || '',
          division: emp.division || '',
          location: emp.location || emp.branch || '',
          yearlyPresent: basePresent,
          yearlyAbsent: baseAbsent,
          yearlyPct,
          hasManualRecord: !!attInfo.hasManual,
        };
      })
      .filter(Boolean);

    return {
      workingDaysYear: workingYear,
      officeHolidaysYear: officeHolidays,
      rows: computedRows,
    };
  }, [employees, attendanceSummary, financialYear]);

  const filteredRows = useMemo(() => {
    const adjustedRows = rows.map((row) => {
      const override = rowOverrides[row.empId];

      let present = row.yearlyPresent;
      if (override && typeof override.yearlyPresent === 'number') {
        present = override.yearlyPresent;
      }

      let absent = row.yearlyAbsent;

      if (financialYear === '2025-26') {
        if (override && typeof override.yearlyPresent === 'number') {
          absent = Math.max(0, workingDaysYear - present);
        } else if (row.hasManualRecord) {
          absent = Math.max(0, workingDaysYear - present);
        } else {
          absent = 0;
        }
      }

      const pct =
        workingDaysYear > 0
          ? Math.max(0, Math.min(100, (present / workingDaysYear) * 100))
          : 0;

      return {
        ...row,
        yearlyPresent: present,
        yearlyAbsent: absent,
        yearlyPct: pct,
      };
    });

    return adjustedRows
      .filter((row) => {
        const search = filters.search.trim().toLowerCase();
        if (search) {
          const combined = `${row.empId} ${row.name}`.toLowerCase();
          if (!combined.includes(search)) return false;
        }
        if (filters.division !== 'all' && row.division !== filters.division) {
          return false;
        }
        if (filters.location !== 'all' && row.location !== filters.location) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const idA = String(a.empId).toLowerCase();
        const idB = String(b.empId).toLowerCase();
        if (idA < idB) return -1;
        if (idA > idB) return 1;
        return 0;
      });
  }, [rows, filters, rowOverrides, workingDaysYear, financialYear]);

  const handleDaysChange = (empId, field, value) => {
    if (financialYear !== '2025-26') {
      return;
    }
    const numeric = Number(value);
    const safeValue = Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;

    setRowOverrides((prev) => {
      const current = prev[empId] || {};
      return {
        ...prev,
        [empId]: {
          ...current,
          [field]: safeValue,
        },
      };
    });
  };

  const handleRefresh = () => {
    setRefreshToken((x) => x + 1);
  };

  const handleEditRow = (empId) => {
    if (financialYear !== '2025-26') return;
    setEditMap((prev) => ({ ...prev, [empId]: true }));
  };

  const handleCancelEdit = (empId) => {
    setEditMap((prev) => ({ ...prev, [empId]: false }));
    setRowOverrides((prev) => {
      const next = { ...prev };
      delete next[empId];
      return next;
    });
  };

  const handleSaveRow = async (row) => {
    if (financialYear !== '2025-26') return;
    const empId = row.empId;
    if (!empId) return;

    setSavingMap((prev) => ({ ...prev, [empId]: true }));
    try {
      await attendanceAPI.saveYearSummary(empId, {
        financialYear,
        yearlyPresent: row.yearlyPresent,
        yearlyAbsent: row.yearlyAbsent,
      });
    } catch (error) {
      console.error('Failed to save year summary', error);
      window.alert('Failed to save year summary');
    } finally {
      setSavingMap((prev) => ({ ...prev, [empId]: false }));
      setEditMap((prev) => ({ ...prev, [empId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8 font-sans p-8">
      <div className="w-full mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Employee Name / ID
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Users className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#262760] focus:border-[#262760] text-sm"
                  placeholder="Search by name or ID"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4 justify-end w-full md:w-auto">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-500 mr-2" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-600">Financial Year</span>
                <select
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="mt-1 rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] text-sm font-medium text-[#262760] py-1 pl-3 pr-8 cursor-pointer bg-white"
                >
                  {FINANCIAL_YEARS.map((fy) => (
                    <option key={fy} value={fy}>
                      {fy}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="w-full md:w-44">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Division
              </label>
              <select
                value={filters.division}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, division: e.target.value }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] text-sm"
              >
                <option value="all">All Divisions</option>
                {divisionOptions.map((division) => (
                  <option key={division} value={division}>
                    {division}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-44">
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center">
                <MapPin className="h-3 w-3 mr-1 text-gray-500" />
                Location
              </label>
              <select
                value={filters.location}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, location: e.target.value }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] text-sm"
              >
                <option value="all">All Locations</option>
                {locationOptions.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl shadow-sm border border-indigo-100 bg-indigo-50 p-4 text-indigo-900">
            <div className="text-[11px] font-semibold uppercase mb-1">
              Financial Year Working Days
            </div>
            <div className="text-2xl font-bold">{workingDaysYear}</div>
            <div className="text-sm mt-1 text-indigo-800/80">
              Monday to Friday between FY start and end.
            </div>
          </div>
          <div className="rounded-xl shadow-sm border border-amber-100 bg-amber-50 p-4 text-amber-900">
            <div className="text-[11px] font-semibold uppercase mb-1">
              Office Holidays (Year)
            </div>
            <div className="text-2xl font-bold">{officeHolidaysYear}</div>
            <div className="text-sm mt-1 text-amber-800/80">
              Weekends and other non-working days.
            </div>
          </div>
          <div className="rounded-xl shadow-sm border border-emerald-100 bg-emerald-50 p-4 text-emerald-900">
            <div className="text-[11px] font-semibold uppercase mb-1">
              Employees
            </div>
            <div className="text-2xl font-bold">{filteredRows.length}</div>
            <div className="text-sm mt-1 text-emerald-800/80">
              Matching current filters.
            </div>
          </div>
        </div>

        <div className="bg-white shadow border-b border-gray-200 sm:rounded-lg overflow-auto max-h-[75vh]">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading attendance summary...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#262760] sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    S.No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Employee Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Present Days (Year)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Absent Days (Year)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Yearly Attendance %
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-8 text-center text-sm text-gray-500"
                    >
                      No records found for current filters.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => {
                    const yearlyStatus =
                      row.yearlyPct >= 95
                        ? { label: 'Excellent', className: 'bg-green-100 text-green-800' }
                        : row.yearlyPct >= 85
                        ? { label: 'Good', className: 'bg-blue-100 text-blue-800' }
                        : row.yearlyPct >= 75
                        ? { label: 'Average', className: 'bg-yellow-100 text-yellow-800' }
                        : row.yearlyPct >= 60
                        ? { label: 'Needs Improvement', className: 'bg-orange-100 text-orange-800' }
                        : { label: 'Critical', className: 'bg-red-100 text-red-800' };

                    return (
                      <tr key={row.empId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {row.empId}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {row.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          <input
                            type="number"
                            min="0"
                            value={row.yearlyPresent}
                            onChange={(e) =>
                              handleDaysChange(row.empId, 'yearlyPresent', e.target.value)
                            }
                            disabled={financialYear !== '2025-26' || !editMap[row.empId]}
                            className={`w-20 px-2 py-1 border border-gray-300 rounded-md text-sm text-right ${
                              financialYear !== '2025-26' || !editMap[row.empId]
                                ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                                : ''
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {row.yearlyAbsent}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {row.yearlyPct.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${yearlyStatus.className}`}
                          >
                            {yearlyStatus.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {financialYear === '2025-26' ? (
                            editMap[row.empId] ? (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleSaveRow(row)}
                                  disabled={!!savingMap[row.empId]}
                                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-white bg-[#262760] hover:bg-[#1e2050] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {savingMap[row.empId] ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={() => handleCancelEdit(row.empId)}
                                  disabled={!!savingMap[row.empId]}
                                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditRow(row.empId)}
                                className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-[#262760] border border-[#262760] hover:bg-[#262760] hover:text-white"
                              >
                                Edit
                              </button>
                            )
                          ) : (
                            <span className="text-xs text-gray-400">Auto</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceSummary;

