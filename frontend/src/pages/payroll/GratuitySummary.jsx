import React, { useEffect, useState } from 'react';

export default function GratuitySummary() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchGratuityData();
  }, []);

  async function fetchGratuityData() {
    setLoading(true);
    setError('');
    try {
      // TODO: Replace with real API call
      // const res = await fetch('/api/payroll/gratuity');
      // const data = await res.json();

      // Sample data for demo
      const data = [
        {
          id: 'E001',
          name: 'Ravi Kumar',
          dateOfJoining: '2015-04-15',
          dateOfExit: '2025-07-01',
          lastDrawnBasic: 45000,
          lastDrawnDA: 5000,
          department: 'Engineering',
          designation: 'Senior Developer',
        },
        {
          id: 'E008',
          name: 'Meena S',
          dateOfJoining: '2019-09-01',
          dateOfExit: null,
          lastDrawnBasic: 35000,
          lastDrawnDA: 3500,
          department: 'HR',
          designation: 'HR Manager',
        },
        {
          id: 'E012',
          name: 'Arun Rao',
          dateOfJoining: '2022-06-10',
          dateOfExit: '2024-12-31',
          lastDrawnBasic: 22000,
          lastDrawnDA: 2200,
          department: 'Sales',
          designation: 'Sales Executive',
        },
      ];

      setEmployees(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load gratuity data');
    } finally {
      setLoading(false);
    }
  }

  function computeCompletedYears(dateOfJoining, dateOfExit) {
    const doj = new Date(dateOfJoining);
    const exit = dateOfExit ? new Date(dateOfExit) : new Date();

    if (isNaN(doj.getTime()) || isNaN(exit.getTime())) return 0;

    let years = exit.getFullYear() - doj.getFullYear();
    const m = exit.getMonth() - doj.getMonth();
    const d = exit.getDate() - doj.getDate();

    if (m < 0 || (m === 0 && d < 0)) years -= 1;

    return years >= 0 ? years : 0;
  }

  function calculateGratuity(emp) {
    const years = computeCompletedYears(emp.dateOfJoining, emp.dateOfExit);
    const basicPlusDA = Number(emp.lastDrawnBasic || 0) + Number(emp.lastDrawnDA || 0);
    if (!basicPlusDA || years <= 0) return 0;

    const gratuity = (basicPlusDA * (15 / 26) * years);
    return Math.round(gratuity * 100) / 100;
  }

  // View employee details
  function handleViewEmployee(emp) {
    setSelectedEmployee({
      ...emp,
      completedYears: computeCompletedYears(emp.dateOfJoining, emp.dateOfExit),
      gratuityAmount: calculateGratuity(emp)
    });
    setShowModal(true);
  }

  // Delete employee
  function handleDeleteEmployee(id) {
    if (window.confirm('Are you sure you want to delete this employee record?')) {
      setEmployees(prev => prev.filter(emp => emp.id !== id));
      // TODO: Add API call to delete from backend
      console.log(`Deleted employee with ID: ${id}`);
    }
  }

  // Export CSV
  function exportCSV() {
    const header = ['Employee ID', 'Name', 'Joining Date', 'Exit Date', 'Completed Years', 'Basic', 'DA', 'Gratuity'];
    const rows = employees.map((e) => {
      const years = computeCompletedYears(e.dateOfJoining, e.dateOfExit);
      return [e.id, e.name, e.dateOfJoining, e.dateOfExit || '', years, e.lastDrawnBasic, e.lastDrawnDA, calculateGratuity(e)];
    });

    const csvContent = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gratuity_summary.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Generate and download PDF for single employee
  function downloadPDF(emp) {
    const years = computeCompletedYears(emp.dateOfJoining, emp.dateOfExit);
    const gratuity = calculateGratuity(emp);
    
    // Create a simple PDF content using jsPDF (you'll need to install jsPDF)
    // For now, we'll create a downloadable HTML page as PDF alternative
    const content = `
      <html>
        <head>
          <title>Gratuity Certificate - ${emp.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .certificate { border: 2px solid #262760; padding: 30px; border-radius: 10px; }
            .title { color: #262760; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .details { margin: 20px 0; }
            .detail-row { margin: 10px 0; display: flex; }
            .label { font-weight: bold; width: 200px; }
            .amount { font-size: 28px; color: #262760; font-weight: bold; text-align: center; margin: 30px 0; }
            .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>GRATUITY CERTIFICATE</h1>
            <p>Company Name Pvt. Ltd.</p>
          </div>
          
          <div class="certificate">
            <div class="title">Employee Gratuity Details</div>
            
            <div class="details">
              <div class="detail-row">
                <div class="label">Employee ID:</div>
                <div>${emp.id}</div>
              </div>
              <div class="detail-row">
                <div class="label">Employee Name:</div>
                <div>${emp.name}</div>
              </div>
              <div class="detail-row">
                <div class="label">Date of Joining:</div>
                <div>${emp.dateOfJoining}</div>
              </div>
              <div class="detail-row">
                <div class="label">Date of Exit:</div>
                <div>${emp.dateOfExit || 'Currently Employed'}</div>
              </div>
              <div class="detail-row">
                <div class="label">Completed Years:</div>
                <div>${years} years</div>
              </div>
              <div class="detail-row">
                <div class="label">Last Drawn Basic:</div>
                <div>₹${Number(emp.lastDrawnBasic).toLocaleString('en-IN')}</div>
              </div>
              <div class="detail-row">
                <div class="label">Last Drawn DA:</div>
                <div>₹${Number(emp.lastDrawnDA).toLocaleString('en-IN')}</div>
              </div>
            </div>
            
            <div class="amount">
              Gratuity Amount: ₹${gratuity.toLocaleString('en-IN')}
            </div>
            
            <div class="details">
              <div class="detail-row">
                <div class="label">Calculation Formula:</div>
                <div>(Basic + DA) × 15/26 × Completed Years</div>
              </div>
              <div class="detail-row">
                <div class="label">Calculation:</div>
                <div>(${emp.lastDrawnBasic} + ${emp.lastDrawnDA}) × 15/26 × ${years}</div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>This is a system generated certificate. For any discrepancies, please contact HR department.</p>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `;

    // Create a Blob and download
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Gratuity_${emp.id}_${emp.name.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    // Note: For production, use a proper PDF library like jsPDF or html2pdf
    // Example with jsPDF:
    // import jsPDF from 'jspdf';
    // const doc = new jsPDF();
    // doc.text(`Gratuity Certificate - ${emp.name}`, 10, 10);
    // doc.save(`Gratuity_${emp.id}.pdf`);
  }

  // Download PDF for all employees
  function downloadAllPDF() {
    const content = `
      <html>
        <head>
          <title>Gratuity Summary Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { color: #262760; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background-color: #262760; color: white; padding: 10px; text-align: left; }
            td { padding: 10px; border: 1px solid #ddd; }
            .total { font-weight: bold; font-size: 18px; color: #262760; }
            .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>GRATUITY SUMMARY REPORT</h1>
            <p>Company Name Pvt. Ltd.</p>
          </div>
          
          <div class="title">Employee Gratuity Details</div>
          
          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Joining Date</th>
                <th>Exit Date</th>
                <th>Completed Years</th>
                <th>Basic (₹)</th>
                <th>DA (₹)</th>
                <th>Gratuity (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${employees.map(emp => {
                const years = computeCompletedYears(emp.dateOfJoining, emp.dateOfExit);
                const gratuity = calculateGratuity(emp);
                return `
                  <tr>
                    <td>${emp.id}</td>
                    <td>${emp.name}</td>
                    <td>${emp.dateOfJoining}</td>
                    <td>${emp.dateOfExit || 'Current'}</td>
                    <td>${years}</td>
                    <td>₹${Number(emp.lastDrawnBasic).toLocaleString('en-IN')}</td>
                    <td>₹${Number(emp.lastDrawnDA).toLocaleString('en-IN')}</td>
                    <td>₹${gratuity.toLocaleString('en-IN')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="total">
            Total Gratuity Liability: ₹${employees.reduce((sum, emp) => sum + calculateGratuity(emp), 0).toLocaleString('en-IN')}
          </div>
          
          <div class="footer">
            <p>This is a system generated report. For any discrepancies, please contact HR department.</p>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            <p>Total Employees: ${employees.length}</p>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Gratuity_Summary_Report_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6">
      {/* Header with buttons */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Gratuity Summary</h1>
          <p className="text-gray-600 mt-1">Calculate and manage employee gratuity payments</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchGratuityData} 
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button 
            onClick={downloadAllPDF} 
            className="px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF Report
          </button>
          <button 
            onClick={exportCSV} 
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Loading and Error States */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#262760] mr-2"></div>
          <span>Loading gratuity data...</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white shadow rounded-lg overflow-x-auto border border-gray-200">
        <table className="w-full min-w-[900px] table-auto">
          <thead className="bg-[#262760]">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white border-b">Employee ID</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white border-b">Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white border-b">Joining Date</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white border-b">Exit Date</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-white border-b">Completed Years</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-white border-b">Basic (₹)</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-white border-b">DA (₹)</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-white border-b">Gratuity (₹)</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-white border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-lg font-medium text-gray-600">No gratuity records found</p>
                    <p className="text-gray-500 mt-1">Add employee data to calculate gratuity</p>
                  </div>
                </td>
              </tr>
            )}

            {employees.map((emp) => (
              <tr key={emp.id} className="border-t hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{emp.id}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{emp.name}</div>
                </td>
                <td className="px-6 py-4">
                  {emp.dateOfJoining}
                </td>
                <td className="px-6 py-4">
                  {emp.dateOfExit || <span className="text-gray-400">—</span>}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    computeCompletedYears(emp.dateOfJoining, emp.dateOfExit) >= 5 
                      ? "bg-green-100 text-green-800" 
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    {computeCompletedYears(emp.dateOfJoining, emp.dateOfExit)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-medium">
                  ₹{Number(emp.lastDrawnBasic).toLocaleString('en-IN')}
                </td>
                <td className="px-6 py-4 text-right">
                  ₹{Number(emp.lastDrawnDA).toLocaleString('en-IN')}
                </td>
                <td className="px-6 py-4 text-right font-bold">
                  <span className={calculateGratuity(emp) > 0 ? "text-green-600" : "text-gray-400"}>
                    ₹{calculateGratuity(emp).toLocaleString('en-IN')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    {/* View Button */}
                    <button
                      onClick={() => handleViewEmployee(emp)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    
                    {/* PDF Download Button */}
                    <button
                      onClick={() => downloadPDF(emp)}
                      className="p-2 text-[#262760] hover:bg-gray-100 rounded-lg transition-colors"
                      title="Download PDF"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v6h6" />
                      </svg>
                    </button>
                    
                    {/* Trash/Delete Button */}
                    <button
                      onClick={() => handleDeleteEmployee(emp.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Record"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Details Modal */}
      {showModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Employee Gratuity Details</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Employee ID</label>
                    <p className="font-medium">{selectedEmployee.id}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Employee Name</label>
                    <p className="font-medium">{selectedEmployee.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Date of Joining</label>
                    <p className="font-medium">{selectedEmployee.dateOfJoining}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Date of Exit</label>
                    <p className="font-medium">{selectedEmployee.dateOfExit || 'Currently Employed'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Completed Years</label>
                    <p className="font-medium">{selectedEmployee.completedYears} years</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Eligibility</label>
                    <p className="font-medium">
                      {selectedEmployee.completedYears >= 5 ? 
                        <span className="text-green-600">Eligible</span> : 
                        <span className="text-red-600">Not Eligible (Minimum 5 years required)</span>
                      }
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-700 mb-3">Salary Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">Last Drawn Basic</label>
                      <p className="font-medium">₹{Number(selectedEmployee.lastDrawnBasic).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Last Drawn DA</label>
                      <p className="font-medium">₹{Number(selectedEmployee.lastDrawnDA).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="font-medium text-gray-700 mb-2">Gratuity Calculation</h4>
                  <div className="text-sm text-gray-600 mb-2">
                    Formula: (Basic + DA) × 15/26 × Completed Years
                  </div>
                  <div className="text-lg font-bold text-[#262760]">
                    Gratuity Amount: ₹{selectedEmployee.gratuityAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      downloadPDF(selectedEmployee);
                      setShowModal(false);
                    }}
                    className="px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v6h6" />
                    </svg>
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      
         
        </div>
     
  );
}