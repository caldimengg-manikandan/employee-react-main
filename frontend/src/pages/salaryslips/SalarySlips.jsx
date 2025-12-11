// src/pages/salaryslips/SalarySlips.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SalarySlips = () => {
  const navigate = useNavigate();
  const [financialYear, setFinancialYear] = useState('');
  const [month, setMonth] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [payslipData, setPayslipData] = useState(null);
  const [showPayslip, setShowPayslip] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    // Check authentication
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!user.id) {
      navigate('/login');
      return;
    }
    setEmployeeId(user.id || user.username);
    
    // Generate financial years (last 3 years + current + next)
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -2; i <= 1; i++) {
      const year = currentYear + i;
      years.push(`${year}-${year + 1}`);
    }
    setAvailableYears(years);
  }, [navigate]);

  const fetchPayslip = async (selectedMonth) => {
    if (!financialYear || !selectedMonth) return;

    // Calculate if payslip should be available
    const yearStart = parseInt(financialYear.split('-')[0]);
    const monthMap = {
      January: 1, February: 2, March: 3, April: 4,
      May: 5, June: 6, July: 7, August: 8,
      September: 9, October: 10, November: 11, December: 12
    };
    
    const selectedMonthNum = monthMap[selectedMonth];
    const selectedYear = selectedMonthNum >= 4 ? yearStart : yearStart + 1;
    const selectedDate = new Date(selectedYear, selectedMonthNum - 1, 1);
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Check if selected month is in the future
    if (selectedDate >= currentMonthStart) {
      alert("Payslip for this month is not available yet.");
      return;
    }

    const formattedMonth = `${selectedYear}-${String(selectedMonthNum).padStart(2, '0')}`;
    
    setIsLoading(true);
    
    try {
      // Replace with your actual API endpoint
      const response = await axios.get('/api/payslips', {
        params: {
          employeeId,
          month: formattedMonth
        }
      });
      
      if (response.data.success) {
        setPayslipData(response.data.data);
        setShowPayslip(true);
      } else {
        alert('Payslip not found for the selected period');
      }
    } catch (error) {
      console.error('Error fetching payslip:', error);
      alert('Failed to load payslip. Please try again.');
      // For demo purposes, show mock data
      showMockPayslip(selectedMonth, selectedYear, formattedMonth, selectedMonthNum);
    } finally {
      setIsLoading(false);
    }
  };

  const showMockPayslip = (selectedMonth, selectedYear, formattedMonth, selectedMonthNum) => {
    const mockData = {
      employeeId,
      employeeName: "John Doe",
      designation: "Software Engineer",
      department: "IT",
      month: selectedMonth,
      year: selectedYear,
      financialYear: financialYear,
      basicSalary: 50000,
      hra: 20000,
      specialAllowance: 15000,
      totalEarnings: 85000,
      pfDeduction: 1800,
      professionalTax: 200,
      tds: 5000,
      otherDeductions: 1000,
      totalDeductions: 8000,
      netSalary: 77000,
      bankName: "ABC Bank",
      accountNumber: "XXXXXX7890",
      ifscCode: "ABC1234567",
      workingDays: 22,
      paidDays: 21,
      leaveDays: 1,
      paidDate: `${selectedYear}-${String(selectedMonthNum).padStart(2, '0')}-28`,
      monthYear: formattedMonth
    };
    
    setPayslipData(mockData);
    setShowPayslip(true);
  };

  const handleMonthChange = (selectedMonth) => {
    setMonth(selectedMonth);
    if (financialYear) {
      fetchPayslip(selectedMonth);
    }
  };

  const handleGoHome = () => {
    navigate('/home');
  };

  const handleBackToSelection = () => {
    setShowPayslip(false);
    setPayslipData(null);
  };

  const handlePrint = () => {
    // Add print class to body to hide non-print elements
    document.body.classList.add('printing');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing');
      }, 100);
    }, 100);
  };

  const handleDownloadPDF = async () => {
    if (!payslipData) return;
    
    try {
      const response = await axios.get(`/api/payslips/download/${employeeId}/${payslipData.monthYear}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip_${employeeId}_${payslipData.monthYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. You can use the print function instead.');
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  // Helper function to convert number to words
  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (num === 0) return 'Zero';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred ' + numberToWords(num % 100);
    if (num < 100000) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;
      return numberToWords(thousands) + ' Thousand' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
    }
    if (num < 10000000) {
      const lakhs = Math.floor(num / 100000);
      const remainder = num % 100000;
      return numberToWords(lakhs) + ' Lakh' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
    }
    return 'Amount too large';
  };

  // Payslip Component with Blue Logo Styling
  const PayslipViewer = ({ data }) => (
    <div className="bg-white p-6 rounded-lg shadow-lg print:p-0 print:shadow-none print:rounded-none" id="payslip-content">
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body.printing * {
            visibility: hidden;
          }
          
          body.printing #payslip-content,
          body.printing #payslip-content * {
            visibility: visible;
          }
          
          body.printing #payslip-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none;
            border: none;
            background: white;
          }
          
          /* Hide non-print elements */
          header, button, .no-print, .md\\:hidden, .md\\:inline-flex, .md\\:inline-block {
            display: none !important;
          }
          
          body {
            background: white !important;
            font-size: 11pt !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          #payslip-content {
            box-shadow: none !important;
            border: none !important;
            padding: 20px !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          
          .container {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .bg-gray-50, .bg-blue-50, .bg-green-50, .bg-purple-50, .bg-gradient-to-r {
            background: white !important;
            background-image: none !important;
          }
          
          .border, .border-2, .border-b, .border-t {
            border-color: #000 !important;
          }
          
          .text-blue-900, .text-blue-700, .text-green-700, .text-red-600, .text-[#262760] {
            color: black !important;
          }
          
          .logo-blue {
            filter: brightness(0) saturate(100%) invert(25%) sepia(99%) saturate(2000%) hue-rotate(200deg) brightness(90%) contrast(100%) !important;
          }
        }
      `}</style>

      {/* Simple Header with Blue Logo */}
      <div className="flex flex-col items-center justify-center mb-8 border-b-2 border-blue-500 pb-4 print:border-black print:pb-3">
        <div className="flex items-center mb-2 print:mb-1">
          <img
            src="/images/steel-logo.png"
            alt="CALDIM"
            className="h-20 w-auto mr-4 logo-blue print :h-16"
          />
          <h1 className="text-3xl font-bold text-blue-900 print:text-2xl print:text-black">CALDIM ENGINEERING PVT LTD</h1>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mt-2 print:text-xl print:text-black">SALARY SLIP</h2>
        <p className="text-gray-600 mt-1 print:text-sm print:text-black">
          Period: <span className="font-semibold">{data.month} {data.year}</span> | Financial Year: <span className="font-semibold">{data.financialYear}</span>
        </p>
      </div>

      {/* Employee & Company Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:gap-6 print:mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2 border-blue-600 print:text-base print:border-black print:text-black">Employee Details</h3>
          <div className="space-y-2 print:space-y-1">
            <p><span className="font-medium text-gray-700 print:text-black">Employee ID:</span> <span className="ml-2">{data.employeeId}</span></p>
            <p><span className="font-medium text-gray-700 print:text-black">Name:</span> <span className="ml-2">{data.employeeName}</span></p>
            <p><span className="font-medium text-gray-700 print:text-black">Designation:</span> <span className="ml-2">{data.designation}</span></p>
            <p><span className="font-medium text-gray-700 print:text-black">Department:</span> <span className="ml-2">{data.department}</span></p>
            <p><span className="font-medium text-gray-700 print:text-black">PAN Number:</span> <span className="ml-2">ABCD1234E</span></p>
            <p><span className="font-medium text-gray-700 print:text-black">UAN:</span> <span className="ml-2">100123456789</span></p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2 border-blue-600 print:text-base print:border-black print:text-black">Payment & Bank Details</h3>
          <div className="space-y-2 print:space-y-1">
            <p><span className="font-medium text-gray-700 print:text-black">Bank Name:</span> <span className="ml-2">{data.bankName}</span></p>
            <p><span className="font-medium text-gray-700 print:text-black">Account Number:</span> <span className="ml-2">{data.accountNumber}</span></p>
            <p><span className="font-medium text-gray-700 print:text-black">IFSC Code:</span> <span className="ml-2">{data.ifscCode}</span></p>
            <p><span className="font-medium text-gray-700 print:text-black">Payment Mode:</span> <span className="ml-2">Bank Transfer (NEFT)</span></p>
            <p><span className="font-medium text-gray-700 print:text-black">Pay Date:</span> <span className="ml-2">{data.paidDate}</span></p>
          </div>
        </div>
      </div>

      {/* Attendance Summary */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200 print:bg-white print:border-black print:p-3 print:mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2 border-blue-600 print:text-base print:border-black print:text-black">Attendance Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:gap-3">
          <div className="text-center p-3 bg-white rounded shadow border border-blue-100 print:border-black print:p-2">
            <p className="text-sm text-gray-600 print:text-black">Working Days</p>
            <p className="text-xl font-bold text-blue-700 print:text-lg print:text-black">{data.workingDays}</p>
          </div>
          <div className="text-center p-3 bg-white rounded shadow border border-blue-100 print:border-black print:p-2">
            <p className="text-sm text-gray-600 print:text-black">Paid Days</p>
            <p className="text-xl font-bold text-green-700 print:text-lg print:text-black">{data.paidDays}</p>
          </div>
          <div className="text-center p-3 bg-white rounded shadow border border-blue-100 print:border-black print:p-2">
            <p className="text-sm text-gray-600 print:text-black">Leave Days</p>
            <p className="text-xl font-bold text-amber-600 print:text-lg print:text-black">{data.leaveDays}</p>
          </div>
          <div className="text-center p-3 bg-white rounded shadow border border-blue-100 print:border-black print:p-2">
            <p className="text-sm text-gray-600 print:text-black">Pay Slip No</p>
            <p className="text-xl font-bold text-purple-600 print:text-lg print:text-black">PS{data.monthYear.replace('-', '')}{data.employeeId.slice(-4)}</p>
          </div>
        </div>
      </div>

      {/* Earnings and Deductions - Removed conveyance and medical allowances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:gap-6 print:mb-6">
        {/* Earnings */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-blue-600 print:text-base print:border-black print:text-black">Earnings (₹)</h3>
          <div className="space-y-3 print:space-y-2">
            <div className="flex justify-between">
              <span>Basic Salary</span>
              <span className="font-medium">{data.basicSalary.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span>House Rent Allowance (HRA)</span>
              <span className="font-medium">{data.hra.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span>Special Allowance</span>
              <span className="font-medium">{data.specialAllowance.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between border-t-2 pt-3 font-bold text-lg border-blue-600 print:border-black print:pt-2">
              <span>Total Earnings</span>
              <span className="text-green-700 print:text-black">₹{data.totalEarnings.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-blue-600 print:text-base print:border-black print:text-black">Deductions (₹)</h3>
          <div className="space-y-3 print:space-y-2">
            <div className="flex justify-between">
              <span>Provident Fund (PF)</span>
              <span className="font-medium">{data.pfDeduction.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span>Professional Tax</span>
              <span className="font-medium">{data.professionalTax.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax Deducted at Source (TDS)</span>
              <span className="font-medium">{data.tds.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span>Employee State Insurance (ESI)</span>
              <span className="font-medium">75.00</span>
            </div>
            <div className="flex justify-between">
              <span>Other Deductions</span>
              <span className="font-medium">{data.otherDeductions.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between border-t-2 pt-3 font-bold text-lg border-blue-600 print:border-black print:pt-2">
              <span>Total Deductions</span>
              <span className="text-red-600 print:text-black">₹{data.totalDeductions.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net Salary */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-300 print:bg-white print:border-black print:p-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-800 print:text-lg print:text-black">NET SALARY PAYABLE</h3>
            <p className="text-gray-600 mt-1 print:text-sm print:text-black">Amount transferred to your bank account via NEFT</p>
          </div>
          <div className="text-center md:text-right mt-4 md:mt-0 print:mt-2">
            <div className="text-3xl md:text-4xl font-bold text-green-700 mb-2 print:text-2xl print:text-black">
              ₹{data.netSalary.toLocaleString('en-IN')}
            </div>
            <div className="text-sm text-gray-600 bg-white p-2 rounded border border-blue-200 print:text-xs print:border-black print:p-1">
              <span className="font-medium">In Words:</span> {numberToWords(data.netSalary)} Rupees Only
            </div>
          </div>
        </div>
      </div>

      {/* CALDIM Address Footer */}
      <div className="mt-8 pt-6 border-t-2 border-gray-300 print:mt-6 print:pt-4 print:border-black">
        <div className="text-center text-sm text-gray-700 mb-4 print:text-xs print:text-black">
          <div className="font-bold text-base mb-2 text-blue-900 print:text-sm print:text-black">CALDIM ENGINEERING PVT LTD</div>
          <div className="mb-1">CIN: U74999TN2016PTC110683 | Email: support@caldimengg.in</div>
          
          {/* Head Office */}
          <div className="mt-4 mb-2">
            <div className="font-semibold text-blue-800 mb-1 print:text-black">Head Office:</div>
            <div className="text-gray-600 print:text-black">
              No.118, Minimac Center, Arcot Road, Valasaravakkam, Chennai - 600 087
            </div>
          </div>
          
          {/* Branch Office */}
          <div className="mt-2">
            <div className="font-semibold text-blue-800 mb-1 print:text-black">Branch Office:</div>
            <div className="text-gray-600 print:text-black">
              2nd Floor, Plot No. 23,24 &25, Near check post , N.H – 207, 
              <br />
              Bagalur Road, Nallur Panchayat, Hosur – 635103
            </div>
          </div>
        </div>

        {/* Final Footer with disclaimer */}
        <div className="mt-6 pt-4 border-t border-gray-200 print:mt-4 print:pt-3 print:border-black">
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 print:text-xxs print:text-black">
            <div className="text-left mb-2 md:mb-0 print:mb-1">
              <p>This is a computer-generated document and does not require a signature.</p>
              <p className="mt-1 print:mt-0">For any discrepancies, please contact HR department within 7 days of receipt.</p>
            </div>
            <div className="text-center mb-2 md:mb-0 print:mb-1">
              <p className="font-bold text-gray-700 print:text-black">CONFIDENTIAL</p>
              <p>For Employee Use Only</p>
            </div>
            <div className="text-right print:text-center">
              <p>Authorized Signatory</p>
              <p>HR Department</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex justify-between items-center px-4 sm:px-6 py-4 bg-[#262760] text-white shadow-md print:hidden">
        <button 
          onClick={showPayslip ? handleBackToSelection : handleGoHome}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-medium transition-colors flex items-center"
        >
          {showPayslip ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Home
            </>
          )}
        </button>
        <div className="text-center flex-1">
          <h1 className="text-lg sm:text-xl font-semibold">
            {showPayslip ? (
              <>
                Payslip - {payslipData?.month} {payslipData?.year}
                <span className="block text-sm font-normal mt-1">
                  Financial Year: {payslipData?.financialYear}
                </span>
              </>
            ) : (
              'Salary Slips - CALDIM ENGINEERING'
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {showPayslip && (
            <>
              <button 
                onClick={handlePrint}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors hidden md:inline-flex items-center"
                title="Print Payslip"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                </svg>
                Print
              </button>
              <button 
                onClick={handleDownloadPDF}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors hidden md:inline-flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Download PDF
              </button>
            </>
          )}
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a2 2 0 10-2.83 1.757l2.83 2.829a2 2 0 101.415-1.414l-2.83-2.829A1.99 1.99 0 0014 7z" clipRule="evenodd" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-7xl print:py-0 print:px-0 print:max-w-none">
        {!showPayslip ? (
          <div className="flex flex-col lg:flex-row gap-6 print:hidden">
            {/* Controls Panel */}
            <div className="lg:w-80 w-full bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <div className="flex items-center mb-6 border-b pb-3">
                <div className="bg-[#262760] p-2 rounded-lg mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">Select Pay Period</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="finYear" className="block text-sm font-medium text-gray-700 mb-2">
                    Financial Year:
                  </label>
                  <select
                    id="finYear"
                    value={financialYear}
                    onChange={(e) => {
                      setFinancialYear(e.target.value);
                      if (month) handleMonthChange(month);
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    disabled={isLoading}
                  >
                    <option value="">-- Select Financial Year --</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-2">
                    Month:
                  </label>
                  <select
                    id="month"
                    value={month}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    disabled={isLoading || !financialYear}
                  >
                    <option value="">-- Select Month --</option>
                    {months.map((monthName) => (
                      <option key={monthName} value={monthName}>
                        {monthName}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <h3 className="font-medium text-blue-800">Instructions</h3>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      Select financial year first
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      Then select month to view payslip
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      Payslips are available after month-end processing
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      Current/future months will show as unavailable
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Panel */}
            <div className="flex-1">
              <div className="bg-white rounded-xl shadow-md p-6 h-full border border-gray-200">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-96">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-[#262760] mb-6"></div>
                      <p className="text-xl font-semibold text-[#262760] mb-2">
                        Loading Payslip...
                      </p>
                      <p className="text-gray-600">
                        Fetching your salary details for {month} {financialYear}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                    <div className="text-center px-4">
                      <div className="text-6xl mb-6">💰</div>
                      <h3 className="text-2xl font-medium mb-3 text-gray-700">CALDIM Salary Slips Portal</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="text-blue-600 font-bold mb-2 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            Secure
                          </div>
                          <p className="text-sm text-gray-600">Encrypted and secure access to your payslips</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <div className="text-green-600 font-bold mb-2 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            Historical
                          </div>
                          <p className="text-sm text-gray-600">Access payslips from previous years</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <div className="text-purple-600 font-bold mb-2 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Download
                          </div>
                          <p className="text-sm text-gray-600">Print or download PDF copies</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : payslipData ? (
          <>
            {/* Action Buttons for Mobile */}
            <div className="md:hidden flex gap-2 mb-6 print:hidden">
              <button 
                onClick={handlePrint}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                </svg>
                Print
              </button>
              <button 
                onClick={handleDownloadPDF}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Download
              </button>
            </div>
            
            <PayslipViewer data={payslipData} />
          </>
        ) : null}
      </div>
    </div>
  );
};

export default SalarySlips;