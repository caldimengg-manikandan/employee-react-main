import React, { useState, useEffect, useCallback } from "react";
import { timesheetAPI, allocationAPI, employeeAPI } from "../../services/api";
import { ChevronLeft, ChevronRight, Calendar, Plus, Trash2, Save, Send, ChevronUp, ChevronDown } from "lucide-react";

// Holiday Calendar 2026 data
const holidays2026 = [
  { date: '01-Jan-26', day: 'THURSDAY', occasion: '' },
  { date: '15-Jan-26', day: 'THURSDAY', occasion: '' },
  { date: '16-Jan-26', day: 'FRIDAY', occasion: '' },
  { date: '26-Jan-26', day: 'MONDAY', occasion: '' },
  { date: '14-Apr-26', day: 'TUESDAY', occasion: '' },
  { date: '01-May-26', day: 'FRIDAY', occasion: '' },
  { date: '14-Sep-26', day: 'MONDAY', occasion: '' },
  { date: '02-Oct-26', day: 'FRIDAY', occasion: '' },
  { date: '19-Oct-26', day: 'MONDAY', occasion: '' },
  { date: 'REGIONAL', day: 'CHOOSE ONE', occasion: '' }
];

const isHoliday = (date) => {
  if (!date) return false;
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = String(date.getFullYear()).slice(-2);
  const formattedDate = `${day}-${month}-${year}`;
  
  return holidays2026.some(h => h.date === formattedDate);
};

const getHolidayOccasion = (date) => {
  if (!date) return "";
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = String(date.getFullYear()).slice(-2);
  const formattedDate = `${day}-${month}-${year}`;
  
  const holiday = holidays2026.find(h => h.date === formattedDate);
  return holiday ? holiday.occasion : "";
};

const Timesheet = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [timesheetRows, setTimesheetRows] = useState([]);
  const [totals, setTotals] = useState({
    daily: [0, 0, 0, 0, 0, 0, 0],
    weekly: 0,
  });
  const [onPremisesTime, setOnPremisesTime] = useState({
    daily: [0, 0, 0, 0, 0, 0, 0],
    weekly: 0,
  });
  const [loading, setLoading] = useState(false);
  const [permissionCounts, setPermissionCounts] = useState({});
  const [monthlyPermissionCount, setMonthlyPermissionCount] = useState(0);
  const [monthlyBasePermissionCount, setMonthlyBasePermissionCount] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLeaveAutoDraft, setIsLeaveAutoDraft] = useState(false);
  const [projects, setProjects] = useState([]);
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [shiftType, setShiftType] = useState("");
  const [dailyShiftTypes, setDailyShiftTypes] = useState(["", "", "", "", "", "", ""]);
  const [cellInputs, setCellInputs] = useState({});

  const shiftTypes = [
    "First Shift",
    "Second Shift",
    "General Shift"
  ];

  const tasks = [
    "Development",
    "Testing",
    "Implementation",
    "Maintenance Support",
    "Modeling",
    "Editing",
    "Backdrafting",
    "Checking",
    "Estimation Work",
    "Documentation",
    "Other's",
    "Non Product(Training)",
    "Project Decision",
    "Idle",
    "Meeting",
    "RIF’s",
    "Study",
    "On Duty",
    "Project Management",
    "Hiring",
    "Office Administration",
    "HR Activities",
    "Accounts",


  ];

  const leaveTypes = [
    "Permission"
  ];

  // ✅ Count leave rows
  const getLeaveRowCount = () => {
    return timesheetRows.filter(row => row.type === "leave").length;
  };

  // ✅ Check if add leave button should be disabled
  const isAddLeaveDisabled = () => {
    const hasPermission = timesheetRows.some(row => row.task === "Permission");
    // Allow up to 4 leave rows, but only 1 Permission row
    return getLeaveRowCount() >= 4 || isSubmitted || isLeaveAutoDraft || hasPermission;
  };

  // ✅ Load existing week data from backend AND attendance data
  useEffect(() => {
    const loadWeekData = async () => {
      try {
        setLoading(true);
        const wd = getWeekDates();
        const normalizeToUTCDateOnly = (d) => {
          const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          return utc.toISOString();
        };

        const weekStartStr = normalizeToUTCDateOnly(wd[0]);
        const weekEndStr = normalizeToUTCDateOnly(wd[6]);

        // Run both requests in parallel to avoid race conditions
        const [timesheetRes, attendanceRes] = await Promise.allSettled([
          timesheetAPI.getTimesheet({
            weekStart: weekStartStr,
            weekEnd: weekEndStr,
            _t: Date.now() // Prevent caching
          }),
          timesheetAPI.getAttendanceData({
            startDate: weekStartStr,
            endDate: weekEndStr,
            _t: Date.now()
          })
        ]);

        // --- Process Timesheet Data ---
        let sheet = {};
        let rows = [];
        let loadedShiftType = "";
        let loadedDailyShiftTypes = ["", "", "", "", "", "", ""];

        if (timesheetRes.status === "fulfilled" && timesheetRes.value) {
          const res = timesheetRes.value;
          sheet = (res?.data && res.data.data) ? res.data.data : res.data;
          
          rows = (sheet.entries || []).map((e) => ({
            id: Date.now() + Math.random(),
            project: e.project || "",
            projectCode: e.projectCode || "",
            task: e.task || "",
            hours: Array.isArray(e.hours) ? e.hours : [0, 0, 0, 0, 0, 0, 0],
            type: e.type || (e.project === "Leave" ? "leave" : "project"),
            shiftType: e.shiftType || "",
            locked: e.locked || false,
            lockedDays: e.lockedDays || [false, false, false, false, false, false, false],
          }));

          loadedShiftType = sheet.shiftType || "";
          if (Array.isArray(sheet.dailyShiftTypes) && sheet.dailyShiftTypes.length === 7) {
            loadedDailyShiftTypes = sheet.dailyShiftTypes;
          } else {
            loadedDailyShiftTypes = [
              loadedShiftType ? loadedShiftType : "",
              loadedShiftType ? loadedShiftType : "",
              loadedShiftType ? loadedShiftType : "",
              loadedShiftType ? loadedShiftType : "",
              loadedShiftType ? loadedShiftType : "",
              loadedShiftType ? loadedShiftType : "",
              loadedShiftType ? loadedShiftType : "",
            ];
          }

          setShiftType(loadedShiftType);
          setDailyShiftTypes(loadedDailyShiftTypes);
          
          setIsSubmitted(
            (sheet.status || "").toLowerCase() === "submitted" ||
            (sheet.status || "").toLowerCase() === "approved"
          );
          const hasApprovedLeaveEntry = rows.some(r => (r.project || "") === "Leave" && (r.task || "").startsWith("Leave Approved"));
          // Disable auto-draft lock so users can edit timesheet even with approved leave
          setIsLeaveAutoDraft(false);
        }

        // --- Process Attendance Data ---
        let attendanceOnPremises = null;
        if (attendanceRes.status === "fulfilled" && attendanceRes.value) {
          const attRes = attendanceRes.value;
          const attendanceData = Array.isArray(attRes.data?.records) ? attRes.data.records : [];
          
          if (attendanceData.length > 0) {
            const weekKeys = wd.map((d) => {
              const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
              return utc.toISOString().split("T")[0];
            });

            const dailyOnPremises = [0, 0, 0, 0, 0, 0, 0];
            let weeklyOnPremises = 0;

            attendanceData.forEach((record) => {
              try {
                const key = new Date(record.date).toISOString().split("T")[0];
                const idx = weekKeys.indexOf(key);
                if (idx !== -1) {
                  const hours = computeRecordDurationHours(record) || 0;
                  if (hours > 0) {
                    dailyOnPremises[idx] += hours;
                    weeklyOnPremises += hours;
                  }
                }
              } catch (_) { }
            });

            const preciseDaily = dailyOnPremises.map((h) => Math.max(0, Number(h) || 0));
            const preciseWeekly = preciseDaily.reduce((sum, h) => sum + h, 0);
            const hasAnyHours = preciseDaily.some((h) => h > 0) || preciseWeekly > 0;
            
            if (hasAnyHours) {
              attendanceOnPremises = {
                daily: preciseDaily,
                weekly: preciseWeekly
              };
            }
          }
        }

        // --- Determine Final On-Premises Time ---
        // Priority: 1. Fresh Attendance Data, 2. Saved Timesheet Data, 3. Default Zeros
        if (attendanceOnPremises) {
          setOnPremisesTime(attendanceOnPremises);
        } else if (Array.isArray(sheet.onPremisesTime?.daily)) {
          setOnPremisesTime({
            daily: (sheet.onPremisesTime.daily || []).map((n) => Number(n) || 0),
            weekly: Number(sheet.onPremisesTime.weekly) || 0
          });
        } else {
          setOnPremisesTime({
            daily: [0, 0, 0, 0, 0, 0, 0],
            weekly: 0
          });
        }

          // --- Set Timesheet Rows ---
          if (rows.length === 0) {
            const weekDates = getWeekDates(currentWeek);
            const holidayHours = weekDates.map(date => isHoliday(date) ? 9.5 : 0);
            const hasHoliday = holidayHours.some(h => h > 0);

            const initialRows = [];
            
            if (hasHoliday) {
              initialRows.push({
                id: Date.now() + Math.random(),
                project: "Office Holiday",
                task: "Office Holiday",
                hours: holidayHours,
                type: "project",
                shiftType: "",
                locked: true // Lock this row to prevent editing
              });
            }

            initialRows.push({
              id: Date.now() + Math.random() + 1,
              project: "",
              task: "",
              hours: [0, 0, 0, 0, 0, 0, 0],
              type: "project",
              shiftType: ""
            });

            setTimesheetRows(initialRows);
            setOriginalData(JSON.stringify(initialRows));
            setHasUnsavedChanges(false);
          } else {
            // Check if we need to add holiday row for existing timesheet
            const weekDates = getWeekDates(currentWeek);
            const holidayHours = weekDates.map(date => isHoliday(date) ? 9.5 : 0);
            const hasHoliday = holidayHours.some(h => h > 0);
            const hasHolidayRow = rows.some(r => r.project === "Office Holiday" || r.task === "Office Holiday");

            if (hasHoliday && !hasHolidayRow) {
               rows.unshift({
                id: Date.now() + Math.random(),
                project: "Office Holiday",
                task: "Office Holiday",
                hours: holidayHours,
                type: "project",
                shiftType: "",
                locked: true
              });
            }

            setTimesheetRows(rows);
            setOriginalData(JSON.stringify(rows));
            setHasUnsavedChanges(false);
          }
        
      } catch (err) {
        console.error("❌ Error loading week data:", err);
        // Don't load draft from session automatically - start fresh
        if (timesheetRows.length === 0) addProjectRow();
      } finally {
        updateMonthlyPermissionCount();
        setLoading(false);
      }
    };
    loadWeekData();
  }, [currentWeek]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const weekStart = params.get('weekStart');
      if (weekStart) {
        const d = new Date(weekStart);
        if (!isNaN(d.getTime())) setCurrentWeek(d);
      }
    } catch (_) { }
  }, []);

  const parseDurationHours = (input) => {
    if (input === null || input === undefined) return 0;
    if (typeof input === "number") {
      if (input > 100000) return input / 3600000;
      if (input > 1000) return input / 3600;
      if (input > 24) return input / 60;
      return input;
    }
    if (typeof input === "string") {
      const parts = input.split(":").map((n) => parseFloat(n) || 0);
      if (parts.length >= 2) {
        const h = parts[0];
        const m = parts[1];
        const s = parts[2] || 0;
        return h + m / 60 + s / 3600;
      }
      const num = parseFloat(input);
      if (!isNaN(num)) return num;
    }
    return 0;
  };

  const formatHoursHHMM = (hours) => {
    const totalMinutes = Math.round((Number(hours) || 0) * 60);
    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const mm = String(totalMinutes % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const parseHHMMToHours = (str) => {
    if (typeof str !== "string") return Number(str) || 0;
    const s = str.trim();
    if (!s) return 0;
    if (s.includes(":")) {
      const parts = s.split(":");
      let h = Math.max(0, parseInt(parts[0], 10) || 0);
      let mRaw = parseInt(parts[1], 10);
      let m = Math.max(0, isNaN(mRaw) ? 0 : mRaw);
      if (m >= 60) {
        h += Math.floor(m / 60);
        m = m % 60;
      }
      const step = 5;
      m = Math.round(m / step) * step;
      if (m === 60) {
        h += 1;
        m = 0;
      }
      return h + m / 60;
    }
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
  };

  const normalizeHHMMInput = (val) => {
    if (typeof val !== "string") return "";
    const digits = val.replace(/\D/g, "");
    if (!digits) return "";
    const h = digits.slice(0, 2);
    const mRaw = digits.slice(2, 4);
    if (mRaw.length === 0) return h;
    let m = parseInt(mRaw, 10);
    if (isNaN(m)) m = 0;
    if (m > 59) m = 59;
    const mm = String(m).padStart(2, "0");
    return `${h}:${mm}`;
  };

  const parseTime = (t) => {
    if (!t) return null;
    try {
      const d = new Date(t);
      if (!isNaN(d.getTime())) return d;
    } catch (_) { }
    return null;
  };

  const sumIntervalsToHours = (intervals) => {
    if (!Array.isArray(intervals)) return 0;
    let totalMs = 0;
    for (const it of intervals) {
      const start = parseTime(it.in || it.start || it.punchIn || it.begin || it.from);
      const end = parseTime(it.out || it.end || it.punchOut || it.finish || it.to);
      if (start && end && end > start) {
        totalMs += end.getTime() - start.getTime();
      }
    }
    return totalMs / 3600000;
  };

  const computeRecordDurationHours = (record) => {
    const candidate = record.workDuration ?? record.workDurationSeconds ?? record.workDurationMs ?? record.workDurationMillis ?? record.duration ?? record.hours;
    const direct = parseDurationHours(candidate);
    if (direct && direct > 0) return direct;
    if (Array.isArray(record.intervals)) return sumIntervalsToHours(record.intervals);
    if (Array.isArray(record.sessions)) return sumIntervalsToHours(record.sessions);
    if (Array.isArray(record.punches)) return sumIntervalsToHours(record.punches);
    if (Array.isArray(record.logs)) return sumIntervalsToHours(record.logs);
    if (record.punchIn && record.punchOut) return sumIntervalsToHours([{ in: record.punchIn, out: record.punchOut }]);
    return 0;
  };



  // Track if data has been modified for navigation warning
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalData, setOriginalData] = useState(null);

  // Set original data when loading from backend
  useEffect(() => {
    if (timesheetRows.length > 0 && !originalData && !isSubmitted) {
      setOriginalData(JSON.stringify(timesheetRows));
    }
  }, [timesheetRows, originalData, isSubmitted]);

  // Check for unsaved changes
  useEffect(() => {
    if (originalData && timesheetRows.length > 0) {
      const currentData = JSON.stringify(timesheetRows);
      setHasUnsavedChanges(currentData !== originalData);
    }
  }, [timesheetRows, originalData]);

  // Update monthly permission count when timesheet rows change
  useEffect(() => {
    updateMonthlyPermissionCount();
  }, [timesheetRows, currentWeek]);

  // Load allocated projects for the logged-in employee
  const loadAllocatedProjects = useCallback(async () => {
    try {
      const [meResult, allocResult] = await Promise.allSettled([
        employeeAPI.getMyProfile(),
        allocationAPI.getAllAllocations()
      ]);
      const me = meResult.status === 'fulfilled' ? meResult.value?.data || {} : {};
      const allocations = allocResult.status === 'fulfilled' && Array.isArray(allocResult.value?.data) 
        ? allocResult.value.data 
        : [];
      const weekDates = getWeekDates();
      const weekStart = new Date(weekDates[0]);
      const weekEnd = new Date(weekDates[6]);
      weekEnd.setHours(23, 59, 59, 999);
      const inSelectedWeek = (alloc) => {
        try {
          if (!alloc.startDate || !alloc.endDate) return true;
          const parseDate = (dateStr) => {
            if (!dateStr) return null;
            const parts = String(dateStr).split("T")[0].split("-");
            if (parts.length !== 3) return new Date(dateStr);
            return new Date(parts[0], parts[1] - 1, parts[2]);
          };
          const sd = parseDate(alloc.startDate);
          const ed = parseDate(alloc.endDate);
          if (!sd || !ed || isNaN(sd.getTime()) || isNaN(ed.getTime())) return true;
          if (sd > ed) return true;
          const ws = new Date(weekStart);
          ws.setHours(0, 0, 0, 0);
          const we = new Date(weekEnd);
          we.setHours(23, 59, 59, 999);
          return sd <= we && ed >= ws;
        } catch (_) {
          return true;
        }
      };
      const normalizeId = (id) => String(id || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const userSession = JSON.parse(sessionStorage.getItem("user") || "{}");
      const empId = normalizeId(me.employeeId || userSession.employeeId);
      const empMongoId = String(me._id || "").trim();
      const empName = String(me.name || userSession.name || "").trim().toLowerCase();
      const mineByMatch = allocations.filter(a => {
        const code = normalizeId(a.employeeCode);
        const eid = String(a.employeeId || "").trim();
        const ename = String(a.employeeName || "").trim().toLowerCase();
        const matchesEmployee =
          (code && empId && code === empId) ||
          (eid && empMongoId && eid === empMongoId) ||
          (ename && empName && ename === empName);
        const statusVal = String(a.status || "").trim().toLowerCase();
        const statusAllowed = statusVal === "active" || statusVal === "completed";
        return matchesEmployee && statusAllowed;
      });
      const mineWeek = mineByMatch.filter(inSelectedWeek);
      const mine = mineWeek.length ? mineWeek : mineByMatch;
      const unique = [];
      const seen = new Set();
      for (const a of mine) {
        const key = `${a.projectName}|${a.projectCode}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push({ name: a.projectName, code: a.projectCode });
        }
      }
      setProjects(unique);
    } catch (error) {
      setProjects([]);
    }
  }, [currentWeek]);

  useEffect(() => {
    loadAllocatedProjects();
  }, [loadAllocatedProjects]);

  useEffect(() => {
    const handler = () => { loadAllocatedProjects(); };
    window.addEventListener('project-allocations-updated', handler);
    return () => {
      window.removeEventListener('project-allocations-updated', handler);
    };
  }, [loadAllocatedProjects]);

  // ✅ Save draft to sessionStorage
  const saveDraftToSession = () => {
    try {
      const weekKey = `timesheet_draft_${getWeekKey()}`;
      const draftData = {
        rows: timesheetRows,
        weekStart: weekDates[0].toISOString(),
        weekEnd: weekDates[6].toISOString(),
        savedAt: new Date().toISOString(),
        shiftType: shiftType,
        dailyShiftTypes: dailyShiftTypes
      };
      sessionStorage.setItem(weekKey, JSON.stringify(draftData));
      console.log("💾 Draft saved to sessionStorage");
      // Update original data after saving
      setOriginalData(JSON.stringify(timesheetRows));
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("❌ Error saving draft to sessionStorage:", error);
    }
  };

  // ✅ Load draft from sessionStorage
  const loadDraftFromSession = () => {
    try {
      const weekKey = `timesheet_draft_${getWeekKey()}`;
      const savedDraft = sessionStorage.getItem(weekKey);

      if (savedDraft) {
        const draftData = JSON.parse(savedDraft);
        setTimesheetRows(draftData.rows || []);
        setShiftType(draftData.shiftType || "General Shift");
        setDailyShiftTypes(
          Array.isArray(draftData.dailyShiftTypes) && draftData.dailyShiftTypes.length === 7
            ? draftData.dailyShiftTypes
            : [
              draftData.shiftType || "General Shift",
              draftData.shiftType || "General Shift",
              draftData.shiftType || "General Shift",
              draftData.shiftType || "General Shift",
              draftData.shiftType || "General Shift",
              draftData.shiftType || "General Shift",
              draftData.shiftType || "General Shift",
            ]
        );
        console.log("📂 Draft loaded from sessionStorage");

        // Show confirmation message
        if (draftData.rows && draftData.rows.length > 0) {
          const savedTime = new Date(draftData.savedAt).toLocaleTimeString();
          alert(`📂 Draft data loaded from your current session (saved at ${savedTime})`);
        }
      }
    } catch (error) {
      console.error("❌ Error loading draft from sessionStorage:", error);
    }
  };

  // ✅ Get unique key for current week
  const getWeekKey = () => {
    const weekDates = getWeekDates();
    return `${weekDates[0].toISOString().split('T')[0]}_${weekDates[6].toISOString().split('T')[0]}`;
  };

  // ✅ Clear draft from sessionStorage
  const clearDraftFromSession = () => {
    try {
      const weekKey = `timesheet_draft_${getWeekKey()}`;
      sessionStorage.removeItem(weekKey);
      console.log("🗑️ Draft cleared from sessionStorage");
    } catch (error) {
      console.error("❌ Error clearing draft from sessionStorage:", error);
    }
  };

  const updateMonthlyPermissionCount = useCallback(() => {
    const currentMonth = currentWeek.getMonth();
    const currentYear = currentWeek.getFullYear();

    let count = 0;
    const newPermissionCounts = {};

    const getPermissionCountForHours = (h) => {
      const val = Number(h) || 0;
      if (val <= 0) return 0;
      if (val <= 1) return 1;
      if (val <= 2) return 2;
      return 3;
    };

    timesheetRows.forEach((row) => {
      if (row.task === "Permission") {
        row.hours.forEach((hours, dayIndex) => {
          const date = new Date(currentWeek);
          date.setDate(date.getDate() + (dayIndex - date.getDay() + 1));

          if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            const dateKey = date.toDateString();
            const c = getPermissionCountForHours(hours);
            if (c > 0) {
              newPermissionCounts[dateKey] = (newPermissionCounts[dateKey] || 0) + c;
              count += c;
            }
          }
        });
      }
    });

    setPermissionCounts(newPermissionCounts);
    setMonthlyPermissionCount(monthlyBasePermissionCount + count);
  }, [currentWeek, timesheetRows, monthlyBasePermissionCount]);

  // Update permission count whenever relevant data changes
  useEffect(() => {
    updateMonthlyPermissionCount();
  }, [updateMonthlyPermissionCount]);

  useEffect(() => {
    const loadMonthlyBasePermissionCount = async () => {
      try {
        const res = await timesheetAPI.getMyTimesheets();
        const sheets = Array.isArray(res.data) ? res.data : [];
        const currentMonth = currentWeek.getMonth();
        const currentYear = currentWeek.getFullYear();
        
        // Calculate current week Monday to exclude it from base count
        const currentBase = new Date(currentWeek);
        const day = currentBase.getDay();
        const diff = (day + 6) % 7;
        const currentMonday = new Date(currentBase);
        currentMonday.setDate(currentBase.getDate() - diff);
        currentMonday.setHours(0, 0, 0, 0);

        let baseCount = 0;
        sheets.forEach((sheet) => {
          const weekStart = new Date(sheet.weekStartDate);
          const sheetMonday = new Date(weekStart);
          sheetMonday.setHours(0, 0, 0, 0);
          
          // Skip if this sheet is for the current week (to avoid double counting)
          if (Math.abs(sheetMonday - currentMonday) < 86400000) return;

          (sheet.entries || []).forEach((entry) => {
            if (entry.task === "Permission" && Array.isArray(entry.hours)) {
              entry.hours.forEach((h, idx) => {
                if (h > 0) {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() + idx);
                  if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                    const val = Number(h) || 0;
                    if (val > 0 && val <= 1) baseCount += 1;
                    else if (val > 1 && val <= 2) baseCount += 2;
                    else if (val > 2) baseCount += 3;
                  }
                }
              });
            }
          });
        });
        setMonthlyBasePermissionCount(baseCount);
      } catch (e) {
        setMonthlyBasePermissionCount(0);
      }
      // updateMonthlyPermissionCount will be triggered by useEffect when monthlyBasePermissionCount changes
    };
    loadMonthlyBasePermissionCount();
  }, [currentWeek]);

  const addProjectRow = () => {
    setTimesheetRows((prev) => {
      // Calculate locked days based on existing approved leaves
      const lockedDays = [false, false, false, false, false, false, false];
      for (let i = 0; i < 7; i++) {
        const totalLeaveHours = prev.reduce((sum, row) => {
          if (row.type === 'leave' && (row.task || '').startsWith('Leave Approved')) {
            return sum + (Number(row.hours[i]) || 0);
          }
          return sum;
        }, 0);
        if (totalLeaveHours >= 8) {
          lockedDays[i] = true;
        }
      }

      const newRow = {
        id: Date.now() + Math.random(),
        project: "",
        task: "",
        hours: [0, 0, 0, 0, 0, 0, 0],
        type: "project",
        shiftType: "",
        lockedDays: lockedDays
      };
      return [...prev, newRow];
    });
  };

  const addLeaveRow = () => {
    if (isAddLeaveDisabled()) {
      alert("Maximum 4 leave rows allowed per timesheet.");
      return;
    }

    const newRow = {
      id: Date.now() + Math.random(),
      project: "Leave",
      task: "Permission",
      hours: [0, 0, 0, 0, 0, 0, 0],
      type: "leave",
      shiftType: ""
    };
    setTimesheetRows((prev) => [...prev, newRow]);
  };

  const deleteRow = (id) => {
    if (timesheetRows.length <= 1) {
      alert("At least one row must remain.");
      return;
    }
    setTimesheetRows((prev) => prev.filter((row) => row.id !== id));
  };

  const updateRow = (id, field, value) => {
    setTimesheetRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value };

          // Reset hours when task type changes
          if (field === "task") {
            updatedRow.hours = [0, 0, 0, 0, 0, 0, 0];
          }

          // Auto-update project code when project name is selected
          if (field === "project") {
            const p = projects.find((proj) => proj.name === value);
            updatedRow.projectCode = p ? p.code : "";
          }

          return updatedRow;
        }
        return row;
      })
    );
  };

  const updateHours = (id, dayIndex, value) => {
    const row = timesheetRows.find(r => r.id === id);
    if (!row) return;

    if (!isShiftSelectedForDay(dayIndex)) {
      return;
    }

    // Block editing other entries on a day with Full Day Leave/Office Holiday/Leave Approved (Full Day)
    const isFullDayMarked = timesheetRows.some(
      (r) =>
        (r.task === "Full Day Leave" || r.task === "Office Holiday" || (r.task === "Leave Approved" && Number(r.hours?.[dayIndex] || 0) >= 9)) &&
        (Number(r.hours?.[dayIndex] || 0) > 0)
    );
    if (
      isFullDayMarked &&
      row.task !== "Full Day Leave" &&
      row.task !== "Office Holiday" &&
      row.task !== "Leave Approved"
    ) {
      alert("Leave/Holiday applied on this day; other entries are blocked.");
      return;
    }

    // Normalize string inputs to HH:MM before parsing
    if (typeof value === "string") {
      value = normalizeHHMMInput(value);
    }

    // Handle empty string for proper deletion
    if (value === "" || value === null || value === undefined) {
      setTimesheetRows((prev) =>
        prev.map((r) => {
          if (r.id === id) {
            const newHours = [...r.hours];
            newHours[dayIndex] = 0;
            return { ...r, hours: newHours };
          }
          return r;
        })
      );
      return;
    }

    let numValue = parseHHMMToHours(value);

    // Calculate current daily totals
    // All rows (used for 24h hard cap)
    const currentDailyAllTotal = timesheetRows.reduce((total, r) => {
      if (r.id === id) return total; // Skip current row
      return total + (r.hours[dayIndex] || 0);
    }, 0);
    // Project-only rows (used for on-premises enforcement)
    const currentDailyProjectTotal = timesheetRows.reduce((total, r) => {
      if (r.id === id) return total; // Skip current row
      if (r.type !== "project") return total;
      return total + (r.hours[dayIndex] || 0);
    }, 0);

    // Calculate break hours for the day
    const currentBreakHours = computeBreakForDay(dayIndex);

    // Check if adding new value would exceed 24 hours (including break hours)
    const newWorkTotalAll = currentDailyAllTotal + numValue;
    const newTotalWithBreakAll = newWorkTotalAll + currentBreakHours;

    if (newTotalWithBreakAll > 24) {
      const currentTotalWithBreak = (currentDailyAllTotal + currentBreakHours).toFixed(1);
      alert(`Daily total (Work + Break) cannot exceed 24 hours.\n\nCurrent: ${currentTotalWithBreak}h (Work: ${currentDailyAllTotal.toFixed(1)}h + Break: ${currentBreakHours.toFixed(1)}h)\nAfter update: ${newTotalWithBreakAll.toFixed(1)}h\n\nPlease reduce hours to stay within 24 hours limit.`);
      return; // Don't update if it would exceed 24 hours
    }

    // Warning when approaching 24 hours (within 2 hours)
    if (newTotalWithBreakAll >= 22 && newTotalWithBreakAll <= 24) {
      const remainingHours = (24 - newTotalWithBreakAll).toFixed(1);
      alert(`⚠️ Warning: You are approaching the 24-hour daily limit.\n\nAfter this update: ${newTotalWithBreakAll.toFixed(1)}h (only ${remainingHours}h remaining)\n\nThis includes Work (${newWorkTotalAll.toFixed(1)}h) + Break (${currentBreakHours.toFixed(1)}h)`);
    }

    // Handle leave types
    if (row.task === "Office Holiday" || row.task === "Full Day Leave") {
      // For Full Day Leave and Office Holiday
      if (numValue > 0 && numValue < 9.5) {
        numValue = 9.5; // Jump to 9.5 when increasing from 0
      } else if (numValue === 0) {
        numValue = 0; // Allow setting to 0
      }
      // If user enters any value manually, validate it
      if (numValue > 0 && numValue !== 9.5) {
        numValue = 9.5; // Force to 9.5 for positive values
      }
    } else if (row.task === "Half Day Leave") {
      // For Half Day Leave
      if (numValue > 0 && numValue < 4.75) {
        numValue = 4.75; // Jump to 4.75 when increasing from 0
      } else if (numValue === 0) {
        numValue = 0; // Allow setting to 0
      }
      // If user enters any value manually, validate it
      if (numValue > 0 && numValue !== 4.75) {
        numValue = 4.75; // Force to 4.75 for positive values
      }
    } else if (row.task === "Permission") {
      // Allow specific duration input, but validate max limits
      if (numValue <= 0) {
        numValue = 0;
      } else if (numValue > 3) {
        alert("Maximum duration for a single permission is 3 hours.");
        return;
      }
      
      const getPermissionCountForHours = (h) => {
        const val = Number(h) || 0;
        if (val <= 0) return 0;
        if (val <= 1) return 1;
        if (val <= 2) return 2;
        return 3;
      };

      const computeMonthlyPermissionCountWithOverride = (overrideRowId, overrideDayIndex, overrideHours) => {
        const currentMonth = currentWeek.getMonth();
        const currentYear = currentWeek.getFullYear();
        let count = monthlyBasePermissionCount;
        timesheetRows.forEach((r) => {
          if (r.task !== "Permission") return;
          r.hours.forEach((h, idx) => {
            const date = new Date(currentWeek);
            date.setDate(date.getDate() + (idx - date.getDay() + 1));
            if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
              const hours = (r.id === overrideRowId && idx === overrideDayIndex) ? overrideHours : h;
              const c = getPermissionCountForHours(hours);
              count += c;
            }
          });
        });
        return count;
      };

      if (numValue > 0) {
        const prospectiveCount = computeMonthlyPermissionCountWithOverride(id, dayIndex, numValue);
        if (prospectiveCount > 3) {
          alert("Monthly permission limit (3 counts) exceeded!");
          return;
        }
      }
    } else {
      numValue = Math.max(0, numValue);
    }

    // Break after update depends on whether there is any project work on that day
    const hasWorkAfterUpdate = timesheetRows.some(
      (r) => r.type === "project" && r.task !== "Office Holiday" && ((r.id === id ? numValue : (r.hours?.[dayIndex] || 0)) > 0)
    );
    
    // Check if there is approved leave (use current state + current row update if applicable)
    // Note: If we are editing the "Leave Approved" row itself, we should use numValue
    const hasApprovedLeave = timesheetRows.some(
      (r) => (r.task || "").startsWith("Leave Approved") && (r.id === id ? numValue : Number(r.hours?.[dayIndex] || 0)) > 0
    );

    const shiftForDay = dailyShiftTypes?.[dayIndex] || shiftType || "";
    const breakByShift = getShiftBreakHours(shiftForDay);
    const breakAfterUpdate = hasWorkAfterUpdate && !hasApprovedLeave ? breakByShift : 0;

    // Shift-based caps removed in favor of on-premises enforcement
    // Enforce on-premises cap: project work + auto break must not exceed on-premises time
    // WE RELAX THIS CHECK if there is a Half Day Leave / Leave Approved (Partial), 
    // to allow entering project hours even if biometric data is missing/short.
    const hasPartialLeave = timesheetRows.some(
      (r) => (r.task === "Half Day Leave" || ((r.task || "").startsWith("Leave Approved") && Number(r.hours?.[dayIndex] || 0) < 9)) &&
        Number(r.hours?.[dayIndex] || 0) > 0
    );

    if (row.type === "project") {
      const opHours = Number(onPremisesTime?.daily?.[dayIndex] || 0);
      if (opHours > 0) {
        const remainingAllowed = Math.max(0, opHours - breakAfterUpdate - currentDailyProjectTotal);
        if (numValue > remainingAllowed) {
          numValue = remainingAllowed;
        }
      } else if (!hasPartialLeave) {
        numValue = 0;
      }
    }

    // Double-check after task-specific validation (including break hours)
    const finalWorkTotal = currentDailyAllTotal + numValue;
    const finalTotalWithBreak = finalWorkTotal + breakAfterUpdate;

    // Shift-based caps removed

    if (finalTotalWithBreak > 24) {
      const currentTotalWithBreak = (currentDailyAllTotal + computeBreakForDay(dayIndex)).toFixed(1);
      alert(`Daily total (Work + Break) cannot exceed 24 hours.\n\nCurrent: ${currentTotalWithBreak}h (Work: ${currentDailyAllTotal.toFixed(1)}h + Break: ${computeBreakForDay(dayIndex).toFixed(1)}h)\nAfter update: ${finalTotalWithBreak.toFixed(1)}h\n\nPlease reduce hours to stay within 24 hours limit.`);
      return;
    }

    setTimesheetRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const newHours = [...r.hours];

          const rounded = Math.round(numValue * 100) / 100;
          newHours[dayIndex] = rounded;
          return { ...r, hours: newHours };
        }
        return r;
      })
    );
  };

  // Check if permission is allowed for a specific day, excluding current row
  const isPermissionAllowed = (dayIndex, excludeRowId = null) => {
    const hasExistingPermission = timesheetRows.some(row =>
      row.task === "Permission" && row.hours[dayIndex] > 0 && row.id !== excludeRowId
    );
    return !hasExistingPermission;
  };

  const hasFullDayLeave = (dayIndex) => {
    return timesheetRows.some(row =>
      (row.task === 'Full Day Leave' || row.task === 'Office Holiday' || ((row.task || "").startsWith('Leave Approved') && Number(row.hours[dayIndex] || 0) >= 9)) &&
      Number(row.hours[dayIndex] || 0) > 0
    );
  };

  useEffect(() => {
    const daysCount = 7;
    let updated = false;
    const nextRows = timesheetRows.map(r => ({ ...r, hours: [...r.hours] }));
    for (let d = 0; d < daysCount; d++) {
      const hasFull = nextRows.some(
        (r) => (r.task === 'Full Day Leave' || r.task === 'Office Holiday' || ((r.task || "").startsWith('Leave Approved') && Number(r.hours?.[d] || 0) >= 9)) && (Number(r.hours?.[d] || 0) > 0)
      );
      if (!hasFull) continue;
      nextRows.forEach((r) => {
        if (r.task === 'Full Day Leave' || r.task === 'Office Holiday' || (r.task || "").startsWith('Leave Approved')) return;
        if ((r.hours?.[d] || 0) > 0) {
          r.hours[d] = 0;
          updated = true;
        }
      });
    }
    if (updated) {
      setTimesheetRows(nextRows);
    }
  }, [timesheetRows]);

  // ✅ Check if there's at least some data entered
  const hasSomeData = () => {
    return timesheetRows.some(row =>
      row.project ||
      row.task ||
      row.hours.some(hours => hours > 0)
    );
  };

  // ✅ Calculate totals dynamically
  useEffect(() => {
    calculateTotals();
  }, [timesheetRows]);

  const calculateTotals = () => {
    const dailyTotals = [0, 0, 0, 0, 0, 0, 0];
    let weeklyTotal = 0;

    timesheetRows.forEach((row) => {
      row.hours.forEach((hours, index) => {
        dailyTotals[index] += hours;
        weeklyTotal += hours;
      });
    });

    setTotals({
      daily: dailyTotals,
      weekly: weeklyTotal,
    });
  };

  // ✅ Week calculation helpers (anchor to local Monday of currentWeek)
  const getWeekDates = () => {
    const base = new Date(currentWeek);
    const day = base.getDay(); // 0 (Sun) .. 6 (Sat)
    const diffToMonday = (day + 6) % 7; // days to go back to Monday
    const monday = new Date(base);
    monday.setDate(base.getDate() - diffToMonday);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };
  const getWeekMonday = (date) => {
    const base = new Date(date);
    const day = base.getDay();
    const diff = (day + 6) % 7;
    const monday = new Date(base);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(base.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };
  const canNavigateNextWeek = () => {
    const next = new Date(currentWeek);
    next.setDate(next.getDate() + 7);
    const nextMonday = getWeekMonday(next).getTime();
    const todayMonday = getWeekMonday(new Date()).getTime();
    return nextMonday <= todayMonday;
  };

  const previousWeek = () => {
    handleNavigation(() => {
      const newWeek = new Date(currentWeek);
      newWeek.setDate(newWeek.getDate() - 7);
      setCurrentWeek(newWeek);
      setTimesheetRows([]);
      setIsSubmitted(false); // Reset submission status when changing weeks
      setOriginalData(null); // Reset original data for new week
    });
  };

  const nextWeek = () => {
    if (!canNavigateNextWeek()) return;
    handleNavigation(() => {
      const newWeek = new Date(currentWeek);
      newWeek.setDate(newWeek.getDate() + 7);
      setCurrentWeek(newWeek);
      setTimesheetRows([]);
      setIsSubmitted(false); // Reset submission status when changing weeks
      setOriginalData(null); // Reset original data for new week
    });
  };

  const goToCurrentWeek = () => {
    handleNavigation(() => {
      setCurrentWeek(new Date());
      setTimesheetRows([]);
      setIsSubmitted(false); // Reset submission status when changing weeks
      setOriginalData(null); // Reset original data for new week
    });
  };

  // ✅ Save as draft - Allow saving with partial data
  const saveAsDraft = async () => {
    if (!hasSomeData()) {
      alert("Please enter at least some data (project, task, or hours) before saving as draft.");
      return;
    }

    // Drafts are saved to backend only

    const normalizeToUTCDateOnly = (d) => {
      const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      return utc.toISOString();
    };

    const sanitizedEntries = timesheetRows.map((row) => ({
      project: row.project || "Unnamed Project",
      projectCode:
        row.type === "leave"
          ? ""
          : (projects.find((p) => p.name === row.project)?.code || ""),
      task: row.task || "Unnamed Task",
      type: row.type,
      locked: row.locked,
      hours: (row.hours || []).map((h) => {
        const n = Number(h);
        return Number.isFinite(n) ? n : 0;
      }),
    }));

    const payload = {
      weekStartDate: normalizeToUTCDateOnly(weekDates[0]),
      weekEndDate: normalizeToUTCDateOnly(weekDates[6]),
      entries: sanitizedEntries,
      totalHours: Number((totals.weekly + computeWeeklyBreak()).toFixed(1)) || 0,
      status: "Draft",
      shiftType: shiftType,
      dailyShiftTypes: dailyShiftTypes,
      onPremisesTime: {
        daily: (onPremisesTime?.daily || []).map((n) => Number(n) || 0),
        weekly: Number(onPremisesTime?.weekly) || 0
      }
    };

    try {
      setLoading(true);

      const response = await timesheetAPI.saveTimesheet(payload);
      console.log("✅ Timesheet saved as draft:", response.data);

      // Draft persisted to backend

      // Update original data to mark as saved
      setOriginalData(JSON.stringify(timesheetRows));
      setHasUnsavedChanges(false);

      // Notify history page to refresh
      try { window.dispatchEvent(new Event('refreshTimesheetHistory')); } catch (_) { }

      alert("✅ Timesheet saved as draft successfully!");
    } catch (error) {
      console.error("❌ Error saving timesheet as draft:", error);
      alert(
        error.response?.data?.message ||
        "Failed to save timesheet as draft. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ Submit timesheet to backend
  const submitTimesheet = async () => {
    const invalidRows = timesheetRows.filter(
      (row) => !row.project || (row.type === "project" && !row.task)
    );
    if (invalidRows.length > 0) {
      alert("Please fill all required fields for all rows.");
      return;
    }

    if (totals.weekly === 0) {
      alert("Please enter hours for at least one day.");
      return;
    }

    if (!weeklyMinimumSatisfied) {
      if (missingShiftDays.length > 0) {
        alert(
          `Please select a shift for the following days (Mon–Fri):\n` +
          `${missingShiftDays.join(", ")}.\n\n` +
          `A shift must be selected for every working day unless a Full Day Leave or Holiday is applied.`
        );
      } else {
        alert(
          `Weekly minimum hours based on selected shifts is ${formatHoursHHMM(weeklyRequiredShiftHours)}.\n` +
          `Currently recorded (Work + Break): ${formatHoursHHMM(weeklyTotalWithBreakValidDays)}.\n\n` +
          `Please complete the required hours before submitting.`
        );
      }
      return;
    }

    if (monthlyPermissionCount > 3) {
      alert(`Monthly permission limit exceeded! Current count: ${monthlyPermissionCount}/3`);
      return;
    }

    for (let i = 0; i < 7; i++) {
      const op = Number(onPremisesTime?.daily?.[i] || 0);
      const hasProjectHours = timesheetRows.some(
        (row) => row.type === "project" && row.task !== "Office Holiday" && ((row.hours?.[i] || 0) > 0)
      );

      let workTotal = 0;
      timesheetRows.forEach((row) => {
        workTotal += Number(row.hours?.[i] || 0);
      });
      const breakHours = computeBreakForDay(i);
      const totalWithBreak = workTotal + breakHours;

      // Skip check for Saturday (5) and Sunday (6)
      // Compare using minute precision to avoid float rounding issues
      const opMinutes = Math.round(op * 60);
      const totalMinutes = Math.round(totalWithBreak * 60);
      if (i < 5 && opMinutes > totalMinutes) {
        alert(`On-Premises Time for ${days[i]} cannot exceed Total (Work + Break).\n\nOn-Premises: ${formatHoursHHMM(op)}\nTotal: ${formatHoursHHMM(totalWithBreak)}`);
        return;
      }

      if (op <= 0 && hasProjectHours) {
        alert(`Project hours not allowed for ${days[i]} without on-premises time. Please record attendance or remove project hours.`);
        return;
      }
    }



    const normalizeToUTCDateOnly = (d) => {
      const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      return utc.toISOString();
    };

    const sanitizedEntries = timesheetRows.map((row) => ({
      project: row.project,
      projectCode:
        row.type === "leave"
          ? ""
          : (projects.find((p) => p.name === row.project)?.code || ""),
      task: row.task,
      type: row.type,
      locked: row.locked,
      hours: (row.hours || []).map((h) => {
        const n = Number(h);
        return Number.isFinite(n) ? n : 0;
      }),
    }));

    const user = JSON.parse(sessionStorage.getItem("user") || "{}");

    const payload = {
      weekStartDate: normalizeToUTCDateOnly(weekDates[0]),
      weekEndDate: normalizeToUTCDateOnly(weekDates[6]),
      entries: sanitizedEntries,
      totalHours: Number((totals.weekly + computeWeeklyBreak()).toFixed(1)) || 0,
      status: "Submitted",
      shiftType: shiftType,
      dailyShiftTypes: dailyShiftTypes,
      employeeId: user.employeeId || "",
      employeeName: user.name || "",
      onPremisesTime: {
        daily: (onPremisesTime?.daily || []).map((n) => Number(n) || 0),
        weekly: Number(onPremisesTime?.weekly) || 0
      }
    };

    try {
      setLoading(true);
      const response = await timesheetAPI.saveTimesheet(payload);
      console.log("✅ Timesheet submitted:", response.data);

      // Submission persisted to backend

      // Set submitted status to prevent auto-saving
      setIsSubmitted(true);

      // Notify history page to refresh
      try { window.dispatchEvent(new Event('refreshTimesheetHistory')); } catch (_) { }

      alert("✅ Timesheet submitted successfully!");
    } catch (error) {
      console.error("❌ Error submitting timesheet:", error);
      alert(
        error.response?.data?.message ||
        "Failed to submit timesheet. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const weekDates = getWeekDates();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getShiftMinHours = (shift) => {
    if (!shift) return 0;
    const s = String(shift);
    if (s.startsWith("General Shift")) return 9.5;
    if (s.startsWith("First Shift") || s.startsWith("Second Shift") || s.startsWith("Secend Shift")) return 8.5;
    return 0;
  };

  const getShiftMaxHours = (shift) => {
    if (!shift) return 24;
    const s = String(shift);
    if (s.startsWith("General Shift")) return 9.5;
    if (s.startsWith("First Shift") || s.startsWith("Second Shift") || s.startsWith("Secend Shift")) return 8.5;
    return 24;
  };

  const isShiftSelectedForDay = (idx) => {
    const s = dailyShiftTypes?.[idx];
    return !!s && s !== "Select Shift";
  };

  const dailyWorkTotals = (() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    timesheetRows.forEach((row) => {
      if (row.type === "project") {
        row.hours.forEach((h, idx) => {
          const n = Number(h) || 0;
          totals[idx] += n;
        });
      }
      if (row.type === "leave") {
        row.hours.forEach((h, idx) => {
          const n = Number(h) || 0;
          totals[idx] += n;
        });
      }
    });
    return totals;
  })();

  const shiftMinimumsSatisfied = dailyShiftTypes.every((shift, idx) => {
    if (!shift || shift === "Select Shift") return true;
    if (hasFullDayLeave(idx)) return true;
    const required = getShiftMinHours(shift);
    return dailyWorkTotals[idx] >= required;
  });

  // ========== WORK + BREAK LOGIC FUNCTIONS ==========

  const getShiftBreakHours = (shift) => {
    if (!shift) return 0;
    const s = String(shift);
    if (s.startsWith("First Shift")) return 65 / 60;
    if (s.startsWith("Second Shift")) return 60 / 60;
    if (s.startsWith("General Shift")) return 75 / 60;
    return 0;
  };

  const computeBreakForDay = (dayIndex) => {
    const hasWork = timesheetRows.some(
      (row) => row.type === "project" && row.task !== "Office Holiday" && Number(row.hours?.[dayIndex] || 0) > 0
    );
    // No break for approved leave days (Full or Half)
    const hasApprovedLeave = timesheetRows.some(
      (row) => (row.task || "").startsWith("Leave Approved") && Number(row.hours?.[dayIndex] || 0) > 0
    );
    const shiftForDay = dailyShiftTypes?.[dayIndex] || shiftType || "";
    const breakByShift = getShiftBreakHours(shiftForDay);
    return hasWork && !hasApprovedLeave ? breakByShift : 0;
  };

  // Calculate weekly break total
  const computeWeeklyBreak = () => {
    let sum = 0;
    for (let i = 0; i < 7; i++) sum += computeBreakForDay(i);
    return sum;
  };

  const hasAnyApprovedLeave = (dayIndex) => {
    return timesheetRows.some(
      (row) => (row.task || "").startsWith("Leave Approved") && Number(row.hours?.[dayIndex] || 0) > 0
    );
  };

  const getWeeklyRequiredShiftHours = () => {
    let required = 0;
    // Iterate all 7 days (Mon-Sun)
    for (let i = 0; i < 7; i++) {
      const shift = dailyShiftTypes?.[i] || shiftType || "";
      // Skip if no shift is selected
      if (!shift || shift === "Select Shift") continue;
      // Skip full day leave/holiday OR any approved leave
      if (hasFullDayLeave(i) || hasAnyApprovedLeave(i)) continue;
      
      // For Mon-Fri (0-4), shift is mandatory (checked by getMissingShiftDays)
      // For Sat-Sun (5-6), if shift is selected, it adds to required hours
      required += getShiftMinHours(shift);
    }
    return required;
  };

  const getMissingShiftDays = () => {
    const missing = [];
    for (let i = 0; i < 5; i++) {
      if (hasFullDayLeave(i) || hasAnyApprovedLeave(i)) continue;
      const shift = dailyShiftTypes?.[i] || shiftType || "";
      if (!shift || shift === "Select Shift") {
        missing.push(days[i]);
      }
    }
    return missing;
  };

  const weeklyRequiredShiftHours = getWeeklyRequiredShiftHours();
  // Sum Work + Break for all days (0-6) EXCLUDING Full Day Leave or Approved Leave days
  const weeklyTotalWithBreakValidDays = totals.daily.slice(0, 7).reduce((sum, h, i) => {
    if (hasFullDayLeave(i) || hasAnyApprovedLeave(i)) return sum;
    return sum + h + computeBreakForDay(i);
  }, 0);
  const missingShiftDays = getMissingShiftDays();
  // Compare minutes to avoid floating point issues
  const weeklyMinimumSatisfied = missingShiftDays.length === 0 && Math.round(weeklyTotalWithBreakValidDays * 60) >= Math.round(weeklyRequiredShiftHours * 60);

  const updateDailyShift = (index, value) => {
    setDailyShiftTypes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const saveDailyShiftTypesToSession = () => { };

  useEffect(() => {
    saveDailyShiftTypesToSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyShiftTypes, shiftType, currentWeek]);

  // Get daily total with break (formatted in HH:MM)
  const getDailyTotalWithBreak = (dayIndex) => {
    const workTotal = totals.daily[dayIndex] || 0;
    const breakTotal = computeBreakForDay(dayIndex);
    const totalHours = workTotal + breakTotal;
    return formatHoursHHMM(totalHours);
  };

  // Get weekly total with break (formatted in HH:MM)
  const getWeeklyTotalWithBreak = () => {
    const workTotal = totals.weekly || 0;
    const breakTotal = computeWeeklyBreak();
    const totalHours = workTotal + breakTotal;
    return formatHoursHHMM(totalHours);
  };

  // Get current daily total with break (numeric value for calculations)
  const getCurrentDailyTotalWithBreak = (dayIndex) => {
    const workTotal = totals.daily[dayIndex] || 0;
    const breakTotal = computeBreakForDay(dayIndex);
    return workTotal + breakTotal;
  };

  // Get CSS class for daily total warning
  const getDailyTotalWarningClass = (dayIndex) => {
    const totalWithBreak = getCurrentDailyTotalWithBreak(dayIndex);
    if (totalWithBreak >= 24) return "bg-red-100 text-red-800 font-bold";
    if (totalWithBreak >= 20) return "bg-yellow-100 text-yellow-800 font-bold";
    return "text-blue-700 font-bold";
  };

  // Navigation confirmation functions
  const handleNavigation = (navigationFunction) => {
    if (hasUnsavedChanges && !isSubmitted) {
      setPendingNavigation(() => navigationFunction);
      setShowNavigationDialog(true);
    } else {
      navigationFunction();
    }
  };

  const confirmSaveAndNavigate = () => {
    saveDraftToSession();
    setShowNavigationDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const cancelNavigation = () => {
    setShowNavigationDialog(false);
    setPendingNavigation(null);
  };

  const discardAndNavigate = () => {
    setShowNavigationDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  // Format week range with month names
  const formatWeekRange = () => {
    const startMonth = weekDates[0].toLocaleDateString("en-US", { month: "short" });
    const endMonth = weekDates[6].toLocaleDateString("en-US", { month: "short" });
    const startDay = weekDates[0].getDate();
    const endDay = weekDates[6].getDate();

    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Week Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full md:w-auto">
            <div className="flex items-center gap-2 justify-center w-full sm:w-auto">
              <button
                onClick={previousWeek}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>

              <div className="text-lg font-semibold text-gray-800">
                {currentWeek.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric"
                })}
              </div>

              <button
                onClick={nextWeek}
                disabled={!canNavigateNextWeek()}
                className={`p-1 rounded transition-colors ${!canNavigateNextWeek() ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"}`}
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Week:</span>
              <span className="text-sm text-gray-800 font-semibold">
                {formatWeekRange()}
              </span>
            </div>
          </div>

          <button
            onClick={goToCurrentWeek}
            className="px-4 py-2 bg-blue-700 text-white rounded text-sm font-medium hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 w-full md:w-auto"
          >
            <Calendar className="w-4 h-4" />
            CURRENT WEEK
          </button>
        </div>
      </div>

      {/* Timesheet Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Header with action buttons */}
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Week Entry
          </h2>

          <div className="flex flex-wrap justify-center gap-3 w-full md:w-auto">
            <button
              onClick={addProjectRow}
              disabled={isLeaveAutoDraft || isSubmitted}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${isLeaveAutoDraft || isSubmitted ? "bg-gray-400 cursor-not-allowed text-white" : "bg-blue-700 hover:bg-blue-800 text-white"}`}
              title={isSubmitted ? "Timesheet already submitted" : "Add Project Row"}
            >
              <Plus className="w-4 h-4" />
              ADD PROJECT
            </button>

            <div className="flex flex-col items-center">
              <button
                onClick={addLeaveRow}
                disabled={isAddLeaveDisabled()}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${isAddLeaveDisabled()
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-700 hover:bg-blue-800 text-white"
                  }`}
                title={isAddLeaveDisabled() ? "Cannot add leave row (Limit reached or Permission active)" : "Add Leave Row"}
              >
                <Plus className="w-4 h-4" />
                ADD PERMISSION 
              </button>
              {/* <span className={`text-[10px] font-bold mt-1 ${monthlyPermissionCount > 3 ? 'text-red-600' : 'text-gray-500'}`}>
                Used: {monthlyPermissionCount}/3
              </span> */}
            </div>

            <button
              onClick={saveAsDraft}
              disabled={loading || !hasSomeData() || isSubmitted || isLeaveAutoDraft}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${loading || !hasSomeData() || isSubmitted || isLeaveAutoDraft
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-700 hover:bg-blue-800 text-white"
                }`}
            >
              <Save className="w-4 h-4" />
              SAVE DRAFT
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-max w-full border-collapse table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-200 w-12">
                  S.no
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-200 min-w-60">
                  Project Name
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-200 min-w-48">
                  Task / Leave Type
                </th>
                {days.map((day, index) => (
                  <th
                    key={day}
                    className={`p-3 text-center text-sm font-semibold text-gray-700 border border-gray-200 w-32 ${isHoliday(weekDates[index]) ? 'bg-green-100' : ''}`}
                  >
                    <div>{day}</div>
                    <div className="text-xs text-gray-500 font-normal">
                      {weekDates[index].toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="mt-2">
                      {isHoliday(weekDates[index]) ? (
                        <div className="text-xs font-bold text-green-800 break-words whitespace-normal px-1">
                          {getHolidayOccasion(weekDates[index])}
                        </div>
                      ) : (
                        <select
                          value={dailyShiftTypes[index]}
                          onChange={(e) => updateDailyShift(index, e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSubmitted || isLeaveAutoDraft}
                        >
                          <option value="">Select Shift</option>
                          {shiftTypes.map((shift) => (
                            <option key={shift} value={shift}>
                              {shift}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </th>
                ))}
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-200 w-24">
                  Total
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-200 w-20">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {timesheetRows.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="p-3 text-gray-900 text-center border border-gray-200">
                    {index + 1}
                  </td>

                  {/* Project Name Column */}
                  <td className="p-2 border border-gray-200">
                    {row.type === "leave" ? (
                      <div className="w-full p-2 text-blue-800 rounded text-sm font-semibold text-center">
                        Leave
                      </div>
                    ) : row.project === "Office Holiday" ? (
                      <div className="w-full p-2 text-green-800 rounded text-sm font-semibold text-center">
                        Office Holiday
                      </div>
                    ) : (
                      <select
                        value={row.project}
                        onChange={(e) => updateRow(row.id, "project", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isSubmitted || isLeaveAutoDraft || row.locked}
                      >
                        <option value="">Select Project</option>
                        {projects.map((p) => (
                          <option key={p.code || p.name} value={p.name}>
                            {p.code ? `${p.name} (${p.code})` : p.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>

                  <td className="p-2 border border-gray-200">
                    {row.task === "Office Holiday" || row.task === "Permission" ? (
                      <div className={`w-full p-2 ${row.task === "Office Holiday" ? "text-green-800" : "text-blue-800"} rounded text-sm font-semibold text-center`}>
                        {row.task}
                      </div>
                    ) : (
                      <select
                        value={row.task}
                        onChange={(e) => updateRow(row.id, "task", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isSubmitted || isLeaveAutoDraft || row.locked}
                      >
                        <option value="">Select {row.type === "leave" ? "Leave Type" : "Task"}</option>
                        {(row.type === "leave" ? leaveTypes : tasks).map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                        {row.task.startsWith("Leave Approved") && (
                          <option value={row.task}>{row.task}</option>
                        )}
                      </select>
                    )}
                  </td>

                  {row.hours.map((hours, dayIndex) => (
                    <td key={dayIndex} className={`p-2 text-center border border-gray-200 w-32 ${isHoliday(weekDates[dayIndex]) ? 'bg-green-100' : ''}`}>
                      <div className="relative inline-flex items-center">
                        <input
                          type="time"
                          value={cellInputs[`${row.id}_${dayIndex}`] ?? formatHoursHHMM(hours)}
                          placeholder="00:00"
                          onChange={(e) => {
                            const key = `${row.id}_${dayIndex}`;
                            setCellInputs((prev) => ({ ...prev, [key]: e.target.value }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const key = `${row.id}_${dayIndex}`;
                              const entered = (e.currentTarget && e.currentTarget.value) || '';
                              updateHours(row.id, dayIndex, entered);
                              setCellInputs((prev) => {
                                const next = { ...prev };
                                delete next[key];
                                return next;
                              });
                              if (e.currentTarget) e.currentTarget.blur();
                            }
                            if (e.key === 'ArrowUp') {
                              // Don't allow arrow keys for Leave Approved
                              if (
                                row.type !== "project" &&
                                row.task !== "Permission" &&
                                row.task !== "Full Day Leave" &&
                                row.task !== "Office Holiday" &&
                                row.task !== "Half Day Leave" &&
                                !row.task.startsWith("Leave Approved")  // Added this condition
                              ) {
                                const key = `${row.id}_${dayIndex}`;
                                const baseStr = cellInputs[key] ?? formatHoursHHMM(hours || 0);
                                const base = parseHHMMToHours(baseStr);
                                const next = base + 5 / 60;
                                updateHours(row.id, dayIndex, formatHoursHHMM(next));
                                setCellInputs((prev) => {
                                  const nextInputs = { ...prev };
                                  delete nextInputs[key];
                                  return nextInputs;
                                });
                                e.preventDefault();
                              }
                            }
                            if (e.key === 'ArrowDown') {
                              // Don't allow arrow keys for Leave Approved
                              if (
                                row.type !== "project" &&
                                row.task !== "Permission" &&
                                row.task !== "Full Day Leave" &&
                                row.task !== "Office Holiday" &&
                                row.task !== "Half Day Leave" &&
                                !row.task.startsWith("Leave Approved")  // Added this condition
                              ) {
                                const key = `${row.id}_${dayIndex}`;
                                const baseStr = cellInputs[key] ?? formatHoursHHMM(hours || 0);
                                const base = parseHHMMToHours(baseStr);
                                const next = Math.max(0, base - 15 / 60);
                                updateHours(row.id, dayIndex, formatHoursHHMM(next));
                                setCellInputs((prev) => {
                                  const nextInputs = { ...prev };
                                  delete nextInputs[key];
                                  return nextInputs;
                                });
                                e.preventDefault();
                              }
                            }
                          }}
                          onFocus={(e) => {
                            const key = `${row.id}_${dayIndex}`;
                            const val = (e.currentTarget && e.currentTarget.value) || '';
                            setCellInputs((prev) => ({ ...prev, [key]: val }));
                          }}
                          onBlur={(e) => {
                            const key = `${row.id}_${dayIndex}`;
                            const val = (e.currentTarget && e.currentTarget.value) || '';
                            updateHours(row.id, dayIndex, val);
                            setCellInputs((prev) => {
                              const next = { ...prev };
                              delete next[key];
                              return next;
                            });
                          }}
                          className={`w-20 p-2 ${row.type !== "project" ? "pr-6" : ""} border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${(row.type === "project" ? (!row.project || !row.task) : (!row.task))
                              ? "bg-gray-100 cursor-not-allowed"
                              : (row.type === "project" && (dayIndex === 5 || dayIndex === 6))
                                ? "bg-gray-100 cursor-not-allowed"
                                : row.task === "Permission" && !isPermissionAllowed(dayIndex, row.id)
                                  ? "bg-gray-100 cursor-not-allowed"
                                  : isSubmitted || row.locked
                                    ? "bg-gray-100 cursor-not-allowed"
                                    : hasFullDayLeave(dayIndex) && row.task !== "Full Day Leave" && row.task !== "Office Holiday"
                                      ? "bg-gray-100 cursor-not-allowed"
                                      : !isShiftSelectedForDay(dayIndex)
                                        ? "bg-gray-100 cursor-not-allowed"
                                        : ""
                            }`}
                          disabled={
                            isSubmitted || isLeaveAutoDraft ||
                            row.locked ||
                            (row.lockedDays && row.lockedDays[dayIndex]) ||
                            (row.type === "project" ? (!row.project || !row.task) : (!row.task)) ||
                            (hasFullDayLeave(dayIndex) && row.task !== "Full Day Leave" && row.task !== "Office Holiday") ||
                            (row.task === "Permission" && (!isPermissionAllowed(dayIndex, row.id) || (monthlyPermissionCount >= 3 && Number(hours) === 0))) ||
                            (!isShiftSelectedForDay(dayIndex))
                          }
                          title={
                            isSubmitted
                              ? "Timesheet already submitted"
                              : row.locked
                                ? "Locked due to approved leave"
                                : (row.lockedDays && row.lockedDays[dayIndex])
                                  ? "Locked due to full day leave"
                                  : (row.type === "project" ? (!row.project || !row.task) : (!row.task))
                                    ? (row.type === "project" ? "Please select project and task first" : "Please select a leave type or task")
                                    : row.task === "Permission" && !isPermissionAllowed(dayIndex, row.id)
                                      ? "Permission not allowed for this day"
                                      : (monthlyPermissionCount >= 3 && Number(hours) === 0)
                                        ? "Monthly permission limit reached"
                                        : hasFullDayLeave(dayIndex) && row.task !== "Full Day Leave" && row.task !== "Office Holiday"
                                          ? "Full Day Leave applied on this day"
                                          : !isShiftSelectedForDay(dayIndex)
                                            ? "Please select a shift for this day"
                                            : ""
                          }
                        />
                        {/* Hide arrows for Leave Approved and other specific leave types */}
                        {row.type !== "project" &&
                          row.task !== "Permission" &&
                          row.task !== "Full Day Leave" &&
                          row.task !== "Office Holiday" &&
                          row.task !== "Half Day Leave" &&
                          !row.task.startsWith("Leave Approved") && (  // Added this condition
                            <div className="absolute right-1 inset-y-1 flex flex-col justify-between">
                              <button
                                onClick={() => {
                                  const key = `${row.id}_${dayIndex}`;
                                  const baseStr = cellInputs[key] ?? formatHoursHHMM(hours || 0);
                                  const base = parseHHMMToHours(baseStr);
                                  const next = base + 15 / 60;
                                  updateHours(row.id, dayIndex, formatHoursHHMM(next));
                                  setCellInputs((prev) => {
                                    const nextInputs = { ...prev };
                                    delete nextInputs[key];
                                    return nextInputs;
                                  });
                                }}
                                disabled={
                                  isSubmitted || isLeaveAutoDraft ||
                                  row.locked ||
                                  (row.type === "project" ? (!row.project || !row.task) : (!row.task)) ||
                                  (hasFullDayLeave(dayIndex) && row.task !== "Full Day Leave" && row.task !== "Office Holiday") ||
                                  (!isShiftSelectedForDay(dayIndex))
                                }
                                className="w-4 h-4 flex items-center justify-center bg-transparent text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Increase 5 minutes"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  const key = `${row.id}_${dayIndex}`;
                                  const baseStr = cellInputs[key] ?? formatHoursHHMM(hours || 0);
                                  const base = parseHHMMToHours(baseStr);
                                  const next = Math.max(0, base - 5 / 60);
                                  updateHours(row.id, dayIndex, formatHoursHHMM(next));
                                  setCellInputs((prev) => {
                                    const nextInputs = { ...prev };
                                    delete nextInputs[key];
                                    return nextInputs;
                                  });
                                }}
                                disabled={
                                  isSubmitted || isLeaveAutoDraft ||
                                  row.locked ||
                                  (row.type === "project" ? (!row.project || !row.task) : (!row.task)) ||
                                  (hasFullDayLeave(dayIndex) && row.task !== "Full Day Leave" && row.task !== "Office Holiday") ||
                                  (!isShiftSelectedForDay(dayIndex))
                                }
                                className="w-4 h-4 flex items-center justify-center bg-transparent text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Decrease 15 minutes"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                      </div>
                    </td>
                  ))}

                  <td className="p-3 font-semibold text-green-600 text-center border border-gray-200 w-24">
                    {formatHoursHHMM(row.hours.reduce((sum, hours) => sum + hours, 0))}
                  </td>

                  <td className="p-2 text-center border border-gray-200 w-20">
                    <button
                      onClick={() => deleteRow(row.id)}
                      className="p-2 text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={timesheetRows.length <= 1 || isSubmitted || isLeaveAutoDraft || row.locked}
                      title={(isSubmitted || isLeaveAutoDraft) ? "Cannot delete in this state" : row.locked ? "Cannot delete locked leave entry" : "Delete Row"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot className="bg-gray-50">
              {/* On-Premises Time Row */}
              <tr className="font-semibold bg-green-50">
                <td colSpan="3" className="p-3 border border-gray-200 text-gray-900">
                  On-Premises Time
                </td>
                {days.map((_, index) => (
                  <td key={index} className="p-3 border border-gray-200 text-green-700 text-center">
                    {formatHoursHHMM(onPremisesTime?.daily?.[index] ?? 0)}
                  </td>
                ))}
                <td className="p-3 border border-gray-200 text-green-700 font-bold text-center">
                  {formatHoursHHMM(onPremisesTime.weekly)}
                </td>
                <td className="p-3 border border-gray-200"></td>
              </tr>

              {/* Work Hours Totals */}
              <tr className="font-semibold">
                <td colSpan="3" className="p-3 border border-gray-200 text-gray-900">
                  Work Hours Total
                </td>
                {totals.daily.map((total, index) => (
                  <td key={index} className="p-3 border border-gray-200 text-gray-900 text-center">
                    {formatHoursHHMM(total)}
                  </td>
                ))}
                <td className="p-3 border border-gray-200 text-green-600 font-bold text-center">
                  {formatHoursHHMM(totals.weekly)}
                </td>
                <td className="p-3 border border-gray-200"></td>
              </tr>

              {/* Break Time Row */}
              <tr className="font-semibold">
                <td colSpan="3" className="p-3 border border-gray-200 text-gray-900">
                  Break Time (Auto)
                </td>
                {days.map((_, index) => (
                  <td key={index} className="p-3 border border-gray-200 text-blue-600 text-center">
                    {formatHoursHHMM(computeBreakForDay(index))}
                  </td>
                ))}
                <td className="p-3 border border-gray-200 text-blue-600 font-bold text-center">
                  {formatHoursHHMM(computeWeeklyBreak())}
                </td>
                <td className="p-3 border border-gray-200"></td>
              </tr>

              {/* Total Hours (Work + Break) */}
              <tr className="font-semibold bg-blue-50">
                <td colSpan="3" className="p-3 border border-gray-200 text-gray-900">
                  Total Hours (Work + Break)
                </td>
                {totals.daily.map((total, index) => (
                  <td key={index} className={`p-3 border border-gray-200 text-center ${getDailyTotalWarningClass(index)}`}>
                    {getDailyTotalWithBreak(index)}
                  </td>
                ))}
                <td className="p-3 border border-gray-200 text-blue-700 font-bold text-center">
                  {getWeeklyTotalWithBreak()}
                </td>
                <td className="p-3 border border-gray-200"></td>
              </tr>
            </tfoot>
          </table>
        </div>


        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600 text-center md:text-left">
            Fill your timesheet and submit before the deadline
            {monthlyPermissionCount > 0 && (
              <span className="ml-2 text-orange-600">
                • Permissions used: {monthlyPermissionCount}/3
              </span>
            )}
            {hasUnsavedChanges && !isSubmitted && (
              <span className="ml-2 text-yellow-600 font-semibold">
                • Unsaved changes
              </span>
            )}
            {isSubmitted && (
              <span className="ml-2 text-green-600 font-semibold">
                • This week's timesheet has been submitted
              </span>
            )}
          </div>
          
          <button
            onClick={submitTimesheet}
            disabled={loading || isSubmitted || isLeaveAutoDraft || !weeklyMinimumSatisfied}
            className={`px-6 py-3 rounded font-medium transition-colors flex items-center justify-center gap-2 w-full md:w-auto ${(loading || isSubmitted || isLeaveAutoDraft || !weeklyMinimumSatisfied)
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-700 hover:bg-blue-800 text-white"
              }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                SUBMITTING...
              </>
            ) : isSubmitted ? (
              "SUBMITTED ✓"
            ) : (
              <>
                <Send className="w-4 h-4" />
                SUBMIT WEEK ({getWeeklyTotalWithBreak()})
              </>
            )}
          </button>
        </div>
      </div>
      {/* Important Notes Section */}
      <div className="p-4  border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Important Notes:</h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Break time: Maximum 1 hour 15 minutes (1.15h) allowed per day</li>
          <li>• Shift timings:
            <ul className="ml-4 mt-1 space-y-1">
              <li>First Shift: 7:00 AM - 3:30 PM</li>
              <li>Second Shift: 3:00 PM - 11:30 PM</li>
              <li>General Shift: 9:30 AM - 7:00 PM</li>
            </ul>
          </li>
          <li>• Monthly permission limit: Maximum 3 hours allowed per month</li>
        </ul>
      </div>

      {/* Navigation Confirmation Dialog */}
      {showNavigationDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Unsaved Changes
            </h3>
            <p className="text-gray-600 mb-6">
              You have unsaved changes. What would you like to do?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelNavigation}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={discardAndNavigate}
                className="px-4 py-2 text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
              >
                Discard Changes
              </button>
              <button
                onClick={confirmSaveAndNavigate}
                className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition-colors"
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timesheet;
