import React, { useState } from 'react';

const EditLeaveEligibility = () => {
  const [username, setUsername] = useState('');
  const [employeeName, setEmployeeName] = useState('Employee name will appear here');
  const [showEligibility, setShowEligibility] = useState(false);

  // Mock employee data
  const employees = [
    { username: 'CDE090', name: 'John Doe', department: 'IT', designation: 'Software Engineer', joinDate: '2022-05-15' },
    { username: 'ABC123', name: 'Jane Smith', department: 'HR', designation: 'HR Manager', joinDate: '2021-08-20' },
    { username: 'XYZ456', name: 'Bob Wilson', department: 'Finance', designation: 'Accountant', joinDate: '2023-01-10' }
  ];

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    
    // Find employee by username
    const employee = employees.find(emp => emp.username === value);
    if (employee) {
      setEmployeeName(employee.name);
    } else {
      setEmployeeName('Employee name will appear here');
    }
  };

  const handleLoadEligibility = () => {
    if (username) {
      setShowEligibility(true);
    } else {
      alert('Please enter username');
    }
  };

  const handleClear = () => {
    setUsername('');
    setEmployeeName('Employee name will appear here');
    setShowEligibility(false);
  };

  // All styles with Arial font
  const containerStyle = {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    minHeight: '100vh'
  };

  const headerStyle = {
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
    marginBottom: '20px',
    fontFamily: 'Arial, sans-serif'
  };

  const formGroupStyle = {
    marginBottom: '15px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    fontFamily: 'Arial, sans-serif'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    color: '#333',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif'
  };

  const buttonStyle = {
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    width: '100%',
    marginTop: '10px',
    fontWeight: 'bold'
  };

  const clearButtonStyle = {
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    width: '100%',
    marginTop: '10px',
    fontWeight: 'bold'
  };

  const resultBoxStyle = {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginTop: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    borderLeft: '4px solid #2ecc71',
    fontFamily: 'Arial, sans-serif'
  };

  const leaveItemStyle = {
    padding: '10px',
    borderBottom: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontFamily: 'Arial, sans-serif'
  };

  const titleStyle = {
    fontSize: '18px',
    margin: '0',
    fontWeight: 'bold',
    fontFamily: 'Arial, sans-serif'
  };

  const subtitleStyle = {
    fontSize: '12px',
    opacity: '0.8',
    margin: '5px 0 0 0',
    fontFamily: 'Arial, sans-serif'
  };

  const noteBoxStyle = {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#fff8dc',
    borderRadius: '5px',
    fontSize: '13px',
    border: '1px solid #ffeaa7',
    fontFamily: 'Arial, sans-serif'
  };

  const helpTextStyle = {
    marginTop: '20px',
    fontSize: '12px',
    color: '#95a5a6',
    textAlign: 'center',
    padding: '10px',
    fontFamily: 'Arial, sans-serif'
  };

  const nameBoxStyle = {
    padding: '10px',
    backgroundColor: '#ecf0f1',
    borderRadius: '4px',
    color: '#7f8c8d',
    fontSize: '14px',
    minHeight: '40px',
    display: 'flex',
    alignItems: 'center',
    fontFamily: 'Arial, sans-serif'
  };

  const daysValueStyle = {
    fontWeight: 'bold',
    color: '#e74c3c',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif'
  };

  const daysDescStyle = {
    padding: '0 10px 10px',
    fontSize: '13px',
    color: '#7f8c8d',
    fontFamily: 'Arial, sans-serif'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>LEAVE ELIGIBILITY</h2>
      </div>
      
      <div style={formGroupStyle}>
        <div style={{marginBottom: '15px'}}>
          <label style={labelStyle}>Username</label>
          <input
            type="text"
            value={username}
            onChange={handleUsernameChange}
            placeholder="Enter username"
            style={inputStyle}
          />
        </div>
        
        <div style={{marginBottom: '20px'}}>
          <label style={labelStyle}>Employee Name</label>
          <div style={nameBoxStyle}>
            {employeeName}
          </div>
        </div>
        
        <button onClick={handleLoadEligibility} style={buttonStyle}>
          Load Eligibility
        </button>
      </div>
      
      {showEligibility && (
        <div style={resultBoxStyle}>
          <h3 style={{color: '#27ae60', marginTop: '0', marginBottom: '15px', fontFamily: 'Arial, sans-serif'}}>Leave Eligibility Results</h3>
          
          <div style={leaveItemStyle}>
            <span>Casual Leave (CL):</span>
            <span style={daysValueStyle}>6 days</span>
          </div>
          <div style={daysDescStyle}>
            0.5 days per month for personal matters
          </div>
          
          <div style={leaveItemStyle}>
            <span>Sick Leave (SL):</span>
            <span style={daysValueStyle}>6 days</span>
          </div>
          <div style={daysDescStyle}>
            0.5 days per month, medical certificate required
          </div>
          
          <div style={leaveItemStyle}>
            <span>Privilege Leave (PL):</span>
            <span style={daysValueStyle}>15 days</span>
          </div>
          <div style={daysDescStyle}>
            15 days per year, max 30 days accumulation
          </div>
          
          <div style={leaveItemStyle}>
            <span>Bereavement Leave:</span>
            <span style={daysValueStyle}>2 days</span>
          </div>
          <div style={daysDescStyle}>
            For immediate family loss
          </div>
          
          <div style={noteBoxStyle}>
            <strong>Note:</strong> Trainees get 1 day/month during training period. Regular employees get full entitlements after probation.
          </div>
        </div>
      )}
      
      <div style={formGroupStyle}>
        <button onClick={handleClear} style={clearButtonStyle}>
          Clear All
        </button>
      </div>
      
      <div style={helpTextStyle}>
        Sample usernames: CDE090, ABC123, XYZ456
      </div>
    </div>
  );
};

export default EditLeaveEligibility;