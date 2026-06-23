const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const HolidayWorkingRequest = require("../models/HolidayWorkingRequest");
const HolidayAllowance = require("../models/HolidayAllowance");
const Notification = require("../models/Notification");
const Employee = require("../models/Employee");
const User = require("../models/User");
const Compensation = require("../models/Compensation");
const Attendance = require("../models/Attendance");

// Helper to generate Request ID
const generateRequestId = async () => {
  const count = await HolidayWorkingRequest.countDocuments();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `HWR-${dateStr}-${(count + 1).toString().padStart(4, "0")}`;
};

// Create a new request
router.post("/", auth, async (req, res) => {
  try {
    const {
      workingDate,
      holidayType,
      division,
      department,
      projectName,
      reason,
      shiftTiming,
      employees,
      remarks,
    } = req.body;

    const requestId = await generateRequestId();

    const userRole = req.user.role;
    if (!["admin", "projectmanager", "project_manager", "teamlead"].includes(userRole)) {
      return res.status(403).json({ message: "Not authorized to create requests" });
    }

    // Get created by name
    const creator = await Employee.findOne({ employeeId: req.user.employeeId });

    const status = "Pending HR Approval";

    const newRequest = new HolidayWorkingRequest({
      requestId,
      workingDate,
      holidayType,
      division,
      department,
      projectName,
      reason,
      shiftTiming,
      employees,
      remarks,
      status,
      createdBy: req.user.employeeId,
      createdByName: creator ? creator.name : req.user.employeeId,
      timeline: [
        {
          status: "Created",
          updatedBy: creator ? creator.name : req.user.employeeId,
          remarks: "Request created and submitted for HR approval",
        },
      ],
    });

    await newRequest.save();

    // If submitted, notify HR
    if (status === "Pending HR Approval") {
      const hrs = await User.find({ role: "hr" });
      const notifications = hrs.map((hr) => ({
        recipient: hr._id,
        title: "New Holiday Working Request",
        message: `A new holiday working request ${requestId} is pending your approval.`,
        type: "OTHER",
        link: "/allowance/holiday-working-request",
      }));
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }

    res.status(201).json({ success: true, data: newRequest });
  } catch (error) {
    console.error("Error creating holiday working request:", error);
    res.status(500).json({ success: false, message: "Failed to create request" });
  }
});

// Get requests
router.get("/", auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Automatically transition Approved requests to Attendance Pending if the date has passed
    const overdueRequests = await HolidayWorkingRequest.find({
      status: "Approved",
      workingDate: { $lt: today }
    });

    if (overdueRequests.length > 0) {
      for (const req of overdueRequests) {
        req.status = "Attendance Pending";
        req.timeline.push({
          status: "Attendance Pending",
          updatedBy: "System",
          remarks: "Working date has passed. Attendance verification is pending."
        });
        await req.save();
      }
    }

    const { status, startDate, endDate } = req.query;
    const userRole = req.user.role;
    const employeeId = req.user.employeeId;

    let filter = {};

    // Filters
    if (status) filter.status = status;
    if (startDate && endDate) {
      filter.workingDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
      filter.workingDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.workingDate = { $lte: new Date(endDate) };
    }

    // Role based access
    if (userRole === "employees") {
      // Employees see requests they created OR requests they are part of
      filter.$or = [
        { createdBy: req.user._id },
        { "employees.employeeId": employeeId }
      ];
    } else if (["projectmanager", "project_manager"].includes(userRole)) {
      // TLs see their own requests or requests they are part of
      filter.$or = [
        { createdBy: employeeId },
        { "employees.employeeId": employeeId },
      ];
    }
    // HR, Admin, Director see all

    const requests = await HolidayWorkingRequest.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("Error fetching requests:", error);
    res.status(500).json({ success: false, message: "Failed to fetch requests" });
  }
});

// Update status
router.put("/:id/status", auth, async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const request = await HolidayWorkingRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const previousStatus = request.status;
    if (previousStatus === "Approved") {
      return res.status(400).json({ success: false, message: "Request is already approved" });
    }

    const updater = await Employee.findOne({ employeeId: req.user.employeeId });
    const updaterName = updater ? updater.name : req.user.employeeId;

    // Validate role for approval
    const userRole = req.user.role;
    if (
      status === "Pending General Manager Approval" &&
      !["hr", "admin"].includes(userRole)
    ) {
      return res.status(403).json({ message: "Not authorized to approve as HR" });
    }

    if (
      status === "Approved" &&
      !["manager", "admin", "director"].includes(userRole)
    ) {
      // GM is manager role in this system
      return res.status(403).json({ message: "Not authorized to final approve" });
    }

    request.status = status;

    if (status === "Pending General Manager Approval") {
      request.hrApprovedBy = updaterName;
      request.hrApprovedAt = new Date();

      // Notify GM (Manager role)
      const gms = await User.find({ role: { $in: ["manager", "director"] } });
      const notifications = gms.map((gm) => ({
        recipient: gm._id,
        title: "Holiday Working Request Pending GM Approval",
        message: `Request ${request.requestId} is pending your final approval.`,
        type: "OTHER",
        link: "/allowance/holiday-working-request",
      }));
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    } else if (status === "Approved") {
      request.gmApprovedBy = updaterName;
      request.gmApprovedAt = new Date();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(request.workingDate) < today) {
        request.status = "Attendance Pending";
      }

      // Notify TL/Manager
      const creatorUser = await User.findOne({ employeeId: request.createdBy });
      if (creatorUser) {
        await Notification.create({
          recipient: creatorUser._id,
          title: "Holiday Working Request Approved",
          message: `Your request ${request.requestId} has been approved.`,
          type: "OTHER",
          link: "/allowance/holiday-working-request",
        });
      }

      // Notify Employees
      const empIds = request.employees.map(e => e.employeeId);
      const empUsers = await User.find({ employeeId: { $in: empIds } });
      const empNotifications = empUsers.map(u => ({
        recipient: u._id,
        title: "Holiday Working Approved",
        message: `You have been approved for holiday working on ${new Date(request.workingDate).toLocaleDateString()}.`,
        type: "OTHER",
      }));
      if (empNotifications.length > 0) {
        await Notification.insertMany(empNotifications);
      }
    } else if (status === "Rejected") {
      // Notify TL/Manager
      const creatorUser = await User.findOne({ employeeId: request.createdBy });
      if (creatorUser) {
        await Notification.create({
          recipient: creatorUser._id,
          title: "Holiday Working Request Rejected",
          message: `Your request ${request.requestId} has been rejected.`,
          type: "OTHER",
          link: "/allowance/holiday-working-request",
        });
      }
    }

    request.timeline.push({
      status: request.status,
      updatedBy: updaterName,
      remarks: remarks || "",
    });

    await request.save();
    res.json({ success: true, data: request });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ success: false, message: "Failed to update status" });
  }
});

// Update request (previously edit draft)
router.put("/:id", auth, async (req, res) => {
  try {
    const request = await HolidayWorkingRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const isPrivileged = ["admin", "manager", "projectmanager", "project_manager", "hr", "teamlead"].includes(req.user.role?.toLowerCase());

    if (!isPrivileged && request.createdBy !== req.user.employeeId) {
      return res.status(403).json({ message: "Not authorized to edit this request" });
    }

    if (!isPrivileged && request.status !== "Pending HR Approval") {
      return res.status(400).json({ message: "Only requests pending HR approval can be edited directly" });
    }

    const {
      workingDate,
      holidayType,
      division,
      department,
      projectName,
      reason,
      shiftTiming,
      employees,
      remarks,
    } = req.body;

    const status = "Pending HR Approval";

    request.workingDate = workingDate || request.workingDate;
    request.holidayType = holidayType || request.holidayType;
    request.division = division || request.division;
    request.department = department || request.department;
    request.projectName = projectName || request.projectName;
    request.reason = reason || request.reason;
    request.shiftTiming = shiftTiming || request.shiftTiming;
    request.employees = employees || request.employees;
    request.remarks = remarks || request.remarks;
    request.status = status;

    const updater = await Employee.findOne({ employeeId: req.user.employeeId });
    const updaterName = updater ? updater.name : req.user.employeeId;

    request.timeline.push({
      status: "Submitted",
      updatedBy: updaterName,
      remarks: "Request updated and submitted for HR approval",
    });

    await request.save();

    const hrs = await User.find({ role: "hr" });
    const notifications = hrs.map((hr) => ({
      recipient: hr._id,
      title: "New Holiday Working Request",
      message: `A new holiday working request ${request.requestId} is pending your approval.`,
      type: "OTHER",
      link: "/allowance/holiday-working-request",
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.json({ success: true, data: request });
  } catch (error) {
    console.error("Error updating request:", error);
    res.status(500).json({ success: false, message: "Failed to update request" });
  }
});

// Delete request (previously delete draft)
router.delete("/:id", auth, async (req, res) => {
  try {
    const request = await HolidayWorkingRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const isPrivileged = ["admin", "manager", "projectmanager", "project_manager", "hr", "teamlead"].includes(req.user.role?.toLowerCase());

    if (!isPrivileged && request.createdBy !== req.user.employeeId) {
      return res.status(403).json({ message: "Not authorized to delete this request" });
    }

    if (!isPrivileged && request.status !== "Pending HR Approval") {
      return res.status(400).json({ message: "Only requests pending HR approval can be deleted" });
    }

    await HolidayWorkingRequest.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Request deleted successfully" });
  } catch (error) {
    console.error("Error deleting request:", error);
    res.status(500).json({ success: false, message: "Failed to delete request" });
  }
});

// Calculate / Verify Attendance dynamically for a request
router.get("/:id/verify-attendance", auth, async (req, res) => {
  try {
    const request = await HolidayWorkingRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const workingDate = new Date(request.workingDate);
    const startOfDay = new Date(workingDate.getFullYear(), workingDate.getMonth(), workingDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(workingDate.getFullYear(), workingDate.getMonth(), workingDate.getDate(), 23, 59, 59, 999);

    const empIds = request.employees.map(e => e.employeeId);

    // Fetch all punches for these employees on that date
    const records = await Attendance.find({
      employeeId: { $in: empIds },
      punchTime: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ punchTime: 1 });

    const results = request.employees.map(emp => {
      const events = records.filter(r => r.employeeId === emp.employeeId);

      // Calculate work hours like weekly attendance logic
      const pairs = [];
      let currentIn = null;
      let currentOut = null;

      for (const e of events) {
        if (e.direction === "in") {
          if (currentIn && currentOut) {
            pairs.push({ start: new Date(currentIn.punchTime), end: new Date(currentOut.punchTime) });
            currentIn = null;
            currentOut = null;
          }
          if (!currentIn) {
            currentIn = e;
          } else {
            if (e.source === "manual" && currentIn.source !== "manual") currentIn = e;
          }
        } else if (e.direction === "out") {
          if (currentIn) {
            const t = new Date(e.punchTime);
            const inT = new Date(currentIn.punchTime);
            if (t > inT) {
              if (!currentOut) {
                currentOut = e;
              } else {
                if (e.source === "manual" && currentOut.source !== "manual") {
                  currentOut = e;
                } else if (t > new Date(currentOut.punchTime)) {
                  currentOut = e;
                }
              }
            }
          }
        }
      }
      if (currentIn && currentOut) {
        pairs.push({ start: new Date(currentIn.punchTime), end: new Date(currentOut.punchTime) });
      }

      const workDurationRec = events.reduce((max, e) => {
        const currentDuration = Number(e.workDurationSeconds) || 0;
        const maxDuration = max ? (Number(max.workDurationSeconds) || 0) : 0;
        return currentDuration > maxDuration ? e : max;
      }, null);

      let workedHours = 0;
      if (workDurationRec) {
        workedHours = Number((workDurationRec.workDurationSeconds / 3600).toFixed(2));
      } else {
        workedHours = Number(
          pairs
            .map(p => (p.end - p.start) / (1000 * 60 * 60))
            .reduce((a, b) => a + b, 0)
            .toFixed(2)
        );
      }

      // Determine presence
      let attendanceStatus = "Absent";
      if (events.length > 0 && workedHours > 0) {
        attendanceStatus = "Present";
      } else {
        // If the working date is today or in the future, it might be Pending
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (workingDate >= today) {
          attendanceStatus = "Pending";
        }
      }

      // Determine Eligibility based on shift hours requirements
      let minHours = 9.0;
      const shift = (request.shiftTiming || "").toLowerCase();
      let shiftMultiplier = 1.0;
      
      if (shift.includes("half")) {
        minHours = 4.5; // 4.5 Hours for Half Day
        shiftMultiplier = 0.5;
      } else {
        minHours = 9.0; // 9.0 Hours for Full Day shifts (General, First, Second)
        shiftMultiplier = 1.0;
      }

      let allowanceEligibility = "Not Eligible";
      let holidayDaysValue = 0;
      if (attendanceStatus === "Present" && workedHours >= minHours) {
        allowanceEligibility = "Eligible";
        holidayDaysValue = shiftMultiplier;
      }

      return {
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        department: emp.department,
        location: emp.location,
        division: emp.division,
        attendanceStatus,
        workedHours,
        allowanceEligibility,
        holidayDaysValue
      };
    });

    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Error verifying holiday attendance:", error);
    res.status(500).json({ success: false, message: "Failed to verify attendance data" });
  }
});

// Finalize attendance and process allowances for eligible employees
router.post("/:id/finalize-attendance", auth, async (req, res) => {
  try {
    const { employees, remarks } = req.body;
    const request = await HolidayWorkingRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    // Role verification
    const userRole = req.user.role?.toLowerCase();
    if (!["admin", "hr", "manager", "director"].includes(userRole)) {
      return res.status(403).json({ success: false, message: "Not authorized to finalize attendance verification" });
    }

    const updater = await Employee.findOne({ employeeId: req.user.employeeId });
    const updaterName = updater ? updater.name : req.user.employeeId;

    // Update the request employees details
    request.employees = request.employees.map(emp => {
      const verified = (employees || []).find(v => v.employeeId === emp.employeeId);
      if (verified) {
        return {
          ...emp.toObject(),
          attendanceStatus: verified.attendanceStatus || emp.attendanceStatus || "Pending",
          workedHours: typeof verified.workedHours === "number" ? verified.workedHours : emp.workedHours || 0,
          allowanceEligibility: verified.allowanceEligibility || emp.allowanceEligibility || "Not Eligible",
          holidayDaysValue: typeof verified.holidayDaysValue === "number" ? verified.holidayDaysValue : emp.holidayDaysValue || 0
        };
      }
      return emp;
    });

    request.status = "Completed";
    request.timeline.push({
      status: "Completed",
      updatedBy: updaterName,
      remarks: remarks || "Attendance verified and request completed"
    });

    await request.save();

    // Process allowances for eligible employees
    const month = new Date(request.workingDate).getMonth() + 1;
    const year = new Date(request.workingDate).getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();

    const eligibleEmployees = request.employees.filter(
      e => e.attendanceStatus === "Present" && e.allowanceEligibility === "Eligible"
    );

    if (eligibleEmployees.length > 0) {
      const empIds = eligibleEmployees.map(e => e.employeeId);
      const compensations = await Compensation.find({ employeeId: { $in: empIds } }).lean();
      const compMap = new Map(compensations.map(c => [c.employeeId, c]));

      for (const emp of eligibleEmployees) {
        const allowanceFilter = {
          employeeId: emp.employeeId,
          month: month,
          year: year,
        };

        const existingAllowance = await HolidayAllowance.findOne(allowanceFilter);
        const comp = compMap.get(emp.employeeId);
        const grossSalary = comp ? (comp.gross || 0) : 0;

        let updateData = {
          employeeId: emp.employeeId,
          employeeName: emp.employeeName,
          division: emp.division,
          location: emp.location || "All",
          month: month,
          year: year,
          grossSalary: grossSalary,
        };

        const daysEarned = emp.holidayDaysValue || 1;

        if (existingAllowance) {
          updateData.holidayDays = (existingAllowance.holidayDays || 0) + daysEarned;

          let perDayAmountUsed = existingAllowance.perDayAmount || 0;
          if (perDayAmountUsed === 0 && grossSalary > 0 && daysInMonth > 0) {
            perDayAmountUsed = Math.round(grossSalary / daysInMonth);
            if (perDayAmountUsed > 1500) perDayAmountUsed = 1500;
          }
          updateData.perDayAmount = perDayAmountUsed;

          const shiftAllottedAmount = existingAllowance.shiftAllottedAmount || 0;
          const foodAllottedAmount = existingAllowance.foodAllottedAmount || 0;
          const shiftDays = existingAllowance.shiftDays || 0;
          const foodDays = existingAllowance.foodDays || 0;

          // Do NOT automatically increment shift and food days (manual entry only)
          updateData.shiftDays = shiftDays;
          updateData.foodDays = foodDays;

          updateData.holidayTotal = Math.round(updateData.holidayDays * perDayAmountUsed);
          updateData.shiftTotal = Math.round(shiftDays * shiftAllottedAmount);
          updateData.foodTotal = Math.round(foodDays * foodAllottedAmount);
          updateData.totalAmount = updateData.holidayTotal + updateData.shiftTotal + updateData.foodTotal;
        } else {
          // Defaults if no existing allowance for the month
          updateData.holidayDays = daysEarned;
          updateData.shiftDays = 0;
          updateData.foodDays = 0;

          let perDayAmountUsed = 0;
          if (grossSalary > 0 && daysInMonth > 0) {
            perDayAmountUsed = Math.round(grossSalary / daysInMonth);
            if (perDayAmountUsed > 1500) perDayAmountUsed = 1500;
          }
          updateData.perDayAmount = perDayAmountUsed;

          updateData.shiftAllottedAmount = 50;
          updateData.foodAllottedAmount = 75;
          updateData.holidayTotal = Math.round(daysEarned * perDayAmountUsed);
          updateData.shiftTotal = 0;
          updateData.foodTotal = 0;
          updateData.totalAmount = updateData.holidayTotal;
        }

        await HolidayAllowance.findOneAndUpdate(allowanceFilter, { $set: updateData }, {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        });
      }
    }

    res.json({ success: true, message: "Attendance verified and allowances processed successfully", data: request });
  } catch (error) {
    console.error("Error finalizing holiday working attendance:", error);
    res.status(500).json({ success: false, message: "Failed to finalize attendance verification" });
  }
});

module.exports = router;
