import React, { useState } from 'react';

const TimesheetSummary = () => {
  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    employee: 'All Employees',
    project: 'All Projects'
  });

  const [summaryData, setSummaryData] = useState(null);

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
      alignItems: 'flex-end'
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

  const handleLoadSummary = () => {
    // Simulate loading summary data with new table structure
    const mockData = {
      totalHours: 2840,
      totalEmployees: 45,
      totalProjects: 12,
      averageHoursPerEmployee: 63.1,
      monthlyData: [
        { month: 'Jan', hours: 220, employees: 40 },
        { month: 'Feb', hours: 240, employees: 42 },
        { month: 'Mar', hours: 260, employees: 43 },
        { month: 'Apr', hours: 280, employees: 44 },
        { month: 'May', hours: 300, employees: 45 },
        { month: 'Jun', hours: 320, employees: 45 },
        { month: 'Jul', hours: 310, employees: 44 },
        { month: 'Aug', hours: 290, employees: 43 },
        { month: 'Sep', hours: 270, employees: 42 },
        { month: 'Oct', hours: 250, employees: 41 },
        { month: 'Nov', hours: 230, employees: 40 },
        { month: 'Dec', hours: 210, employees: 40 }
      ],
      // New data structure for the detailed table
      projectEmployeeSummary: [
        { project: 'Project Alpha', employeeId: 'EMP001', employeeName: 'John Doe', totalHours: 120 },
        { project: 'Project Alpha', employeeId: 'EMP004', employeeName: 'Sarah Wilson', totalHours: 95 },
        { project: 'Project Alpha', employeeId: 'EMP007', employeeName: 'David Brown', totalHours: 85 },
        { project: 'Project Beta', employeeId: 'EMP002', employeeName: 'Jane Smith', totalHours: 150 },
        { project: 'Project Beta', employeeId: 'EMP001', employeeName: 'John Doe', totalHours: 65 },
        { project: 'Project Beta', employeeId: 'EMP005', employeeName: 'Robert Taylor', totalHours: 110 },
        { project: 'Project Gamma', employeeId: 'EMP003', employeeName: 'Mike Johnson', totalHours: 180 },
        { project: 'Project Gamma', employeeId: 'EMP002', employeeName: 'Jane Smith', totalHours: 45 },
        { project: 'Project Gamma', employeeId: 'EMP006', employeeName: 'Emily Davis', totalHours: 75 }
      ]
    };
    setSummaryData(mockData);
  };

  const handleExportToExcel = () => {
    console.log('Exporting to Excel with filters:', filters);
    alert('Export functionality would be implemented here');
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

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
            <option>All Employees</option>
            <option>Development Team</option>
            <option>Design Team</option>
            <option>Marketing Team</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Projects</label>
          <select
            value={filters.project}
            onChange={(e) => handleFilterChange('project', e.target.value)}
            style={styles.filterSelect}
          >
            <option>All Projects</option>
            <option>Project Alpha</option>
            <option>Project Beta</option>
            <option>Project Gamma</option>
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
                        height: `${(monthData.hours / 400) * 100}%`
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