import React, { useState, useEffect } from 'react';
import { adminTimesheetAPI } from '../../services/api';
import * as XLSX from 'xlsx';
import { 
  BarChart3, 
  Clock, 
  Users, 
  FolderOpen, 
  Calendar, 
  Filter, 
  Download, 
  RefreshCw, 
  X, 
  Loader2,
  TrendingUp
} from 'lucide-react';

const TimesheetSummary = () => {
  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    employee: 'All Employees',
    project: 'All Projects'
  });

  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState(['All Employees']);
  const [availableProjects, setAvailableProjects] = useState(['All Projects']);

  const defaultFilters = {
    year: new Date().getFullYear().toString(),
    employee: 'All Employees',
    project: 'All Projects'
  };

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const res = await adminTimesheetAPI.list({
          employeeId: '',
          division: 'All Division',
          location: 'All Locations',
          status: 'All Status',
          project: 'All Projects'
        });
        let rows = res.data?.data || [];
        rows = rows.filter(r => {
          const s = (r.status || '').toLowerCase();
          const includeStatus = s === 'submitted' || s === 'approved';
          const yearMatch = (r.week || '').startsWith(filters.year);
          return includeStatus && yearMatch;
        });
        const empSet = new Set();
        const projSet = new Set();
        rows.forEach(r => {
          if (r.employeeName) empSet.add(r.employeeName);
          (r.timeEntries || []).forEach(te => {
            const p = (te.project || '').trim();
            const taskVal = (te.task || '').toLowerCase();
            if (p && p.toLowerCase() !== 'leave' && !taskVal.includes('holiday') && !taskVal.includes('leave')) {
              projSet.add(p);
            }
          });
        });
        setAvailableEmployees(['All Employees', ...Array.from(empSet).sort()]);
        setAvailableProjects(['All Projects', ...Array.from(projSet).sort()]);
      } catch {
        setAvailableEmployees(['All Employees']);
        setAvailableProjects(['All Projects']);
      }
    };
    loadOptions();
  }, [filters.year]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setSummaryData(null);
  };

  const handleLoadSummary = async () => {
    try {
      setIsLoading(true);
      const listRes = await adminTimesheetAPI.list({
        employeeId: '',
        division: 'All Division',
        location: 'All Locations',
        status: 'All Status',
        project: filters.project
      });
      let rows = listRes.data?.data || [];

      rows = rows.filter(r => {
        const yearMatch = (r.week || '').startsWith(filters.year);
        const empMatch = (filters.employee === 'All Employees') || (r.employeeName === filters.employee);
        const projMatch = (filters.project === 'All Projects') || ((r.timeEntries || []).some(te => (te.project || '').trim() === filters.project));
        return yearMatch && empMatch && projMatch;
      });

      const isExcludedEntry = (te) => {
        const project = (te?.project || '').trim().toLowerCase();
        const task = (te?.task || '').trim().toLowerCase();
        if (!project) return true;
        if (project === 'leave') return true;
        if (task.includes('holiday')) return true;
        if (task.includes('leave')) return true;
        return false;
      };

      const entryHours = (te) => Number(te?.total || 0);

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyMap = new Map(monthNames.map(m => [m, { month: m, hours: 0, employees: 0 }]));
      const employeesPerMonth = new Map(monthNames.map(m => [m, new Set()]));

      rows.forEach(r => {
        const d = r.submittedDate ? new Date(r.submittedDate) : null;
        const m = d ? monthNames[d.getMonth()] : null;
        if (m) {
          let monthHours = 0;
          (r.timeEntries || []).forEach(te => {
            if (isExcludedEntry(te)) return;
            if (filters.project !== 'All Projects' && (te.project || '').trim() !== filters.project) return;
            monthHours += entryHours(te);
          });
          if (monthHours > 0) {
            const v = monthlyMap.get(m);
            v.hours += monthHours;
            monthlyMap.set(m, v);
            const set = employeesPerMonth.get(m);
            if (r.employeeId) set.add(r.employeeId);
          }
        }
      });
      monthNames.forEach(m => {
        const v = monthlyMap.get(m);
        v.employees = (employeesPerMonth.get(m) || new Set()).size;
        monthlyMap.set(m, v);
      });

      const projectEmpMap = new Map();
      rows.forEach(r => {
        (r.timeEntries || []).forEach(te => {
          if (isExcludedEntry(te)) return;
          if (filters.project !== 'All Projects' && (te.project || '').trim() !== filters.project) return;
          const key = `${te.project}||${r.employeeId}||${r.employeeName}`;
          const prev = projectEmpMap.get(key) || 0;
          projectEmpMap.set(key, prev + entryHours(te));
        });
      });
      const projectEmployeeSummary = Array.from(projectEmpMap.entries()).map(([key, total]) => {
        const [project, employeeId, employeeName] = key.split('||');
        return { project, employeeId, employeeName, totalHours: total };
      });

      let totalHours = 0;
      const employeeSet = new Set();
      const projectSet = new Set();
      rows.forEach(r => {
        let rowHasHours = false;
        (r.timeEntries || []).forEach(te => {
          if (isExcludedEntry(te)) return;
          if (filters.project !== 'All Projects' && (te.project || '').trim() !== filters.project) return;
          const h = entryHours(te);
          if (h > 0) {
            totalHours += h;
            rowHasHours = true;
          }
          const p = (te.project || '').trim();
          if (p) projectSet.add(p);
        });
        if (rowHasHours && r.employeeId) employeeSet.add(r.employeeId);
      });
      const totalEmployeesCount = employeeSet.size;
      const totalProjectsCount = projectSet.size;
      const averageHoursPerEmployee = totalEmployeesCount > 0 ? totalHours / totalEmployeesCount : 0;

      setSummaryData({
        totalHours: Number(totalHours || 0),
        totalEmployees: totalEmployeesCount,
        totalProjects: totalProjectsCount,
        averageHoursPerEmployee: Number(averageHoursPerEmployee || 0),
        monthlyData: Array.from(monthlyMap.values()),
        projectEmployeeSummary
      });
    } catch (e) {
      setSummaryData({
        totalHours: 0,
        totalEmployees: 0,
        totalProjects: 0,
        averageHoursPerEmployee: 0,
        monthlyData: [],
        projectEmployeeSummary: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportToExcel = () => {
    if (!summaryData) {
      alert('Please load summary data before exporting.');
      return;
    }

    const workbook = XLSX.utils.book_new();

    const safeToken = (v) =>
      String(v || '')
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 40) || 'All';

    const generatedOn = new Date();

    const summarySheetData = [
      ['Timesheet Summary'],
      [],
      ['Year', filters.year],
      ['Employee', filters.employee],
      ['Project', filters.project],
      ['Generated On', generatedOn.toLocaleString()],
      [],
      ['Metric', 'Value'],
      ['Total Hours (HH:MM)', formatHours(summaryData.totalHours)],
      ['Total Hours (Decimal)', Number(summaryData.totalHours || 0)],
      ['Total Employees', Number(summaryData.totalEmployees || 0)],
      ['Total Projects', Number(summaryData.totalProjects || 0)],
      ['Avg Hours/Employee (HH:MM)', formatHours(summaryData.averageHoursPerEmployee)],
      ['Avg Hours/Employee (Decimal)', Number(summaryData.averageHoursPerEmployee || 0)]
    ];

    const summaryWs = XLSX.utils.aoa_to_sheet(summarySheetData);
    summaryWs['!cols'] = [{ wch: 22 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, summaryWs, 'Summary');

    const monthlyData = Array.isArray(summaryData.monthlyData) ? summaryData.monthlyData : [];
    const monthlySheetData = [
      ['Month', 'Total Hours (Decimal)', 'Total Hours (HH:MM)', 'Employees']
    ];
    monthlyData.forEach((m) => {
      monthlySheetData.push([
        m.month || '',
        Number(m.hours || 0),
        formatHours(m.hours),
        Number(m.employees || 0)
      ]);
    });

    const monthlyWs = XLSX.utils.aoa_to_sheet(monthlySheetData);
    monthlyWs['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, monthlyWs, 'Monthly');

    const projectEmployeeRows = Array.isArray(summaryData.projectEmployeeSummary)
      ? [...summaryData.projectEmployeeSummary]
      : [];
    projectEmployeeRows.sort((a, b) => {
      const p = String(a.project || '').localeCompare(String(b.project || ''));
      if (p !== 0) return p;
      const e = String(a.employeeId || '').localeCompare(String(b.employeeId || ''));
      if (e !== 0) return e;
      return String(a.employeeName || '').localeCompare(String(b.employeeName || ''));
    });

    const projectEmployeeSheetData = [
      ['Project', 'Employee ID', 'Employee Name', 'Total Hours (Decimal)', 'Total Hours (HH:MM)']
    ];
    projectEmployeeRows.forEach((row) => {
      projectEmployeeSheetData.push([
        row.project || '',
        row.employeeId || '',
        row.employeeName || '',
        Number(row.totalHours || 0),
        formatHours(row.totalHours)
      ]);
    });

    const projectEmployeeWs = XLSX.utils.aoa_to_sheet(projectEmployeeSheetData);
    projectEmployeeWs['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 26 }, { wch: 22 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, projectEmployeeWs, 'Project_Employee');

    const fileName = [
      'Timesheet_Summary',
      safeToken(filters.year),
      safeToken(filters.employee),
      safeToken(filters.project),
      generatedOn.toISOString().split('T')[0]
    ].join('_') + '.xlsx';

    XLSX.writeFile(workbook, fileName);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  const maxMonthlyHours = (summaryData?.monthlyData || []).reduce(
    (max, m) => Math.max(max, Number(m.hours || 0)),
    0
  );

  const formatHours = (h) => {
    const val = Number(h || 0);
    const totalMinutes = Math.round(val * 60);
    const sign = totalMinutes < 0 ? "-" : "";
    const absMinutes = Math.abs(totalMinutes);
    const hh = String(Math.floor(absMinutes / 60)).padStart(2, "0");
    const mm = String(absMinutes % 60).padStart(2, "0");
    return `${sign}${hh}:${mm}`;
  };

  const isFiltersModified =
    filters.year !== defaultFilters.year ||
    filters.employee !== defaultFilters.employee ||
    filters.project !== defaultFilters.project;

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-6 font-sans text-slate-800">
      
      {/* Top Header Card */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-950/5 border border-slate-200/80 p-5 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-[#262760] to-[#3a3c8c] text-white rounded-2xl shadow-md shadow-indigo-900/20">
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-indigo-950 tracking-tight">Timesheet Summary & Analytics</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isFiltersModified && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all border border-rose-200 flex items-center gap-1.5"
            >
              <X size={15} />
              Clear Filters
            </button>
          )}

          <button
            onClick={handleLoadSummary}
            disabled={isLoading}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs font-bold hover:scale-[1.02] transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw size={15} />
                Load Summary
              </>
            )}
          </button>

          {summaryData && (
            <button
              onClick={handleExportToExcel}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold hover:scale-[1.02] transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2"
            >
              <Download size={15} />
              Export to Excel
            </button>
          )}
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-950/5 border border-slate-200/80 p-5 space-y-4">
        <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm pb-2 border-b border-slate-200">
          <Filter size={16} className="text-indigo-600" />
          Summary Filters
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-400" /> Select Year
            </label>
            <select
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Users size={13} className="text-slate-400" /> Employees
            </label>
            <select
              value={filters.employee}
              onChange={(e) => handleFilterChange('employee', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            >
              {availableEmployees.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <FolderOpen size={13} className="text-slate-400" /> Projects
            </label>
            <select
              value={filters.project}
              onChange={(e) => handleFilterChange('project', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            >
              {availableProjects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {summaryData ? (
        <div className="space-y-6">
          
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Hours */}
            <div className="bg-gradient-to-br from-indigo-900 via-[#1e1b4b] to-[#262760] p-5 rounded-2xl text-white shadow-xl shadow-indigo-950/10 border border-indigo-500/20 relative overflow-hidden group hover:scale-[1.01] transition-all">
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-indigo-200/80">Total Logged Hours</p>
                  <h3 className="text-3xl font-extrabold mt-1 text-white">{formatHours(summaryData.totalHours)}</h3>
                </div>
                <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-indigo-300">
                  <Clock size={24} />
                </div>
              </div>
            </div>

            {/* Total Employees */}
            <div className="bg-gradient-to-br from-purple-900 via-[#3b0764] to-[#581c87] p-5 rounded-2xl text-white shadow-xl shadow-purple-950/10 border border-purple-500/20 relative overflow-hidden group hover:scale-[1.01] transition-all">
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-purple-200/80">Active Employees</p>
                  <h3 className="text-3xl font-extrabold mt-1 text-white">{summaryData.totalEmployees}</h3>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-xl border border-purple-400/30 text-purple-300">
                  <Users size={24} />
                </div>
              </div>
            </div>

            {/* Total Projects */}
            <div className="bg-gradient-to-br from-blue-900 via-[#172554] to-[#1e3a8a] p-5 rounded-2xl text-white shadow-xl shadow-blue-950/10 border border-blue-500/20 relative overflow-hidden group hover:scale-[1.01] transition-all">
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-blue-200/80">Active Projects</p>
                  <h3 className="text-3xl font-extrabold mt-1 text-white">{summaryData.totalProjects}</h3>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-400/30 text-blue-300">
                  <FolderOpen size={24} />
                </div>
              </div>
            </div>

            {/* Avg Hours / Employee */}
            <div className="bg-gradient-to-br from-emerald-900 via-[#064e3b] to-[#047857] p-5 rounded-2xl text-white shadow-xl shadow-emerald-950/10 border border-emerald-500/20 relative overflow-hidden group hover:scale-[1.01] transition-all">
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-200/80">Avg Hours / Employee</p>
                  <h3 className="text-3xl font-extrabold mt-1 text-white">{formatHours(summaryData.averageHoursPerEmployee)}</h3>
                </div>
                <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-400/30 text-emerald-300">
                  <TrendingUp size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Hours Distribution Chart Card */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-950/5 border border-slate-200/80 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-950 font-extrabold text-sm uppercase tracking-wider">
                <BarChart3 size={18} className="text-indigo-600" />
                Monthly Hours Distribution ({filters.year})
              </div>
              <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                Max Monthly: {formatHours(maxMonthlyHours)}
              </span>
            </div>

            {/* Bar Chart Representation */}
            <div className="flex items-end justify-between gap-2 md:gap-4 h-56 pt-6 pb-2 px-2 bg-slate-50/70 rounded-xl border border-slate-200/60">
              {summaryData.monthlyData.map((monthData) => {
                const heightPercent = maxMonthlyHours > 0
                  ? Math.min((Number(monthData.hours || 0) / maxMonthlyHours) * 100, 100)
                  : 0;

                return (
                  <div key={monthData.month} className="flex-1 flex flex-col items-center h-full justify-end group">
                    {/* Hour Tooltip pill */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-1 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-mono shadow-md">
                      {formatHours(monthData.hours)}
                    </div>
                    
                    {/* Bar Container */}
                    <div className="w-full max-w-[36px] bg-slate-200/80 rounded-t-xl h-44 flex items-end overflow-hidden">
                      <div
                        className="w-full bg-gradient-to-t from-indigo-800 via-indigo-600 to-purple-600 rounded-t-xl transition-all duration-500 group-hover:brightness-110"
                        style={{ height: `${heightPercent}%` }}
                      ></div>
                    </div>

                    <span className="text-xs font-bold text-slate-700 mt-2">{monthData.month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Project-wise Employee Summary Table Card */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-950/5 border border-slate-200/80 overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FolderOpen size={18} className="text-indigo-600" />
                <h2 className="text-sm font-bold text-indigo-950 uppercase tracking-wider">Project-wise Employee Summary</h2>
                <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-extrabold border border-indigo-200">
                  {summaryData.projectEmployeeSummary.length} breakdown records
                </span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-left border-collapse text-xs font-medium">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-[#1e1b4b] via-[#262760] to-[#2e3078] text-white font-bold uppercase tracking-wider">
                    <th className="p-3.5 pl-5">Project</th>
                    <th className="p-3.5">Employee ID</th>
                    <th className="p-3.5">Employee Name</th>
                    <th className="p-3.5 text-center pr-5">Total Hours (HH:MM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaryData.projectEmployeeSummary.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-slate-500 font-semibold">
                        No project employee summary records found.
                      </td>
                    </tr>
                  ) : (
                    summaryData.projectEmployeeSummary.map((item, index) => (
                      <tr key={index} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="p-3.5 pl-5 font-bold text-indigo-950">{item.project}</td>
                        <td className="p-3.5 font-bold text-indigo-600">{item.employeeId}</td>
                        <td className="p-3.5 text-slate-800 font-medium">{item.employeeName}</td>
                        <td className="p-3.5 pr-5 text-center font-bold font-mono text-emerald-700 text-sm">
                          {formatHours(item.totalHours)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        /* Empty State Card */
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-950/5 border border-slate-200/80 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 flex items-center justify-center mx-auto shadow-inner">
            <BarChart3 size={32} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-indigo-950">No Analytics Loaded Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Select your desired Year, Employee, or Project filters above and click <span className="font-bold text-indigo-700">"Load Summary"</span> to generate summary metrics and distribution charts.
            </p>
          </div>
          <button
            onClick={handleLoadSummary}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs font-bold hover:scale-[1.02] transition-all shadow-md shadow-indigo-600/20 inline-flex items-center gap-2"
          >
            <RefreshCw size={15} />
            Load Summary Now
          </button>
        </div>
      )}

    </div>
  );
};

export default TimesheetSummary;
