
const express = require("express");
const AdminTimesheet = require("../models/AdminTimesheet");
const Timesheet = require("../models/Timesheet");
const User = require("../models/User");
const Employee = require("../models/Employee");

const router = express.Router();

/**
 * GET All Timesheets with Filters
 * /api/admin-timesheet/list
 */
router.get("/list", async (req, res) => {
  try {
    const { employeeId, division, location, status, week, project } = req.query;

    let adminQuery = {};
    if (employeeId) adminQuery.employeeId = employeeId;
    if (division && division !== "All Division") adminQuery.division = division;
    if (location && location !== "All Locations") adminQuery.location = location;
    if (status && status !== "All Status") adminQuery.status = status;
    if (week && week !== "All Weeks") adminQuery.week = week;
    if (project && project !== "All Projects") adminQuery["timeEntries.project"] = project;

    const adminDocs = await AdminTimesheet.find(adminQuery).sort({ submittedDate: -1 });

    // If caller wants specifically Submitted status OR no admin docs found, include raw submitted employee timesheets
    const includeSubmitted = !status || status === "All Status" || status === "Submitted";
    let submittedDocs = [];

    if (includeSubmitted) {
      const tsQuery = { status: "Submitted" };
      if (week && week !== "All Weeks") {
        // Match weekStartDate's ISO week
        // We'll filter after transform using week string
      }

      // Load submitted timesheets and transform to admin view
      const sheets = await Timesheet.find(tsQuery).lean();
      for (const sheet of sheets) {
        try {
          const user = await User.findById(sheet.userId).lean();
          let emp = null;
          
          // Try multiple methods to find employee data
          if (user?.employeeId) {
            emp = await Employee.findOne({ employeeId: user.employeeId }).lean();
          }
          
          // If not found by employeeId, try email
          if (!emp && user?.email) {
            emp = await Employee.findOne({ email: user.email }).lean();
          }
          
          // If still not found, try name matching
          if (!emp && user?.name) {
            emp = await Employee.findOne({ name: user.name }).lean();
          }

          const weekStr = toWeekString(new Date(sheet.weekStartDate));
          const timeEntries = (sheet.entries || []).map((e) => {
            const hours = e.hours || [0, 0, 0, 0, 0, 0, 0];
            const total = hours.reduce((a, b) => a + (Number(b) || 0), 0);
            return {
              project: e.project,
              task: e.task,
              monday: Number(hours[0] || 0),
              tuesday: Number(hours[1] || 0),
              wednesday: Number(hours[2] || 0),
              thursday: Number(hours[3] || 0),
              friday: Number(hours[4] || 0),
              saturday: Number(hours[5] || 0),
              sunday: Number(hours[6] || 0),
              total: Number(total || 0),
            };
          });

          const weeklyTotal = timeEntries.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
          
          // Log employee lookup results for debugging
          if (!emp) {
            console.log(`⚠️ No employee found for user: ${user?.employeeId || user?.email || user?.name} (userId: ${sheet.userId})`);
          } else if (!emp.division) {
            console.log(`⚠️ Employee found but no division set: ${emp.employeeId} - ${emp.name}`);
          } else {
            console.log(`✅ Employee found with division: ${emp.employeeId} - ${emp.name} - Division: ${emp.division}`);
          }
          
          // Try to get division from existing AdminTimesheet records if employee not found or no division
          let divisionData = emp?.division || "";
          let locationData = emp?.location || "";
          
          if (!divisionData || !locationData) {
            const existingRecord = await AdminTimesheet.findOne({ 
              employeeId: emp?.employeeId || user?.employeeId 
            }).lean();
            
            if (existingRecord) {
              divisionData = divisionData || existingRecord.division || "Not Assigned";
              locationData = locationData || existingRecord.location || "Not Assigned";
              console.log(`📋 Found existing record with division: ${divisionData}, location: ${locationData}`);
            }
          }
          
          const record = {
            // Use a synthetic _id to avoid collision; fall back to sheet._id
            _id: sheet._id,
            employeeId: emp?.employeeId || user?.employeeId || "",
            employeeName: emp?.name || user?.name || "",
            division: divisionData || "Not Assigned",
            location: locationData || "Not Assigned",
            week: weekStr,
            status: "Submitted",
            submittedDate: (sheet.submittedAt ? new Date(sheet.submittedAt) : new Date()).toISOString().split("T")[0],
            timeEntries,
            weeklyTotal: Number(weeklyTotal || 0),
          };

          // Apply filters to submitted records
          if (employeeId && record.employeeId !== employeeId) continue;
          if (division && division !== "All Division" && record.division !== division) continue;
          if (location && location !== "All Locations" && record.location !== location) continue;
          if (week && week !== "All Weeks" && record.week !== week) continue;
          if (project && project !== "All Projects") {
            const hasProject = (record.timeEntries || []).some((te) => te.project === project);
            if (!hasProject) continue;
          }

          submittedDocs.push(record);
        } catch (err) {
          // skip faulty record
        }
      }
    }

    // Merge admin docs and submitted docs, preferring admin docs for duplicates (employeeId+week)
    const key = (r) => `${r.employeeId}|${r.week}`;
    const map = new Map();
    for (const r of submittedDocs) map.set(key(r), r);
    for (const r of adminDocs) map.set(key(r), r);
    const combined = Array.from(map.values()).sort((a, b) => (a.submittedDate < b.submittedDate ? 1 : -1));

    res.json({ success: true, data: combined });

  } catch (err) {
    console.error("Error loading admin timesheets:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/**
 * APPROVE Timesheet
 * /api/admin-timesheet/approve/:id
 */
router.put("/approve/:id", async (req, res) => {
  try {
    let updated = await AdminTimesheet.findByIdAndUpdate(
      req.params.id,
      { status: "Approved", rejectionReason: "" },
      { new: true }
    );

    if (updated) {
      // Update the corresponding Timesheet document
      const user = await User.findOne({ employeeId: updated.employeeId }).lean();
      if (user) {
        // Use improved timesheet finding function
        const targetTimesheet = await findTimesheetByWeek(user._id, updated.week);
        if (targetTimesheet) {
          const timesheetResult = await Timesheet.findByIdAndUpdate(
            targetTimesheet._id,
            { status: "Approved", approvedAt: new Date() },
            { new: true }
          );
          console.log(`✅ Approved timesheet ${targetTimesheet._id} for user ${user._id}, week ${updated.week}`);
        } else {
          console.log(`⚠️ No timesheet found for user ${user._id}, week ${updated.week}`);
        }
      } else {
        console.log(`⚠️ No user found with employeeId: ${updated.employeeId}`);
      }
    } else {
      // Handle case where admin timesheet doesn't exist yet
      const sheet = await Timesheet.findById(req.params.id).lean();
      if (sheet) {
        const user = await User.findById(sheet.userId).lean();
        let emp = null;
        
        // Try multiple methods to find employee data
        if (user?.employeeId) {
          emp = await Employee.findOne({ employeeId: user.employeeId }).lean();
        }
        
        // If not found by employeeId, try email
        if (!emp && user?.email) {
          emp = await Employee.findOne({ email: user.email }).lean();
        }
        
        // If still not found, try name matching
        if (!emp && user?.name) {
          emp = await Employee.findOne({ name: user.name }).lean();
        }

        const weekStr = toWeekString(new Date(sheet.weekStartDate));
        
        // Try to get division from existing AdminTimesheet records if employee not found or no division
        let divisionData = emp?.division || "";
        let locationData = emp?.location || "";
        
        if (!divisionData || !locationData) {
          const existingRecord = await AdminTimesheet.findOne({ 
            employeeId: emp?.employeeId || user?.employeeId 
          }).lean();
          
          if (existingRecord) {
            divisionData = divisionData || existingRecord.division || "Not Assigned";
            locationData = locationData || existingRecord.location || "Not Assigned";
          }
        }

        updated = await AdminTimesheet.findOneAndUpdate(
          { employeeId: emp?.employeeId || user?.employeeId || "", week: weekStr },
          { 
            $set: { 
              status: "Approved", 
              rejectionReason: "",
              employeeName: emp?.name || user?.name || "",
              division: divisionData || "Not Assigned",
              location: locationData || "Not Assigned"
            } 
          },
          { new: true, upsert: true }
        );

        await Timesheet.findByIdAndUpdate(sheet._id, { status: "Approved", approvedAt: new Date() });
      }
    }

    res.json({ success: true, message: "Timesheet approved", data: updated });

  } catch (err) {
    console.error("Approve error:", err);
    res.status(500).json({ success: false, message: "Approve failed" });
  }
});

/**
 * REJECT Timesheet
 * /api/admin-timesheet/reject/:id
 */
router.put("/reject/:id", async (req, res) => {
  try {
    const { reason } = req.body;

    let updated = await AdminTimesheet.findByIdAndUpdate(
      req.params.id,
      {
        status: "Rejected",
        rejectionReason: reason
      },
      { new: true }
    );

    if (updated) {
      // Update the corresponding Timesheet document
      const user = await User.findOne({ employeeId: updated.employeeId }).lean();
      if (user) {
        // Use improved timesheet finding function
        const targetTimesheet = await findTimesheetByWeek(user._id, updated.week);
        if (targetTimesheet) {
          const timesheetResult = await Timesheet.findByIdAndUpdate(
            targetTimesheet._id,
            { status: "Rejected" },
            { new: true }
          );
          console.log(`❌ Rejected timesheet ${targetTimesheet._id} for user ${user._id}, week ${updated.week}`);
        } else {
          console.log(`⚠️ No timesheet found for user ${user._id}, week ${updated.week}`);
        }
      } else {
        console.log(`⚠️ No user found with employeeId: ${updated.employeeId}`);
      }
    } else {
      // Handle case where admin timesheet doesn't exist yet
      const sheet = await Timesheet.findById(req.params.id).lean();
      if (sheet) {
        const user = await User.findById(sheet.userId).lean();
        let emp = null;
        
        // Try multiple methods to find employee data
        if (user?.employeeId) {
          emp = await Employee.findOne({ employeeId: user.employeeId }).lean();
        }
        
        // If not found by employeeId, try email
        if (!emp && user?.email) {
          emp = await Employee.findOne({ email: user.email }).lean();
        }
        
        // If still not found, try name matching
        if (!emp && user?.name) {
          emp = await Employee.findOne({ name: user.name }).lean();
        }

        const weekStr = toWeekString(new Date(sheet.weekStartDate));
        
        // Try to get division from existing AdminTimesheet records if employee not found or no division
        let divisionData = emp?.division || "";
        let locationData = emp?.location || "";
        
        if (!divisionData || !locationData) {
          const existingRecord = await AdminTimesheet.findOne({ 
            employeeId: emp?.employeeId || user?.employeeId 
          }).lean();
          
          if (existingRecord) {
            divisionData = divisionData || existingRecord.division || "Not Assigned";
            locationData = locationData || existingRecord.location || "Not Assigned";
          }
        }

        updated = await AdminTimesheet.findOneAndUpdate(
          { employeeId: emp?.employeeId || user?.employeeId || "", week: weekStr },
          { 
            $set: { 
              status: "Rejected", 
              rejectionReason: reason || "",
              employeeName: emp?.name || user?.name || "",
              division: divisionData || "Not Assigned",
              location: locationData || "Not Assigned"
            } 
          },
          { new: true, upsert: true }
        );

        await Timesheet.findByIdAndUpdate(sheet._id, { status: "Rejected" });
      }
    }

    res.json({ success: true, message: "Timesheet rejected", data: updated });

  } catch (err) {
    console.error("Reject error:", err);
    res.status(500).json({ success: false, message: "Reject failed" });
  }
});

/**
 * YEARLY SUMMARY
 * /api/admin-timesheet/summary?year=2025&project=X&employee=Y
 */
router.get("/summary", async (req, res) => {
  try {
    const { year, employee, project } = req.query;

    let match = {
      week: { $regex: `^${year}` }
    };

    if (employee && employee !== "All Employees") match.employeeName = employee;
    if (project && project !== "All Projects") match["timeEntries.project"] = project;

    const summary = await AdminTimesheet.aggregate([
      { $match: match },

      {
        $group: {
          _id: null,
          totalHours: { $sum: "$weeklyTotal" },
          totalEmployees: { $addToSet: "$employeeId" },
          totalProjects: { $addToSet: "$timeEntries.project" }
        }
      }
    ]);

    res.json({
      success: true,
      summary: summary[0] || {
        totalHours: 0,
        totalEmployees: [],
        totalProjects: []
      }
    });

  } catch (err) {
    console.error("Summary error:", err);
    res.status(500).json({ success: false, message: "Summary failed" });
  }
});

module.exports = router;

/**
 * Find timesheet by week string with improved matching
 */
async function findTimesheetByWeek(userId, weekStr) {
  try {
    const { start, end } = isoWeekToRange(weekStr);
    
    // First try exact date range matching
    let timesheet = await Timesheet.findOne({
      userId: userId,
      weekStartDate: { $gte: start, $lte: end }
    });
    
    if (timesheet) return timesheet;
    
    // If no exact match, try broader range (±1 day)
    const broaderStart = new Date(start);
    broaderStart.setDate(broaderStart.getDate() - 1);
    const broaderEnd = new Date(end);
    broaderEnd.setDate(broaderEnd.getDate() + 1);
    
    timesheet = await Timesheet.findOne({
      userId: userId,
      weekStartDate: { $gte: broaderStart, $lte: broaderEnd }
    });
    
    return timesheet;
  } catch (error) {
    console.error("Error finding timesheet by week:", error);
    return null;
  }
}

function toWeekString(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  const weekStr = String(weekNo).padStart(2, "0");
  return `${date.getUTCFullYear()}-W${weekStr}`;
}

function isoWeekToRange(weekStr) {
  const [yearPart, weekPart] = weekStr.split("-W");
  const year = Number(yearPart);
  const week = Number(weekPart);
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const ISOweekStart = new Date(simple);
  if (dow <= 4) ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  else ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  const ISOweekEnd = new Date(ISOweekStart);
  ISOweekEnd.setUTCDate(ISOweekStart.getUTCDate() + 6);
  return { start: ISOweekStart, end: ISOweekEnd };
}