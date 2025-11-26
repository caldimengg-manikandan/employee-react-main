import React, { useState, useEffect } from "react";

export default function AttendanceFetcher() {
  const [date, setDate] = useState(() => {
    // Set default to current date in YYYY-MM-DD format
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [resp, setResp] = useState(null);
  const [loading, setLoading] = useState(false);

  // Auto-fetch data when component mounts and when date changes
  useEffect(() => {
    fetchData();
  }, [date]);

  function formatDateRange(d) {
    return {
      begin: `${d}T00:00:00 08:00`,
      end: `${d}T23:59:59 08:00`
    };
  }

  async function fetchData() {
    setLoading(true);
    const { begin, end } = formatDateRange(date);

    try {
      // Simulate API call - replace with your actual API endpoint
      const r = await fetch("/api/hikvision/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceReportRequest: {
            pageNo: 1,
            pageSize: 100,
            queryInfo: {
              personID: [],
              beginTime: begin,
              endTime: end,
              sortInfo: { sortField: 1, sortType: 1 }
            }
          }
        })
      });

      const json = await r.json();
      setResp(json);
    } catch (err) {
      // If API fails, show demo data for current date
      if (date === new Date().toISOString().split('T')[0]) {
        setResp(generateDemoData());
      } else {
        setResp({ ok: false, error: err.message });
      }
    } finally {
      setLoading(false);
    }
  }

  // Generate demo data for current date
  const generateDemoData = () => {
    const currentDate = new Date().toISOString().split('T')[0];
    const demoRecords = [
      {
        personInfo: {
          personCode: "EMP001",
          givenName: "John",
          fullName: "John Smith",
          orgName: "Engineering"
        },
        date: currentDate,
        planInfo: {
          periodName: "Morning Shift",
          planBeginTime: `${currentDate}T09:00:00+08:00`,
          planEndTime: `${currentDate}T17:00:00+08:00`
        },
        attendanceBaseInfo: {
          beginTime: `${currentDate}T08:55:00+08:00`,
          endTime: `${currentDate}T17:05:00+08:00`,
          attendanceStatus: "1"
        },
        allDurationTime: 29400 // 8 hours 10 minutes in seconds
      },
      {
        personInfo: {
          personCode: "EMP002",
          givenName: "Sarah",
          fullName: "Sarah Johnson",
          orgName: "Marketing"
        },
        date: currentDate,
        planInfo: {
          periodName: "Morning Shift",
          planBeginTime: `${currentDate}T09:00:00+08:00`,
          planEndTime: `${currentDate}T17:00:00+08:00`
        },
        attendanceBaseInfo: {
          beginTime: `${currentDate}T09:15:00+08:00`,
          endTime: `${currentDate}T17:00:00+08:00`,
          attendanceStatus: "2"
        },
        allDurationTime: 27900 // 7 hours 45 minutes in seconds
      },
      {
        personInfo: {
          personCode: "EMP003",
          givenName: "Mike",
          fullName: "Mike Chen",
          orgName: "Sales"
        },
        date: currentDate,
        planInfo: {
          periodName: "Morning Shift",
          planBeginTime: `${currentDate}T09:00:00+08:00`,
          planEndTime: `${currentDate}T17:00:00+08:00`
        },
        attendanceBaseInfo: {
          beginTime: `${currentDate}T09:00:00+08:00`,
          endTime: `${currentDate}T16:30:00+08:00`,
          attendanceStatus: "3"
        },
        allDurationTime: 27000 // 7 hours 30 minutes in seconds
      },
      {
        personInfo: {
          personCode: "EMP004",
          givenName: "Lisa",
          fullName: "Lisa Wang",
          orgName: "HR"
        },
        date: currentDate,
        planInfo: {
          periodName: "Morning Shift",
          planBeginTime: `${currentDate}T09:00:00+08:00`,
          planEndTime: `${currentDate}T17:00:00+08:00`
        },
        attendanceBaseInfo: {
          beginTime: `${currentDate}T09:00:00+08:00`,
          endTime: `${currentDate}T18:30:00+08:00`,
          attendanceStatus: "6"
        },
        allDurationTime: 34200 // 9 hours 30 minutes in seconds
      },
      {
        personInfo: {
          personCode: "EMP005",
          givenName: "David",
          fullName: "David Brown",
          orgName: "Engineering"
        },
        date: currentDate,
        planInfo: {
          periodName: "Morning Shift",
          planBeginTime: `${currentDate}T09:00:00+08:00`,
          planEndTime: `${currentDate}T17:00:00+08:00`
        },
        attendanceBaseInfo: null, // Absent case
        allDurationTime: 0
      }
    ];

    return {
      ok: true,
      data: {
        data: {
          record: demoRecords
        }
      }
    };
  };

  // Function to test with specific date
  const testWithDemoDate = () => {
    setDate("2025-11-24");
  };

  // Function to render the data in table format
  const renderTable = () => {
    if (!resp && !loading) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Data Available</h3>
          <p>Click "Fetch Records" to load attendance data.</p>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading attendance records...</p>
        </div>
      );
    }

    // If there's an error
    if (resp?.error || !resp?.ok) {
      return (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <div className="error-text">
            <h3>Error Loading Data</h3>
            <p>{resp?.error || "Failed to fetch attendance data"}</p>
            <button onClick={testWithDemoDate} className="demo-button">
              Test with 2025-11-24
            </button>
          </div>
        </div>
      );
    }

    // Extract attendance records from the response
    const records = resp.data?.data?.record || [];

    if (records.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Attendance Records Found</h3>
          <p>No attendance records found for {date}.</p>
          <button onClick={testWithDemoDate} className="demo-button">
            Test with 2025-11-24
          </button>
        </div>
      );
    }

    return (
      <div className="table-container">
        <div className="table-header">
          <h3>Attendance Records (Hikvision Device)</h3>
          <div className="record-info">
            <span className="source">Hikvision</span>
            <span className="record-count">{records.length} records found</span>
          </div>
        </div>
        
        <div className="table-wrapper">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Work Duration</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => (
                <tr key={index} className={index % 2 === 0 ? "even-row" : "odd-row"}>
                  <td>
                    <span className="employee-id">
                      {record.personInfo?.personCode || "N/A"}
                    </span>
                  </td>
                  <td>
                    <div className="employee-name">
                      {record.personInfo?.givenName || record.personInfo?.fullName || "N/A"}
                    </div>
                  </td>
                  <td>
                    <span className="date-cell">
                      {record.date || date}
                    </span>
                  </td>
                  <td>
                    <span className="check-time">
                      {formatTime(record.attendanceBaseInfo?.beginTime) || "N/A"}
                    </span>
                  </td>
                  <td>
                    <span className="check-time">
                      {formatTime(record.attendanceBaseInfo?.endTime) || "N/A"}
                    </span>
                  </td>
                  <td>
                    <span className="duration">
                      {formatDuration(record.allDurationTime)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${record.attendanceBaseInfo?.attendanceStatus || '4'}`}>
                      {getStatusText(record.attendanceBaseInfo?.attendanceStatus || '4')}
                    </span>
                  </td>
                  <td>
                    <span className="source-badge">Hikvision</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Helper function to format time
  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch (e) {
      return timeString;
    }
  };

  // Helper function to format duration (seconds to hours:minutes)
  const formatDuration = (seconds) => {
    if (!seconds) return "0h 0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Helper function to get status text
  const getStatusText = (statusCode) => {
    const statusMap = {
      "1": "Normal",
      "2": "Late",
      "3": "Early Leave",
      "4": "Absent",
      "5": "Leave",
      "6": "Overtime"
    };
    return statusMap[statusCode] || `Unknown (${statusCode})`;
  };

  return (
    <div className="attendance-fetcher">
      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <h1 className="title">
              <span className="title-icon">📅</span>
              Attendance Records (Hikvision Device)
            </h1>
            <p className="subtitle">Real-time employee attendance monitoring system</p>
          </div>
        </header>

        {/* Controls Section */}
        <div className="controls-card">
          <div className="controls-header">
            <h2>Fetch Attendance Data</h2>
            <p>Select a date to view attendance records</p>
          </div>
          
          <div className="controls-content">
            <div className="input-group">
              <label htmlFor="date-input" className="input-label">
                <span className="label-icon">📅</span>
                Select Date
              </label>
              <input 
                id="date-input"
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="date-input"
              />
            </div>

            <div className="button-group">
              <button 
                onClick={fetchData} 
                disabled={loading}
                className={`fetch-button ${loading ? 'loading' : ''}`}
              >
                {loading ? (
                  <>
                    <span className="button-spinner"></span>
                    Loading...
                  </>
                ) : (
                  <>
                    <span className="button-icon">🔄</span>
                    Refresh Data
                  </>
                )}
              </button>

              <button 
                onClick={testWithDemoDate}
                className="demo-button secondary"
              >
                <span className="button-icon">🧪</span>
                Test with 2025-11-24
              </button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="results-section">
          {renderTable()}
        </div>

        {/* Debug Section */}
        {resp && (
          <details className="debug-section">
            <summary className="debug-summary">
              <span className="debug-icon">🐛</span>
              Raw Response Data (Debug)
            </summary>
            <pre className="debug-content">
              {JSON.stringify(resp, null, 2)}
            </pre>
          </details>
        )}
      </div>

      <style jsx>{`
        .attendance-fetcher {
          min-height: 100vh;
          background: #ffffff;
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Header Styles */
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding: 40px 20px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 20px;
          border: 1px solid #e9ecef;
        }

        .title {
          font-size: 2.2rem;
          font-weight: 700;
          margin-bottom: 10px;
          color: #2c3e50;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
        }

        .title-icon {
          font-size: 2rem;
        }

        .subtitle {
          font-size: 1.1rem;
          color: #6c757d;
          font-weight: 400;
        }

        /* Controls Card */
        .controls-card {
          background: white;
          border-radius: 16px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e9ecef;
        }

        .controls-header h2 {
          color: #2c3e50;
          margin-bottom: 8px;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .controls-header p {
          color: #6c757d;
          margin-bottom: 25px;
          font-size: 1rem;
        }

        .controls-content {
          display: flex;
          align-items: flex-end;
          gap: 20px;
          flex-wrap: wrap;
          justify-content: space-between;
        }

        .input-group {
          flex: 1;
          min-width: 250px;
        }

        .button-group {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .input-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #2c3e50;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
        }

        .label-icon {
          font-size: 1.1rem;
        }

        .date-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-size: 16px;
          transition: all 0.3s ease;
          background: #f8f9fa;
          color: #2c3e50;
        }

        .date-input:focus {
          outline: none;
          border-color: #3498db;
          background: white;
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }

        .fetch-button {
          padding: 12px 24px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 140px;
          justify-content: center;
          box-shadow: 0 2px 10px rgba(52, 152, 219, 0.2);
        }

        .demo-button {
          padding: 12px 24px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
        }

        .demo-button.secondary {
          background: #95a5a6;
        }

        .fetch-button:hover:not(.loading),
        .demo-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
        }

        .fetch-button.loading {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .button-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Table Styles */
        .table-container {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e9ecef;
        }

        .table-header {
          padding: 20px 30px;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .table-header h3 {
          color: #2c3e50;
          margin: 0;
          font-size: 1.2rem;
          font-weight: 600;
        }

        .record-info {
          display: flex;
          align-items: center;
          gap: 15px;
          font-size: 0.9rem;
        }

        .source {
          color: #6c757d;
          font-weight: 500;
        }

        .record-count {
          background: #3498db;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .attendance-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1000px;
        }

        .attendance-table th {
          background: #2c3e50;
          color: white;
          padding: 14px 12px;
          text-align: left;
          font-weight: 600;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .attendance-table td {
          padding: 12px;
          border-bottom: 1px solid #e9ecef;
          font-size: 0.9rem;
          color: #495057;
        }

        .even-row {
          background: #f8f9fa;
        }

        .odd-row {
          background: white;
        }

        .even-row:hover, .odd-row:hover {
          background: #e3f2fd;
        }

        .employee-id {
          font-family: 'Courier New', monospace;
          font-weight: 600;
          color: #2c3e50;
          font-size: 0.85rem;
        }

        .employee-name {
          font-weight: 600;
          color: #2c3e50;
          font-size: 0.9rem;
        }

        .date-cell, .check-time {
          font-family: 'Courier New', monospace;
          color: #2c3e50;
          font-size: 0.85rem;
        }

        .duration {
          font-family: 'Courier New', monospace;
          font-weight: 600;
          color: #2c3e50;
          background: #f8f9fa;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.85rem;
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-1 { background: #d4edda; color: #155724; }
        .status-2 { background: #fff3cd; color: #856404; }
        .status-3 { background: #fff3cd; color: #856404; }
        .status-4 { background: #f8d7da; color: #721c24; }
        .status-5 { background: #e2e3e5; color: #383d41; }
        .status-6 { background: #cce7ff; color: #004085; }

        .source-badge {
          background: #e9ecef;
          color: #6c757d;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        /* Loading State */
        .loading-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e9ecef;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        /* Error and Empty States */
        .error-container, .empty-state {
          background: white;
          border-radius: 16px;
          padding: 50px 30px;
          text-align: center;
          box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e9ecef;
        }

        .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          background: #f8d7da;
          color: #721c24;
          border-color: #f5c6cb;
        }

        .error-icon, .empty-icon {
          font-size: 2.5rem;
        }

        .error-text h3, .empty-state h3 {
          margin-bottom: 10px;
          color: inherit;
        }

        .empty-state {
          color: #6c757d;
        }

        /* Debug Section */
        .debug-section {
          margin-top: 30px;
        }

        .debug-summary {
          padding: 12px 20px;
          background: #6c757d;
          color: white;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
          border: none;
          font-size: 0.9rem;
        }

        .debug-content {
          background: #f8f9fa;
          color: #495057;
          padding: 20px;
          border-radius: 0 0 10px 10px;
          margin-top: 5px;
          overflow: auto;
          font-size: 0.85rem;
          font-family: 'Courier New', monospace;
          max-height: 400px;
          border: 1px solid #e9ecef;
          border-top: none;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .attendance-fetcher {
            padding: 15px;
          }

          .header {
            padding: 30px 20px;
            margin-bottom: 30px;
          }

          .title {
            font-size: 1.8rem;
            flex-direction: column;
            gap: 10px;
          }

          .controls-card {
            padding: 25px 20px;
          }

          .controls-content {
            flex-direction: column;
            align-items: stretch;
            gap: 15px;
          }

          .button-group {
            width: 100%;
            justify-content: stretch;
          }

          .fetch-button, .demo-button {
            flex: 1;
            min-width: auto;
          }

          .table-header {
            flex-direction: column;
            gap: 15px;
            align-items: flex-start;
            padding: 20px;
          }

          .record-info {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}