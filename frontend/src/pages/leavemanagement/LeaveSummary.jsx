import React, { useState } from 'react';

const LeaveSummary = () => {
  // Get current year and month
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  
  const [selectedMonth, setSelectedMonth] = useState(`${currentMonth} ${currentYear}`);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Generate months for current year
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ].map(month => `${month} ${currentYear}`);

  // Sample leave applications data with total leave days per employee
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
    },
  ];

  // Filter leave applications based on search term
  const filteredApplications = leaveApplications.filter(app => 
    app.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate total leave days for all applications
  const totalLeaveDays = filteredApplications.reduce((sum, app) => sum + app.days, 0);

  // Handle approve/reject actions
  const handleApprove = (id) => {
    alert(`Leave application ${id} approved`);
  };

  const handleReject = (id) => {
    alert(`Leave application ${id} rejected`);
  };

  // Handle Excel download
  const handleDownloadExcel = () => {
    const data = filteredApplications.map(app => ({
      'S.No': filteredApplications.indexOf(app) + 1,
      'Employee ID': app.employeeId,
      'Employee Name': app.employeeName,
      'Leave Type': app.leaveType,
      'Start Date': app.fromDate,
      'End Date': app.toDate,
      'Days Count': app.days,
      'Total Leave Days': app.totalLeaveDays,
      'Status': app.status
    }));
    
    alert(`Downloading Excel report for ${selectedMonth} (${data.length} records)`);
    console.log('Excel data:', data);
  };

  const containerStyle = {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  };

  const headerStyle = {
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px'
  };

  const titleStyle = {
    fontSize: '24px',
    margin: '0 0 10px 0'
  };

  const subtitleStyle = {
    fontSize: '14px',
    opacity: '0.8',
    margin: '0'
  };

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const filterRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '20px'
  };

  const labelStyle = {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '5px',
    display: 'block'
  };

  const selectStyle = {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    width: '200px'
  };

  const inputStyle = {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    width: '300px'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px'
  };

  const thStyle = {
    backgroundColor: '#f8f9fa',
    padding: '12px',
    textAlign: 'left',
    borderBottom: '2px solid #dee2e6',
    fontWeight: 'bold',
    fontSize: '14px'
  };

  const tdStyle = {
    padding: '12px',
    borderBottom: '1px solid #dee2e6',
    fontSize: '14px'
  };

  const statusBadgeStyle = (status) => {
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold',
      display: 'inline-block'
    };
    
    switch(status.toLowerCase()) {
      case 'approved':
        return { ...baseStyle, backgroundColor: '#d4edda', color: '#155724' };
      case 'pending':
        return { ...baseStyle, backgroundColor: '#fff3cd', color: '#856404' };
      case 'rejected':
        return { ...baseStyle, backgroundColor: '#f8d7da', color: '#721c24' };
      default:
        return { ...baseStyle, backgroundColor: '#e9ecef', color: '#495057' };
    }
  };

  const buttonStyle = {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    margin: '0 4px'
  };

  const approveButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#28a745',
    color: 'white'
  };

  const rejectButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#dc3545',
    color: 'white'
  };

  const downloadButtonStyle = {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    marginTop: '20px'
  };

  const totalStyle = {
    backgroundColor: '#e9ecef',
    padding: '12px',
    borderRadius: '4px',
    marginTop: '20px',
    fontSize: '16px',
    fontWeight: 'bold',
    textAlign: 'right'
  };

  return (
    <div style={containerStyle}>
      

      {/* Filters Card */}
      <div style={cardStyle}>
        <div style={filterRowStyle}>
          <div>
            <label style={labelStyle}>Select Month</label>
            <select 
              style={selectStyle}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {months.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={labelStyle}>Search Employee</label>
            <input
              type="text"
              placeholder="Search by name or ID..."
              style={inputStyle}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
              <th style={thStyle}>Leave Dates (Start - End)</th>
              <th style={thStyle}>Days Count</th>
              <th style={thStyle}>Total Leave Days ({currentYear})</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredApplications.map((app, index) => (
              <tr key={app.id}>
                <td style={tdStyle}>{index + 1}</td>
                <td style={tdStyle}>{app.employeeId}</td>
                <td style={tdStyle}>{app.employeeName}</td>
                <td style={tdStyle}>{app.leaveType}</td>
                <td style={tdStyle}>
                  {app.fromDate} to {app.toDate}
                </td>
                <td style={tdStyle}>{app.days}</td>
                <td style={tdStyle}>
                  <span style={{
                    fontWeight: 'bold', 
                    color: '#2c3e50',
                    backgroundColor: '#f0f8ff',
                    padding: '4px 8px',
                    borderRadius: '4px'
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
                    <>
                      <button 
                        style={approveButtonStyle}
                        onClick={() => handleApprove(app.id)}
                      >
                        Approve
                      </button>
                      <button 
                        style={rejectButtonStyle}
                        onClick={() => handleReject(app.id)}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {app.status !== 'Pending' && (
                    <span style={{ color: '#6c757d' }}>No action</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        

        {/* Download Excel Button */}
        <div style={{textAlign: 'right', marginTop: '20px'}}>
          <button 
            style={downloadButtonStyle}
            onClick={handleDownloadExcel}
          >
            Download Excel Report ({selectedMonth})
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveSummary;