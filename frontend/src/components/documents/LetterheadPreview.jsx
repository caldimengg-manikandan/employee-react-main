import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Printer, Download, Save } from 'lucide-react';
import caldimLetterheadImg from '../../assets/caldim_letterhead.png';

const LetterheadPreview = ({
  documentNumber = 'CAL-DOC-PREVIEW',
  title = 'OFFICIAL DOCUMENT',
  content = '',
  employeeDetails = {},
  status = 'Active',
  showActions = true,
  onSave,
  onLogAction
}) => {
  const previewRef = useRef(null);

  const currentDateStr = employeeDetails?.currentDate || new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Handle PDF Download
  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;
    try {
      const element = previewRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${documentNumber}_${title.replace(/\s+/g, '_')}.pdf`);

      if (onLogAction) {
        onLogAction('DOWNLOADED');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  // Handle Native Print
  const handlePrint = () => {
    if (onLogAction) {
      onLogAction('PRINTED');
    }
    window.print();
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Action Toolbar */}
      {showActions && (
        <div className="flex items-center justify-end w-full max-w-[820px] mb-4 bg-gray-100 p-3 rounded-xl border border-gray-200 print:hidden">
          <div className="flex items-center space-x-2">
            {onSave && (
              <button
                onClick={onSave}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gray-800 text-white text-xs font-bold rounded-lg hover:bg-gray-900 shadow-sm transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Record</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5 text-gray-600" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white text-xs font-bold rounded-lg hover:from-blue-800 hover:to-indigo-800 shadow-md transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* Printable A4 Container with Caldim_LH.pdf Background */}
      <div className="w-full overflow-x-auto flex justify-center bg-gray-200/70 p-4 print:p-0 print:bg-white">
        <div
          ref={previewRef}
          className="w-[210mm] min-h-[297mm] h-[297mm] bg-white shadow-2xl print:shadow-none flex flex-col justify-between relative border border-gray-300 print:border-none box-border overflow-hidden p-0"
          style={{
            fontFamily: "'Trebuchet MS', 'Arial', sans-serif",
            backgroundImage: `url(${caldimLetterheadImg})`,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Top Spacing to clear the Caldim_LH.pdf Header Banner (165px) */}
          <div className="h-[165px] w-full shrink-0" />

          {/* Letter Body Area */}
          <main className="relative z-10 px-14 py-2 flex-1 flex flex-col justify-between">
            <div>
              {/* Date Row */}
              <div className="flex justify-end items-center mb-6 text-xs text-gray-700 border-b border-gray-200/60 pb-2">
                <div>
                  <span className="font-bold text-gray-600">Date: </span>
                  <span className="font-bold text-gray-900">{currentDateStr}</span>
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center mb-6">
                <h2 className="text-base font-bold text-[#1b2752] uppercase tracking-wide border-b-2 border-[#1b2752] inline-block pb-1">
                  {title}
                </h2>
              </div>

              {/* Employee Summary Card if employee is selected */}
              {employeeDetails?.name && (
                <div className="mb-5 bg-slate-50/90 border border-slate-200 rounded-lg p-3.5 text-xs grid grid-cols-2 gap-x-6 gap-y-2 shadow-sm">
                  <div>
                    <span className="text-gray-500 font-medium">Employee Name:</span>{' '}
                    <strong className="text-gray-900">{employeeDetails.name}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Employee ID:</span>{' '}
                    <strong className="text-gray-900">{employeeDetails.employeeId || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Designation:</span>{' '}
                    <strong className="text-gray-900">{employeeDetails.designation || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Department:</span>{' '}
                    <strong className="text-gray-900">{employeeDetails.department || 'Engineering'}</strong>
                  </div>
                  {employeeDetails.doj && (
                    <div>
                      <span className="text-gray-500 font-medium">Date of Joining:</span>{' '}
                      <strong className="text-gray-900">{employeeDetails.doj}</strong>
                    </div>
                  )}
                  {employeeDetails.salary && (
                    <div>
                      <span className="text-gray-500 font-medium">Salary / CTC:</span>{' '}
                      <strong className="text-gray-900">INR {employeeDetails.salary}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Formatted Letter Body */}
              <div
                className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap max-w-none min-h-[200px]"
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                dangerouslySetInnerHTML={{
                  __html: content && content.includes('<') && content.includes('>')
                    ? content
                    : (content || '').replace(/\n/g, '<br/>')
                }}
              />
            </div>

            {/* Authorized Signatory Block (Left Aligned) */}
            <div className="flex flex-col items-start mt-8 pb-4">
              <p className="text-[11px] text-gray-600 italic mb-2">
                For <strong>CALDIM ENGINEERING PRIVATE LIMITED</strong>
              </p>

              <div className="text-left min-w-[200px]">
                <div className="h-10 border-b border-gray-900 mb-1 w-48" />
                <p className="text-xs font-bold text-gray-900">Authorized Signatory</p>
              </div>
            </div>
          </main>

          {/* Bottom Spacing to clear the Caldim_LH.pdf Footer (75px) */}
          <div className="h-[75px] w-full shrink-0" />
        </div>
      </div>
    </div>
  );
};

export default LetterheadPreview;
