const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const ConferenceBooking = require("../models/ConferenceBooking");
const Employee = require("../models/Employee");

// Helper to check overlap
const checkOverlap = async (date, startTime, endTime, excludeId = null) => {
  const query = {
    date,
    status: { $in: ["Pending", "Approved", "Blocked"] },
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return await ConferenceBooking.findOne(query);
};

// Helper to suggest alternative slots
const getAlternativeSlots = async (date, requestedDurationMin = 60) => {
  const startHour = 9; // 9:00 AM
  const endHour = 18;  // 6:00 PM
  
  // Fetch existing bookings for this day
  const bookings = await ConferenceBooking.find({
    date,
    status: { $in: ["Pending", "Approved", "Blocked"] }
  }).sort({ startTime: 1 });

  const busySlots = bookings.map(b => ({
    start: timeToMin(b.startTime),
    end: timeToMin(b.endTime)
  }));

  const alternatives = [];
  let currentMin = startHour * 60;
  const limitMin = endHour * 60;

  while (currentMin + requestedDurationMin <= limitMin && alternatives.length < 3) {
    const slotEnd = currentMin + requestedDurationMin;
    const hasConflict = busySlots.some(busy => {
      return currentMin < busy.end && slotEnd > busy.start;
    });

    if (!hasConflict) {
      alternatives.push({
        startTime: minToTime(currentMin),
        endTime: minToTime(slotEnd)
      });
      // Move forward by 30 mins or by duration
      currentMin += 30;
    } else {
      // Find the end time of the conflicting booking to skip over it
      const conflict = busySlots.find(busy => currentMin < busy.end && slotEnd > busy.start);
      currentMin = conflict.end;
    }
  }

  return alternatives;
};

// Convert "HH:MM" to minutes from midnight
function timeToMin(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// Convert minutes from midnight to "HH:MM"
function minToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

// 1. Get all bookings
router.get("/", auth, async (req, res) => {
  try {
    const bookings = await ConferenceBooking.find().sort({ date: 1, startTime: 1 }).lean();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 2. Request a booking
router.post("/", auth, async (req, res) => {
  try {
    const { title, date, startTime, endTime, reason } = req.body;
    
    if (!title || !date || !startTime || !endTime) {
      return res.status(400).json({ message: "Title, date, start time, and end time are required." });
    }

    // Check employee location and division (Admins & HR bypass)
    const isAdminOrHr = ["admin", "hr", "director"].includes(req.user.role?.toLowerCase());
    const employee = await Employee.findOne({ employeeId: req.user.employeeId });

    if (!employee && !isAdminOrHr) {
      return res.status(404).json({ message: "Employee profile not found." });
    }

    if (!isAdminOrHr) {
      const isHosur = employee.location?.trim().toLowerCase() === "hosur";
      const validDivisions = ["sds", "tekla", "das(software)", "das"];
      const isMatchingDivision = validDivisions.includes(employee.division?.replace(/\s+/g, "").toLowerCase());

      if (!isHosur || !isMatchingDivision) {
        return res.status(403).json({ 
          message: "Office Sync booking is restricted to Hosur location employees of SDS, TEKLA, and DAS divisions." 
        });
      }
    }

    // Role & Designation verification: only TL, Managers, Admin, HR can book
    const bookingRoles = ["admin", "hr", "director", "teamlead", "manager", "projectmanager", "project_manager"];
    const isBookingRole = bookingRoles.includes(req.user.role?.toLowerCase());

    const employeeDesignation = employee?.designation?.trim().toLowerCase() || "";
    const employeePosition = employee?.position?.trim().toLowerCase() || "";
    const isTLOrManagerDesignation = ["team lead", "reporting manager", "project manager", "manager", "tl"].some(d => 
      employeeDesignation.includes(d) || employeePosition.includes(d)
    );

    if (!isBookingRole && !isTLOrManagerDesignation) {
      return res.status(403).json({ message: "Access denied. Only Team Leads, Managers, and HR/Admin can book rooms." });
    }

    // Validation: Start time must be before end time
    if (timeToMin(startTime) >= timeToMin(endTime)) {
      return res.status(400).json({ message: "Start time must be before end time." });
    }

    // Check overlap
    const conflict = await checkOverlap(date, startTime, endTime);
    if (conflict) {
      const duration = timeToMin(endTime) - timeToMin(startTime);
      const alternatives = await getAlternativeSlots(date, duration);
      return res.status(400).json({ 
        message: "Conference Room Already Booked", 
        conflict: true,
        alternatives
      });
    }

    // Create booking
    // No approval required: bookings are approved automatically
    const initialStatus = "Approved";

    const booking = await ConferenceBooking.create({
      title,
      bookedBy: req.user.employeeId,
      bookedByName: req.user.name,
      bookedByEmail: req.user.email,
      division: employee ? employee.division : "System",
      location: employee ? employee.location : "Hosur",
      date,
      startTime,
      endTime,
      status: initialStatus,
      reason
    });

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 3. Update status (Approve/Reject or Cancel)
router.put("/:id/status", auth, async (req, res) => {
  try {
    const { status, adminComments } = req.body;
    const booking = await ConferenceBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const userRole = req.user.role?.toLowerCase();
    const isAdminOrHr = ["admin", "hr", "director"].includes(userRole);

    if (status === "Approved" || status === "Rejected") {
      // Must be HR/Admin to approve or reject
      if (!isAdminOrHr) {
        return res.status(403).json({ message: "Only HR/Admin can approve or reject bookings." });
      }
      booking.status = status;
      if (adminComments) booking.adminComments = adminComments;
    } else if (status === "Cancelled") {
      // Creator or Admin can cancel
      if (booking.bookedBy !== req.user.employeeId && !isAdminOrHr) {
        return res.status(403).json({ message: "You can only cancel your own bookings." });
      }
      booking.status = "Cancelled";
    } else {
      return res.status(400).json({ message: "Invalid status update." });
    }

    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 4. Block slots (HR/Admin Only)
router.post("/block", auth, async (req, res) => {
  try {
    const userRole = req.user.role?.toLowerCase();
    const isAdminOrHr = ["admin", "hr", "director"].includes(userRole);

    if (!isAdminOrHr) {
      return res.status(403).json({ message: "Only HR/Admin can block time slots." });
    }

    const { date, startTime, endTime, reason } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: "Date, start time, and end time are required." });
    }

    // Check overlap
    const conflict = await checkOverlap(date, startTime, endTime);
    if (conflict) {
      return res.status(400).json({ message: "Cannot block slot. Another active booking exists in this period." });
    }

    const booking = await ConferenceBooking.create({
      title: "Blocked Slot",
      bookedBy: req.user.employeeId || "ADMIN",
      bookedByName: req.user.name || "System Admin",
      bookedByEmail: req.user.email,
      division: "System",
      location: "Hosur",
      date,
      startTime,
      endTime,
      status: "Blocked",
      reason: reason || "Maintenance / Corporate Use"
    });

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
