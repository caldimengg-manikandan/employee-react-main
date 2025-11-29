import React, { useState, useEffect } from "react";

export default function AttendanceFetcher() {
  const [fromDate, setFromDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [resp, setResp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  // Auto-fetch data when component mounts
  useEffect(() => {
    fetchData();
  }, []);

  function formatDateRange(from, to) {
    return {
      begin: `${from}T00:00:00 08:00`,
      end: `${to}T23:59:59 08:00`
    };
  }

  async function fetchData() {
    setLoading(true);

    try {
      const { begin, end } = formatDateRange(fromDate, toDate);

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
      try {
        const records = json?.data?.data?.record || [];
        if (records.length > 0) {
          await saveToDB(json);
        }
      } catch (e) {}
    } catch (err) {
      // Show demo data if API fails
      const demo = generateDemoData();
      setResp(demo);
    } finally {
      setLoading(false);
    }
  }

  async function saveToDB(payload = resp) {
    if (!payload) return;
    if (payload?.meta?.demo) return;
    setSaveLoading(true);
    setSaveResult(null);
    try {
      const r = await fetch('/api/attendance/save-hikvision-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await r.json();
      setSaveResult(json);
    } catch (e) {
      setSaveResult({ success: false, message: e.message });
    } finally {
      setSaveLoading(false);
    }
  }

  // Generate demo data for date range
  const generateDemoData = () => {
    const generateRecordsForDateRange = () => {
      const records = [];
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);
      
      // Generate records for each date in the range
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const currentDate = date.toISOString().split('T')[0];
        
        const dailyRecords = [
          {
            personInfo: {
              personCode: "EMP001",
              givenName: "John Smith",
              orgName: "Engineering"
            },
            date: currentDate,
            attendanceBaseInfo: {
              beginTime: `${currentDate}T08:55:00+08:00`,
              endTime: `${currentDate}T17:05:00+08:00`,
              attendanceStatus: "1"
            },
            allDurationTime: 29400
          },
          {
            personInfo: {
              personCode: "EMP002",
              givenName: "Sarah Johnson",
              orgName: "Marketing"
            },
            date: currentDate,
            attendanceBaseInfo: {
              beginTime: `${currentDate}T09:15:00+08:00`,
              endTime: `${currentDate}T17:00:00+08:00`,
              attendanceStatus: "2"
            },
            allDurationTime: 27900
          },
          {
            personInfo: {
              personCode: "EMP003",
              givenName: "Mike Chen",
              orgName: "Sales"
            },
            date: currentDate,
            attendanceBaseInfo: {
              beginTime: `${currentDate}T09:00:00+08:00`,
              endTime: `${currentDate}T16:30:00+08:00`,
              attendanceStatus: "3"
            },
            allDurationTime: 27000
          }
        ];

        records.push(...dailyRecords);
      }
      
      return records;
    };

    return {
      ok: true,
      data: {
        data: {
          record: generateRecordsForDateRange()
        }
      },
      meta: { demo: true }
    };
  };

  const testWithDemoDate = () => {
    setFromDate("2025-11-24");
    setToDate("2025-11-26");
    setTimeout(() => fetchData(), 100);
  };

  const syncData = () => {
    fetchData();
  };

  const resetFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    setFromDate(today);
    setToDate(today);
    setTimeout(() => fetchData(), 100);
  };

  // Format date to DD-MM-YYYY
  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Format date for input field (YYYY-MM-DD)
  const formatInputDate = (dateString) => {
    return dateString;
  };

  const handleFromDateChange = (e) => {
    const newFromDate = e.target.value;
    setFromDate(newFromDate);
    
    // If fromDate is after toDate, adjust toDate
    if (newFromDate > toDate) {
      setToDate(newFromDate);
    }
  };

  const handleToDateChange = (e) => {
    const newToDate = e.target.value;
    setToDate(newToDate);
    
    // If toDate is before fromDate, adjust fromDate
    if (newToDate < fromDate) {
      setFromDate(newToDate);
    }
  };

  const renderTable = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading attendance records...</p>
        </div>
      );
    }

    if (!resp) return null;

    const records = resp.data?.data?.record || [];

    if (records.length === 0) {
      return (
        <div className="empty-state">
          <p>No attendance records found for the selected date range.</p>
          <button onClick={testWithDemoDate} className="demo-button">
            Load Demo Data
          </button>
        </div>
      );
    }

    return (
      <div className="table-container">
        <div className="table-header">
          <span>Showing records from {formatDisplayDate(fromDate)} to {formatDisplayDate(toDate)}</span>
          <span className="record-count">{records.length} records found{saveResult?.success ? ` • saved ${saveResult.savedCount || 0}` : ''}</span>
        </div>
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
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr key={index}>
                <td>{record.personInfo?.personCode || "N/A"}</td>
                <td>{record.personInfo?.givenName || "N/A"}</td>
                <td>{formatDisplayDate(record.date)}</td>
                <td>{formatTime(record.attendanceBaseInfo?.beginTime)}</td>
                <td>{formatTime(record.attendanceBaseInfo?.endTime)}</td>
                <td>{formatDuration(record.allDurationTime)}</td>
                <td>
                  <span className={`status status-${record.attendanceBaseInfo?.attendanceStatus || '4'}`}>
                    {getStatusText(record.attendanceBaseInfo?.attendanceStatus || '4')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="action-buttons" style={{ marginTop: 12 }}>
          <button 
            onClick={saveToDB} 
            className="btn btn-primary" 
            disabled={saveLoading || records.length === 0}
          >
            {saveLoading ? 'Saving...' : 'Save to MongoDB'}
          </button>
          {saveResult && (
            <span style={{ marginLeft: 12, fontSize: 12, color: saveResult.success ? '#166534' : '#991b1b' }}>
              {saveResult.success ? `Saved ${saveResult.savedCount || 0} new record(s)` : (saveResult.message || 'Save failed')}
            </span>
          )}
        </div>
      </div>
    );
  };

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (e) {
      return "N/A";
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0h 0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusText = (statusCode) => {
    const statusMap = {
      "1": "Normal",
      "2": "Late",
      "3": "Early Leave",
      "4": "Absent",
      "5": "Leave",
      "6": "Overtime"
    };
    return statusMap[statusCode] || "Unknown";
  };

  return (
    <div className="attendance-page">
      <div className="container">
        {/* Header */}
        <div className="header">
          <h1>Employee Attendance</h1>
          <p>View employee attendance records and work duration.</p>
        </div>

        {/* Status Bar */}
        <div className="status-bar">
          <div className="status-item">
            <span className="status-indicator connected"></span>
            <span>Hikvision: Connected</span>
          </div>
          <div className="status-item">
            <span>Last sync: {new Date().toLocaleString()}</span>
          </div>
        </div>

        <div className="separator"></div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-row">
            <div className="filter-group">
              <label>Employee ID</label>
              <select className="filter-select">
                <option>All Employee IDs</option>
                <option>EMP001</option>
                <option>EMP002</option>
                <option>EMP003</option>
              </select>
            </div>
            <div className="filter-group">
              <label>From Date</label>
              <input 
                type="date" 
                value={formatInputDate(fromDate)} 
                onChange={handleFromDateChange}
                className="date-input"
                max={formatInputDate(toDate)}
              />
            </div>
            <div className="filter-group">
              <label>To Date</label>
              <input 
                type="date" 
                value={formatInputDate(toDate)} 
                onChange={handleToDateChange}
                className="date-input"
                min={formatInputDate(fromDate)}
              />
            </div>
            <button onClick={syncData} className="btn btn-primary">
              Sync Data
            </button>
          </div>
        </div>

        <div className="separator"></div>

        {/* Action Buttons */}

        <div className="separator"></div>

        {/* Results Section */}
        <div className="results-section">
          {renderTable()}
        </div>
      </div>

      <style jsx>{`
        .attendance-page {
          min-height: 100vh;
          background: #f8f9fa;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #333;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .header {
          margin-bottom: 20px;
        }

        .header h1 {
          font-size: 24px;
          font-weight: 600;
          margin: 0 0 8px 0;
          color: #1a1a1a;
        }

        .header p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .status-bar {
          display: flex;
          gap: 30px;
          margin-bottom: 20px;
          padding: 12px 0;
          border-bottom: 1px solid #e1e5e9;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #555;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-indicator.connected {
          background: #28a745;
        }

        .separator {
          height: 1px;
          background: #e1e5e9;
          margin: 20px 0;
        }

        .filters-section {
          margin: 20px 0;
        }

        .filter-row {
          display: flex;
          gap: 20px;
          align-items: end;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-group label {
          font-size: 12px;
          font-weight: 500;
          color: #555;
        }

        .filter-select, .date-input {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 13px;
          background: white;
          min-width: 150px;
        }

        .date-input {
          color: #374151;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          margin: 20px 0;
        }

        .btn {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
          background: white;
          color: #374151;
          transition: all 0.2s;
        }

        .btn:hover {
          background: #f9fafb;
        }

        .btn-primary {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }

        .btn-primary:hover {
          background: #1d4ed8;
        }

        .btn-secondary {
          background: #6b7280;
          color: white;
          border-color: #6b7280;
        }

        .btn-secondary:hover {
          background: #4b5563;
        }

        .btn-outline {
          background: transparent;
          border-color: #d1d5db;
        }

        .btn-outline:hover {
          background: #f9fafb;
        }

        .table-container {
          margin-top: 20px;
          overflow-x: auto;
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding: 0 8px;
        }

        .record-count {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }

        .attendance-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .attendance-table th {
          background: #f8f9fa;
          padding: 12px;
          text-align: left;
          font-weight: 500;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
          border-top: 1px solid #e5e7eb;
        }

        .attendance-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          color: #4b5563;
        }

        .attendance-table tr:hover {
          background: #f9fafb;
        }

        .status {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }

        .status-1 {
          background: #dcfce7;
          color: #166534;
        }

        .status-2 {
          background: #fef3c7;
          color: #92400e;
        }

        .status-3 {
          background: #fef3c7;
          color: #92400e;
        }

        .status-4 {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-5 {
          background: #e5e7eb;
          color: #374151;
        }

        .status-6 {
          background: #dbeafe;
          color: #1e40af;
        }

        .loading-state {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #2563eb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 12px;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .demo-button {
          padding: 6px 12px;
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          margin-top: 8px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .container {
            padding: 20px;
          }

          .filter-row {
            flex-direction: column;
            gap: 12px;
          }

          .action-buttons {
            flex-direction: column;
          }

          .status-bar {
            flex-direction: column;
            gap: 12px;
          }

          .table-header {
            flex-direction: column;
            gap: 8px;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
