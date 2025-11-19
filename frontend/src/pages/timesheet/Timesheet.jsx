import React, { useState, useEffect } from "react";
import { timesheetAPI, projectAPI } from "../../services/api";
import { ChevronLeft, ChevronRight, Calendar, Plus, Trash2, Save, Send } from "lucide-react";

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
  const [projects, setProjects] = useState([]);
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  const tasks = [
    "Modeling",
    "Editing",
    "Backdrafting",
    "Checking",
    "Estimation Work",
    "Documentation",
    "Other's",
    "Non product(Training)",
    "Project Decision",
  ];

  const leaveTypes = [
    "Office Holiday",
    "Full Day Leave", 
    "Half Day Leave",
    "Permission"
  ];

  // ✅ Count leave rows
  const getLeaveRowCount = () => {
    return timesheetRows.filter(row => row.type === "leave").length;
  };

  // ✅ Check if add leave button should be disabled
  const isAddLeaveDisabled = () => {
    return getLeaveRowCount() >= 4 || isSubmitted;
  };

  // ✅ Load existing week data from backend; fallback to session draft
  useEffect(() => {
    const loadWeekData = async () => {
      try {
        const wd = getWeekDates();
        const normalizeToUTCDateOnly = (d) => {
          const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          return utc.toISOString();
        };
        const res = await timesheetAPI.getTimesheet({
          weekStart: normalizeToUTCDateOnly(wd[0]),
          weekEnd: normalizeToUTCDateOnly(wd[6]),
        });
        const sheet = res.data;
        const rows = (sheet.entries || []).map((e) => ({
          id: Date.now() + Math.random(),
          project: e.project || "",
          projectCode: e.projectCode || "",
          task: e.task || "",
          hours: Array.isArray(e.hours) ? e.hours : [0,0,0,0,0,0,0],
          type: e.type || (e.project === "Leave" ? "leave" : "project"),
        }));
        setTimesheetRows(rows.length ? rows : []);
        setIsSubmitted(
          (sheet.status || "").toLowerCase() === "submitted" ||
          (sheet.status || "").toLowerCase() === "approved"
        );
        clearDraftFromSession();
      } catch (err) {
        // Don't load draft from session automatically - start fresh
        if (timesheetRows.length === 0) addProjectRow();
      } finally {
        updateMonthlyPermissionCount();
      }
    };
    loadWeekData();
  }, [currentWeek]);

  // ✅ Load on-premises time from attendance data
  useEffect(() => {
    const loadOnPremisesTime = async () => {
      try {
        const weekDates = getWeekDates();
        const normalizeToUTCDateOnly = (d) => {
          const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          return utc.toISOString();
        };

        // Get attendance data for the current week
        const attendanceRes = await timesheetAPI.getAttendanceData({
          startDate: normalizeToUTCDateOnly(weekDates[0]),
          endDate: normalizeToUTCDateOnly(weekDates[6])
        });

        const attendanceData = attendanceRes.data || [];
        const dailyOnPremises = [0, 0, 0, 0, 0, 0, 0];
        let weeklyOnPremises = 0;

        // Calculate on-premises time for each day
        attendanceData.forEach(record => {
          const recordDate = new Date(record.punchTime);
          const dayIndex = (recordDate.getDay() + 6) % 7; // Convert to Mon-Sun (0-6)
          
          if (dayIndex >= 0 && dayIndex < 7) {
            // Calculate time difference between punch in and punch out
            if (record.punchIn && record.punchOut) {
              const punchIn = new Date(record.punchIn);
              const punchOut = new Date(record.punchOut);
              const hoursOnPremises = (punchOut - punchIn) / (1000 * 60 * 60); // Convert ms to hours
              
              if (hoursOnPremises > 0) {
                dailyOnPremises[dayIndex] += hoursOnPremises;
                weeklyOnPremises += hoursOnPremises;
              }
            }
          }
        });

        setOnPremisesTime({
          daily: dailyOnPremises.map(hours => parseFloat(hours.toFixed(1))),
          weekly: parseFloat(weeklyOnPremises.toFixed(1))
        });

      } catch (error) {
        console.error("❌ Error loading on-premises time:", error);
        // Set default values if API fails
        setOnPremisesTime({
          daily: [0, 0, 0, 0, 0, 0, 0],
          weekly: 0
        });
      }
    };

    loadOnPremisesTime();
  }, [currentWeek]);

  // Track if data has been modified for navigation warning
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalData, setOriginalData] = useState(null);

  // Set original data when loading from backend
  useEffect(() => {
    if (timesheetRows.length > 0 && !originalData) {
      setOriginalData(JSON.stringify(timesheetRows));
    }
  }, [timesheetRows, originalData]);

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

  // Load projects from Project Allocation
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await projectAPI.getAllProjects();
        const projectData = Array.isArray(res.data) ? res.data : [];
        setProjects(projectData.map(p => ({ name: p.name, code: p.code })));
      } catch (error) {
        console.error("❌ Error loading projects:", error);
        // Fallback to empty array if API fails
        setProjects([]);
      }
    };
    loadProjects();
  }, []);

  // ✅ Save draft to sessionStorage
  const saveDraftToSession = () => {
    try {
      const weekKey = `timesheet_draft_${getWeekKey()}`;
      const draftData = {
        rows: timesheetRows,
        weekStart: weekDates[0].toISOString(),
        weekEnd: weekDates[6].toISOString(),
        savedAt: new Date().toISOString()
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

  const updateMonthlyPermissionCount = () => {
    const currentMonth = currentWeek.getMonth();
    const currentYear = currentWeek.getFullYear();
    
    let count = 0;
    const newPermissionCounts = {};
    
    timesheetRows.forEach((row) => {
      if (row.task === "Permission") {
        row.hours.forEach((hours, dayIndex) => {
          if (hours > 0) {
            const date = new Date(currentWeek);
            date.setDate(date.getDate() + (dayIndex - date.getDay() + 1));
            
            if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
              const dateKey = date.toDateString();
              newPermissionCounts[dateKey] = (newPermissionCounts[dateKey] || 0) + 1;
              count += 1;
            }
          }
        });
      }
    });
    
    setPermissionCounts(newPermissionCounts);
    setMonthlyPermissionCount(monthlyBasePermissionCount + count);
  };

  useEffect(() => {
    const loadMonthlyBasePermissionCount = async () => {
      try {
        const res = await timesheetAPI.getMyTimesheets();
        const sheets = Array.isArray(res.data) ? res.data : [];
        const currentMonth = currentWeek.getMonth();
        const currentYear = currentWeek.getFullYear();
        let baseCount = 0;
        sheets.forEach((sheet) => {
          const weekStart = new Date(sheet.weekStartDate);
          (sheet.entries || []).forEach((entry) => {
            if (entry.task === "Permission" && Array.isArray(entry.hours)) {
              entry.hours.forEach((h, idx) => {
                if (h > 0) {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() + idx);
                  if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                    baseCount += 1;
                  }
                }
              });
            }
          });
        });
        setMonthlyBasePermissionCount(baseCount);
      } catch (e) {
        setMonthlyBasePermissionCount(0);
      } finally {
        updateMonthlyPermissionCount();
      }
    };
    loadMonthlyBasePermissionCount();
  }, [currentWeek]);

  const addProjectRow = () => {
    const newRow = {
      id: Date.now() + Math.random(),
      project: "",
      task: "",
      hours: [0, 0, 0, 0, 0, 0, 0],
      type: "project"
    };
    setTimesheetRows((prev) => [...prev, newRow]);
  };

  const addLeaveRow = () => {
    if (isAddLeaveDisabled()) {
      alert("Maximum 4 leave rows allowed per timesheet.");
      return;
    }

    const newRow = {
      id: Date.now() + Math.random(),
      project: "Leave",
      task: "",
      hours: [0, 0, 0, 0, 0, 0, 0],
      type: "leave"
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
          
          return updatedRow;
        }
        return row;
      })
    );
  };

  const updateHours = (id, dayIndex, value) => {
    const row = timesheetRows.find(r => r.id === id);
    if (!row) return;

    // Block editing other entries on a day with Full Day Leave/Office Holiday
    const isFullDayMarked = timesheetRows.some(
      (r) =>
        (r.task === "Full Day Leave" || r.task === "Office Holiday") &&
        ((r.hours?.[dayIndex] || 0) > 0)
    );
    if (
      isFullDayMarked &&
      row.task !== "Full Day Leave" &&
      row.task !== "Office Holiday"
    ) {
      alert("Full Day Leave applied on this day; other entries are blocked.");
      return;
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

    let numValue = parseFloat(value) || 0;

    // Calculate current daily total without this row's current value
    const currentDailyTotal = timesheetRows.reduce((total, r) => {
      if (r.id === id) return total; // Skip current row
      return total + (r.hours[dayIndex] || 0);
    }, 0);

    // Calculate break hours for the day
    const currentBreakHours = computeBreakForDay(dayIndex);
    
    // Check if adding new value would exceed 24 hours (including break hours)
    const newWorkTotal = currentDailyTotal + numValue;
    const newTotalWithBreak = newWorkTotal + currentBreakHours;
    
    if (newTotalWithBreak > 24) {
      const currentTotalWithBreak = (currentDailyTotal + currentBreakHours).toFixed(1);
      alert(`Daily total (Work + Break) cannot exceed 24 hours.\n\nCurrent: ${currentTotalWithBreak}h (Work: ${currentDailyTotal.toFixed(1)}h + Break: ${currentBreakHours.toFixed(1)}h)\nAfter update: ${newTotalWithBreak.toFixed(1)}h\n\nPlease reduce hours to stay within 24 hours limit.`);
      return; // Don't update if it would exceed 24 hours
    }

    // Warning when approaching 24 hours (within 2 hours)
    if (newTotalWithBreak >= 22 && newTotalWithBreak <= 24) {
      const remainingHours = (24 - newTotalWithBreak).toFixed(1);
      // Only show warning once per session for this day to avoid spam
      const warningKey = `timesheet_warning_${dayIndex}_${currentWeek.toDateString()}`;
      if (!sessionStorage.getItem(warningKey)) {
        alert(`⚠️ Warning: You are approaching the 24-hour daily limit.\n\nAfter this update: ${newTotalWithBreak.toFixed(1)}h (only ${remainingHours}h remaining)\n\nThis includes Work (${newWorkTotal.toFixed(1)}h) + Break (${currentBreakHours.toFixed(1)}h)`);
        sessionStorage.setItem(warningKey, 'true');
      }
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
      const date = new Date(currentWeek);
      date.setDate(date.getDate() + (dayIndex - date.getDay() + 1));
      const dateKey = date.toDateString();
      const currentPermissionCount = permissionCounts[dateKey] || 0;
      const remainingMonthlyPermissions = 3 - monthlyPermissionCount;
      if (numValue > 0 && remainingMonthlyPermissions <= 0) {
        alert("Monthly permission limit (3 counts) exceeded!");
        numValue = 0;
      } else if (numValue > 0) {
        numValue = 1;
      } else {
        numValue = 0;
      }
    } else {
      // Regular project hours
      numValue = Math.max(0, Math.min(8.25, numValue));
    }

    // Double-check after task-specific validation (including break hours)
    const finalWorkTotal = currentDailyTotal + numValue;
    const finalTotalWithBreak = finalWorkTotal + currentBreakHours;
    
    if (finalTotalWithBreak > 24) {
      const currentTotalWithBreak = (currentDailyTotal + currentBreakHours).toFixed(1);
      alert(`Daily total (Work + Break) cannot exceed 24 hours.\n\nCurrent: ${currentTotalWithBreak}h (Work: ${currentDailyTotal.toFixed(1)}h + Break: ${currentBreakHours.toFixed(1)}h)\nAfter update: ${finalTotalWithBreak.toFixed(1)}h\n\nPlease reduce hours to stay within 24 hours limit.`);
      return;
    }

    setTimesheetRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const newHours = [...r.hours];
          newHours[dayIndex] = numValue;
          return { ...r, hours: newHours };
        }
        return r;
      })
    );
  };

  // Check if permission is allowed for a specific day
  const isPermissionAllowed = (dayIndex) => {
    if (monthlyPermissionCount >= 3) return false;
    
    const date = new Date(currentWeek);
    date.setDate(date.getDate() + (dayIndex - date.getDay() + 1));
    const dateKey = date.toDateString();
    
    // Check if this day already has permission
    const hasExistingPermission = timesheetRows.some(row => 
      row.task === "Permission" && row.hours[dayIndex] > 0
    );
    
    return !hasExistingPermission;
  };

  const hasFullDayLeave = (dayIndex) => {
    return timesheetRows.some(row =>
      (row.task === 'Full Day Leave' || row.task === 'Office Holiday') &&
      row.hours[dayIndex] > 0
    );
  };

  useEffect(() => {
    const daysCount = 7;
    let updated = false;
    const nextRows = timesheetRows.map(r => ({ ...r, hours: [...r.hours] }));
    for (let d = 0; d < daysCount; d++) {
      const hasFull = nextRows.some(
        (r) => (r.task === 'Full Day Leave' || r.task === 'Office Holiday') && ((r.hours?.[d] || 0) > 0)
      );
      if (!hasFull) continue;
      nextRows.forEach((r) => {
        if (r.task === 'Full Day Leave' || r.task === 'Office Holiday') return;
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

  const computeBreakForDay = (dayIndex) => {
    const hasWork = timesheetRows.some(
      (row) => row.type === "project" && (row.hours?.[dayIndex] || 0) > 0
    );
    return hasWork ? 1.25 : 0;
  };

  const computeWeeklyBreak = () => {
    let sum = 0;
    for (let i = 0; i < 7; i++) sum += computeBreakForDay(i);
    return sum;
  };

  const getDailyTotalWithBreak = (dayIndex) => {
    return (totals.daily[dayIndex] + computeBreakForDay(dayIndex)).toFixed(1);
  };

  const getWeeklyTotalWithBreak = () => {
    return (totals.weekly + computeWeeklyBreak()).toFixed(1);
  };

  const getCurrentDailyTotalWithBreak = (dayIndex) => {
    const workTotal = totals.daily[dayIndex] || 0;
    const breakTotal = computeBreakForDay(dayIndex);
    return (workTotal + breakTotal).toFixed(1);
  };

  const getDailyTotalWarningClass = (dayIndex) => {
    const totalWithBreak = parseFloat(getCurrentDailyTotalWithBreak(dayIndex));
    if (totalWithBreak >= 24) return "bg-red-100 text-red-800 font-bold";
    if (totalWithBreak >= 20) return "bg-yellow-100 text-yellow-800 font-bold";
    return "text-blue-700 font-bold";
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

  const previousWeek = () => {
    handleNavigation(() => {
      // Clear warning session keys when changing weeks
      for (let i = 0; i < 7; i++) {
        sessionStorage.removeItem(`timesheet_warning_${i}_${currentWeek.toDateString()}`);
      }
      
      const newWeek = new Date(currentWeek);
      newWeek.setDate(newWeek.getDate() - 7);
      setCurrentWeek(newWeek);
      setTimesheetRows([]);
      setIsSubmitted(false); // Reset submission status when changing weeks
      setOriginalData(null); // Reset original data for new week
    });
  };

  const nextWeek = () => {
    handleNavigation(() => {
      // Clear warning session keys when changing weeks
      for (let i = 0; i < 7; i++) {
        sessionStorage.removeItem(`timesheet_warning_${i}_${currentWeek.toDateString()}`);
      }
      
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
      // Clear warning session keys when changing weeks
      for (let i = 0; i < 7; i++) {
        sessionStorage.removeItem(`timesheet_warning_${i}_${currentWeek.toDateString()}`);
      }
      
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
      status: "Draft"
    };

    try {
      setLoading(true);
      const response = await timesheetAPI.saveTimesheet(payload);
      console.log("✅ Timesheet saved as draft:", response.data);
      
      // Clear sessionStorage draft after successful backend save
      clearDraftFromSession();
      
      // Update original data to mark as saved
      setOriginalData(JSON.stringify(timesheetRows));
      setHasUnsavedChanges(false);
      
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

    if (monthlyPermissionCount > 3) {
      alert(`Monthly permission limit exceeded! Current count: ${monthlyPermissionCount}/3`);
      return;
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
      status: "Submitted"
    };

    try {
      setLoading(true);
      const response = await timesheetAPI.saveTimesheet(payload);
      console.log("✅ Timesheet submitted:", response.data);
      
      // Clear sessionStorage draft after successful submission
      clearDraftFromSession();
      
      // Set submitted status to prevent auto-saving
      setIsSubmitted(true);
      
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
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Week Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
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
                className="p-1 hover:bg-gray-100 rounded transition-colors"
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
            className="px-4 py-2 bg-blue-700 text-white rounded text-sm font-medium hover:bg-blue-800 transition-colors flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            CURRENT WEEK
          </button>
        </div>
      </div>

      {/* Timesheet Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header with action buttons */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            Current Week Entry
          </h2>

          <div className="flex gap-3">
            <button
              onClick={addProjectRow}
              className="px-4 py-2 bg-blue-700 text-white rounded text-sm font-medium hover:bg-blue-800 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              ADD PROJECT
            </button>
            
            <button
              onClick={addLeaveRow}
              disabled={isAddLeaveDisabled()}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                isAddLeaveDisabled()
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-blue-700 hover:bg-blue-800 text-white"
              }`}
              title={isAddLeaveDisabled() ? "Maximum 4 leave rows allowed" : "Add Leave Row"}
            >
              <Plus className="w-4 h-4" />
              ADD LEAVE ({getLeaveRowCount()}/4)
            </button>

            <button
              onClick={saveAsDraft}
              disabled={loading || !hasSomeData() || isSubmitted}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                loading || !hasSomeData() || isSubmitted
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
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-200 w-12">
                  S.no
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-200 min-w-60">
                  Project Name
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-200 min-w-40">
                  Project Code
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-200 min-w-48">
                  Task / Leave Type
                </th>
                {days.map((day, index) => (
                  <th
                    key={day}
                    className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-200 w-32"
                  >
                    <div>{day}</div>
                    <div className="text-xs text-gray-500 font-normal">
                      {weekDates[index].toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
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
                      <div className="w-full p-2 bg-orange-100 text-orange-800 rounded text-sm font-semibold text-center">
                        LEAVE
                      </div>
                    ) : (
                      <select
                        value={row.project}
                        onChange={(e) => updateRow(row.id, "project", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isSubmitted}
                      >
                        <option value="">Select Project</option>
                        {projects.map((p) => (
                          <option key={p.code || p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>

                  <td className="p-2 border border-gray-200">
                    {row.type === "leave" ? (
                      <div className="w-full p-2 bg-gray-100 text-gray-600 rounded text-sm text-center">-</div>
                    ) : (
                      <div className="w-full p-2 bg-gray-50 text-blue-700 font-mono rounded text-sm">
                        {projects.find((p) => p.name === row.project)?.code || ""}
                      </div>
                    )}
                  </td>

                  <td className="p-2 border border-gray-200">
                    <select
                      value={row.task}
                      onChange={(e) => updateRow(row.id, "task", e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSubmitted}
                    >
                      <option value="">Select {row.type === "leave" ? "Leave Type" : "Task"}</option>
                      {(row.type === "leave" ? leaveTypes : tasks).map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </td>

                  {row.hours.map((hours, dayIndex) => (
                    <td key={dayIndex} className="p-2 border border-gray-200">
                      <div className="flex flex-col items-center">
                        <input
                          type="number"
                          value={hours}
                          onChange={(e) => updateHours(row.id, dayIndex, e.target.value)}
                          onKeyDown={(e) => {
                            // Allow backspace and delete to work properly
                            if (e.key === 'Backspace' || e.key === 'Delete') {
                              // Let the change happen naturally, the onChange will handle it
                            }
                          }}
                          onInput={(e) => {
                            // Allow empty input for better user experience
                            if (e.target.value === '') {
                              e.target.value = '';
                            }
                          }}
                          min="0"
                          max={
                            row.task === "Office Holiday" || row.task === "Full Day Leave" ? 9.5 :
                            row.task === "Half Day Leave" ? 4.75 :
                            row.task === "Permission" ? 1 : 9
                          }
                          step={
                            row.task === "Half Day Leave" ? 4.75 :
                            row.task === "Office Holiday" || row.task === "Full Day Leave" ? 9.5 :
                            row.task === "Permission" ? 1 : 0.25
                          }
                          className={`w-20 p-2 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            row.task === "Permission" && !isPermissionAllowed(dayIndex) 
                              ? "bg-gray-100 cursor-not-allowed" 
                              : isSubmitted
                              ? "bg-gray-100 cursor-not-allowed"
                              : hasFullDayLeave(dayIndex) && row.task !== "Full Day Leave" && row.task !== "Office Holiday"
                              ? "bg-gray-100 cursor-not-allowed"
                              : ""
                          }`}
                          disabled={
                            isSubmitted ||
                            (hasFullDayLeave(dayIndex) && row.task !== "Full Day Leave" && row.task !== "Office Holiday") ||
                            (row.task === "Permission" && (!isPermissionAllowed(dayIndex) || monthlyPermissionCount >= 3))
                          }
                          title={
                            isSubmitted 
                              ? "Timesheet already submitted" 
                              : row.task === "Permission" && !isPermissionAllowed(dayIndex) 
                              ? "Permission not allowed for this day" 
                              : monthlyPermissionCount >= 3 
                              ? "Monthly permission limit reached" 
                              : hasFullDayLeave(dayIndex) && row.task !== "Full Day Leave" && row.task !== "Office Holiday"
                              ? "Full Day Leave applied on this day" 
                              : ""
                          }
                        />
                       
                      </div>
                    </td>
                  ))}

                  <td className="p-3 font-semibold text-green-600 text-center border border-gray-200">
                    {row.hours
                      .reduce((sum, hours) => sum + hours, 0)
                      .toFixed(1)}
                  </td>

                  <td className="p-2 text-center border border-gray-200">
                    <button
                      onClick={() => deleteRow(row.id)}
                      className="p-2 text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={timesheetRows.length <= 1 || isSubmitted}
                      title={isSubmitted ? "Cannot delete after submission" : "Delete Row"}
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
                <td colSpan="4" className="p-3 border border-gray-200 text-gray-900">
                  On-Premises Time
                </td>
                {onPremisesTime.daily.map((time, index) => (
                  <td key={index} className="p-3 border border-gray-200 text-green-700 text-center">
                    {time > 0 ? `${time}h` : "-"}
                  </td>
                ))}
                <td className="p-3 border border-gray-200 text-green-700 font-bold text-center">
                  {onPremisesTime.weekly > 0 ? `${onPremisesTime.weekly}h` : "-"}
                </td>
                <td className="p-3 border border-gray-200"></td>
              </tr>

              {/* Work Hours Totals */}
              <tr className="font-semibold">
                <td colSpan="4" className="p-3 border border-gray-200 text-gray-900">
                  Work Hours Total
                </td>
                {totals.daily.map((total, index) => (
                  <td key={index} className="p-3 border border-gray-200 text-gray-900 text-center">
                    {total.toFixed(1)}h
                  </td>
                ))}
                <td className="p-3 border border-gray-200 text-green-600 font-bold text-center">
                  {totals.weekly.toFixed(1)}h
                </td>
                <td className="p-3 border border-gray-200"></td>
              </tr>
              
              {/* Break Time Row */}
              <tr className="font-semibold">
                <td colSpan="4" className="p-3 border border-gray-200 text-gray-900">
                  Break Time (Auto)
                </td>
                {days.map((_, index) => (
                  <td key={index} className="p-3 border border-gray-200 text-blue-600 text-center">
                    {computeBreakForDay(index)}h
                  </td>
                ))}
                <td className="p-3 border border-gray-200 text-blue-600 font-bold text-center">
                  {computeWeeklyBreak()}h
                </td>
                <td className="p-3 border border-gray-200"></td>
              </tr>
              
              {/* Total Hours (Work + Break) */}
              <tr className="font-semibold bg-blue-50">
                <td colSpan="4" className="p-3 border border-gray-200 text-gray-900">
                  Total Hours (Work + Break)
                </td>
                {totals.daily.map((total, index) => (
                  <td key={index} className={`p-3 border border-gray-200 text-center ${getDailyTotalWarningClass(index)}`}>
                    {getDailyTotalWithBreak(index)}h
                  </td>
                ))}
                <td className="p-3 border border-gray-200 text-blue-700 font-bold text-center">
                  {getWeeklyTotalWithBreak()}h
                </td>
                <td className="p-3 border border-gray-200"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
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
            disabled={loading || isSubmitted}
            className={`px-6 py-3 rounded font-medium transition-colors flex items-center gap-2 ${
              loading || isSubmitted
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
                SUBMIT WEEK ({getWeeklyTotalWithBreak()}H)
              </>
            )}
          </button>
        </div>
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