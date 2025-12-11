import React, { useState } from 'react';

const LeaveSummary = () => {
  // Get current year and month
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12 for January-December
  
  // State for filters
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedLeaveType, setSelectedLeaveType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Generate years (current year and previous 5 years)
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);
  
  // Months
  const months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' }
  ];

  // Locations
  const locations = ['New York', 'London', 'Tokyo', 'Singapore', 'Bangalore', 'Sydney'];

  // Leave types
  const leaveTypes = ['Casual Leave', 'Sick Leave', 'Annual Leave', 'Emergency Leave', 'Maternity Leave', 'Paternity Leave'];

  // Status options
  const statusOptions = ['Approved', 'Pending', 'Rejected'];

  // Sample leave applications data
  const leaveApplications = [
    { 
      id: 'LA001', 
      employeeName: 'John Doe', 
      employeeId: 'EMP001',
      leaveType: 'Casual Leave',
      fromDate: '10-06-2024',
      toDate: '12-06-2024',
      days: 3,
      totalLeaveDays: 12,
      status: 'Approved',
      location: 'New York'
    },
    { 
      id: 'LA002', 
      employeeName: 'Jane Smith', 
      employeeId: 'EMP002',
      leaveType: 'Sick Leave',
      fromDate: '15-06-2024',
      toDate: '16-06-2024',
      days: 2,
      totalLeaveDays: 8,
      status: 'Pending',
      location: 'London'
    },
    { 
      id: 'LA003', 
      employeeName: 'Mike Johnson', 
      employeeId: 'EMP003',
      leaveType: 'Annual Leave',
      fromDate: '20-06-2024',
      toDate: '25-06-2024',
      days: 6,
      totalLeaveDays: 18,
      status: 'Approved',
      location: 'Tokyo'
    },
    { 
      id: 'LA004', 
      employeeName: 'Sarah Wilson', 
      employeeId: 'EMP004',
      leaveType: 'Emergency Leave',
      fromDate: '05-06-2024',
      toDate: '05-06-2024',
      days: 1,
      totalLeaveDays: 6,
      status: 'Rejected',
      location: 'Singapore'
    },
    { 
      id: 'LA005', 
      employeeName: 'David Brown', 
      employeeId: 'EMP005',
      leaveType: 'Casual Leave',
      fromDate: '18-06-2024',
      toDate: '19-06-2024',
      days: 2,
      totalLeaveDays: 10,
      status: 'Approved',
      location: 'Bangalore'
    },
    { 
      id: 'LA006', 
      employeeName: 'Priya Sharma', 
      employeeId: 'EMP006',
      leaveType: 'Annual Leave',
      fromDate: '01-07-2024',
      toDate: '05-07-2024',
      days: 5,
      totalLeaveDays: 15,
      status: 'Pending',
      location: 'Bangalore'
    },
    { 
      id: 'LA007', 
      employeeName: 'Amit Patel', 
      employeeId: 'EMP007',
      leaveType: 'Sick Leave',
      fromDate: '10-08-2024',
      toDate: '12-08-2024',
      days: 3,
      totalLeaveDays: 9,
      status: 'Approved',
      location: 'Singapore'
    },
    { 
      id: 'LA008', 
      employeeName: 'Emily Chen', 
      employeeId: 'EMP008',
      leaveType: 'Maternity Leave',
      fromDate: '01-09-2024',
      toDate: '31-12-2024',
      days: 90,
      totalLeaveDays: 90,
      status: 'Approved',
      location: 'Tokyo'
    },
  ];

  // Filter leave applications based on all filter criteria
  const filteredApplications = leaveApplications.filter(app => {
    // Get month from fromDate (format: DD-MM-YYYY)
    const fromMonth = parseInt(app.fromDate.split('-')[1]);
    
    // Match search term
    const matchesSearch = searchTerm === '' || 
      app.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Match year (extract year from fromDate)
    const fromYear = parseInt(app.fromDate.split('-')[2]);
    const matchesYear = selectedYear === 'all' || fromYear === selectedYear;
    
    // Match month
    const matchesMonth = selectedMonth === 'all' || fromMonth === selectedMonth;
    
    // Match employee ID
    const matchesEmployeeId = selectedEmployeeId === '' || 
      app.employeeId.toLowerCase().includes(selectedEmployeeId.toLowerCase());
    
    // Match leave type
    const matchesLeaveType = selectedLeaveType === 'all' || app.leaveType === selectedLeaveType;
    
    // Match location
    const matchesLocation = selectedLocation === 'all' || app.location === selectedLocation;
    
    // Match status
    const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus;
    
    return matchesSearch && matchesYear && matchesMonth && matchesEmployeeId && 
           matchesLeaveType && matchesLocation && matchesStatus;
  });

  // Calculate total leave days for filtered applications
  const totalLeaveDays = filteredApplications.reduce((sum, app) => sum + app.days, 0);

  // Handle filter reset
  const handleResetFilters = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
    setSelectedEmployeeId('');
    setSelectedLeaveType('all');
    setSelectedLocation('all');
    setSelectedStatus('all');
    setSearchTerm('');
  };

  // Handle approve/reject actions
  const handleApprove = (id) => {
    alert(`Leave application ${id} approved`);
  };

  const handleReject = (id) => {
    alert(`Leave application ${id} rejected`);
  };

  // Handle Excel download
  const handleDownloadExcel = () => {
    const selectedMonthName = months.find(m => m.value === selectedMonth)?.name || 'All Months';
    const data = filteredApplications.map(app => ({
      'S.No': filteredApplications.indexOf(app) + 1,
      'Employee ID': app.employeeId,
      'Employee Name': app.employeeName,
      'Leave Type': app.leaveType,
      'Start Date': app.fromDate,
      'End Date': app.toDate,
      'Days Count': app.days,
      'Total Leave Days': app.totalLeaveDays,
      'Status': app.status,
      'Location': app.location
    }));
    
    alert(`Downloading Excel report for ${selectedMonthName} ${selectedYear} (${data.length} records)`);
    console.log('Excel data:', data);
  };

  const containerStyle = {
    padding: '20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: '#f8f9fa',
    minHeight: '100vh'
  };

  const searchContainerStyle = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  };

  const searchBoxStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '20px'
  };

  const searchInputStyle = {
    padding: '12px 16px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
    flex: '1',
    boxSizing: 'border-box',
    backgroundColor: '#fdfdfd',
    transition: 'border 0.2s, box-shadow 0.2s'
  };

  const searchIconStyle = {
    fontSize: '18px',
    color: '#7f8c8d'
  };

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '25px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  };

  const filterGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '15px'
  };

  const filterGroupStyle = {
    marginBottom: '0'
  };

  const labelStyle = {
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '6px',
    display: 'block',
    color: '#34495e'
  };

  const inputStyle = {
    padding: '10px 12px',
    border: '1px solid #dfe6e9',
    borderRadius: '6px',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#fdfdfd',
    transition: 'border 0.2s'
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px'
  };

  const thStyle = {
    backgroundColor: '#f8f9fa',
    padding: '14px',
    textAlign: 'left',
    borderBottom: '2px solid #e9ecef',
    fontWeight: '600',
    fontSize: '14px',
    color: '#495057'
  };

  const tdStyle = {
    padding: '14px',
    borderBottom: '1px solid #e9ecef',
    fontSize: '14px',
    color: '#2c3e50'
  };

  const statusBadgeStyle = (status) => {
    const baseStyle = {
      padding: '5px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-block',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    };
    
    switch(status.toLowerCase()) {
      case 'approved':
        return { ...baseStyle, backgroundColor: '#e7f6ec', color: '#0a5c36' };
      case 'pending':
        return { ...baseStyle, backgroundColor: '#fff8e1', color: '#b36b00' };
      case 'rejected':
        return { ...baseStyle, backgroundColor: '#ffebee', color: '#c62828' };
      default:
        return { ...baseStyle, backgroundColor: '#f5f5f5', color: '#616161' };
    }
  };

  const buttonStyle = {
    padding: '7px 14px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    margin: '0 4px',
    transition: 'all 0.2s'
  };

  const approveButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#27ae60',
    color: 'white'
  };

  const rejectButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#e74c3c',
    color: 'white'
  };

  const resetButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#7f8c8d',
    color: 'white',
    padding: '10px 20px'
  };

  const downloadButtonStyle = {
    padding: '12px 24px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s'
  };

  const totalStyle = {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '6px',
    marginTop: '20px',
    fontSize: '16px',
    fontWeight: '600',
    textAlign: 'right',
    color: '#2c3e50',
    borderLeft: '4px solid #3498db'
  };

  const filterHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  };

  const filterTitleStyle = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: '0'
  };

  const resultsCountStyle = {
    fontSize: '13px',
    color: '#7f8c8d',
    backgroundColor: '#f8f9fa',
    padding: '5px 12px',
    borderRadius: '4px'
  };

  return (
    <div style={containerStyle}>
      {/* Search Box (Replaces Header) */}
      <div style={searchContainerStyle}>
        <div style={searchBoxStyle}>
          <div style={searchIconStyle}></div>
          <input
            type="text"
            placeholder="Search by employee name or ID..."
            style={searchInputStyle}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={(e) => {
              e.target.style.border = '1px solid #3498db';
              e.target.style.boxShadow = '0 0 0 2px rgba(52, 152, 219, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.border = '1px solid #e0e0e0';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button 
            style={resetButtonStyle}
            onClick={handleResetFilters}
            onMouseOver={(e) => e.target.style.backgroundColor = '#6c7a7d'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#7f8c8d'}
          >
            Reset Filters
          </button>
        </div>

        {/* Filters Grid */}
        <div style={filterGridStyle}>
          <div style={filterGroupStyle}>
            <label style={labelStyle}>Year</label>
            <select 
              style={selectStyle}
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              <option value="all">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div style={filterGroupStyle}>
            <label style={labelStyle}>Month</label>
            <select 
              style={selectStyle}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              <option value="all">All Months</option>
              {months.map(month => (
                <option key={month.value} value={month.value}>{month.name}</option>
              ))}
            </select>
          </div>
          
          <div style={filterGroupStyle}>
            <label style={labelStyle}>Employee ID</label>
            <input
              type="text"
              placeholder="Enter employee ID..."
              style={inputStyle}
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
            />
          </div>
          
          <div style={filterGroupStyle}>
            <label style={labelStyle}>Leave Type</label>
            <select 
              style={selectStyle}
              value={selectedLeaveType}
              onChange={(e) => setSelectedLeaveType(e.target.value)}
            >
              <option value="all">All Types</option>
              {leaveTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div style={filterGroupStyle}>
            <label style={labelStyle}>Location</label>
            <select 
              style={selectStyle}
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="all">All Locations</option>
              {locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
          
          <div style={filterGroupStyle}>
            <label style={labelStyle}>Status</label>
            <select 
              style={selectStyle}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Leave Applications Card */}
      <div style={cardStyle}>
        <div style={filterHeaderStyle}>
          <h2 style={filterTitleStyle}>Leave Applications</h2>
          <div style={resultsCountStyle}>
            Showing {filteredApplications.length} of {leaveApplications.length} applications
          </div>
        </div>

        {/* Leave Applications Table */}
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>S.No</th>
              <th style={thStyle}>Employee ID</th>
              <th style={thStyle}>Employee Name</th>
              <th style={thStyle}>Leave Type</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Leave Dates</th>
              <th style={thStyle}>Days Count</th>
              <th style={thStyle}>Total Leave Days ({selectedYear})</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredApplications.length > 0 ? (
              filteredApplications.map((app, index) => (
                <tr key={app.id}>
                  <td style={tdStyle}>{index + 1}</td>
                  <td style={tdStyle}>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: '600',
                      color: '#3498db'
                    }}>
                      {app.employeeId}
                    </span>
                  </td>
                  <td style={tdStyle}>{app.employeeName}</td>
                  <td style={tdStyle}>{app.leaveType}</td>
                  <td style={tdStyle}>
                    <span style={{
                      backgroundColor: '#f1f8ff',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}>
                      {app.location}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{fontSize: '13px'}}>
                      <div><strong>From:</strong> {app.fromDate}</div>
                      <div><strong>To:</strong> {app.toDate}</div>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      fontWeight: 'bold', 
                      color: '#2c3e50',
                      backgroundColor: '#f8f9fa',
                      padding: '5px 10px',
                      borderRadius: '4px',
                      display: 'inline-block',
                      minWidth: '40px',
                      textAlign: 'center'
                    }}>
                      {app.days}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      fontWeight: 'bold', 
                      color: '#27ae60',
                      backgroundColor: '#e7f6ec',
                      padding: '5px 12px',
                      borderRadius: '4px',
                      display: 'inline-block'
                    }}>
                      {app.totalLeaveDays} days
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={statusBadgeStyle(app.status)}>
                      {app.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {app.status === 'Pending' && (
                      <div>
                        <button 
                          style={approveButtonStyle}
                          onClick={() => handleApprove(app.id)}
                          onMouseOver={(e) => e.target.style.backgroundColor = '#219653'}
                          onMouseOut={(e) => e.target.style.backgroundColor = '#27ae60'}
                        >
                          Approve
                        </button>
                        <button 
                          style={rejectButtonStyle}
                          onClick={() => handleReject(app.id)}
                          onMouseOver={(e) => e.target.style.backgroundColor = '#c0392b'}
                          onMouseOut={(e) => e.target.style.backgroundColor = '#e74c3c'}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {app.status !== 'Pending' && (
                      <span style={{ color: '#95a5a6', fontSize: '13px' }}>Completed</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" style={{...tdStyle, textAlign: 'center', padding: '40px'}}>
                  <div style={{color: '#7f8c8d', fontSize: '16px'}}>
                    No leave applications found matching your filters.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Total Summary */}
        {filteredApplications.length > 0 && (
          <div style={totalStyle}>
            Total Leave Days for Filtered Results: {totalLeaveDays} days
          </div>
        )}

        {/* Download Excel Button */}
        <div style={{textAlign: 'right', marginTop: '30px'}}>
          <button 
            style={downloadButtonStyle}
            onClick={handleDownloadExcel}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2980b9'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3498db'}
          >
            Download Excel Report ({filteredApplications.length} records)
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveSummary;