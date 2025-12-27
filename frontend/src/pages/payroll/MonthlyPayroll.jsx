import React, { useEffect, useState } from 'react';
import { Play, Download, Check, X, Mail, Filter } from 'lucide-react';
import { employeeAPI, leaveAPI, payrollAPI, monthlyPayrollAPI, loanAPI } from '../../services/api';

const calculateSalaryFields = (salaryData, lopDaysInput) => {
  const basicDA = parseFloat(salaryData.basicDA) || 0;
  const hra = parseFloat(salaryData.hra) || 0;
  const specialAllowance = parseFloat(salaryData.specialAllowance) || 0;
  const gratuity = parseFloat(salaryData.gratuity) || 0;
  const pf = parseFloat(salaryData.pf) || 0;
  const esi = parseFloat(salaryData.esi) || 0;
  const tax = parseFloat(salaryData.tax) || 0;
  const professionalTax = parseFloat(salaryData.professionalTax) || 0;
  const loanDeduction = parseFloat(salaryData.loanDeduction) || 0;

  // Use input if provided, otherwise check record, otherwise 0
  const lopDays = lopDaysInput !== undefined ? lopDaysInput : (salaryData.lopDays || 0);

  const totalEarnings = basicDA + hra + specialAllowance;
  
  // Calculate LOP deduction
  // Per Day Salary = Total Earnings / 30
  const perDaySalary = totalEarnings / 30;
  const lopDeduction = Math.round(perDaySalary * lopDays);

  // Gratuity is part of CTC but usually not deducted from monthly Net Salary (it's separate)
  const totalDeductions = pf + esi + tax + professionalTax + loanDeduction + lopDeduction;
  const netSalary = totalEarnings - totalDeductions;
  const ctc = totalEarnings + gratuity;

  return {
    ...salaryData,
    totalEarnings,
    totalDeductions,
    netSalary,
    ctc,
    lop: lopDeduction,
    lopDays
  };
};

const defaultSample = [];

export default function MonthlyPayroll() {
  const [salaryRecords, setSalaryRecords] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [simulation, setSimulation] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filterBank, setFilterBank] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterDesignation, setFilterDesignation] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const [empResponse, payrollResponse, loanResponse] = await Promise.all([
        employeeAPI.getAllEmployees(),
        payrollAPI.list(),
        loanAPI.list()
      ]);
      
      const employees = Array.isArray(empResponse.data) ? empResponse.data : [];
      const payrolls = Array.isArray(payrollResponse.data) ? payrollResponse.data : [];
      const loans = loanResponse.data && loanResponse.data.loans ? loanResponse.data.loans : [];

      const mapped = employees.map(emp => {
        // Find matching payroll record
        const payrollRec = payrolls.find(p => p.employeeId === emp.employeeId);
        
        // Calculate Loan Deduction from active loans
        const empLoans = loans.filter(l => 
          l.employeeId === emp.employeeId && 
          l.status === 'active' && 
          l.paymentEnabled === true
        );
        
        const calculatedLoanDeduction = empLoans.reduce((sum, loan) => {
          if (!loan.amount || !loan.tenureMonths) return sum;
          const monthly = Math.round(loan.amount / loan.tenureMonths);
          return sum + monthly;
        }, 0);

        return {
          id: emp._id,
          employeeId: emp.employeeId,
          employeeName: emp.name,
          designation: emp.designation,
          department: emp.department || emp.division,
          division: emp.division,
          location: emp.location || emp.address || emp.currentAddress || 'Unknown',
          
          // Use payroll record if available, else fallback to employee record
          basicDA: payrollRec ? (payrollRec.basicDA || 0) : (emp.basicDA || emp.basic || 0),
          hra: payrollRec ? (payrollRec.hra || 0) : (emp.hra || 0),
          specialAllowance: payrollRec ? (payrollRec.specialAllowance || 0) : (emp.specialAllowance || 0),
          gratuity: payrollRec ? (payrollRec.gratuity || 0) : (emp.gratuity || 0),
          
          pf: payrollRec ? (payrollRec.pf || 0) : (emp.pf || 0),
          esi: payrollRec ? (payrollRec.esi || 0) : (emp.esi || 0),
          tax: payrollRec ? (payrollRec.tax || 0) : (emp.tax || 0),
          professionalTax: payrollRec ? (payrollRec.professionalTax || 0) : (emp.professionalTax || 0),
          
          // Use calculated loan deduction if available, otherwise fallback
          loanDeduction: calculatedLoanDeduction > 0 ? calculatedLoanDeduction : (payrollRec ? (payrollRec.loanDeduction || 0) : (emp.loanDeduction || 0)),
          
          lop: 0,
          status: 'Pending',
          
          accountNumber: payrollRec?.accountNumber || emp.bankAccount || '',
          ifscCode: payrollRec?.ifscCode || emp.ifsc || '',
          bankName: payrollRec?.bankName || emp.bankName || ''
        };
      });
      setSalaryRecords(mapped);
    } catch (e) {
      console.error('Failed to fetch employees or payrolls', e);
      setMessage('Error fetching data. Please check permissions.');
    } finally {
      setLoading(false);
    }
  };

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

  const runSimulation = async () => {
    if (selectedEmployees.length === 0) {
      setMessage('Select at least one employee to simulate payroll.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setProcessing(true);
    
    try {
      // Calculate month start and end
      const [year, month] = selectedMonth.split('-');
      // Start of selected month for LOP calculation
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      // End of selected month for LOP calculation
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

      // Fetch approved leaves with overlap and current balances
      const [leavesResponse, balancesResponse] = await Promise.all([
        leaveAPI.list({
          status: 'Approved',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          overlap: 'true'
        }),
        leaveAPI.getBalance()
      ]);
      
      const leaves = leavesResponse.data || [];
      const balancesList = Array.isArray(balancesResponse.data) ? balancesResponse.data : [];
      
      // Create a map of employee balances for quick lookup
      const balanceMap = new Map();
      balancesList.forEach(item => {
        if (item.employeeId && item.balances) {
          balanceMap.set(item.employeeId, item.balances);
        }
      });

      const selectedRecords = salaryRecords.filter(r => selectedEmployees.includes(r.id));

      const results = selectedRecords.map(rec => {
        // Calculate LOP days for this employee
        // Match by employeeId or loose match by name if needed
        const employeeLeaves = leaves.filter(l => 
          (l.employeeId && l.employeeId === rec.employeeId)
        );
        
        // Filter only LOP leaves (case-insensitive)
        const lopLeaves = employeeLeaves.filter(l => {
          const type = (l.leaveType || '').toLowerCase().replace(/\s+/g, '');
          return ['lop', 'lossofpay', 'unpaid', 'lwop'].includes(type);
        });

        // Calculate actual days falling within the selected month
        const explicitLopDays = lopLeaves.reduce((sum, l) => {
          const startOfDay = (d) => {
            const newD = new Date(d);
            newD.setHours(0, 0, 0, 0);
            return newD;
          };

          const lStart = startOfDay(l.startDate);
          const lEnd = startOfDay(l.endDate);
          const mStart = startOfDay(start);
          const mEnd = startOfDay(end);
          
          // Intersection with month
          const effectiveStart = lStart < mStart ? mStart : lStart;
          const effectiveEnd = lEnd > mEnd ? mEnd : lEnd;
          
          if (effectiveStart > effectiveEnd) return sum;
          
          // Calculate days difference (inclusive)
          const diffTime = Math.abs(effectiveEnd - effectiveStart);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          
          return sum + diffDays;
        }, 0);

        // Check for negative balances (excess leave taken)
        let negativeBalanceDays = 0;
        const empBalances = balanceMap.get(rec.employeeId);
        
        if (empBalances) {
          const cl = Number(empBalances.casual?.balance || 0);
          const sl = Number(empBalances.sick?.balance || 0);
          const pl = Number(empBalances.privilege?.balance || 0);
          
          // Sum up all negative balances
          negativeBalanceDays = Math.max(0, -cl) + Math.max(0, -sl) + Math.max(0, -pl);
        }
        
        // Total LOP days = Explicit LOP applications + Negative Balance days
        const lopDays = explicitLopDays + negativeBalanceDays;

        const base = calculateSalaryFields(rec, lopDays);
        const adjusted = { ...base };
        
        // Include gratuity by default (calculation already includes it)
        adjusted.salaryMonth = selectedMonth;
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

      setSimulation({ results, totals });
    } catch (err) {
      console.error("Simulation failed", err);
      setMessage("Failed to run simulation: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const savePayroll = async () => {
    if (!simulation) return;
    
    setSaving(true);
    try {
      // Format payload to match backend expectation
      const payload = {
        payrolls: simulation.results
      };
      
      const response = await monthlyPayrollAPI.save(payload);
      
      setMessage(`Successfully saved ${response.data.count} payroll records to database.`);
      setTimeout(() => setMessage(''), 5000);
      
    } catch (error) {
      console.error('Failed to save payroll:', error);
      setMessage('Error saving payroll data: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
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

  const departments = ['all', ...new Set(salaryRecords.map(r => r.department || '').filter(Boolean))];
  const designations = ['all', ...new Set(salaryRecords.map(r => r.designation || '').filter(Boolean))];
  const locations = ['all', ...new Set(salaryRecords.map(r => r.location || '').filter(Boolean))];
  const statuses = ['all', ...new Set(salaryRecords.map(r => r.status || '').filter(Boolean))];

  const filteredRecords = salaryRecords.filter(record => {
    // Search
    const matchesSearch = 
      (record.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Department
    const matchesDept = filterDepartment === 'all' || record.department === filterDepartment;

    // Designation
    const matchesDesig = filterDesignation === 'all' || record.designation === filterDesignation;

    const matchesLocation = filterLocation === 'all' || record.location === filterLocation;

    const matchesStatus = filterStatus === 'all' || String(record.status || '').toLowerCase() === String(filterStatus).toLowerCase();

    const baseMatches = matchesSearch && matchesDept && matchesDesig && matchesLocation && matchesStatus;

    // Bank
    const bankName = String(record.bankName || '');
    if (filterBank === 'all') return baseMatches;
    if (filterBank === 'hdfc') return baseMatches && bankName.toLowerCase().includes('hdfc');
    if (filterBank === 'sbi') return baseMatches && bankName.toLowerCase().includes('sbi');
    if (filterBank === 'axis') return baseMatches && bankName.toLowerCase().includes('axis');
    if (filterBank === 'indian') return baseMatches && bankName.toLowerCase().includes('indian');
    if (filterBank === 'icici') return baseMatches && bankName.toLowerCase().includes('icici');
    if (filterBank === 'other') return baseMatches && !['hdfc', 'sbi', 'axis', 'indian', 'icici'].some(bank => bankName.toLowerCase().includes(bank));
    return baseMatches;
  }).sort((a, b) => {
    const idA = a.employeeId || '';
    const idB = b.employeeId || '';
    return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
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

  const resetFilters = () => {
    setSearchTerm('');
    setFilterDepartment('all');
    setFilterDesignation('all');
    setFilterLocation('all');
    setFilterStatus('all');
    setFilterBank('all');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-1">
       
        
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded ${
          message.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {message}
        </div>
      )}

      {/* Controls */}
      <div className="bg-white p-5 rounded-lg shadow mb-3 border border-gray-200">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 items-end mb-4 border-b pb-4">
          {/* Search */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Name or ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 pl-8 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Filter className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Department</label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Departments</option>
              {departments.filter(d => d !== 'all').map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Designation */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Designation</label>
            <select
              value={filterDesignation}
              onChange={(e) => setFilterDesignation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Designations</option>
              {designations.filter(d => d !== 'all').map(desig => (
                <option key={desig} value={desig}>{desig}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Location</label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Locations</option>
              {locations.filter(l => l !== 'all').map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              {statuses.filter(s => s !== 'all').map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Bank</label>
            <select
              value={filterBank}
              onChange={(e) => setFilterBank(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        </div>

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
            <label className="text-sm font-medium text-gray-700 mb-1 block">Selected Employees</label>
            <div className="px-3 py-2 border border-gray-300 rounded bg-gray-50 text-center">
              <span className="font-medium text-blue-600">{selectedEmployees.length}</span>
              <span className="text-gray-600"> / {filteredRecords.length} filtered</span>
            </div>
            
          </div>
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
            onClick={resetFilters}
            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Reset Filters
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
                simulate
              </>
            )}
          </button>
        </div>
        </div>
      </div>

      {/* Employee/Salary Records Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="overflow-auto max-h-[70vh]">
          <table className="min-w-[1200px] w-full divide-y divide-gray-200">
            <thead className="bg-[#262760] sticky top-0 z-30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider sticky left-0 z-40 bg-[#262760] w-[90px] min-w-[90px] max-w-[90px]">
                  Select
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider sticky left-[90px] z-40 bg-[#262760] w-[140px] min-w-[140px] max-w-[140px]">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider sticky left-[230px] z-40 bg-[#262760] w-[240px] min-w-[240px] max-w-[240px]">
                  Employee Name
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
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      Loading employees...
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No employees found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => {
                  const salary = calculateSalaryFields(record);
                  return (
                    <tr key={record.id} className="group hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap sticky left-0 z-20 bg-white group-hover:bg-gray-50 w-[90px] min-w-[90px] max-w-[90px]">
                      <input 
                        type="checkbox" 
                        checked={selectedEmployees.includes(record.id)} 
                        onChange={() => toggleSelectEmployee(record.id)} 
                        className="w-4 h-4 text-blue-600"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap sticky left-[90px] z-20 bg-white group-hover:bg-gray-50 w-[140px] min-w-[140px] max-w-[140px]">
                      <div className="text-sm font-medium text-gray-900">{record.employeeId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap sticky left-[230px] z-20 bg-white group-hover:bg-gray-50 w-[240px] min-w-[240px] max-w-[240px]">
                      <div className="font-medium text-gray-900">{record.employeeName}</div>
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
              }))}
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

      {/* Simulation Result Modal */}
      {simulation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-gray-200">
            {/* Header - Frozen */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white rounded-t-lg z-10 shrink-0">
              <h3 className="text-lg font-semibold text-gray-800">
                Simulation Preview ({simulation.results.length} employees)
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={savePayroll} 
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                  disabled={saving}
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Save
                </button>
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

            {/* Scrollable Content */}
            <div className="overflow-auto flex-1 p-5">
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full divide-y divide-gray-200">
                  <thead className="bg-[#262760] sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider sticky left-0 z-20 bg-[#262760] w-[280px] min-w-[280px] max-w-[280px]">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Total Earnings
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        LOP Days
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        LOP Deduction
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Loan Deduction
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
                      <tr key={result.id} className="group hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap sticky left-0 z-10 bg-white group-hover:bg-gray-50 w-[280px] min-w-[280px] max-w-[280px]">
                          <div className="font-medium text-gray-900">{result.employeeName}</div>
                          <div className="text-xs text-gray-500">{result.employeeId}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {formatCurrency(result.totalEarnings)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-red-600 font-medium">
                          {result.lopDays || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                          {formatCurrency(result.lop)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                          {formatCurrency(result.loanDeduction)}
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
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                        {formatCurrency(simulation.results.reduce((sum, r) => sum + (r.lop || 0), 0))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                        {formatCurrency(simulation.results.reduce((sum, r) => sum + (r.loanDeduction || 0), 0))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {formatCurrency(simulation.totals.totalDeductions)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-green-600">
                        {formatCurrency(simulation.totals.netSalary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Mixed Banks
                        </span> */}
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
          </div>
        </div>
      )}

      {/* Empty state */}
      {!simulation && selectedEmployees.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          
        </div>
      )}
    </div>
  );
}
