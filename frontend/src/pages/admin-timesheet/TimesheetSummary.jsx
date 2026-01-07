import React, { useState, useEffect } from 'react';
import { adminTimesheetAPI } from '../../services/api';

const TimesheetSummary = () => {
  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    employee: 'All Employees',
    project: 'All Projects'
  });

  const [summaryData, setSummaryData] = useState(null);
  const [availableEmployees, setAvailableEmployees] = useState(['All Employees']);
  const [availableProjects, setAvailableProjects] = useState(['All Projects']);

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

  const styles = {
    timesheetSummary: {
      background: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      fontFamily: 'Arial, sans-serif'
    },
    title: {
      margin: '0 0 20px 0',
      color: '#333',
      fontSize: '24px',
      fontWeight: 'bold'
    },
    summaryFilters: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginBottom: '30px',
      padding: '20px',
      background: '#f8f9fa',
      borderRadius: '8px'
    },
    filterGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    filterLabel: {
      marginBottom: '5px',
      fontWeight: '500',
      color: '#555',
      fontSize: '14px'
    },
    filterSelect: {
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      backgroundColor: 'white'
    },
    loadSummaryBtn: {
      background: '#1976d2',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: '500',
      alignSelf: 'end',
      fontSize: '14px',
      transition: 'all 0.2s ease'
    },
    exportExcelBtn: {
      background: '#28a745',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: '500',
      alignSelf: 'end',
      fontSize: '14px',
      transition: 'all 0.2s ease'
    },
    noData: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#666',
      fontSize: '16px'
    },
    summaryContent: {
      animation: 'fadeIn 0.5s ease-in'
    },
    summaryStats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    },
    summaryStat: {
      background: '#f8f9fa',
      padding: '20px',
      borderRadius: '8px',
      textAlign: 'center',
      borderLeft: '4px solid #1976d2'
    },
    summaryStatTitle: {
      margin: '0 0 10px 0',
      color: '#666',
      fontSize: '14px',
      fontWeight: '500'
    },
    summaryStatValue: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#333'
    },
    monthlyChart: {
      background: '#f8f9fa',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '30px'
    },
    chartTitle: {
      margin: '0 0 20px 0',
      color: '#333',
      fontSize: '18px',
      fontWeight: '600'
    },
    chartBars: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      height: '200px',
      padding: '20px 0'
    },
    chartBarContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      flex: 1,
      margin: '0 5px'
    },
    chartBar: {
      height: '150px',
      width: '30px',
      background: '#e9ecef',
      borderRadius: '4px 4px 0 0',
      position: 'relative',
      display: 'flex',
      alignItems: 'flex-end',
      overflow: 'hidden'
    },
    barFill: {
      background: '#1976d2',
      width: '100%',
      borderRadius: '4px 4px 0 0',
      transition: 'height 0.3s ease'
    },
    barLabel: {
      marginTop: '10px',
      fontSize: '12px',
      color: '#666'
    },
    barValue: {
      marginTop: '5px',
      fontSize: '11px',
      color: '#999'
    },
    detailedTable: {
      overflowX: 'auto'
    },
    summaryTable: {
      width: '100%',
      borderCollapse: 'collapse',
      border: '1px solid #e2e8f0'
    },
    summaryTableHeader: {
      padding: '12px',
      textAlign: 'left',
      borderBottom: '1px solid #e2e8f0',
      backgroundColor: '#1976d2',
      fontWeight: '600',
      color: 'white',
      fontSize: '14px',
      borderRight: '1px solid #1565c0'
    },
    summaryTableCell: {
      padding: '12px',
      textAlign: 'left',
      borderBottom: '1px solid #e2e8f0',
      fontSize: '14px'
    },
    summaryTableRow: {
      transition: 'all 0.2s ease',
      '&:hover': {
        backgroundColor: '#f7fafc'
      }
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleLoadSummary = async () => {
    try {
      const summaryRes = await adminTimesheetAPI.summary({
        year: filters.year,
        employee: filters.employee,
        project: filters.project
      });
      const summary = summaryRes.data?.summary || { totalHours: 0, totalEmployees: [], totalProjects: [] };

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

      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const monthlyMap = new Map(monthNames.map(m => [m, { month: m, hours: 0, employees: 0 }]));
      const employeesPerMonth = new Map(monthNames.map(m => [m, new Set()]));

      rows.forEach(r => {
        const d = r.submittedDate ? new Date(r.submittedDate) : null;
        const m = d ? monthNames[d.getMonth()] : null;
        if (m) {
          const v = monthlyMap.get(m);
          v.hours += Number(r.weeklyTotal || 0);
          monthlyMap.set(m, v);
          const set = employeesPerMonth.get(m);
          if (r.employeeId) set.add(r.employeeId);
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
          const key = `${te.project}||${r.employeeId}||${r.employeeName}`;
          const prev = projectEmpMap.get(key) || 0;
          projectEmpMap.set(key, prev + Number(te.total || 0));
        });
      });
      const projectEmployeeSummary = Array.from(projectEmpMap.entries()).map(([key, total]) => {
        const [project, employeeId, employeeName] = key.split('||');
        return { project, employeeId, employeeName, totalHours: total };
      });

      const totalEmployeesCount = Array.isArray(summary.totalEmployees) ? summary.totalEmployees.length : 0;
      let totalProjectsCount = 0;
      if (Array.isArray(summary.totalProjects)) {
        const flat = new Set();
        summary.totalProjects.forEach(v => {
          if (Array.isArray(v)) v.forEach(p => flat.add(p));
          else if (v) flat.add(v);
        });
        totalProjectsCount = flat.size;
      }

      const averageHoursPerEmployee = totalEmployeesCount > 0 ? Number(summary.totalHours || 0) / totalEmployeesCount : 0;

      setSummaryData({
        totalHours: Number(summary.totalHours || 0),
        totalEmployees: totalEmployeesCount,
        totalProjects: totalProjectsCount,
        averageHoursPerEmployee: Number(averageHoursPerEmployee.toFixed(1)),
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
    }
  };

  const handleExportToExcel = () => {
    console.log('Exporting to Excel with filters:', filters);
    alert('Export functionality would be implemented here');
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  const maxMonthlyHours = (summaryData?.monthlyData || []).reduce(
    (max, m) => Math.max(max, Number(m.hours || 0)),
    0
  );

  return (
    <div style={styles.timesheetSummary}>
      <h2 style={styles.title}>Yearly Timesheet Summary</h2>
      
      <div style={styles.summaryFilters}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Select Year</label>
          <select
            value={filters.year}
            onChange={(e) => handleFilterChange('year', e.target.value)}
            style={styles.filterSelect}
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Employees</label>
          <select
            value={filters.employee}
            onChange={(e) => handleFilterChange('employee', e.target.value)}
            style={styles.filterSelect}
          >
            {availableEmployees.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Projects</label>
          <select
            value={filters.project}
            onChange={(e) => handleFilterChange('project', e.target.value)}
            style={styles.filterSelect}
          >
            {availableProjects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <button 
          style={styles.loadSummaryBtn}
          onClick={handleLoadSummary}
          onMouseOver={(e) => e.target.style.background = '#1565c0'}
          onMouseOut={(e) => e.target.style.background = '#1976d2'}
        >
          Load Summary
        </button>

        <button 
          style={styles.exportExcelBtn}
          onClick={handleExportToExcel}
          onMouseOver={(e) => e.target.style.background = '#218838'}
          onMouseOut={(e) => e.target.style.background = '#28a745'}
        >
          Export to Excel
        </button>
      </div>

      {summaryData ? (  
        <div style={styles.summaryContent}>
          <div style={styles.summaryStats}>
            <div style={styles.summaryStat}>
              <h3 style={styles.summaryStatTitle}>Total Hours</h3>
              <div style={styles.summaryStatValue}>{summaryData.totalHours.toLocaleString()}</div>
            </div>
            <div style={styles.summaryStat}>
              <h3 style={styles.summaryStatTitle}>Total Employees</h3>
              <div style={styles.summaryStatValue}>{summaryData.totalEmployees}</div>
            </div>
            <div style={styles.summaryStat}>
              <h3 style={styles.summaryStatTitle}>Total Projects</h3>
              <div style={styles.summaryStatValue}>{summaryData.totalProjects}</div>
            </div>
            <div style={styles.summaryStat}>
              <h3 style={styles.summaryStatTitle}>Avg Hours/Employee</h3>
              <div style={styles.summaryStatValue}>{summaryData.averageHoursPerEmployee}</div>
            </div>
          </div>

          <div style={styles.monthlyChart}>
            <h3 style={styles.chartTitle}>Monthly Hours Distribution</h3>
            <div style={styles.chartBars}>
              {summaryData.monthlyData.map((monthData, index) => (
                <div key={monthData.month} style={styles.chartBarContainer}>
                  <div style={styles.chartBar}>
                    <div 
                      style={{
                        ...styles.barFill,
                        height: `${
                          maxMonthlyHours > 0
                            ? Math.min((Number(monthData.hours || 0) / maxMonthlyHours) * 100, 100)
                            : 0
                        }%`
                      }}
                    ></div>
                  </div>
                  <span style={styles.barLabel}>{monthData.month}</span>
                  <span style={styles.barValue}>{monthData.hours}h</span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.detailedTable}>
            <h3 style={styles.chartTitle}>Project-wise Employee Summary</h3>
            <table style={styles.summaryTable}>
              <thead>
                <tr>
                  <th style={styles.summaryTableHeader}>Project</th>
                  <th style={styles.summaryTableHeader}>Employee ID</th>
                  <th style={styles.summaryTableHeader}>Employee Name</th>
                  <th style={styles.summaryTableHeader}>Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.projectEmployeeSummary.map((item, index) => (
                  <tr key={index} style={styles.summaryTableRow}>
                    <td style={styles.summaryTableCell}>{item.project}</td>
                    <td style={styles.summaryTableCell}>
                      <span style={{color: '#1976d2', fontWeight: '500'}}>
                        {item.employeeId}
                      </span>
                    </td>
                    <td style={styles.summaryTableCell}>{item.employeeName}</td>
                    <td style={styles.summaryTableCell}>
                      <span style={{fontWeight: '600'}}>{item.totalHours}h</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={styles.noData}>
          <p>No data loaded yet</p>
          <p>Use the filters above and click "Load Summary" to view data</p>
        </div>
      )}
    </div>
  );
};

export default TimesheetSummary;
