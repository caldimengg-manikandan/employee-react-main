// import React, { useState, useEffect } from "react";
// import { timesheetAPI } from "../../services/api";
// import { ChevronLeft, ChevronRight, Calendar, Plus, Trash2, Save, Send } from "lucide-react";

// const Timesheet = () => {
//   const [currentWeek, setCurrentWeek] = useState(new Date());
//   const [timesheetRows, setTimesheetRows] = useState([]);
//   const [totals, setTotals] = useState({
//     daily: [0, 0, 0, 0, 0, 0, 0],
//     weekly: 0,
//   });
//   const [loading, setLoading] = useState(false);
//   const [permissionCounts, setPermissionCounts] = useState({});
//   const [monthlyPermissionCount, setMonthlyPermissionCount] = useState(0);
//   const [isSubmitted, setIsSubmitted] = useState(false);

//   // Color scheme - All blue buttons
//   const colors = {
//     primary: "#2563eb",      // Blue for all main buttons
//     secondary: "#1e40af",    // Darker blue for hover states
//     danger: "#dc2626"        // Red for delete
//   };

//   // Project names organized by category
//   const projects = [
//     "1250 Maryland Avenue",
//     "NJTP CDL Training Course",
//     "Templeton Elementary School (Main Steel)",
//     "Maryland Ave Main Steel",
//     "New Century Bridge",
//     "Templeton Elementary School (Misc Steel)",
//     "KIPP Academy Charter School",
//     "Ocean C College - New Admin Building",
//     "Grove Street-Building 2",
//     "Metro YMCA of Oranges",
//     "Kirkwood - Sunroom Addition",
//     "Great Oaks Legacy Charter School",
//     "Paper Mill play House",
//     "Miami Freedom Park",
//     "URBA - BLDG II_624 N Glebe",
//     "Cleveland Brothers",
//     "Tenant Communicating 102 Stair Option A",
//     "Susquehanna Trail Apartments",
//     "Elwyn New School",
//     "East End United Methodist Church",
//     "Bulverde Marketplace D9",
//     "USVI Elevator Slab",
//     "NISD John Jay High School",
//     "Jia terminal B expansion Deck rig",
//     "Congress Heights Recreation Center",
//     "Brandywine K-8 School",
//     "DGS KING ES (MLK ES)",
//     "Broderick MV GIS Substation",
//     "Coatesville Train Station",
//     "ACADEMY-KERRVILLE",
//     "25-018 - MES Racks",
//     "25-014 – Alamo Hall",
//     "CALDIM Employee Portal",
//     "CALDIM Management Portal",
//     "Shangrila Enterprises Portal",
//     "ServoTech Automation System",
//     "Voomet Dashboard",
//     "Steel Fabrication ERP",
//     "HVAC System Installation",
//     "Mechanical Piping Project",
//     "Industrial Equipment Setup",
//     "Mechanical Assembly Line",
//     "Pump and Valve Systems"
//   ];

//   const tasks = [
//     "Modeling",
//     "Editing",
//     "Backdrafting",
//     "Checking",
//     "Estimation Work",
//     "Documentation",
//     "Other's",
//     "Non product(Training)",
//     "Project Decision",
//   ];

//   const leaveTypes = [
//     "Office Holiday",
//     "Full Day Leave", 
//     "Half Day Leave",
//     "Permission"
//   ];

//   // Break time constants - 1.25 hours per day
//   const BREAK_HOURS_PER_DAY = 1.25;
//   const BREAK_HOURS_PER_WEEK = BREAK_HOURS_PER_DAY * 7; // 8.75 hours per week
//   const MAX_WORK_HOURS_PER_DAY = 8.25; // 9.5 total - 1.25 break
//   const MAX_TOTAL_HOURS_PER_DAY = 9.5; // Including break

//   // ✅ Load draft data from sessionStorage
//   useEffect(() => {
//     loadDraftFromSession();
//     if (timesheetRows.length === 0) addProjectRow();
//     updateMonthlyPermissionCount();
//   }, [currentWeek]);

//   // Save draft to sessionStorage whenever timesheetRows change, but only if not submitted
//   useEffect(() => {
//     if (hasSomeData() && !isSubmitted) {
//       saveDraftToSession();
//     }
//   }, [timesheetRows, currentWeek, isSubmitted]);

//   // Update monthly permission count when timesheet rows change
//   useEffect(() => {
//     updateMonthlyPermissionCount();
//   }, [timesheetRows, currentWeek]);

//   // ✅ Save draft to sessionStorage
//   const saveDraftToSession = () => {
//     try {
//       const weekKey = `timesheet_draft_${getWeekKey()}`;
//       const draftData = {
//         rows: timesheetRows,
//         weekStart: weekDates[0].toISOString(),
//         weekEnd: weekDates[6].toISOString(),
//         savedAt: new Date().toISOString()
//       };
//       sessionStorage.setItem(weekKey, JSON.stringify(draftData));
//       console.log("💾 Draft auto-saved to sessionStorage");
//     } catch (error) {
//       console.error("❌ Error saving draft to sessionStorage:", error);
//     }
//   };

//   // ✅ Load draft from sessionStorage
//   const loadDraftFromSession = () => {
//     try {
//       const weekKey = `timesheet_draft_${getWeekKey()}`;
//       const savedDraft = sessionStorage.getItem(weekKey);
      
//       if (savedDraft) {
//         const draftData = JSON.parse(savedDraft);
//         setTimesheetRows(draftData.rows || []);
//         console.log("📂 Draft loaded from sessionStorage");
        
//         // Show confirmation message
//         if (draftData.rows && draftData.rows.length > 0) {
//           const savedTime = new Date(draftData.savedAt).toLocaleTimeString();
//           alert(`📂 Draft data loaded from your current session (saved at ${savedTime})`);
//         }
//       }
//     } catch (error) {
//       console.error("❌ Error loading draft from sessionStorage:", error);
//     }
//   };

//   // ✅ Get unique key for current week
//   const getWeekKey = () => {
//     const weekDates = getWeekDates();
//     return `${weekDates[0].toISOString().split('T')[0]}_${weekDates[6].toISOString().split('T')[0]}`;
//   };

//   // ✅ Clear draft from sessionStorage
//   const clearDraftFromSession = () => {
//     try {
//       const weekKey = `timesheet_draft_${getWeekKey()}`;
//       sessionStorage.removeItem(weekKey);
//       console.log("🗑️ Draft cleared from sessionStorage");
//     } catch (error) {
//       console.error("❌ Error clearing draft from sessionStorage:", error);
//     }
//   };

//   const updateMonthlyPermissionCount = () => {
//     const currentMonth = currentWeek.getMonth();
//     const currentYear = currentWeek.getFullYear();
    
//     let count = 0;
//     const newPermissionCounts = {};
    
//     timesheetRows.forEach((row) => {
//       if (row.task === "Permission") {
//         row.hours.forEach((hours, dayIndex) => {
//           if (hours > 0) {
//             const date = new Date(currentWeek);
//             date.setDate(date.getDate() + (dayIndex - date.getDay() + 1));
            
//             if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
//               const dateKey = date.toDateString();
//               newPermissionCounts[dateKey] = (newPermissionCounts[dateKey] || 0) + 1;
              
//               // Calculate permission count based on hours
//               if (hours > 0 && hours <= 1) {
//                 count += 1;
//               } else if (hours > 1 && hours <= 2) {
//                 count += 2;
//               } else if (hours > 2 && hours <= 3) {
//                 count += 3;
//               }
//             }
//           }
//         });
//       }
//     });
    
//     setPermissionCounts(newPermissionCounts);
//     setMonthlyPermissionCount(count);
//   };

//   const addProjectRow = () => {
//     const newRow = {
//       id: Date.now() + Math.random(),
//       project: "",
//       task: "",
//       hours: [0, 0, 0, 0, 0, 0, 0],
//       type: "project"
//     };
//     setTimesheetRows((prev) => [...prev, newRow]);
//   };

//   const addLeaveRow = () => {
//     const newRow = {
//       id: Date.now() + Math.random(),
//       project: "Leave",
//       task: "",
//       hours: [0, 0, 0, 0, 0, 0, 0],
//       type: "leave"
//     };
//     setTimesheetRows((prev) => [...prev, newRow]);
//   };

//   const deleteRow = (id) => {
//     if (timesheetRows.length <= 1) {
//       alert("At least one row must remain.");
//       return;
//     }
//     setTimesheetRows((prev) => prev.filter((row) => row.id !== id));
//   };

//   const updateRow = (id, field, value) => {
//     setTimesheetRows((prev) =>
//       prev.map((row) => {
//         if (row.id === id) {
//           const updatedRow = { ...row, [field]: value };
          
//           // Reset hours when task type changes
//           if (field === "task") {
//             updatedRow.hours = [0, 0, 0, 0, 0, 0, 0];
//           }
          
//           return updatedRow;
//         }
//         return row;
//       })
//     );
//   };

//   const updateHours = (id, dayIndex, value) => {
//     const row = timesheetRows.find(r => r.id === id);
//     if (!row) return;

//     let numValue = parseFloat(value) || 0;
    
//     // Apply limits based on task type
//     if (row.task === "Office Holiday" || row.task === "Full Day Leave") {
//       numValue = Math.max(0, Math.min(MAX_TOTAL_HOURS_PER_DAY, numValue));
//     } else if (row.task === "Half Day Leave") {
//       numValue = Math.max(0, Math.min(4.75, numValue));
//     } else if (row.task === "Permission") {
//       // Permission specific rules
//       numValue = Math.max(0, Math.min(3, numValue));
      
//       // Check monthly limit
//       const date = new Date(currentWeek);
//       date.setDate(date.getDate() + (dayIndex - date.getDay() + 1));
//       const dateKey = date.toDateString();
      
//       const currentPermissionCount = permissionCounts[dateKey] || 0;
//       const remainingMonthlyPermissions = 3 - monthlyPermissionCount;
      
//       if (numValue > 0 && remainingMonthlyPermissions <= 0) {
//         alert("Monthly permission limit (3 counts) exceeded!");
//         numValue = 0;
//       }
//     } else {
//       // Regular project tasks - Maximum 8.25 hours (9.5 hours total - 1.25 hour break)
//       numValue = Math.max(0, Math.min(MAX_WORK_HOURS_PER_DAY, numValue));
//     }

//     setTimesheetRows((prev) =>
//       prev.map((row) => {
//         if (row.id === id) {
//           const newHours = [...row.hours];
//           newHours[dayIndex] = numValue;
//           return { ...row, hours: newHours };
//         }
//         return row;
//       })
//     );
//   };

//   // Check if permission is allowed for a specific day
//   const isPermissionAllowed = (dayIndex) => {
//     if (monthlyPermissionCount >= 3) return false;
    
//     const date = new Date(currentWeek);
//     date.setDate(date.getDate() + (dayIndex - date.getDay() + 1));
//     const dateKey = date.toDateString();
    
//     // Check if this day already has permission
//     const hasExistingPermission = timesheetRows.some(row => 
//       row.task === "Permission" && row.hours[dayIndex] > 0
//     );
    
//     return !hasExistingPermission;
//   };

//   // ✅ Check if there's at least some data entered
//   const hasSomeData = () => {
//     return timesheetRows.some(row => 
//       row.project || 
//       row.task || 
//       row.hours.some(hours => hours > 0)
//     );
//   };

//   // ✅ Calculate totals dynamically
//   useEffect(() => {
//     calculateTotals();
//   }, [timesheetRows]);

//   const calculateTotals = () => {
//     const dailyTotals = [0, 0, 0, 0, 0, 0, 0];
//     let weeklyTotal = 0;

//     timesheetRows.forEach((row) => {
//       row.hours.forEach((hours, index) => {
//         dailyTotals[index] += hours;
//         weeklyTotal += hours;
//       });
//     });

//     setTotals({
//       daily: dailyTotals,
//       weekly: weeklyTotal,
//     });
//   };

//   // Calculate total hours including break time
//   const getTotalHoursWithBreak = (hours) => {
//     return (parseFloat(hours) + BREAK_HOURS_PER_DAY).toFixed(2);
//   };

//   // Calculate daily totals including break time
//   const getDailyTotalWithBreak = (dayIndex) => {
//     return (totals.daily[dayIndex] + BREAK_HOURS_PER_DAY).toFixed(2);
//   };

//   // Calculate weekly total including break time
//   const getWeeklyTotalWithBreak = () => {
//     return (totals.weekly + BREAK_HOURS_PER_WEEK).toFixed(2);
//   };

//   // ✅ Week calculation helpers
//   const getWeekDates = () => {
//     const weekNum = getWeekNumber(currentWeek);
//     const year = currentWeek.getFullYear();
//     return getWeekDatesArray(year, weekNum);
//   };

//   const getWeekNumber = (date) => {
//     const d = new Date(
//       Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
//     );
//     const dayNum = d.getUTCDay() || 7;
//     d.setUTCDate(d.getUTCDate() + 4 - dayNum);
//     const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
//     return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
//   };

//   const getWeekDatesArray = (year, week) => {
//     const jan1 = new Date(year, 0, 1);
//     const dayOfWeek = jan1.getDay();
//     let firstMonday;

//     if (dayOfWeek <= 4) {
//       firstMonday = new Date(jan1);
//       firstMonday.setDate(jan1.getDate() - (dayOfWeek - 1));
//     } else {
//       firstMonday = new Date(jan1);
//       firstMonday.setDate(jan1.getDate() + (8 - dayOfWeek));
//     }

//     const weekStart = new Date(firstMonday);
//     weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);

//     return Array.from({ length: 7 }, (_, i) => {
//       const d = new Date(weekStart);
//       d.setDate(weekStart.getDate() + i);
//       return d;
//     });
//   };

//   const previousWeek = () => {
//     const newWeek = new Date(currentWeek);
//     newWeek.setDate(newWeek.getDate() - 7);
//     setCurrentWeek(newWeek);
//     setIsSubmitted(false); // Reset submission status when changing weeks
//   };

//   const nextWeek = () => {
//     const newWeek = new Date(currentWeek);
//     newWeek.setDate(newWeek.getDate() + 7);
//     setCurrentWeek(newWeek);
//     setIsSubmitted(false); // Reset submission status when changing weeks
//   };

//   const goToCurrentWeek = () => {
//     setCurrentWeek(new Date());
//     setIsSubmitted(false); // Reset submission status when changing weeks
//   };

//   // ✅ Save as draft - Allow saving with partial data
//   const saveAsDraft = async () => {
//     if (!hasSomeData()) {
//       alert("Please enter at least some data (project, task, or hours) before saving as draft.");
//       return;
//     }

//     const normalizeToUTCDateOnly = (d) => {
//       const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
//       return utc.toISOString();
//     };

//     const sanitizedEntries = timesheetRows.map((row) => ({
//       project: row.project || "Unnamed Project",
//       task: row.task || "Unnamed Task",
//       type: row.type,
//       hours: (row.hours || []).map((h) => {
//         const n = Number(h);
//         return Number.isFinite(n) ? n : 0;
//       }),
//     }));

//     const payload = {
//       weekStartDate: normalizeToUTCDateOnly(weekDates[0]),
//       weekEndDate: normalizeToUTCDateOnly(weekDates[6]),
//       entries: sanitizedEntries,
//       totalHours: Number(totals.weekly) || 0,
//       status: "Draft"
//     };

//     try {
//       setLoading(true);
//       const response = await timesheetAPI.saveTimesheet(payload);
//       console.log("✅ Timesheet saved as draft:", response.data);
      
//       // Clear sessionStorage draft after successful backend save
//       clearDraftFromSession();
      
//       alert("✅ Timesheet saved as draft successfully!");
//     } catch (error) {
//       console.error("❌ Error saving timesheet as draft:", error);
//       alert(
//         error.response?.data?.message ||
//           "Failed to save timesheet as draft. Please try again."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ✅ Submit timesheet to backend
//   const submitTimesheet = async () => {
//     const invalidRows = timesheetRows.filter(
//       (row) => !row.project || (row.type === "project" && !row.task)
//     );
//     if (invalidRows.length > 0) {
//       alert("Please fill all required fields for all rows.");
//       return;
//     }

//     if (totals.weekly === 0) {
//       alert("Please enter hours for at least one day.");
//       return;
//     }

//     // Check permission limits
//     if (monthlyPermissionCount > 3) {
//       alert(`Monthly permission limit exceeded! Current count: ${monthlyPermissionCount}/3`);
//       return;
//     }

//     const normalizeToUTCDateOnly = (d) => {
//       const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
//       return utc.toISOString();
//     };

//     const sanitizedEntries = timesheetRows.map((row) => ({
//       project: row.project,
//       task: row.task,
//       type: row.type,
//       hours: (row.hours || []).map((h) => {
//         const n = Number(h);
//         return Number.isFinite(n) ? n : 0;
//       }),
//     }));

//     const payload = {
//       weekStartDate: normalizeToUTCDateOnly(weekDates[0]),
//       weekEndDate: normalizeToUTCDateOnly(weekDates[6]),
//       entries: sanitizedEntries,
//       totalHours: Number(totals.weekly) || 0,
//     };

//     try {
//       setLoading(true);
//       const response = await timesheetAPI.saveTimesheet(payload);
//       console.log("✅ Timesheet submitted:", response.data);
      
//       // Clear sessionStorage draft after successful submission
//       clearDraftFromSession();
      
//       // Set submitted status to prevent auto-saving
//       setIsSubmitted(true);
      
//       alert("✅ Timesheet submitted successfully!");
//     } catch (error) {
//       console.error("❌ Error submitting timesheet:", error);
//       alert(
//         error.response?.data?.message ||
//           "Failed to submit timesheet. Please try again."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const weekDates = getWeekDates();
//   const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

//   // Format week range with month names
//   const formatWeekRange = () => {
//     const startMonth = weekDates[0].toLocaleDateString("en-US", { month: "short" });
//     const endMonth = weekDates[6].toLocaleDateString("en-US", { month: "short" });
//     const startDay = weekDates[0].getDate();
//     const endDay = weekDates[6].getDate();

//     return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
//   };

//   return (
//     <div className="p-6 bg-gray-50 min-h-screen">
//       <div className="mb-6">
//         <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Timesheet</h1>
//         <p className="text-gray-600 text-lg">Fill and submit your weekly timesheet</p>
//         <div className="text-sm text-blue-600 mt-2">
//           ⏰ Note: {BREAK_HOURS_PER_DAY} hours break time is automatically included in daily totals
//         </div>
//         {monthlyPermissionCount > 0 && (
//           <div className="text-sm text-orange-600 mt-1">
//             Monthly Permission Count: {monthlyPermissionCount}/3
//           </div>
//         )}
//         {isSubmitted && (
//           <div className="text-sm text-green-600 mt-1 font-semibold">
//             ✅ This week's timesheet has been submitted successfully!
//           </div>
//         )}
//       </div>

//       {/* Week Navigation */}
//       <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
//         <div className="flex justify-between items-center">
//           <div className="flex items-center gap-6">
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={previousWeek}
//                 className="p-1 hover:bg-gray-100 rounded transition-colors"
//               >
//                 <ChevronLeft className="w-5 h-5 text-gray-600" />
//               </button>
              
//               <div className="text-lg font-semibold text-gray-800">
//                 {currentWeek.toLocaleDateString("en-US", {
//                   month: "long",
//                   year: "numeric"
//                 })}
//               </div>
              
//               <button
//                 onClick={nextWeek}
//                 className="p-1 hover:bg-gray-100 rounded transition-colors"
//               >
//                 <ChevronRight className="w-5 h-5 text-gray-600" />
//               </button>
//             </div>
            
//             <div className="flex items-center gap-2">
//               <span className="text-sm text-gray-600 font-medium">Week:</span>
//               <span className="text-sm text-gray-800 font-semibold">
//                 {formatWeekRange()}
//               </span>
//             </div>
//           </div>

//           <button
//             onClick={goToCurrentWeek}
//             style={{ backgroundColor: colors.primary }}
//             className="px-4 py-2 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
//           >
//             <Calendar className="w-4 h-4" />
//             CURRENT WEEK
//           </button>
//         </div>
//       </div>

//       {/* Timesheet Table */}
//       <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
//         {/* Header with action buttons */}
//         <div className="p-4 border-b border-gray-200 flex justify-between items-center">
//           <h2 className="text-xl font-semibold text-gray-800">
//             Current Week Entry
//           </h2>

//           <div className="flex gap-3">
//             <button
//               onClick={addProjectRow}
//               style={{ backgroundColor: colors.primary }}
//               className="px-4 py-2 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
//             >
//               <Plus className="w-4 h-4" />
//               ADD PROJECT
//             </button>
            
//             <button
//               onClick={addLeaveRow}
//               style={{ backgroundColor: colors.primary }}
//               className="px-4 py-2 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
//             >
//               <Plus className="w-4 h-4" />
//               ADD LEAVE
//             </button>

//             <button
//               onClick={saveAsDraft}
//               disabled={loading || !hasSomeData() || isSubmitted}
//               style={{ 
//                 backgroundColor: loading || !hasSomeData() || isSubmitted ? "#9ca3af" : colors.primary 
//               }}
//               className="px-4 py-2 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               <Save className="w-4 h-4" />
//               SAVE DRAFT
//             </button>
//           </div>
//         </div>

//         <div className="overflow-x-auto">
//           <table className="w-full border-collapse">
//             <thead className="bg-gray-50">
//               <tr>
//                 <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-200 w-12">
//                   S.no
//                 </th>
//                 <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-200 min-w-60">
//                   Project Name
//                 </th>
//                 <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-200 min-w-48">
//                   Task / Leave Type
//                 </th>
//                 {days.map((day, index) => (
//                   <th
//                     key={day}
//                     className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-200 w-32"
//                   >
//                     <div>{day}</div>
//                     <div className="text-xs text-gray-500 font-normal">
//                       {weekDates[index].toLocaleDateString("en-US", {
//                         month: "short",
//                         day: "numeric",
//                       })}
//                     </div>
//                   </th>
//                 ))}
//                 <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-200 w-24">
//                   Total
//                 </th>
//                 <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-200 w-20">
//                   Action
//                 </th>
//               </tr>
//             </thead>
//             <tbody>
//               {timesheetRows.map((row, index) => (
//                 <tr key={row.id} className="hover:bg-gray-50">
//                   <td className="p-3 text-gray-900 text-center border border-gray-200">
//                     {index + 1}
//                   </td>

//                   {/* Project Name Column */}
//                   <td className="p-2 border border-gray-200">
//                     {row.type === "leave" ? (
//                       <div 
//                         style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
//                         className="w-full p-2 rounded text-sm font-semibold text-center"
//                       >
//                         LEAVE
//                       </div>
//                     ) : (
//                       <select
//                         value={row.project}
//                         onChange={(e) => updateRow(row.id, "project", e.target.value)}
//                         className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//                         disabled={isSubmitted}
//                       >
//                         <option value="">Select Project</option>
//                         {projects.map((project) => (
//                           <option key={project} value={project}>
//                             {project}
//                           </option>
//                         ))}
//                       </select>
//                     )}
//                   </td>

//                   <td className="p-2 border border-gray-200">
//                     <select
//                       value={row.task}
//                       onChange={(e) => updateRow(row.id, "task", e.target.value)}
//                       className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       disabled={isSubmitted}
//                     >
//                       <option value="">Select {row.type === "leave" ? "Leave Type" : "Task"}</option>
//                       {(row.type === "leave" ? leaveTypes : tasks).map((item) => (
//                         <option key={item} value={item}>
//                           {item}
//                         </option>
//                       ))}
//                     </select>
//                   </td>

//                   {row.hours.map((hours, dayIndex) => (
//                     <td key={dayIndex} className="p-2 border border-gray-200">
//                       <div className="flex flex-col items-center">
//                         <input
//                           type="number"
//                           value={hours}
//                           onChange={(e) =>
//                             updateHours(row.id, dayIndex, e.target.value)
//                           }
//                           min="0"
//                           max={
//                             row.task === "Office Holiday" || row.task === "Full Day Leave" ? MAX_TOTAL_HOURS_PER_DAY :
//                             row.task === "Half Day Leave" ? 4.75 :
//                             row.task === "Permission" ? 3 : MAX_WORK_HOURS_PER_DAY
//                           }
//                           step="0.5"
//                           className={`w-20 p-2 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${
//                             row.task === "Permission" && !isPermissionAllowed(dayIndex) 
//                               ? "bg-gray-100 cursor-not-allowed" 
//                               : isSubmitted
//                               ? "bg-gray-100 cursor-not-allowed"
//                               : ""
//                           }`}
//                           disabled={
//                             isSubmitted ||
//                             (row.task === "Permission" && !isPermissionAllowed(dayIndex)) ||
//                             monthlyPermissionCount >= 3
//                           }
//                           title={
//                             isSubmitted 
//                               ? "Timesheet already submitted" 
//                               : row.task === "Permission" && !isPermissionAllowed(dayIndex) 
//                               ? "Permission not allowed for this day" 
//                               : monthlyPermissionCount >= 3 
//                               ? "Monthly permission limit reached" 
//                               : ""
//                           }
//                         />
//                         {row.task === "Permission" && hours > 0 && (
//                           <div className="text-xs text-gray-500 mt-1">
//                             Count: {
//                               hours > 0 && hours <= 1 ? 1 :
//                               hours > 1 && hours <= 2 ? 2 :
//                               hours > 2 && hours <= 3 ? 3 : 0
//                             }
//                           </div>
//                         )}
//                       </div>
//                     </td>
//                   ))}

//                   <td className="p-3 font-semibold text-green-600 text-center border border-gray-200">
//                     {row.hours
//                       .reduce((sum, hours) => sum + hours, 0)
//                       .toFixed(1)}
//                   </td>

//                   <td className="p-2 text-center border border-gray-200">
//                     <button
//                       onClick={() => deleteRow(row.id)}
//                       style={{ color: colors.danger }}
//                       className="p-2 hover:opacity-70 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
//                       disabled={timesheetRows.length <= 1 || isSubmitted}
//                       title={isSubmitted ? "Cannot delete after submission" : "Delete Row"}
//                     >
//                       <Trash2 className="w-4 h-4" />
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>

//             <tfoot className="bg-gray-50">
//               {/* Work Hours Totals */}
//               <tr className="font-semibold">
//                 <td colSpan="3" className="p-3 border border-gray-200 text-gray-900">
//                   Work Hours Total
//                 </td>
//                 {totals.daily.map((total, index) => (
//                   <td key={index} className="p-3 border border-gray-200 text-gray-900 text-center">
//                     {total.toFixed(1)}h
//                   </td>
//                 ))}
//                 <td className="p-3 border border-gray-200 text-green-600 font-bold text-center">
//                   {totals.weekly.toFixed(1)}h
//                 </td>
//                 <td className="p-3 border border-gray-200"></td>
//               </tr>
              
//               {/* Break Time Row */}
//               <tr className="font-semibold">
//                 <td colSpan="3" className="p-3 border border-gray-200 text-gray-900">
//                   Break Time (Auto)
//                 </td>
//                 {days.map((_, index) => (
//                   <td key={index} className="p-3 border border-gray-200 text-blue-600 text-center">
//                     {BREAK_HOURS_PER_DAY}h
//                   </td>
//                 ))}
//                 <td className="p-3 border border-gray-200 text-blue-600 font-bold text-center">
//                   {BREAK_HOURS_PER_WEEK.toFixed(2)}h
//                 </td>
//                 <td className="p-3 border border-gray-200"></td>
//               </tr>
              
//               {/* Total Hours (Work + Break) */}
//               <tr className="font-semibold bg-blue-50">
//                 <td colSpan="3" className="p-3 border border-gray-200 text-gray-900">
//                   Total Hours (Work + Break)
//                 </td>
//                 {totals.daily.map((total, index) => (
//                   <td key={index} className="p-3 border border-gray-200 text-blue-700 font-bold text-center">
//                     {getDailyTotalWithBreak(index)}h
//                   </td>
//                 ))}
//                 <td className="p-3 border border-gray-200 text-blue-700 font-bold text-center">
//                   {getWeeklyTotalWithBreak()}h
//                 </td>
//                 <td className="p-3 border border-gray-200"></td>
//               </tr>
//             </tfoot>
//           </table>
//         </div>

//         <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
//           <div className="text-sm text-gray-600">
//             Fill your timesheet and submit before the deadline
//             {monthlyPermissionCount > 0 && (
//               <span className="ml-2 text-orange-600">
//                 • Permissions used: {monthlyPermissionCount}/3
//               </span>
//             )}
//             {isSubmitted && (
//               <span className="ml-2 text-green-600 font-semibold">
//                 • This week's timesheet has been submitted
//               </span>
//             )}
//           </div>
//           <button
//             onClick={submitTimesheet}
//             disabled={loading || monthlyPermissionCount > 3 || isSubmitted}
//             style={{ 
//               backgroundColor: loading || monthlyPermissionCount > 3 || isSubmitted ? "#9ca3af" : colors.primary 
//             }}
//             className="px-6 py-3 text-white rounded font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
//           >
//             {loading ? (
//               <>
//                 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
//                 SUBMITTING...
//               </>
//             ) : isSubmitted ? (
//               "SUBMITTED ✓"
//             ) : (
//               <>
//                 <Send className="w-4 h-4" />
//                 SUBMIT WEEK ({getWeeklyTotalWithBreak()}H)
//               </>
//             )}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Timesheet;