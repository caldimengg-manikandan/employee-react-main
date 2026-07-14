const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const ConferenceBooking = require("../models/ConferenceBooking");
const Employee = require("../models/Employee");

// Helper to check overlap
const checkOverlap = async (date, startTime, endTime, excludeId = null) => {
  const query = {
    date,
    status: { $in: ["Pending", "Approved", "Reserved", "Blocked"] },
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
  const endHour = 21.0;  // 9:00 PM
  
  // Fetch existing bookings for this day
  const bookings = await ConferenceBooking.find({
    date,
    status: { $in: ["Pending", "Approved", "Reserved", "Blocked"] }
  }).sort({ startTime: 1 });

  const busySlots = bookings.map(b => ({
    start: timeToMin(b.startTime),
    end: timeToMin(b.endTime)
  }));

  // Determine if date is today in local timezone
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentMinOfDay = currentHour * 60 + currentMinute;
  
  const offset = now.getTimezoneOffset();
  const localToday = new Date(now.getTime() - (offset * 60 * 1000)).toISOString().split("T")[0];
  const isToday = date === localToday;

  const alternatives = [];
  let currentMin = startHour * 60;

  // If the booking date is today, only suggest slots starting in the future (rounded to next 30 min)
  if (isToday) {
    const roundedMin = Math.ceil(currentMinOfDay / 30) * 30;
    if (roundedMin > currentMin) {
      currentMin = roundedMin;
    }
  }

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

async function sendBookingSubmittedEmail(booking, employee) {
  try {
    const { sendZohoMail } = require("../zohoMail.service");
    
    // Find active Team Leads, Project Managers, Admin Managers, and General Managers
    const leadsAndManagers = await Employee.find({
      status: "Active",
      $or: [
        { designation: { $regex: /team\s*lead|project\s*manager|admin\s*manager|general\s*manager/i } },
        { position: { $regex: /team\s*lead|project\s*manager|admin\s*manager|general\s*manager/i } }
      ]
    }).select("name designation email officialEmail");

    // Map ONLY to officialEmail, trim and filter empty ones
    const recipientEmails = [...new Set(leadsAndManagers
      .map(e => (e.officialEmail || "").trim())
      .filter(Boolean)
    )];

    if (recipientEmails.length === 0) {
      console.log("⚠️ No lead/manager emails found to notify.");
      return;
    }

    console.log(`📧 Sending booking notification to leads/managers: ${recipientEmails.join(", ")}`);

    const formattedDate = new Date(booking.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formatTime12h = (timeStr) => {
      const [h, m] = timeStr.split(":");
      const hour = parseInt(h);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${m} ${ampm}`;
    };

    const timeRange = `${formatTime12h(booking.startTime)} - ${formatTime12h(booking.endTime)}`;

    const subject = `New Office Sync Booking: ${booking.title} by ${booking.bookedByName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 750px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; color: #333;">
        <h2 style="color: #4F46E5; margin-top: 0; padding-bottom: 10px; border-bottom: 2px solid #4F46E5;">Office Sync - New Booking Request</h2>
        <p style="font-size: 16px; margin-bottom: 20px;">A new booking request has been submitted for the conference room.</p>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <h3 style="color: #4F46E5; margin-top: 0; margin-bottom: 12px; font-size: 16px;">Booking Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 150px;"><strong>Title:</strong></td>
              <td style="padding: 8px 0; color: #333;">${booking.title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Booked By:</strong></td>
              <td style="padding: 8px 0; color: #333;">${booking.bookedByName} (${employee?.designation || 'TL/Manager'})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Division:</strong></td>
              <td style="padding: 8px 0; color: #333;">${booking.division}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Location:</strong></td>
              <td style="padding: 8px 0; color: #333;">${booking.location}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Date:</strong></td>
              <td style="padding: 8px 0; color: #333;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Time Slot:</strong></td>
              <td style="padding: 8px 0; color: #333; font-weight: bold; color: #4F46E5;">${timeRange}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; vertical-align: top;"><strong>Reason:</strong></td>
              <td style="padding: 8px 0; color: #333;">${booking.reason || "-"}</td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 14px; color: #666;">This is an automated notification sent to all Team Leads, Project Managers, Admin Managers, and General Managers.</p>
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0; color: #999; font-size: 12px; text-align: center;">
          <p>© ${new Date().getFullYear()} Caldim Engineering. All rights reserved.</p>
        </div>
      </div>
    `;

    await sendZohoMail({
      to: recipientEmails.join(", "),
      subject,
      content: `New Office Sync Booking: ${booking.title} by ${booking.bookedByName}\nDate: ${formattedDate}\nTime: ${timeRange}\nReason: ${booking.reason || '-'}`,
      html
    });

    console.log("✅ Office Sync booking notification email sent successfully.");
  } catch (err) {
    console.error("❌ Failed to send Office Sync booking email:", err.message);
  }
}

// 1. Get all bookings
router.get("/", auth, async (req, res) => {
  try {
    const bookings = await ConferenceBooking.find().sort({ date: 1, startTime: 1 }).lean();
    const User = require("../models/User");
    const employeeIds = [...new Set(bookings.map(b => b.bookedBy))];
    const users = await User.find({ employeeId: { $in: employeeIds } }).select("employeeId role").lean();
    const roleMap = {};
    users.forEach(u => {
      roleMap[u.employeeId] = u.role;
    });
    const enrichedBookings = bookings.map(b => ({
      ...b,
      bookedByRole: roleMap[b.bookedBy] || "employee"
    }));
    res.json(enrichedBookings);
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

    // Parse the current IST time using Intl.DateTimeFormat
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const pv = {};
    parts.forEach(p => { pv[p.type] = p.value; });

    const currentYear = Number(pv.year);
    const currentMonth = Number(pv.month);
    const currentDay = Number(pv.day);
    const currentHour = Number(pv.hour);
    const currentMinute = Number(pv.minute);

    // Parse requested times
    const [year, month, day] = date.split("-").map(Number);
    let [startH, startM] = startTime.split(":").map(Number);
    let [endH, endM] = endTime.split(":").map(Number);

    // Auto-convert 12-hour format (1 to 8) to 24-hour PM format (13 to 20)
    if (startH >= 1 && startH < 9) {
      startH += 12;
    }
    if (endH >= 1 && endH < 9) {
      endH += 12;
    }

    const finalStartTime = `${startH.toString().padStart(2, "0")}:${startM.toString().padStart(2, "0")}`;
    const finalEndTime = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;

    // Compare with current IST time
    const bookingStartDateTime = new Date(year, month - 1, day, startH, startM);
    const currentISTDateTime = new Date(currentYear, currentMonth - 1, currentDay, currentHour, currentMinute);

    if (bookingStartDateTime < currentISTDateTime) {
      return res.status(400).json({ message: "Cannot book a conference room slot in the past." });
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
    if (timeToMin(finalStartTime) >= timeToMin(finalEndTime)) {
      return res.status(400).json({ message: "Start time must be before end time." });
    }

    const startMin = timeToMin(finalStartTime);
    const endMin = timeToMin(finalEndTime);
    const openingMin = timeToMin("09:00");
    const closingMin = timeToMin("21:00");

    // Validation: Booking must be within business hours (9:00 AM - 9:00 PM)
    if (startMin < openingMin || endMin > closingMin) {
      return res.status(400).json({ message: "Conference room can only be booked during business hours (9:00 AM - 9:00 PM)." });
    }

    // Prevent bookings overlapping with Lunch Break (13:00 - 13:45)
    const lunchStart = timeToMin("13:00");
    const lunchEnd = timeToMin("13:45");
    if (startMin < lunchEnd && endMin > lunchStart) {
      return res.status(400).json({ message: "Cannot book conference room during Lunch Break (1:00 PM - 1:45 PM)." });
    }

    // Check overlap
    const conflict = await checkOverlap(date, finalStartTime, finalEndTime);
    if (conflict) {
      const duration = timeToMin(finalEndTime) - timeToMin(finalStartTime);
      const alternatives = await getAlternativeSlots(date, duration);
      return res.status(400).json({ 
        message: "Conference Room Already Booked", 
        conflict: true,
        alternatives
      });
    }

    // Create booking: all successful bookings are instantly Reserved
    const initialStatus = "Reserved";

    const booking = await ConferenceBooking.create({
      title,
      bookedBy: req.user.employeeId,
      bookedByName: req.user.name,
      bookedByEmail: req.user.email,
      division: employee ? employee.division : "System",
      location: employee ? employee.location : "Hosur",
      date,
      startTime: finalStartTime,
      endTime: finalEndTime,
      status: initialStatus,
      reason
    });

    // Send email notification asynchronously in the background
    sendBookingSubmittedEmail(booking, employee);

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

    if (status === "Approved" || status === "Reserved" || status === "Rejected") {
      // Must be HR/Admin to approve or reject
      if (!isAdminOrHr) {
        return res.status(403).json({ message: "Only HR/Admin can approve or reject bookings." });
      }
      booking.status = (status === "Approved") ? "Reserved" : status;
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
