import XLSXStyle from "xlsx-js-style";

/**
 * Format date helper DD/MM/YYYY
 */
const formatDate = (dateInput) => {
  if (!dateInput) return "N/A";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
};

const formatDateTime = (dateInput) => {
  if (!dateInput) return "N/A";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch {
    return String(dateInput);
  }
};

/**
 * Standard Borders
 */
const borderThin = {
  top: { style: "thin", color: { rgb: "E2E8F0" } },
  bottom: { style: "thin", color: { rgb: "E2E8F0" } },
  left: { style: "thin", color: { rgb: "E2E8F0" } },
  right: { style: "thin", color: { rgb: "E2E8F0" } }
};

const borderHeader = {
  top: { style: "medium", color: { rgb: "0F172A" } },
  bottom: { style: "medium", color: { rgb: "0F172A" } },
  left: { style: "thin", color: { rgb: "CBD5E1" } },
  right: { style: "thin", color: { rgb: "CBD5E1" } }
};

const borderFooter = {
  top: { style: "medium", color: { rgb: "0F172A" } },
  bottom: { style: "medium", color: { rgb: "0F172A" } },
  left: { style: "thin", color: { rgb: "334155" } },
  right: { style: "thin", color: { rgb: "334155" } }
};

/**
 * Build Master Flattened Sheet (Request Details + Every Employee)
 */
const buildMasterDetailedSheet = (requests) => {
  const dataRows = [];

  // Summary Metrics
  let totalAllocatedEmployees = 0;
  let totalPresentEmployees = 0;
  let totalAbsentEmployees = 0;
  let totalEligibleEmployees = 0;
  let totalWorkedHours = 0;

  let rowCounter = 1;

  requests.forEach((req) => {
    const employees = req.employees && req.employees.length > 0 ? req.employees : [null];

    employees.forEach((emp) => {
      const isEmpPresent = emp?.attendanceStatus === "Present";
      const isEmpAbsent = emp?.attendanceStatus === "Absent";
      const isEmpEligible = emp?.allowanceEligibility === "Eligible";
      const empWorkedHrs = Number(emp?.workedHours) || 0;

      if (emp) {
        totalAllocatedEmployees++;
        if (isEmpPresent) totalPresentEmployees++;
        if (isEmpAbsent) totalAbsentEmployees++;
        if (isEmpEligible) totalEligibleEmployees++;
        totalWorkedHours += empWorkedHrs;
      }

      dataRows.push({
        sNo: rowCounter++,
        requestId: req.requestId || "N/A",
        workingDate: formatDate(req.workingDate),
        holidayType: req.holidayType || "Saturday",
        division: req.division || "N/A",
        projectName: req.projectName || "N/A",
        shiftTiming: req.shiftTiming || "General Shift",
        reason: req.reason || "N/A",
        remarks: req.remarks || "—",
        createdBy: req.createdByName || req.createdBy || "N/A",
        createdAt: formatDate(req.createdAt),
        empId: emp?.employeeId || "—",
        empName: emp?.employeeName || "—",
        empLocation: emp?.location || emp?.branch || req.division || "—",
        attendanceStatus: emp?.attendanceStatus || (req.status === "Approved" ? "Pending" : "—"),
        workedHours: emp ? (emp.workedHours !== undefined ? Number(emp.workedHours).toFixed(1) : "0.0") : "—",
        allowanceEligibility: emp?.allowanceEligibility || "—",
        holidayDays: emp?.holidayDaysValue !== undefined ? String(emp.holidayDaysValue) : (isEmpEligible ? "1" : "0"),
        hrApprovedBy: req.hrApprovedBy || (req.timeline?.find(t => t.status?.includes("General Manager") || t.status === "Approved")?.updatedBy) || "—",
        gmApprovedBy: req.gmApprovedBy || (req.timeline?.find(t => t.status === "Approved" || t.status === "Completed")?.updatedBy) || "—",
        requestStatus: req.status || "Pending HR Approval"
      });
    });
  });

  // Convert to Array of Arrays for Sheet
  const sheetAOA = [];

  // Row 1: Title Banner
  sheetAOA.push([
    "CALDIM ENGINEERING - HOLIDAY WORKING MASTER DETAILED REPORT",
    ...Array(20).fill("")
  ]);

  // Row 2: Metadata Subtitle
  const dateStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  sheetAOA.push([
    `Generated On: ${dateStr}  |  Total Requests: ${requests.length}  |  All Information Gathered in One Place with Full Employee Records`,
    ...Array(20).fill("")
  ]);

  // Row 3: KPI Metrics Banner
  sheetAOA.push([
    `KPI SUMMARY -> Total Requests: ${requests.length} | Total Employee Allocations: ${totalAllocatedEmployees} | Present: ${totalPresentEmployees} | Absent: ${totalAbsentEmployees} | Allowance Eligible: ${totalEligibleEmployees} | Total Worked Hours: ${totalWorkedHours.toFixed(1)} hrs`,
    ...Array(20).fill("")
  ]);

  // Row 4: Column Headers
  const headers = [
    "S.No",
    "Request ID",
    "Working Date",
    "Holiday Type",
    "Division",
    "Project Name",
    "Shift Timing",
    "Reason for Working",
    "Creator Remarks",
    "Applied By (TL/PM)",
    "Applied Date",
    "Employee ID",
    "Employee Name",
    "Employee Division / Location",
    "Attendance Status",
    "Worked Hours",
    "Allowance Eligibility",
    "Holiday Days Value",
    "HR Approved By",
    "GM Approved By",
    "Request Status"
  ];
  sheetAOA.push(headers);

  // Row 5+: Data rows
  dataRows.forEach((row) => {
    sheetAOA.push([
      row.sNo,
      row.requestId,
      row.workingDate,
      row.holidayType,
      row.division,
      row.projectName,
      row.shiftTiming,
      row.reason,
      row.remarks,
      row.createdBy,
      row.createdAt,
      row.empId,
      row.empName,
      row.empLocation,
      row.attendanceStatus,
      row.workedHours,
      row.allowanceEligibility,
      row.holidayDays,
      row.hrApprovedBy,
      row.gmApprovedBy,
      row.requestStatus
    ]);
  });

  // Footer Totals Row
  sheetAOA.push([
    "TOTAL",
    `Total: ${requests.length} Requests`,
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
    `Total Emp: ${totalAllocatedEmployees}`,
    "—",
    "—",
    `Present: ${totalPresentEmployees}`,
    `${totalWorkedHours.toFixed(1)} hrs`,
    `Eligible: ${totalEligibleEmployees}`,
    "—",
    "—",
    "—",
    "—"
  ]);

  const ws = XLSXStyle.utils.aoa_to_sheet(sheetAOA);

  // Set Merges for Title Banners
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 20 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 20 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 20 } }
  ];

  // Set Column Widths
  ws["!cols"] = [
    { wch: 8 },  // S.No
    { wch: 22 }, // Request ID
    { wch: 14 }, // Working Date
    { wch: 15 }, // Holiday Type
    { wch: 16 }, // Division
    { wch: 24 }, // Project Name
    { wch: 18 }, // Shift Timing
    { wch: 32 }, // Reason
    { wch: 24 }, // Remarks
    { wch: 22 }, // Applied By
    { wch: 14 }, // Applied Date
    { wch: 14 }, // Employee ID
    { wch: 24 }, // Employee Name
    { wch: 22 }, // Employee Location
    { wch: 18 }, // Attendance Status
    { wch: 14 }, // Worked Hours
    { wch: 20 }, // Allowance Eligibility
    { wch: 18 }, // Holiday Days
    { wch: 20 }, // HR Approved By
    { wch: 20 }, // GM Approved By
    { wch: 22 }  // Request Status
  ];

  const totalRowCount = sheetAOA.length;
  const lastRowIdx = totalRowCount - 1;

  // Apply Cell Styling
  for (let R = 0; R < totalRowCount; R++) {
    for (let C = 0; C <= 20; C++) {
      const cellRef = XLSXStyle.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" };

      // Row 0: Master Title
      if (R === 0) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: "1E2050" } }, // Deep Navy
          font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
      // Row 1: Subtitle
      else if (R === 1) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: "282B70" } }, // Slightly lighter Navy
          font: { name: "Calibri", sz: 10, italic: true, color: { rgb: "E0E7FF" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
      // Row 2: KPI Bar
      else if (R === 2) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: "0F172A" } }, // Slate 900
          font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "6EE7B7" } }, // Mint Emerald
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
      // Row 3: Column Headers (Multi-colored category blocks)
      else if (R === 3) {
        let headerBg = "1E2050"; // Default Navy

        if (C >= 0 && C <= 3) {
          headerBg = "1E2050"; // Request Meta (Deep Navy)
        } else if (C >= 4 && C <= 6) {
          headerBg = "1E3A8A"; // Work & Shift (Royal Blue)
        } else if (C >= 7 && C <= 10) {
          headerBg = "312E81"; // Reason & Creator (Indigo)
        } else if (C >= 11 && C <= 13) {
          headerBg = "0F766E"; // Employee Info (Teal 700)
        } else if (C >= 14 && C <= 17) {
          headerBg = "065F46"; // Attendance & Eligibility (Emerald 800)
        } else if (C >= 18 && C <= 20) {
          headerBg = "581C87"; // Approvals & Status (Purple 800)
        }

        ws[cellRef].s = {
          fill: { fgColor: { rgb: headerBg } },
          font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: borderHeader
        };
      }
      // Last Row: Footer Totals
      else if (R === lastRowIdx) {
        let footerBg = "0F172A";
        let fontColor = "FFFFFF";
        let align = "center";

        if (C === 0 || C === 1) {
          fontColor = "60A5FA"; // Light Blue
        } else if (C === 11) {
          fontColor = "5EEAD4"; // Teal
        } else if (C === 14) {
          fontColor = "86EFAC"; // Green
        } else if (C === 15) {
          fontColor = "FDE047"; // Yellow
        } else if (C === 16) {
          fontColor = "93C5FD"; // Soft Blue
        }

        ws[cellRef].s = {
          fill: { fgColor: { rgb: footerBg } },
          font: { name: "Calibri", sz: 11, bold: true, color: { rgb: fontColor } },
          alignment: { horizontal: align, vertical: "center" },
          border: borderFooter
        };
      }
      // Data Rows (R >= 4 && R < lastRowIdx)
      else {
        const isEven = (R - 4) % 2 === 0;
        let rowBg = isEven ? "FFFFFF" : "F8FAFC";
        let fontColor = "1E293B";
        let isBold = false;
        let align = "left";

        // S.No
        if (C === 0) {
          align = "center";
          fontColor = "64748B";
        }
        // Request ID
        else if (C === 1) {
          align = "center";
          fontColor = "4338CA"; // Indigo
          isBold = true;
          rowBg = isEven ? "EEF2FF" : "E0E7FF";
        }
        // Working Date
        else if (C === 2) {
          align = "center";
          fontColor = "0F172A";
          isBold = true;
        }
        // Holiday Type
        else if (C === 3) {
          align = "center";
          fontColor = "475569";
        }
        // Division
        else if (C === 4) {
          align = "left";
          fontColor = "334155";
        }
        // Project Name
        else if (C === 5) {
          align = "left";
          fontColor = "1E40AF"; // Blue
          isBold = true;
          rowBg = isEven ? "EFF6FF" : "DBEAFE";
        }
        // Shift Timing
        else if (C === 6) {
          align = "center";
          fontColor = "475569";
        }
        // Reason & Remarks
        else if (C === 7 || C === 8) {
          align = "left";
          fontColor = "334155";
        }
        // Applied By
        else if (C === 9) {
          align = "left";
          fontColor = "6B21A8"; // Purple
          isBold = true;
        }
        // Applied Date
        else if (C === 10) {
          align = "center";
          fontColor = "64748B";
        }
        // Employee ID
        else if (C === 11) {
          align = "center";
          fontColor = "3730A3"; // Indigo
          isBold = true;
          rowBg = isEven ? "F5F3FF" : "EDE9FE";
        }
        // Employee Name
        else if (C === 12) {
          align = "left";
          fontColor = "0F172A";
          isBold = true;
        }
        // Employee Location
        else if (C === 13) {
          align = "left";
          fontColor = "475569";
        }
        // Attendance Status
        else if (C === 14) {
          align = "center";
          isBold = true;
          const statusVal = String(ws[cellRef].v || "").toLowerCase();
          if (statusVal === "present") {
            rowBg = "D1FAE5"; // Soft Emerald
            fontColor = "065F46";
          } else if (statusVal === "absent") {
            rowBg = "FEE2E2"; // Soft Rose
            fontColor = "991B1B";
          } else if (statusVal === "pending") {
            rowBg = "FEF3C7"; // Soft Amber
            fontColor = "92400E";
          } else {
            fontColor = "64748B";
          }
        }
        // Worked Hours
        else if (C === 15) {
          align = "center";
          const hrs = parseFloat(ws[cellRef].v);
          if (!isNaN(hrs) && hrs > 0) {
            fontColor = "0F766E"; // Teal
            isBold = true;
            rowBg = isEven ? "F0FDFA" : "CCFBF1";
          } else {
            fontColor = "94A3B8";
          }
        }
        // Allowance Eligibility
        else if (C === 16) {
          align = "center";
          isBold = true;
          const eligVal = String(ws[cellRef].v || "").toLowerCase();
          if (eligVal === "eligible") {
            rowBg = "DBEAFE"; // Soft Blue
            fontColor = "1D4ED8";
          } else if (eligVal === "not eligible") {
            rowBg = "F1F5F9"; // Slate
            fontColor = "475569";
          } else {
            fontColor = "64748B";
          }
        }
        // Holiday Days Value
        else if (C === 17) {
          align = "center";
          fontColor = "047857";
          isBold = true;
        }
        // HR & GM Approvers
        else if (C === 18 || C === 19) {
          align = "left";
          fontColor = "4338CA";
          if (ws[cellRef].v && ws[cellRef].v !== "—") {
            isBold = true;
          }
        }
        // Request Status
        else if (C === 20) {
          align = "center";
          isBold = true;
          const reqStatus = String(ws[cellRef].v || "").toLowerCase();
          if (reqStatus === "approved" || reqStatus === "completed") {
            rowBg = "D1FAE5";
            fontColor = "065F46";
          } else if (reqStatus.includes("pending")) {
            rowBg = "FEF3C7";
            fontColor = "92400E";
          } else if (reqStatus === "attendance verified") {
            rowBg = "EDE9FE";
            fontColor = "5B21B6";
          } else if (reqStatus === "rejected") {
            rowBg = "FFE4E6";
            fontColor = "9F1239";
          }
        }

        ws[cellRef].s = {
          fill: { fgColor: { rgb: rowBg } },
          font: { name: "Calibri", sz: 10, bold: isBold, color: { rgb: fontColor } },
          alignment: { horizontal: align, vertical: "center", wrapText: C === 7 || C === 8 },
          border: borderThin
        };
      }
    }
  }

  return ws;
};

/**
 * Build Requests High-Level Summary Sheet
 */
const buildRequestsSummarySheet = (requests) => {
  const sheetAOA = [];

  // Title Row
  sheetAOA.push([
    "HOLIDAY WORKING REQUESTS - HIGH LEVEL SUMMARY",
    ...Array(15).fill("")
  ]);

  // Subtitle
  sheetAOA.push([
    `Total Requests: ${requests.length} | Exported on: ${new Date().toLocaleDateString("en-IN")}`,
    ...Array(15).fill("")
  ]);

  // Headers
  const headers = [
    "S.No",
    "Request ID",
    "Date",
    "Holiday Type",
    "Division",
    "Project Name",
    "Shift Timing",
    "Applied By",
    "Total Employees",
    "Present Count",
    "Absent Count",
    "Eligible Count",
    "HR Approver",
    "GM Approver",
    "Status",
    "Reason"
  ];
  sheetAOA.push(headers);

  let grandTotalEmp = 0;
  let grandTotalPresent = 0;
  let grandTotalAbsent = 0;
  let grandTotalEligible = 0;

  requests.forEach((req, idx) => {
    const emps = req.employees || [];
    const totalEmp = emps.length;
    const presentCount = emps.filter(e => e.attendanceStatus === "Present").length;
    const absentCount = emps.filter(e => e.attendanceStatus === "Absent").length;
    const eligibleCount = emps.filter(e => e.allowanceEligibility === "Eligible").length;

    grandTotalEmp += totalEmp;
    grandTotalPresent += presentCount;
    grandTotalAbsent += absentCount;
    grandTotalEligible += eligibleCount;

    sheetAOA.push([
      idx + 1,
      req.requestId || "N/A",
      formatDate(req.workingDate),
      req.holidayType || "Saturday",
      req.division || "N/A",
      req.projectName || "N/A",
      req.shiftTiming || "General Shift",
      req.createdByName || req.createdBy || "N/A",
      totalEmp,
      presentCount,
      absentCount,
      eligibleCount,
      req.hrApprovedBy || "—",
      req.gmApprovedBy || "—",
      req.status || "Pending HR Approval",
      req.reason || "N/A"
    ]);
  });

  // Footer Totals
  sheetAOA.push([
    "TOTAL",
    `Count: ${requests.length}`,
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
    grandTotalEmp,
    grandTotalPresent,
    grandTotalAbsent,
    grandTotalEligible,
    "—",
    "—",
    "—",
    "—"
  ]);

  const ws = XLSXStyle.utils.aoa_to_sheet(sheetAOA);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 15 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 15 } }
  ];

  ws["!cols"] = [
    { wch: 8 },  // S.No
    { wch: 22 }, // Request ID
    { wch: 14 }, // Date
    { wch: 15 }, // Type
    { wch: 16 }, // Division
    { wch: 24 }, // Project
    { wch: 18 }, // Shift
    { wch: 22 }, // Applied By
    { wch: 16 }, // Total Emp
    { wch: 15 }, // Present
    { wch: 15 }, // Absent
    { wch: 16 }, // Eligible
    { wch: 20 }, // HR
    { wch: 20 }, // GM
    { wch: 22 }, // Status
    { wch: 30 }  // Reason
  ];

  const totalRowCount = sheetAOA.length;
  const lastRowIdx = totalRowCount - 1;

  for (let R = 0; R < totalRowCount; R++) {
    for (let C = 0; C <= 15; C++) {
      const cellRef = XLSXStyle.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" };

      if (R === 0) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: "1E2050" } },
          font: { name: "Calibri", sz: 13, bold: true, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      } else if (R === 1) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: "312E81" } },
          font: { name: "Calibri", sz: 10, italic: true, color: { rgb: "E0E7FF" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      } else if (R === 2) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: "1E3A8A" } },
          font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: borderHeader
        };
      } else if (R === lastRowIdx) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: "0F172A" } },
          font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: borderFooter
        };
      } else {
        const isEven = (R - 3) % 2 === 0;
        let rowBg = isEven ? "FFFFFF" : "F8FAFC";
        let fontColor = "1E293B";
        let isBold = false;
        let align = "left";

        if (C === 0 || C === 2 || C === 3 || C === 6) {
          align = "center";
        } else if (C === 1) {
          align = "center";
          fontColor = "4338CA";
          isBold = true;
        } else if (C === 5) {
          fontColor = "1E40AF";
          isBold = true;
        } else if (C >= 8 && C <= 11) {
          align = "center";
          isBold = true;
          if (C === 9) fontColor = "065F46";
          else if (C === 10) fontColor = "991B1B";
          else if (C === 11) fontColor = "1D4ED8";
        } else if (C === 14) {
          align = "center";
          isBold = true;
          const st = String(ws[cellRef].v || "").toLowerCase();
          if (st === "approved" || st === "completed") {
            rowBg = "D1FAE5";
            fontColor = "065F46";
          } else if (st.includes("pending")) {
            rowBg = "FEF3C7";
            fontColor = "92400E";
          } else if (st === "rejected") {
            rowBg = "FFE4E6";
            fontColor = "9F1239";
          }
        }

        ws[cellRef].s = {
          fill: { fgColor: { rgb: rowBg } },
          font: { name: "Calibri", sz: 10, bold: isBold, color: { rgb: fontColor } },
          alignment: { horizontal: align, vertical: "center", wrapText: C === 15 },
          border: borderThin
        };
      }
    }
  }

  return ws;
};

/**
 * Export Multiple Requests (All info + Employee records in master sheet + summary sheet)
 */
export const exportHolidayWorkingRequestsToExcel = (requests, customFilename = null) => {
  if (!requests || requests.length === 0) {
    alert("No data available to export.");
    return;
  }

  const wb = XLSXStyle.utils.book_new();

  // Sheet 1: Master Detailed Info & Employees
  const masterSheet = buildMasterDetailedSheet(requests);
  XLSXStyle.utils.book_append_sheet(wb, masterSheet, "All Info & Employees");

  // Sheet 2: Requests Summary
  const summarySheet = buildRequestsSummarySheet(requests);
  XLSXStyle.utils.book_append_sheet(wb, summarySheet, "Requests Summary");

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `Holiday_Working_Requests_Master_${timestamp}.xlsx`;

  XLSXStyle.writeFile(wb, filename);
};

/**
 * Export Single Request with full details & employee list
 */
export const exportSingleHolidayRequestToExcel = (request) => {
  if (!request) return;
  const filename = `Holiday_Working_${request.requestId || "Request"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  exportHolidayWorkingRequestsToExcel([request], filename);
};
