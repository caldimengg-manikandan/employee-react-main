// src/pages/salaryslips/SalarySlips.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { monthlyPayrollAPI, employeeAPI } from '../../services/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const SalarySlips = () => {
  const navigate = useNavigate();
  const [financialYear, setFinancialYear] = useState('');
  const [month, setMonth] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [uanNumber, setUanNumber] = useState('');
  const [payslipData, setPayslipData] = useState(null);
  const [showPayslip, setShowPayslip] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    const init = async () => {
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      if (!user?.id) {
        navigate('/login');
        return;
      }
      try {
        const me = await employeeAPI.getMyProfile();
        const empId = me?.data?.employeeId || user.employeeId || user.username || user.id;
        setEmployeeId(empId);
        if (me?.data) {
          setPanNumber(me.data.pan || '');
          setUanNumber(me.data.uan || '');
        }
      } catch (err) {
        const fallbackId = user.employeeId || user.username || user.id;
        setEmployeeId(fallbackId);
      }
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let i = -2; i <= 1; i++) {
        const year = currentYear + i;
        years.push(`${year}-${year + 1}`);
      }
      setAvailableYears(years);
    };
    init();
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
    if (selectedDate > currentMonthStart) {
      alert("Payslip for this month is not available yet.");
      return;
    }

    const formattedMonth = `${selectedYear}-${String(selectedMonthNum).padStart(2, '0')}`;
    
    setIsLoading(true);
    
    try {
      const response = await monthlyPayrollAPI.list({ month: formattedMonth });
      const records = Array.isArray(response?.data) ? response.data : [];
      const rec = records.find(r => String(r.employeeId) === String(employeeId));
      if (!rec) {
        alert('Payslip not found for the selected period');
        setIsLoading(false);
        return;
      }
      
      // Calculate actual days in the month
      const daysInMonth = new Date(selectedYear, selectedMonthNum, 0).getDate();
      const workingDays = daysInMonth;
      
      const lopDays = Number(rec.lopDays || 0);
      const paidDays = Math.max(0, workingDays - lopDays);
      const paidDate = rec.paymentDate || `${selectedYear}-${String(selectedMonthNum).padStart(2, '0')}-28`;
      const mapped = {
        employeeId: rec.employeeId,
        employeeName: rec.employeeName,
        designation: rec.designation || '',
        department: rec.department || '',
        panNumber: panNumber || 'N/A',
        uanNumber: uanNumber || 'N/A',
        month: selectedMonth,
        year: selectedYear,
        financialYear,
        basicSalary: Number(rec.basicDA || 0),
        hra: Number(rec.hra || 0),
        specialAllowance: Number(rec.specialAllowance || 0),
        totalEarnings: Number(rec.totalEarnings || 0),
        pfDeduction: Number(rec.pf || 0),
        professionalTax: Number(rec.professionalTax || 0),
        tds: Number(rec.tax || 0),
        esi: Number(rec.esi || 0),
        lopDeduction: Number(rec.lop || 0),
        loanDeduction: Number(rec.loanDeduction || 0),
        gratuity: Number(rec.gratuity || 0),
        otherDeductions: 0,
        totalDeductions: Number(rec.totalDeductions || 0),
        netSalary: Number(rec.netSalary || 0),
        bankName: rec.bankName || '',
        accountNumber: rec.accountNumber || '',
        ifscCode: rec.ifscCode || '',
        workingDays,
        paidDays,
        leaveDays: lopDays,
        paidDate,
        monthYear: formattedMonth
      };
      setPayslipData(mapped);
      setShowPayslip(true);
    } catch (error) {
      alert('Failed to load payslip. Please try again.');
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
      panNumber: panNumber || 'N/A',
      uanNumber: uanNumber || 'N/A',
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
      loanDeduction: 1000,
      otherDeductions: 0,
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

  useEffect(() => {
    if (payslipData) {
      setPayslipData(prev => ({
        ...prev,
        panNumber: panNumber || prev?.panNumber || 'N/A',
        uanNumber: uanNumber || prev?.uanNumber || 'N/A',
      }));
    }
  }, [panNumber, uanNumber]); 

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
    const element = document.getElementById('payslip-content');
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let position = 0;
    if (imgHeight < pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      while (heightLeft > 0) {
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        if (heightLeft > 0) {
          pdf.addPage();
          position = position - pageHeight;
        }
      }
    }
    pdf.save(`payslip_${employeeId}_${payslipData.monthYear}.pdf`);
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

  // Payslip Component with New Template Styling
  const PayslipViewer = ({ data }) => (
    <div className="bg-white relative min-h-[1120px] w-[794px] mx-auto shadow-lg print:shadow-none print:w-full print:min-h-0 font-sans" id="payslip-content">
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
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
            height: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none;
            border: none;
            background: white;
          }
          
          /* Hide non-print elements */
          header, button, .no-print, .md\\:hidden, .md\\:inline-flex, .md\\:inline-block {
            display: none !important;
          }
        }
      `}</style>

      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <img 
          src="/images/steel-logo.png" 
          alt="Watermark" 
          className="w-[500px] opacity-[0.05] grayscale"
        />
      </div>

      <div className="relative z-10 flex flex-col h-full justify-between min-h-[1120px] print:min-h-0">
        {/* Header */}
        <div className="w-full flex h-32 relative overflow-hidden">
            {/* Left Part: Blue Background */}
            <div className="relative w-[60%] bg-[#1e2b58] flex items-center pl-8 pr-12 z-10" style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)' }}>
                <div className="flex items-center gap-4">
                    <img src="/images/steel-logo.png" alt="CALDIM" className="h-16 w-auto brightness-0 invert" />
                    <div className="text-white">
                        <h1 className="text-3xl font-bold leading-none tracking-wide">CALDIM</h1>
                        <p className="text-[10px] tracking-[0.2em] mt-1 text-orange-400 font-semibold">ENGINEERING PRIVATE LIMITED</p>
                    </div>
                </div>
            </div>
            
            {/* Orange Accent */}
            <div className="absolute left-[50%] top-0 h-32 w-16 bg-[#f37021]" style={{ clipPath: 'polygon(40% 0, 100% 0, 60% 100%, 0% 100%)', zIndex: 0 }}></div>
          
            {/* Right Part: Address */}
            <div className="flex-1 flex flex-col justify-center items-end pr-8 pt-2 z-10">
                 <div className="flex items-center mb-2">
                     <span className="font-bold text-gray-800 mr-3 text-lg">044-47860455</span>
                     <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                        </svg>
                     </div>
                 </div>
                 <div className="flex items-start justify-end text-right">
                     <span className="text-sm font-semibold text-gray-700 w-64 leading-tight">No.118, Minimac Center, Arcot Road, Valasaravakkam, Chennai - 600 087.</span>
                     <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs ml-3 mt-1 shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                     </div>
                 </div>
            </div>
        </div>

        {/* Content Body */}
        <div className="px-12 mb-2  py-6 flex-grow">
            
          
            
            <div className="text-center mb-4 bg-blue-50 py-0 rounded border border-blue-100">
               <p className="text-gray-800 font-medium">
                  Payslip for the period of: <span className="font-bold text-[#1e2b58] text-lg ml-2">{data.month} {data.year}</span>
               </p>
            </div>

            {/* Employee Details & Bank Details */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-[#1e2b58]">
                <h3 className="text-[#1e2b58] font-bold text-lg mb-4 border-b pb-2 border-gray-200">Employee Details</h3>
                <div className="space-y-2 text-sm">
                   <div className="flex"><span className="w-32 text-gray-500 font-medium">Employee ID:</span> <span className="font-bold text-gray-800">{data.employeeId}</span></div>
                   <div className="flex"><span className="w-32 text-gray-500 font-medium">Name:</span> <span className="font-bold text-gray-800">{data.employeeName}</span></div>
                   <div className="flex"><span className="w-32 text-gray-500 font-medium">Designation:</span> <span className="font-bold text-gray-800">{data.designation}</span></div>
                   {/* <div className="flex"><span className="w-32 text-gray-500 font-medium">Department:</span> <span className="font-bold text-gray-800">{data.department}</span></div> */}
                   <div className="flex"><span className="w-32 text-gray-500 font-medium">PAN Number:</span> <span className="font-bold text-gray-800">{data.panNumber}</span></div>
                   <div className="flex"><span className="w-32 text-gray-500 font-medium">UAN:</span> <span className="font-bold text-gray-800">{data.uanNumber}</span></div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-[#f37021]">
                <h3 className="text-[#1e2b58] font-bold text-lg mb-4 border-b pb-2 border-gray-200">Bank Details</h3>
                <div className="space-y-2 text-sm">
                   <div className="flex"><span className="w-32 text-gray-500 font-medium">Bank Name:</span> <span className="font-bold text-gray-800">{data.bankName}</span></div>
                   <div className="flex"><span className="w-32 text-gray-500 font-medium">Account No:</span> <span className="font-bold text-gray-800">{data.accountNumber}</span></div>
                   <div className="flex"><span className="w-32 text-gray-500 font-medium">IFSC Code:</span> <span className="font-bold text-gray-800">{data.ifscCode}</span></div>
                   <div className="flex"><span className="w-32 text-gray-500 font-medium">Payment Date:</span> <span className="font-bold text-gray-800">{data.paidDate}</span></div>
                   {/* <div className="flex"><span className="w-32 text-gray-500 font-medium">Paid Days:</span> <span className="font-bold text-gray-800">{data.paidDays}</span></div> */}
                   {/* <div className="flex"><span className="w-32 text-gray-500 font-medium">LOP Days:</span> <span className="font-bold text-gray-800">{data.leaveDays}</span></div> */}
                </div>
              </div>
            </div>

            {/* Salary Table */}
            <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-2 bg-[#1e2b58] text-white text-center font-bold py-2">
                    <div>EARNINGS</div>
                    <div>DEDUCTIONS</div>
                </div>
                <div className="grid grid-cols-2">
                    {/* Earnings Column */}
                    <div className="border-r border-gray-200">
                        <div className="p-4 space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-gray-600">Basic Salary</span> <span className="font-bold text-gray-800">{data.basicSalary.toLocaleString('en-IN')}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-600">HRA</span> <span className="font-bold text-gray-800">{data.hra.toLocaleString('en-IN')}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-600">Special Allowance</span> <span className="font-bold text-gray-800">{data.specialAllowance.toLocaleString('en-IN')}</span></div>
                            
                            <div className="pt-4 mt-4 border-t border-gray-200 flex justify-between font-bold text-[#1e2b58] text-lg">
                                <span>Total Earnings</span>
                                <span>₹{data.totalEarnings.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Deductions Column */}
                    <div>
                        <div className="p-4 space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-gray-600">Provident Fund</span> <span className="font-bold text-gray-800">{data.pfDeduction.toLocaleString('en-IN')}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-600">Professional Tax</span> <span className="font-bold text-gray-800">{data.professionalTax.toLocaleString('en-IN')}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-600">TDS</span> <span className="font-bold text-gray-800">{data.tds.toLocaleString('en-IN')}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-600">ESI</span> <span className="font-bold text-gray-800">{data.esi.toLocaleString('en-IN')}</span></div>
                            {data.lopDeduction > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Loss of Pay</span> <span className="font-bold text-gray-800">{data.lopDeduction.toLocaleString('en-IN')}</span></div>}
                            {(data.loanDeduction > 0) && (
                                <>
                                    {data.loanDeduction > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Loan</span> <span className="font-bold text-gray-800">{data.loanDeduction.toLocaleString('en-IN')}</span></div>}
                                </>
                            )}

                            <div className="pt-4 mt-4 border-t border-gray-200 flex justify-between font-bold text-red-600 text-lg">
                                <span>Total Deductions</span>
                                <span>₹{data.totalDeductions.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Net Salary */}
            <div className="bg-[#1e2b58] text-white p-6 rounded-lg shadow-md mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-gray-300 text-sm mb-1 uppercase tracking-wider">Net Salary Payable</p>
                        <p className="text-2xl font-bold">₹{data.netSalary.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-300 text-xs mb-1">Amount in words</p>
                        <p className="font-medium text-lg italic">{numberToWords(data.netSalary)} Rupees Only</p>
                    </div>
                </div>
            </div>
            
            <p className="text-center text-xs text-gray-500 mt-8">This is a computer-generated document and does not require a signature.</p>
        </div>

        {/* Footer */}
        <div className="w-full flex items-end mt-auto">
            {/* Orange Line */}
            <div className="h-3 bg-[#f37021] flex-1 mb-0"></div>
            
            {/* Blue Block */}
            <div className="bg-[#1e2b58] text-white py-3 px-10 pl-16 flex flex-col items-end justify-center" style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)', minWidth: '450px' }}>
                <div className="text-sm font-medium tracking-wide">Website : www.caldimengg.com</div>
                <div className="text-sm font-medium tracking-wide mt-1">CIN U74999TN2016PTC110683</div>
            </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header>
        
       
        <div className="flex items-center gap-2">
          {showPayslip && (
            <>
  
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
         
        </div>
      </header>

      <div className="w-full px-3 sm:px-4 py-6 sm:py-8 print:py-0 print:px-0 print:w-full">

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

                {/* <button
                  onClick={() => navigate('/salaryslips/pf-gratuity')}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-[#262760] text-white rounded-lg hover:bg-[#1e2b58] transition-colors shadow-md font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  View PF & Gratuity
                </button> */}
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
