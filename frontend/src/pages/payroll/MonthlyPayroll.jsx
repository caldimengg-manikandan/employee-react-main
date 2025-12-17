import React, { useEffect, useState } from 'react';
import { Play, Download, Check, X, Mail, Filter } from 'lucide-react';

const calculateSalaryFields = (salaryData) => {
  const basicDA = parseFloat(salaryData.basicDA) || 0;
  const hra = parseFloat(salaryData.hra) || 0;
  const specialAllowance = parseFloat(salaryData.specialAllowance) || 0;
  const gratuity = parseFloat(salaryData.gratuity) || 0;
  const pf = parseFloat(salaryData.pf) || 0;
  const esi = parseFloat(salaryData.esi) || 0;
  const tax = parseFloat(salaryData.tax) || 0;
  const professionalTax = parseFloat(salaryData.professionalTax) || 0;
  const loanDeduction = parseFloat(salaryData.loanDeduction) || 0;
  const lop = parseFloat(salaryData.lop) || 0;

  const totalEarnings = basicDA + hra + specialAllowance;
  const totalDeductions = pf + esi + tax + professionalTax + loanDeduction + lop + gratuity;
  const netSalary = totalEarnings - totalDeductions;
  const ctc = totalEarnings + gratuity;

  return {
    ...salaryData,
    totalEarnings,
    totalDeductions,
    netSalary,
    ctc
  };
};

const defaultSample = [
  {
    id: 1,
    employeeId: 'EMP001',
    employeeName: 'John Doe',
    designation: 'Software Engineer',
    location: 'Chennai',
    basicDA: 40000,
    hra: 16000,
    specialAllowance: 8000,
    gratuity: 2000,
    pf: 4800,
    esi: 1200,
    tax: 3000,
    professionalTax: 200,
    loanDeduction: 0,
    lop: 0,
    status: 'Pending',
    accountNumber: '123456789012',
    ifscCode: 'HDFC0001234',
    bankName: 'HDFC Bank'
  },
  {
    id: 2,
    employeeId: 'EMP002',
    employeeName: 'Jane Smith',
    designation: 'HR Manager',
    location: 'Hosur',
    basicDA: 50000,
    hra: 20000,
    specialAllowance: 10000,
    gratuity: 2500,
    pf: 6000,
    esi: 1500,
    tax: 5000,
    professionalTax: 200,
    loanDeduction: 2000,
    lop: 0,
    status: 'Pending',
    accountNumber: '987654321098',
    ifscCode: 'SBIN0001234',
    bankName: 'SBI'
  },
  {
    id: 3,
    employeeId: 'EMP003',
    employeeName: 'Robert Johnson',
    designation: 'Sales Executive',
    location: 'Chennai',
    basicDA: 30000,
    hra: 12000,
    specialAllowance: 6000,
    gratuity: 1500,
    pf: 3600,
    esi: 900,
    tax: 2000,
    professionalTax: 200,
    loanDeduction: 1000,
    lop: 0,
    status: 'Pending',
    accountNumber: '543210987654',
    ifscCode: 'AXIS0001234',
    bankName: 'Axis Bank'
  }
];

export default function MonthlyPayroll() {
  const [salaryRecords, setSalaryRecords] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [simulation, setSimulation] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [filterBank, setFilterBank] = useState('all');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('payrollRecords');
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized = parsed.map(r => ({ 
          accountNumber: '', 
          ifscCode: '', 
          bankName: 'HDFC Bank', 
          ...r 
        }));
        setSalaryRecords(normalized);
        return;
      }
    } catch (e) {
      console.warn('Failed to parse payrollRecords from localStorage', e);
    }
    setSalaryRecords(defaultSample);
  }, []);

  const toggleSelectEmployee = (id) => {
    setSelectedEmployees(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedEmployees(salaryRecords.map(r => r.id));
  };

  const clearSelection = () => {
    setSelectedEmployees([]);
  };

  const runSimulation = () => {
    if (selectedEmployees.length === 0) {
      setMessage('Select at least one employee to simulate payroll.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setProcessing(true);
    const selectedRecords = salaryRecords.filter(r => selectedEmployees.includes(r.id));

    const results = selectedRecords.map(rec => {
      const base = calculateSalaryFields(rec);
      const adjusted = { ...base };
      
      // Include gratuity by default (calculation already includes it)
      adjusted.salaryMonth = `${selectedMonth}-01`;
      adjusted.paymentDate = new Date().toISOString().slice(0,10);
      adjusted.accountNumber = rec.accountNumber || '';
      adjusted.ifscCode = rec.ifscCode || '';
      adjusted.bankName = rec.bankName || 'HDFC Bank';
      
      return adjusted;
    });

    const totals = results.reduce((acc, r) => {
      acc.totalEarnings += Number(r.totalEarnings || 0);
      acc.totalDeductions += Number(r.totalDeductions || 0);
      acc.netSalary += Number(r.netSalary || 0);
      acc.ctc += Number(r.ctc || 0);
      return acc;
    }, { totalEarnings: 0, totalDeductions: 0, netSalary: 0, ctc: 0 });

    setTimeout(() => {
      setSimulation({ results, totals });
      setProcessing(false);
    }, 800);
  };

  const sendPaymentEmail = () => {
    if (!simulation) return;

    // Check for missing bank details
    const missingBankDetails = simulation.results.filter(r => 
      !r.accountNumber || !r.ifscCode
    );

    if (missingBankDetails.length > 0) {
      setMessage(`Error: ${missingBankDetails.length} employee(s) have incomplete bank details.`);
      setTimeout(() => setMessage(''), 6000);
      return;
    }

    // Prepare email data
    const emailData = {
      month: selectedMonth,
      totalEmployees: simulation.results.length,
      totalAmount: simulation.totals.netSalary,
      employees: simulation.results.map(r => ({
        name: r.employeeName,
        id: r.employeeId,
        amount: r.netSalary,
        accountNumber: r.accountNumber,
        ifscCode: r.ifscCode,
        bankName: r.bankName
      }))
    };

    // Create email content
    const emailContent = `
Subject: Monthly Salary Payment Request - ${selectedMonth}

Dear Accounts Team,

Please process salary payments for the following employees for ${selectedMonth}.

Total Amount: ₹${formatCurrency(simulation.totals.netSalary)}
Total Employees: ${simulation.results.length}

Employee Details:
${simulation.results.map(r => `
- ${r.employeeName} (${r.employeeId})
  Amount: ₹${formatCurrency(r.netSalary)}
  Account: ${r.accountNumber}
  IFSC: ${r.ifscCode}
  Bank: ${r.bankName}
`).join('')}

Please confirm once payments are processed.

Regards,
Payroll Department
`;

    // Simulate sending email
    console.log('Email content:', emailContent);
    
    // Update status in records
    const updatedRecords = salaryRecords.map(rec => {
      const simRec = simulation.results.find(s => s.id === rec.id);
      if (simRec) {
        return { 
          ...rec, 
          ...simRec, 
          status: 'Payment Email Sent', 
          salaryMonth: simRec.salaryMonth, 
          paymentDate: simRec.paymentDate 
        };
      }
      return rec;
    });

    setSalaryRecords(updatedRecords);
    
    try {
      localStorage.setItem('payrollRecords', JSON.stringify(updatedRecords));
    } catch (e) {
      console.warn('Failed to write payrollRecords to localStorage', e);
    }

    setMessage('Payment email sent to accounts team. Records updated.');
    setTimeout(() => setMessage(''), 5000);
    setSimulation(null);
    setSelectedEmployees([]);
  };

  const exportSimulationCSV = () => {
    if (!simulation) return;
    
    const header = [
      'Employee ID', 'Name', 'Designation', 'Salary Month', 'Payment Date',
      'Basic+DA', 'HRA', 'Special Allowance', 'Total Earnings',
      'PF', 'ESI', 'Tax', 'Professional Tax', 'Loan Deduction', 'LOP', 'Gratuity',
      'Total Deductions', 'Net Salary', 'CTC', 'Account Number', 'IFSC Code', 'Bank Name'
    ];
    
    const rows = simulation.results.map(r => [
      r.employeeId, r.employeeName, r.designation, r.salaryMonth, r.paymentDate,
      r.basicDA, r.hra, r.specialAllowance, r.totalEarnings,
      r.pf, r.esi, r.tax, r.professionalTax, r.loanDeduction, r.lop, r.gratuity,
      r.totalDeductions, r.netSalary, r.ctc,
      r.accountNumber, r.ifscCode, r.bankName
    ]);

    const csvContent = [header, ...rows].map(r => 
      r.map(cell => `"${cell ?? ''}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly_payroll_${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount) => 
    new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR', 
      minimumFractionDigits: 0 
    }).format(amount || 0);

  const filteredRecords = salaryRecords.filter(record => {
    if (filterBank === 'all') return true;
    if (filterBank === 'hdfc') return record.bankName?.includes('HDFC');
    if (filterBank === 'sbi') return record.bankName?.includes('SBI');
    if (filterBank === 'axis') return record.bankName?.includes('Axis');
    if (filterBank === 'indian') return record.bankName?.includes('Indian');
    if (filterBank === 'icici') return record.bankName?.includes('ICICI');
    if (filterBank === 'other') return !['HDFC', 'SBI', 'Axis', 'Indian', 'ICICI'].some(bank => 
      record.bankName?.includes(bank)
    );
    return true;
  });

  const getBankFilterLabel = () => {
    switch(filterBank) {
      case 'all': return 'All Banks';
      case 'hdfc': return 'HDFC Bank';
      case 'sbi': return 'SBI';
      case 'axis': return 'Axis Bank';
      case 'indian': return 'Indian Bank';
      case 'icici': return 'ICICI Bank';
      case 'other': return 'Other Banks';
      default: return 'All Banks';
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Monthly Payroll Processing</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={selectAll} 
            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Select All
          </button>
          <button 
            onClick={clearSelection} 
            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
          <button 
            onClick={runSimulation} 
            className="px-4 py-2 bg-[#262760] text-white rounded hover:bg-[#1e2050] transition-colors flex items-center gap-2"
            disabled={processing}
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Simulation
              </>
            )}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded ${
          message.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {message}
        </div>
      )}

      {/* Controls */}
      <div className="bg-white p-5 rounded-lg shadow mb-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Salary Month</label>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Bank Filter</label>
            <select 
              value={filterBank} 
              onChange={(e) => setFilterBank(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Banks</option>
              <option value="hdfc">HDFC Bank</option>
              <option value="sbi">SBI</option>
              <option value="axis">Axis Bank</option>
              <option value="indian">Indian Bank</option>
              <option value="icici">ICICI Bank</option>
              <option value="other">Other Banks</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Selected Employees</label>
            <div className="px-3 py-2 border border-gray-300 rounded bg-gray-50 text-center">
              <span className="font-medium text-blue-600">{selectedEmployees.length}</span>
              <span className="text-gray-600"> / {salaryRecords.length} employees</span>
            </div>
          </div>
        </div>
      </div>

      {/* Employee/Salary Records Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#262760]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Select
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Designation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Basic+DA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Net Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Account No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  IFSC Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Bank Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.map(record => {
                const salary = calculateSalaryFields(record);
                return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        checked={selectedEmployees.includes(record.id)} 
                        onChange={() => toggleSelectEmployee(record.id)} 
                        className="w-4 h-4 text-blue-600"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{record.employeeName}</div>
                      <div className="text-xs text-gray-500">{record.employeeId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{record.designation}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{formatCurrency(record.basicDA)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-green-600">
                        {formatCurrency(salary.netSalary)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                      {record.accountNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                      {record.ifscCode || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.bankName?.includes('HDFC') 
                          ? 'bg-green-100 text-green-800' 
                          : record.bankName?.includes('SBI')
                          ? 'bg-blue-100 text-blue-800'
                          : record.bankName?.includes('Axis')
                          ? 'bg-purple-100 text-purple-800'
                          : record.bankName?.includes('Indian')
                          ? 'bg-indigo-100 text-indigo-800'
                          : record.bankName?.includes('ICICI')
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {record.bankName || 'Not Set'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.status === 'Paid' 
                          ? 'bg-green-100 text-green-800' 
                          : record.status === 'Payment Email Sent'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Showing: {getBankFilterLabel()} ({filteredRecords.length} records)
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Selected: <span className="font-medium text-blue-600">{selectedEmployees.length}</span> employees
            </div>
          </div>
        </div>
      </div>

      {/* Simulation Result */}
      {simulation && (
        <div className="bg-white p-5 rounded-lg shadow mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Simulation Preview ({simulation.results.length} employees)
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={exportSimulationCSV} 
                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button 
                onClick={sendPaymentEmail}
                className="px-4 py-2 bg-[#262760] text-white rounded hover:bg-[#1e2050] transition-colors flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Send Payment Email
              </button>
              <button 
                onClick={() => setSimulation(null)} 
                className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#262760]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Total Earnings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Total Deductions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Net Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Bank
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {simulation.results.map(result => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{result.employeeName}</div>
                      <div className="text-xs text-gray-500">{result.employeeId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {formatCurrency(result.totalEarnings)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {formatCurrency(result.totalDeductions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-green-600">
                      {formatCurrency(result.netSalary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        result.bankName?.includes('HDFC') 
                          ? 'bg-green-100 text-green-800' 
                          : result.bankName?.includes('SBI')
                          ? 'bg-blue-100 text-blue-800'
                          : result.bankName?.includes('Axis')
                          ? 'bg-purple-100 text-purple-800'
                          : result.bankName?.includes('Indian')
                          ? 'bg-indigo-100 text-indigo-800'
                          : result.bankName?.includes('ICICI')
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {result.bankName || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="border-t font-semibold bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">Totals</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {formatCurrency(simulation.totals.totalEarnings)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {formatCurrency(simulation.totals.totalDeductions)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-green-600">
                    {formatCurrency(simulation.totals.netSalary)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Mixed Banks
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {/* Summary Stats */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-600 font-medium">Total Employees</div>
              <div className="text-xl font-bold text-blue-700">{simulation.results.length}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="text-sm text-green-600 font-medium">Total Net Salary</div>
              <div className="text-xl font-bold text-green-700">
                {formatCurrency(simulation.totals.netSalary)}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <div className="text-sm text-purple-600 font-medium">Gratuity Included</div>
              <div className="text-xl font-bold text-purple-700">
                {formatCurrency(simulation.results.reduce((sum, r) => sum + (r.gratuity || 0), 0))}
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <div className="text-sm text-orange-600 font-medium">Total CTC</div>
              <div className="text-xl font-bold text-orange-700">
                {formatCurrency(simulation.totals.ctc)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!simulation && selectedEmployees.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="mb-4">
            <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-600">No employees selected</p>
          <p className="text-gray-500 mt-1">Select employees and click <strong>Simulation</strong> to preview monthly payroll</p>
        </div>
      )}
    </div>
  );
}