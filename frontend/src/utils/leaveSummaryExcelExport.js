import XLSXStyle from "xlsx-js-style";

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
 * Build Master Leave Detailed Sheet
 */
const buildMasterLeaveSheet = (leaveApplications, filters = {}) => {
  const dataRows = [];

  let grandTotalDays = 0;
  let totalCL = 0;
  let totalSL = 0;
  let totalPL = 0;
  let totalBL = 0;
  let totalNegPL = 0;
  let totalLOP = 0;
  let approvedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;

  leaveApplications.forEach((app, index) => {
    const days = Number(app.totalLeaveDays) || Number(app.days) || 0;
    const cl = Number(app.clUsed) || 0;
    const sl = Number(app.slUsed) || 0;
    const pl = Number(app.plUsed) || 0;
    const bl = Number(app.blUsed) || 0;
    const negPL = Number(app.negativePL) || 0;
    const lop = Number(app.lopDays) || 0;

    grandTotalDays += days;
    totalCL += cl;
    totalSL += sl;
    totalPL += pl;
    totalBL += bl;
    totalNegPL += negPL;
    totalLOP += lop;

    if (app.status === "Approved") approvedCount++;
    else if (app.status === "Pending") pendingCount++;
    else if (app.status === "Rejected") rejectedCount++;

    const specialDetail = [
      app.bereavementRelation ? `Relation: ${app.bereavementRelation}` : "",
      app.regionalHolidayName ? `Holiday: ${app.regionalHolidayName}` : ""
    ].filter(Boolean).join(" | ") || "—";

    dataRows.push({
      sNo: index + 1,
      employeeId: app.employeeId || "—",
      employeeName: app.employeeName || "—",
      location: app.location || "—",
      leaveType: app.leaveType || "—",
      startDate: app.fromDate || "—",
      endDate: app.toDate || "—",
      dayType: app.dayType || "Full Day",
      totalDays: days,
      clUsed: cl,
      slUsed: sl,
      plUsed: pl,
      blUsed: bl,
      negativePL: negPL,
      lopDays: lop,
      specialDetail: specialDetail,
      reason: app.reason || "N/A",
      status: app.status || "Pending"
    });
  });

  const sheetAOA = [];

  // Row 1: Title Banner
  sheetAOA.push([
    "CALDIM ENGINEERING - LEAVE MANAGEMENT MASTER REPORT",
    ...Array(16).fill("")
  ]);

  // Row 2: Subtitle
  const dateStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const filterParts = [];
  if (filters.year && filters.year !== "all") filterParts.push(`Year: ${filters.year}`);
  if (filters.month && filters.month !== "all") filterParts.push(`Month: ${filters.month}`);
  if (filters.location && filters.location !== "all") filterParts.push(`Location: ${filters.location}`);
  if (filters.leaveType && filters.leaveType !== "all") filterParts.push(`Type: ${filters.leaveType}`);
  if (filters.status && filters.status !== "all") filterParts.push(`Status: ${filters.status}`);
  const filterSummary = filterParts.length > 0 ? ` | Active Filters: [ ${filterParts.join(" | ")} ]` : "";

  sheetAOA.push([
    `Generated On: ${dateStr}  |  Total Applications: ${leaveApplications.length}${filterSummary}`,
    ...Array(16).fill("")
  ]);

  // Row 3: KPI Metrics Banner
  sheetAOA.push([
    `KPI SUMMARY -> Total Applications: ${leaveApplications.length} | Total Days: ${grandTotalDays} days | Approved: ${approvedCount} | Pending: ${pendingCount} | Rejected: ${rejectedCount} | CL: ${totalCL}d | SL: ${totalSL}d | PL: ${totalPL}d | BL: ${totalBL}d | LOP: ${totalLOP}d`,
    ...Array(16).fill("")
  ]);

  // Row 4: Column Headers
  const headers = [
    "S.No",
    "Employee ID",
    "Employee Name",
    "Location",
    "Leave Type",
    "Start Date",
    "End Date",
    "Day Type",
    "Total Days",
    "CL Used",
    "SL Used",
    "PL Used",
    "BL Used",
    "Negative PL",
    "LOP Days",
    "Special Info / Relation",
    "Reason for Leave",
    "Status"
  ];
  sheetAOA.push(headers);

  // Row 5+: Data rows
  dataRows.forEach((row) => {
    sheetAOA.push([
      row.sNo,
      row.employeeId,
      row.employeeName,
      row.location,
      row.leaveType,
      row.startDate,
      row.endDate,
      row.dayType,
      row.totalDays,
      row.clUsed > 0 ? row.clUsed : 0,
      row.slUsed > 0 ? row.slUsed : 0,
      row.plUsed > 0 ? row.plUsed : 0,
      row.blUsed > 0 ? row.blUsed : 0,
      row.negativePL > 0 ? row.negativePL : 0,
      row.lopDays > 0 ? row.lopDays : 0,
      row.specialDetail,
      row.reason,
      row.status
    ]);
  });

  // Footer Totals Row
  sheetAOA.push([
    "TOTAL",
    `Total: ${leaveApplications.length} Apps`,
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
    grandTotalDays,
    totalCL,
    totalSL,
    totalPL,
    totalBL,
    totalNegPL,
    totalLOP,
    "—",
    `Approved: ${approvedCount} | Pending: ${pendingCount}`,
    "—"
  ]);

  const ws = XLSXStyle.utils.aoa_to_sheet(sheetAOA);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 17 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 17 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 17 } }
  ];

  ws["!cols"] = [
    { wch: 8 },  // S.No
    { wch: 15 }, // Employee ID
    { wch: 24 }, // Employee Name
    { wch: 14 }, // Location
    { wch: 22 }, // Leave Type
    { wch: 14 }, // Start Date
    { wch: 14 }, // End Date
    { wch: 14 }, // Day Type
    { wch: 14 }, // Total Days
    { wch: 12 }, // CL Used
    { wch: 12 }, // SL Used
    { wch: 12 }, // PL Used
    { wch: 12 }, // BL Used
    { wch: 14 }, // Negative PL
    { wch: 12 }, // LOP Days
    { wch: 24 }, // Special Info
    { wch: 32 }, // Reason
    { wch: 16 }  // Status
  ];

  const totalRowCount = sheetAOA.length;
  const lastRowIdx = totalRowCount - 1;

  for (let R = 0; R < totalRowCount; R++) {
    for (let C = 0; C <= 17; C++) {
      const cellRef = XLSXStyle.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" };

      // Row 0: Title Banner
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
          fill: { fgColor: { rgb: "282B70" } },
          font: { name: "Calibri", sz: 10, italic: true, color: { rgb: "E0E7FF" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
      // Row 2: KPI Metrics Bar
      else if (R === 2) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: "0F172A" } },
          font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "6EE7B7" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
      // Row 3: Multi-Category Column Headers
      else if (R === 3) {
        let headerBg = "1E2050";

        if (C >= 0 && C <= 3) {
          headerBg = "1E2050"; // Employee Info (Navy)
        } else if (C >= 4 && C <= 8) {
          headerBg = "1E3A8A"; // Schedule & Total Days (Royal Blue)
        } else if (C >= 9 && C <= 14) {
          headerBg = "0F766E"; // Deduction Breakdown (Teal)
        } else if (C >= 15 && C <= 16) {
          headerBg = "312E81"; // Special info & Reason (Indigo)
        } else if (C === 17) {
          headerBg = "581C87"; // Status (Purple)
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
          fontColor = "60A5FA";
        } else if (C === 8) {
          fontColor = "86EFAC"; // Mint green total days
        } else if (C >= 9 && C <= 12) {
          fontColor = "5EEAD4"; // Teal
        } else if (C === 13 || C === 14) {
          fontColor = "FCA5A5"; // Soft red
        } else if (C === 16) {
          fontColor = "FDE047";
        }

        ws[cellRef].s = {
          fill: { fgColor: { rgb: footerBg } },
          font: { name: "Calibri", sz: 11, bold: true, color: { rgb: fontColor } },
          alignment: { horizontal: align, vertical: "center" },
          border: borderFooter
        };
      }
      // Data Rows
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
        // Employee ID
        else if (C === 1) {
          align = "center";
          fontColor = "4338CA"; // Indigo
          isBold = true;
          rowBg = isEven ? "EEF2FF" : "E0E7FF";
        }
        // Employee Name
        else if (C === 2) {
          align = "left";
          fontColor = "0F172A";
          isBold = true;
        }
        // Location
        else if (C === 3) {
          align = "center";
          fontColor = "334155";
        }
        // Leave Type
        else if (C === 4) {
          align = "left";
          fontColor = "1E40AF"; // Blue
          isBold = true;
          rowBg = isEven ? "EFF6FF" : "DBEAFE";
        }
        // Start & End Date
        else if (C === 5 || C === 6) {
          align = "center";
          fontColor = "334155";
        }
        // Day Type
        else if (C === 7) {
          align = "center";
          fontColor = "475569";
        }
        // Total Days
        else if (C === 8) {
          align = "center";
          fontColor = "047857"; // Emerald
          isBold = true;
          rowBg = isEven ? "ECFDF5" : "D1FAE5";
        }
        // CL, SL, PL, BL
        else if (C >= 9 && C <= 12) {
          align = "center";
          const val = Number(ws[cellRef].v) || 0;
          if (val > 0) {
            fontColor = "0F766E"; // Teal
            isBold = true;
            rowBg = isEven ? "F0FDFA" : "CCFBF1";
          } else {
            fontColor = "94A3B8";
          }
        }
        // Negative PL, LOP Days
        else if (C === 13 || C === 14) {
          align = "center";
          const val = Number(ws[cellRef].v) || 0;
          if (val > 0) {
            fontColor = C === 13 ? "BE123C" : "B45309";
            isBold = true;
            rowBg = C === 13 ? "FFF1F2" : "FFFBEB";
          } else {
            fontColor = "94A3B8";
          }
        }
        // Special info & Reason
        else if (C === 15 || C === 16) {
          align = "left";
          fontColor = "334155";
        }
        // Status
        else if (C === 17) {
          align = "center";
          isBold = true;
          const statusVal = String(ws[cellRef].v || "").toLowerCase();
          if (statusVal === "approved") {
            rowBg = "D1FAE5"; // Emerald
            fontColor = "065F46";
          } else if (statusVal === "pending") {
            rowBg = "FEF3C7"; // Amber
            fontColor = "92400E";
          } else if (statusVal === "rejected") {
            rowBg = "FEE2E2"; // Rose
            fontColor = "991B1B";
          }
        }

        ws[cellRef].s = {
          fill: { fgColor: { rgb: rowBg } },
          font: { name: "Calibri", sz: 10, bold: isBold, color: { rgb: fontColor } },
          alignment: { horizontal: align, vertical: "center", wrapText: C === 15 || C === 16 },
          border: borderThin
        };
      }
    }
  }

  return ws;
};

/**
 * Build Leave Type Summary Sheet
 */
const buildLeaveTypeSummarySheet = (leaveApplications) => {
  const sheetAOA = [];

  sheetAOA.push([
    "LEAVE TYPE BREAKDOWN & SUMMARY",
    ...Array(6).fill("")
  ]);

  sheetAOA.push([
    `Total Records: ${leaveApplications.length} | Exported on: ${new Date().toLocaleDateString("en-IN")}`,
    ...Array(6).fill("")
  ]);

  const headers = [
    "S.No",
    "Leave Category",
    "Total Applications",
    "Total Days Taken",
    "Approved Apps",
    "Pending Apps",
    "Rejected Apps"
  ];
  sheetAOA.push(headers);

  // Group by leaveType
  const typeMap = {};
  leaveApplications.forEach((app) => {
    const type = app.leaveType || "Unclassified";
    if (!typeMap[type]) {
      typeMap[type] = { count: 0, days: 0, approved: 0, pending: 0, rejected: 0 };
    }
    const days = Number(app.totalLeaveDays) || Number(app.days) || 0;
    typeMap[type].count++;
    typeMap[type].days += days;
    if (app.status === "Approved") typeMap[type].approved++;
    else if (app.status === "Pending") typeMap[type].pending++;
    else if (app.status === "Rejected") typeMap[type].rejected++;
  });

  let grandCount = 0;
  let grandDays = 0;
  let grandApproved = 0;
  let grandPending = 0;
  let grandRejected = 0;

  Object.keys(typeMap).sort().forEach((typeKey, idx) => {
    const item = typeMap[typeKey];
    grandCount += item.count;
    grandDays += item.days;
    grandApproved += item.approved;
    grandPending += item.pending;
    grandRejected += item.rejected;

    sheetAOA.push([
      idx + 1,
      typeKey,
      item.count,
      item.days,
      item.approved,
      item.pending,
      item.rejected
    ]);
  });

  // Footer Totals
  sheetAOA.push([
    "TOTAL",
    "All Categories Combined",
    grandCount,
    grandDays,
    grandApproved,
    grandPending,
    grandRejected
  ]);

  const ws = XLSXStyle.utils.aoa_to_sheet(sheetAOA);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }
  ];

  ws["!cols"] = [
    { wch: 8 },  // S.No
    { wch: 28 }, // Leave Category
    { wch: 18 }, // Total Applications
    { wch: 18 }, // Total Days Taken
    { wch: 16 }, // Approved Apps
    { wch: 16 }, // Pending Apps
    { wch: 16 }  // Rejected Apps
  ];

  const totalRowCount = sheetAOA.length;
  const lastRowIdx = totalRowCount - 1;

  for (let R = 0; R < totalRowCount; R++) {
    for (let C = 0; C <= 6; C++) {
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
          alignment: { horizontal: C <= 1 ? "left" : "center", vertical: "center" },
          border: borderFooter
        };
      } else {
        const isEven = (R - 3) % 2 === 0;
        let rowBg = isEven ? "FFFFFF" : "F8FAFC";
        let fontColor = "1E293B";
        let isBold = false;
        let align = C === 1 ? "left" : "center";

        if (C === 1) {
          fontColor = "1E40AF";
          isBold = true;
        } else if (C === 3) {
          fontColor = "047857";
          isBold = true;
        } else if (C === 4) {
          fontColor = "065F46";
        } else if (C === 5) {
          fontColor = "92400E";
        } else if (C === 6) {
          fontColor = "991B1B";
        }

        ws[cellRef].s = {
          fill: { fgColor: { rgb: rowBg } },
          font: { name: "Calibri", sz: 10, bold: isBold, color: { rgb: fontColor } },
          alignment: { horizontal: align, vertical: "center" },
          border: borderThin
        };
      }
    }
  }

  return ws;
};

/**
 * Build Detailed Monthly LOP Sheet
 */
const buildMonthlyLOPSheet = (lopRecords, filters = {}) => {
  const dataRows = [];
  let grandTotalLeaveDays = 0;
  let grandTotalLOPDays = 0;
  let approvedLOP = 0;
  let pendingLOP = 0;
  let rejectedLOP = 0;

  lopRecords.forEach((app, index) => {
    const totalDays = Number(app.totalLeaveDays) || Number(app.days) || 0;
    const lopDays = Number(app.lopDays) > 0 ? Number(app.lopDays) : (
      String(app.leaveType || '').toLowerCase().includes('loss of pay') || String(app.leaveType || '').toLowerCase().includes('lop')
        ? totalDays
        : 0
    );

    grandTotalLeaveDays += totalDays;
    grandTotalLOPDays += lopDays;

    if (app.status === 'Approved') approvedLOP += lopDays;
    else if (app.status === 'Pending') pendingLOP += lopDays;
    else if (app.status === 'Rejected') rejectedLOP += lopDays;

    const sDate = app.startDateRaw ? new Date(app.startDateRaw) : null;
    const monthYear = sDate && !isNaN(sDate) 
      ? sDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
      : '—';

    const otherLeaves = [
      app.clUsed > 0 ? `CL: ${app.clUsed}d` : '',
      app.slUsed > 0 ? `SL: ${app.slUsed}d` : '',
      app.plUsed > 0 ? `PL: ${app.plUsed}d` : '',
      app.blUsed > 0 ? `BL: ${app.blUsed}d` : '',
      app.negativePL > 0 ? `NegPL: ${app.negativePL}d` : ''
    ].filter(Boolean).join(', ') || 'None';

    dataRows.push({
      sNo: index + 1,
      employeeId: app.employeeId || '—',
      employeeName: app.employeeName || '—',
      location: app.location || '—',
      monthYear: monthYear,
      startDate: app.fromDate || '—',
      endDate: app.toDate || '—',
      dayType: app.dayType || 'Full Day',
      totalDays: totalDays,
      lopDays: lopDays,
      otherLeaves: otherLeaves,
      reason: app.reason || 'N/A',
      status: app.status || 'Pending'
    });
  });

  const uniqueEmployees = new Set(lopRecords.map(r => r.employeeId).filter(Boolean)).size;

  const sheetAOA = [];

  // Row 1: Title Banner
  sheetAOA.push([
    "CALDIM ENGINEERING - MONTHLY LOSS OF PAY (LOP) REPORT",
    ...Array(12).fill("")
  ]);

  // Row 2: Subtitle
  const dateStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const filterParts = [];
  if (filters.year && filters.year !== "all") filterParts.push(`Year: ${filters.year}`);
  if (filters.month && filters.month !== "all") filterParts.push(`Month: ${filters.month}`);
  if (filters.location && filters.location !== "all") filterParts.push(`Location: ${filters.location}`);
  if (filters.status && filters.status !== "all") filterParts.push(`Status: ${filters.status}`);
  const filterSummary = filterParts.length > 0 ? ` | Active Filters: [ ${filterParts.join(" | ")} ]` : " | Showing All LOP Records";

  sheetAOA.push([
    `Generated On: ${dateStr}  |  Total LOP Records: ${lopRecords.length}${filterSummary}`,
    ...Array(12).fill("")
  ]);

  // Row 3: KPI Metrics Banner
  sheetAOA.push([
    `LOP SUMMARY -> Impacted Employees: ${uniqueEmployees} | Total LOP Days: ${grandTotalLOPDays} days | Approved LOP: ${approvedLOP} days | Pending LOP: ${pendingLOP} days | Rejected LOP: ${rejectedLOP} days`,
    ...Array(12).fill("")
  ]);

  // Row 4: Column Headers
  const headers = [
    "S.No",
    "Employee ID",
    "Employee Name",
    "Location",
    "Month / Year",
    "Start Date",
    "End Date",
    "Day Type",
    "Total Leave Days",
    "LOP Days",
    "Other Deductions",
    "Reason for Leave",
    "Approval Status"
  ];
  sheetAOA.push(headers);

  // Row 5+: Data Rows
  dataRows.forEach((row) => {
    sheetAOA.push([
      row.sNo,
      row.employeeId,
      row.employeeName,
      row.location,
      row.monthYear,
      row.startDate,
      row.endDate,
      row.dayType,
      row.totalDays,
      row.lopDays,
      row.otherLeaves,
      row.reason,
      row.status
    ]);
  });

  // Footer Totals Row
  sheetAOA.push([
    "TOTAL",
    `Total: ${uniqueEmployees} Employees`,
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
    grandTotalLeaveDays,
    grandTotalLOPDays,
    "—",
    `Approved: ${approvedLOP}d | Pending: ${pendingLOP}d`,
    "—"
  ]);

  const ws = XLSXStyle.utils.aoa_to_sheet(sheetAOA);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 12 } }
  ];

  ws["!cols"] = [
    { wch: 8 },  // S.No
    { wch: 15 }, // Employee ID
    { wch: 24 }, // Employee Name
    { wch: 14 }, // Location
    { wch: 15 }, // Month / Year
    { wch: 14 }, // Start Date
    { wch: 14 }, // End Date
    { wch: 14 }, // Day Type
    { wch: 16 }, // Total Leave Days
    { wch: 14 }, // LOP Days
    { wch: 22 }, // Other Deductions
    { wch: 32 }, // Reason
    { wch: 16 }  // Approval Status
  ];

  const totalRowCount = sheetAOA.length;
  const lastRowIdx = totalRowCount - 1;

  for (let R = 0; R < totalRowCount; R++) {
    for (let C = 0; C <= 12; C++) {
      const cellRef = XLSXStyle.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" };

      // Row 0: Title Banner
      if (R === 0) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: "7C2D12" } }, // Warm Amber / Crimson
          font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
      // Row 1: Subtitle
      else if (R === 1) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: "9A3412" } },
          font: { name: "Calibri", sz: 10, italic: true, color: { rgb: "FFEDD5" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
      // Row 2: KPI Metrics Bar
      else if (R === 2) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: "1E293B" } },
          font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FDE047" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
      // Row 3: Headers
      else if (R === 3) {
        let headerBg = "9A3412";
        if (C >= 0 && C <= 3) headerBg = "1E2050";
        else if (C >= 4 && C <= 7) headerBg = "1E3A8A";
        else if (C === 8) headerBg = "0F766E";
        else if (C === 9) headerBg = "B91C1C"; // Deep Red for LOP
        else if (C >= 10 && C <= 11) headerBg = "334155";
        else if (C === 12) headerBg = "475569";

        ws[cellRef].s = {
          fill: { fgColor: { rgb: headerBg } },
          font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: borderHeader
        };
      }
      // Last Row: Footer
      else if (R === lastRowIdx) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: "1E293B" } },
          font: { name: "Calibri", sz: 11, bold: true, color: { rgb: C === 9 ? "F87171" : "FFFFFF" } },
          alignment: { horizontal: alignSummaryCell(C), vertical: "center" },
          border: borderFooter
        };
      }
      // Data rows
      else {
        const isEven = (R - 4) % 2 === 0;
        let rowBg = isEven ? "FFFFFF" : "FFFBEB";
        let fontColor = "1E293B";
        let isBold = false;
        let align = "left";

        if (C === 0) {
          align = "center";
          fontColor = "64748B";
        } else if (C === 1) {
          align = "center";
          fontColor = "4338CA";
          isBold = true;
          rowBg = isEven ? "EEF2FF" : "E0E7FF";
        } else if (C === 2) {
          align = "left";
          fontColor = "0F172A";
          isBold = true;
        } else if (C === 3 || C === 4) {
          align = "center";
          fontColor = "334155";
        } else if (C === 5 || C === 6 || C === 7) {
          align = "center";
          fontColor = "475569";
        } else if (C === 8) {
          align = "center";
          fontColor = "0F766E";
          isBold = true;
        } else if (C === 9) {
          // LOP Column
          align = "center";
          fontColor = "DC2626";
          isBold = true;
          rowBg = isEven ? "FEF2F2" : "FEE2E2";
        } else if (C === 10 || C === 11) {
          align = "left";
          fontColor = "334155";
        } else if (C === 12) {
          align = "center";
          isBold = true;
          const statusVal = String(ws[cellRef].v || "").toLowerCase();
          if (statusVal === "approved") {
            rowBg = "D1FAE5";
            fontColor = "065F46";
          } else if (statusVal === "pending") {
            rowBg = "FEF3C7";
            fontColor = "92400E";
          } else if (statusVal === "rejected") {
            rowBg = "FEE2E2";
            fontColor = "991B1B";
          }
        }

        ws[cellRef].s = {
          fill: { fgColor: { rgb: rowBg } },
          font: { name: "Calibri", sz: 10, bold: isBold, color: { rgb: fontColor } },
          alignment: { horizontal: align, vertical: "center", wrapText: C === 10 || C === 11 },
          border: borderThin
        };
      }
    }
  }

  return ws;
};

const alignSummaryCell = (c) => {
  if (c <= 1) return "left";
  if (c >= 8 && c <= 9) return "center";
  return "center";
};

/**
 * Build Employee Consolidated LOP Summary Sheet
 */
const buildEmployeeConsolidatedLOPSheet = (lopRecords) => {
  const sheetAOA = [];

  sheetAOA.push([
    "EMPLOYEE-WISE CONSOLIDATED LOSS OF PAY (LOP) SUMMARY",
    ...Array(7).fill("")
  ]);

  sheetAOA.push([
    `Total LOP Records Analyzed: ${lopRecords.length} | Generated On: ${new Date().toLocaleDateString("en-IN")}`,
    ...Array(7).fill("")
  ]);

  const headers = [
    "S.No",
    "Employee ID",
    "Employee Name",
    "Location",
    "Total LOP Requests",
    "Approved LOP Days",
    "Pending LOP Days",
    "Total LOP Days"
  ];
  sheetAOA.push(headers);

  // Group by employee
  const empMap = {};
  lopRecords.forEach((app) => {
    const id = app.employeeId || "UNKNOWN";
    if (!empMap[id]) {
      empMap[id] = {
        employeeId: id,
        employeeName: app.employeeName || "—",
        location: app.location || "—",
        count: 0,
        approvedLop: 0,
        pendingLop: 0,
        totalLop: 0
      };
    }
    const lop = Number(app.lopDays) > 0 ? Number(app.lopDays) : (
      String(app.leaveType || '').toLowerCase().includes('loss of pay') || String(app.leaveType || '').toLowerCase().includes('lop')
        ? (Number(app.totalLeaveDays) || Number(app.days) || 0)
        : 0
    );

    empMap[id].count++;
    empMap[id].totalLop += lop;
    if (app.status === "Approved") empMap[id].approvedLop += lop;
    else if (app.status === "Pending") empMap[id].pendingLop += lop;
  });

  let grandRequests = 0;
  let grandApproved = 0;
  let grandPending = 0;
  let grandTotal = 0;

  Object.values(empMap).sort((a, b) => b.totalLop - a.totalLop).forEach((emp, idx) => {
    grandRequests += emp.count;
    grandApproved += emp.approvedLop;
    grandPending += emp.pendingLop;
    grandTotal += emp.totalLop;

    sheetAOA.push([
      idx + 1,
      emp.employeeId,
      emp.employeeName,
      emp.location,
      emp.count,
      emp.approvedLop,
      emp.pendingLop,
      emp.totalLop
    ]);
  });

  // Footer Totals
  sheetAOA.push([
    "TOTAL",
    `Total: ${Object.keys(empMap).length} Employees`,
    "—",
    "—",
    grandRequests,
    grandApproved,
    grandPending,
    grandTotal
  ]);

  const ws = XLSXStyle.utils.aoa_to_sheet(sheetAOA);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }
  ];

  ws["!cols"] = [
    { wch: 8 },  // S.No
    { wch: 16 }, // Employee ID
    { wch: 26 }, // Employee Name
    { wch: 16 }, // Location
    { wch: 18 }, // Total LOP Requests
    { wch: 18 }, // Approved LOP Days
    { wch: 18 }, // Pending LOP Days
    { wch: 18 }  // Total LOP Days
  ];

  const totalRowCount = sheetAOA.length;
  const lastRowIdx = totalRowCount - 1;

  for (let R = 0; R < totalRowCount; R++) {
    for (let C = 0; C <= 7; C++) {
      const cellRef = XLSXStyle.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" };

      if (R === 0) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: "7C2D12" } },
          font: { name: "Calibri", sz: 13, bold: true, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      } else if (R === 1) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: "9A3412" } },
          font: { name: "Calibri", sz: 10, italic: true, color: { rgb: "FFEDD5" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      } else if (R === 2) {
        let headerBg = "9A3412";
        if (C <= 3) headerBg = "1E2050";
        else if (C === 4) headerBg = "1E3A8A";
        else if (C === 5) headerBg = "065F46";
        else if (C === 6) headerBg = "92400E";
        else if (C === 7) headerBg = "B91C1C";

        ws[cellRef].s = {
          fill: { fgColor: { rgb: headerBg } },
          font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: borderHeader
        };
      } else if (R === lastRowIdx) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: "0F172A" } },
          font: { name: "Calibri", sz: 11, bold: true, color: { rgb: C === 7 ? "F87171" : "FFFFFF" } },
          alignment: { horizontal: C <= 1 ? "left" : "center", vertical: "center" },
          border: borderFooter
        };
      } else {
        const isEven = (R - 3) % 2 === 0;
        let rowBg = isEven ? "FFFFFF" : "FFFBEB";
        let fontColor = "1E293B";
        let isBold = false;
        let align = C <= 2 ? "left" : "center";

        if (C === 0) {
          align = "center";
          fontColor = "64748B";
        } else if (C === 1) {
          align = "center";
          fontColor = "4338CA";
          isBold = true;
          rowBg = isEven ? "EEF2FF" : "E0E7FF";
        } else if (C === 2) {
          fontColor = "0F172A";
          isBold = true;
        } else if (C === 5) {
          fontColor = "047857";
          isBold = true;
        } else if (C === 6) {
          fontColor = "B45309";
        } else if (C === 7) {
          fontColor = "DC2626";
          isBold = true;
          rowBg = isEven ? "FEF2F2" : "FEE2E2";
        }

        ws[cellRef].s = {
          fill: { fgColor: { rgb: rowBg } },
          font: { name: "Calibri", sz: 10, bold: isBold, color: { rgb: fontColor } },
          alignment: { horizontal: align, vertical: "center" },
          border: borderThin
        };
      }
    }
  }

  return ws;
};

/**
 * Main Export Function for Leave Summary
 */
export const exportLeaveSummaryToExcel = (leaveApplications, filters = {}) => {
  if (!leaveApplications || leaveApplications.length === 0) {
    alert("No data available to export.");
    return;
  }

  const wb = XLSXStyle.utils.book_new();

  // Sheet 1: Master Leave Records with All Information
  const masterSheet = buildMasterLeaveSheet(leaveApplications, filters);
  XLSXStyle.utils.book_append_sheet(wb, masterSheet, "All Leave Records");

  // Sheet 2: Leave Category Summary
  const summarySheet = buildLeaveTypeSummarySheet(leaveApplications);
  XLSXStyle.utils.book_append_sheet(wb, summarySheet, "Leave Category Summary");

  const timestamp = new Date().toISOString().slice(0, 10);
  const fileName = `Leave_Management_Summary_Master_${timestamp}.xlsx`;

  XLSXStyle.writeFile(wb, fileName);
};

/**
 * Main Export Function for Monthly Loss of Pay (LOP) Report
 */
export const exportMonthlyLOPToExcel = (leaveApplications, filters = {}) => {
  // Filter for records with LOP days
  const lopRecords = (leaveApplications || []).filter(app => {
    const lop = Number(app.lopDays) || 0;
    const isLopType = String(app.leaveType || '').toLowerCase().includes('loss of pay') ||
                      String(app.leaveType || '').toLowerCase().includes('lop');
    return lop > 0 || isLopType;
  });

  if (lopRecords.length === 0) {
    alert("No Loss of Pay (LOP) records found for the selected filter criteria.");
    return;
  }

  const wb = XLSXStyle.utils.book_new();

  // Sheet 1: Monthly LOP Detailed Applications
  const lopSheet = buildMonthlyLOPSheet(lopRecords, filters);
  XLSXStyle.utils.book_append_sheet(wb, lopSheet, "Monthly LOP Details");

  // Sheet 2: Consolidated Employee LOP Summary
  const employeeSummarySheet = buildEmployeeConsolidatedLOPSheet(lopRecords);
  XLSXStyle.utils.book_append_sheet(wb, employeeSummarySheet, "Employee LOP Summary");

  const monthLabel = filters.month && filters.month !== "all" ? `_${filters.month}` : "";
  const yearLabel = filters.year && filters.year !== "all" ? `_${filters.year}` : "";
  const timestamp = new Date().toISOString().slice(0, 10);
  const fileName = `Monthly_LOP_Report${yearLabel}${monthLabel}_${timestamp}.xlsx`;

  XLSXStyle.writeFile(wb, fileName);
};
