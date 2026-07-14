// routes/employees.js
const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const HolidayAllowance = require('../models/HolidayAllowance');
const PromotionHistory = require('../models/PromotionHistory');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Team = require('../models/Team');
const { validateEmployeeCreate, validateEmployeeUpdate } = require('../middleware/validation');

const syncCompensationToEmployeeAndPayroll = async (emp) => {
  try {
    const Compensation = require("../models/Compensation");
    const Payroll = require("../models/Payroll");
    
    // Find latest compensation by employeeId or by name
    let comp = await Compensation.findOne({ 
      $or: [
        { employeeId: emp.employeeId },
        { name: { $regex: new RegExp(`^${emp.name}$`, "i") } }
      ]
    }).sort({ createdAt: -1 });

    if (comp) {
      // Update employeeId in compensation if empty
      if (!comp.employeeId) {
        comp.employeeId = emp.employeeId;
        await comp.save();
      }

      // Build payroll data and save
      const basicDA = Number(comp.basicDA) || 0;
      const hra = Number(comp.hra) || 0;
      const specialAllowance = Number(comp.specialAllowance) || 0;
      let calculatedEmployeePF = 1800;
      let calculatedEmployerPF = 1950;
      if (basicDA > 0) {
        if (basicDA < 15000) {
          calculatedEmployeePF = Math.round(basicDA * 0.12);
          calculatedEmployerPF = Math.round(basicDA * 0.13) + 150;
        } else {
          calculatedEmployeePF = 1800;
          calculatedEmployerPF = 1950;
        }
      }
      const employeePF = comp.employeePfContribution !== undefined && comp.employeePfContribution !== null && comp.employeePfContribution !== "" ? Number(comp.employeePfContribution) : calculatedEmployeePF;
      const employerPF = comp.employerPfContribution !== undefined && comp.employerPfContribution !== null && comp.employerPfContribution !== "" ? Number(comp.employerPfContribution) : calculatedEmployerPF;
      const esi = Number(comp.esi) || 0;
      const tax = Number(comp.tax) || 0;
      const professionalTax = Number(comp.professionalTax) || 0;
      const gratuity = Number(comp.gratuity) || 0;
      const volunteerPF = Number(comp.volunteerPF) || 0;

      const reconstructedGross = basicDA + hra + specialAllowance + employeePF + employerPF + esi;
      const totalEarnings = Math.round(reconstructedGross);
      const totalDeductions = employeePF + employerPF + esi + tax + professionalTax + volunteerPF;
      const netSalary = (basicDA + hra + specialAllowance) - tax - professionalTax - volunteerPF;
      const ctc = Math.round(reconstructedGross + gratuity);

      const payrollData = {
        employeeId: emp.employeeId,
        employeeName: emp.name || emp.employeename,
        designation: comp.designation,
        department: comp.department,
        location: comp.location || emp.location || 'Chennai',
        dateOfJoining: emp.dateOfJoining || comp.effectiveDate,
        employmentType: "Permanent",
        basicDA,
        hra,
        specialAllowance,
        employeePfContribution: employeePF,
        employerPfContribution: employerPF,
        esi,
        tax,
        professionalTax,
        gratuity,
        volunteerPF,
        totalEarnings,
        totalDeductions,
        netSalary,
        ctc,
        status: "Pending"
      };

      // Upsert to Payroll
      await Payroll.findOneAndUpdate(
        { employeeId: { $regex: new RegExp(`^${emp.employeeId}$`, 'i') } },
        { $set: payrollData },
        { upsert: true, new: true }
      );

      // Update Employee with salary details
      const Employee = require("../models/Employee");
      await Employee.findByIdAndUpdate(
        emp._id,
        {
          $set: {
            dateOfJoining: emp.dateOfJoining || payrollData.dateOfJoining,
            basicDA: payrollData.basicDA,
            hra: payrollData.hra,
            specialAllowance: payrollData.specialAllowance,
            employeePfContribution: payrollData.employeePfContribution,
            employerPfContribution: payrollData.employerPfContribution,
            esi: payrollData.esi,
            tax: payrollData.tax,
            professionalTax: payrollData.professionalTax,
            gratuity: payrollData.gratuity,
            volunteerPF: payrollData.volunteerPF,
            totalEarnings: payrollData.totalEarnings,
            totalDeductions: payrollData.totalDeductions,
            netSalary: payrollData.netSalary,
            ctc: payrollData.ctc
          }
        }
      );
    }
  } catch (syncErr) {
    console.error("Error auto-syncing compensation to employee:", syncErr);
  }
};

// Helper to get team assignments (duplicated from admintimesheetRoutes to maintain consistency)
async function getTeamManagementAssignmentSets(userEmployeeId) {
  const teams = await Team.find({})
    .select("leaderEmployeeId members")
    .lean();

  const allAssigned = new Set();
  const mine = new Set();

  for (const t of teams) {
    const members = Array.isArray(t.members) ? t.members : [];
    for (const m of members) {
      if (!m) continue;
      allAssigned.add(m);
      if (userEmployeeId && t.leaderEmployeeId === userEmployeeId) {
        mine.add(m);
      }
    }
  }

  return {
    allAssignedMemberIds: Array.from(allAssigned),
    myAssignedMemberIds: Array.from(mine)
  };
}

// Get all employees - restricted based on user permissions
router.get('/', auth, async (req, res) => {
  try {
    const { status, byDivision, division } = req.query;
    let query = {};

    // Default to Active if no status provided and not requesting 'all'
    if (status && status !== 'all') {
      query.status = status;
    } else if (!status) {
      query.status = 'Active';
    }

    const getDivisionQueryValue = (div) => {
      if (!div) return div;
      const normalized = div.replace(/\s+/g, '').toLowerCase();
      if (normalized === 'das(software)' || normalized === 'dassoftware') {
        return { $in: ['DAS(Software)', 'DAS (Software)'] };
      }
      return div;
    };

    const roleLower = String(req.user.role || '').toLowerCase();
    
    // Fetch logged-in user employee profile to determine division and designation
    const loggedInEmp = await Employee.findOne({ employeeId: req.user.employeeId });
    const empDesignation = loggedInEmp ? (loggedInEmp.designation || "").trim().toLowerCase() : "";
    const allowedDesignations = [
      "team lead",
      "sr. team lead",
      "sr team lead",
      "assistant project manager",
      "asst project manager"
    ];

    const hasFullAccess = req.user.permissions?.includes('employee_access') ||
      ['admin', 'director', 'manager'].includes(roleLower);

    // Full access for users with employee_access or admin/director/GM roles
    if (hasFullAccess) {
      if (byDivision === 'true') {
        if (division) {
          query.division = getDivisionQueryValue(division);
        } else {
          if (loggedInEmp && loggedInEmp.division) {
            query.division = getDivisionQueryValue(loggedInEmp.division);
          }
        }
      }
      const employees = await Employee.find(query).sort({ createdAt: -1 });
      return res.json(employees);
    }

    const isPM = ['projectmanager', 'project_manager', 'teamlead'].includes(roleLower) || allowedDesignations.includes(empDesignation);
    if (isPM) {
      if (byDivision === 'true') {
        // PM/TL should only be able to query active employees in their own division
        if (loggedInEmp && loggedInEmp.division) {
          query.division = getDivisionQueryValue(loggedInEmp.division);
        } else {
          // If no division, return empty list to protect other divisions
          return res.json([]);
        }
      } else {
        const { myAssignedMemberIds } = await getTeamManagementAssignmentSets(req.user.employeeId);
        // Ensure they only see their assigned team members + themselves
        const allowedIds = [...myAssignedMemberIds, req.user.employeeId];
        query.employeeId = { $in: allowedIds };
      }

      const employees = await Employee.find(query, {
        'name': 1,
        'employeeId': 1,
        'email': 1,
        'department': 1,
        'designation': 1,
        'position': 1,
        'division': 1,
        'branch': 1,
        'bankName': 1,
        'bankAccount': 1,
        'ifsc': 1,
        'location': 1,
        'dateOfJoining': 1,
        'dateOfBirth': 1,
        'mobileNo': 1,
        '_id': 1,
        'status': 1
      }).sort({ name: 1 });
      return res.json(employees);
    }

    // Limited access for users with timesheet_access only
    if (req.user.permissions?.includes('timesheet_access')) {
      const employees = await Employee.find(query, {
        'name': 1,
        'employeeId': 1,
        'email': 1,
        'department': 1,
        'designation': 1,
        'position': 1,
        'bankName': 1,
        'bankAccount': 1,
        'ifsc': 1,
        'branch': 1,
        '_id': 1,
        'status': 1
      }).sort({ name: 1 });
      return res.json(employees);
    }

    // Otherwise deny
    return res.status(403).json({ message: 'Access denied' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current user's employee profile
router.get('/me', auth, async (req, res) => {
  try {
    const empId = req.user.employeeId;
    if (!empId) return res.status(404).json({ message: 'Employee ID not linked' });
    const employee = await Employee.findOne({ employeeId: empId });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get employees for timesheet purposes only (limited data)
router.get('/timesheet/employees', auth, async (req, res) => {
  try {
    // Check if user has timesheet access
    if (!req.user.permissions?.includes('timesheet_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const role = String(req.user?.role || "").toLowerCase();
    const isAdmin = role === "admin" || role === "director" || role === "manager";
    const isPM = role === "projectmanager" || role === "project_manager" || role === "teamlead";
    const { allAssignedMemberIds, myAssignedMemberIds } = await getTeamManagementAssignmentSets(req.user?.employeeId);

    // Timesheet selection MUST only show Active employees
    let query = { status: 'Active' };

    if (isAdmin) {
      // Admin sees all Active employees
    } else if (isPM) {
      if (myAssignedMemberIds.length === 0) {
        return res.json([]);
      }
      query.employeeId = { $in: myAssignedMemberIds };
    } else {
      // Reporting Manager (unassigned employees)
      if (allAssignedMemberIds.length > 0) {
        query.employeeId = { $nin: allAssignedMemberIds };
      }
    }

    // Return only basic employee info needed for timesheets
    const employees = await Employee.find(query, {
      'name': 1,
      'employeeId': 1,
      'email': 1,
      'department': 1,
      'designation': 1,
      'position': 1,
      'division': 1,
      'location': 1,
      '_id': 1
    }).sort({ name: 1 });

    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get employee by ID - restricted based on user permissions
router.get('/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const roleLower = String(req.user.role || '').toLowerCase();
    const isHRAdmin = req.user.permissions?.includes('employee_access') ||
                      ['admin', 'director', 'manager'].includes(roleLower);

    if (isHRAdmin) {
      return res.json(employee);
    }

    const isSelf = employee.employeeId === req.user.employeeId;
    if (isSelf) {
      return res.json(employee);
    }

    const isPM = ['projectmanager', 'project_manager', 'teamlead'].includes(roleLower);
    if (isPM) {
      const { myAssignedMemberIds } = await getTeamManagementAssignmentSets(req.user.employeeId);
      if (myAssignedMemberIds.includes(employee.employeeId)) {
        const limitedEmployee = {
          _id: employee._id,
          name: employee.name,
          employeeId: employee.employeeId,
          email: employee.email,
          department: employee.department,
          designation: employee.designation || employee.position || employee.role,
          position: employee.position
        };
        return res.json(limitedEmployee);
      }
    }

    if (req.user.permissions?.includes('timesheet_access')) {
      const limitedEmployee = {
        _id: employee._id,
        name: employee.name,
        employeeId: employee.employeeId,
        email: employee.email,
        department: employee.department,
        designation: employee.designation || employee.position || employee.role,
        position: employee.position
      };
      return res.json(limitedEmployee);
    }

    return res.status(403).json({ message: 'Access denied' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new employee - requires admin permissions
router.post('/', auth, validateEmployeeCreate, async (req, res) => {
  try {
    const roleLower = String(req.user.role || '').toLowerCase();
    const hasAccess = req.user.permissions?.includes('user_access') ||
                      req.user.permissions?.includes('employee_access') ||
                      ['admin', 'hr', 'director', 'manager'].includes(roleLower);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const body = req.body || {};
    const data = { ...body };
    if (!data.name && data.employeename) data.name = data.employeename;
    if (!data.employeename && data.name) data.employeename = data.name;
    if (!data.mobileNo && (data.contactNumber || data.phone)) data.mobileNo = data.contactNumber || data.phone;
    if (!data.contactNumber && data.mobileNo) data.contactNumber = data.mobileNo;
    if (!data.dateOfBirth && data.dob) data.dateOfBirth = data.dob;
    if (!data.dateOfJoining && (data.hireDate || data.dateofjoin)) data.dateOfJoining = data.hireDate || data.dateofjoin;
    if (!data.emergencyMobileNo && (data.emergencyMobile || data.emergencyContact)) data.emergencyMobileNo = data.emergencyMobile || data.emergencyContact;
    if (!data.emergencyContact && (data.emergencyMobileNo || data.emergencyMobile)) data.emergencyContact = data.emergencyMobileNo || data.emergencyMobile;
    if (!data.highestQualification && data.qualification) data.highestQualification = data.qualification;
    if (!data.qualification && data.highestQualification) data.qualification = data.highestQualification;
    if (!data.designation && (data.position || data.role)) data.designation = data.position || data.role;
    if (!data.position && data.role) data.position = data.role;
    if (!data.position && data.designation) data.position = data.designation;

    // Check if email is already in use by another user
    if (data.email && data.email !== req.user.email) {
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already in use by another user' });
      }
    }

    const permAddrParts = [
      data.permanentAddressLine,
      data.permanentCity,
      data.permanentState,
      data.permanentPincode
    ].filter(Boolean);
    const currAddrParts = [
      data.currentAddressLine,
      data.currentCity,
      data.currentState,
      data.currentPincode
    ].filter(Boolean);
    if (!data.permanentAddress && permAddrParts.length) {
      data.permanentAddress = permAddrParts.join(', ');
    }
    if (!data.currentAddress && currAddrParts.length) {
      data.currentAddress = currAddrParts.join(', ');
    }
    if (Array.isArray(data.previousOrganizations)) {
      data.previousOrganizations = data.previousOrganizations.map(org => {
        const o = { ...org };
        if (!o.designation && (o.position || o.role)) o.designation = o.position || o.role;
        if (!o.position && o.role) o.position = o.role;
        if (!o.position && o.designation) o.position = o.designation;
        delete o.role;
        return o;
      });
    }
    delete data.role;

    const employee = new Employee(data);
    const savedEmployee = await employee.save();
    
    // Auto-sync compensation if name matches
    await syncCompensationToEmployeeAndPayroll(savedEmployee);

    res.status(201).json(savedEmployee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update current user's own employee profile (self-service)
router.put('/me', auth, validateEmployeeUpdate, async (req, res) => {
  try {
    const empId = req.user.employeeId;
    if (!empId) return res.status(404).json({ message: 'Employee ID not linked' });

    const body = req.body || {};
    let data = { ...body };

    const roleLower = String(req.user.role || '').toLowerCase();
    const isHRAdmin = ['admin', 'hr', 'director', 'manager'].includes(roleLower) || req.user.permissions?.includes('employee_access');

    if (!isHRAdmin) {
      const allowedFields = [
        'name', 'employeename', 'mobileNo', 'contactNumber', 'phone',
        'dateOfBirth', 'dob', 'emergencyMobileNo', 'emergencyMobile',
        'emergencyContact', 'highestQualification', 'qualification',
        'permanentAddressLine', 'permanentCity', 'permanentState', 'permanentPincode',
        'currentAddressLine', 'currentCity', 'currentState', 'currentPincode',
        'permanentAddress', 'currentAddress', 'previousOrganizations', 'avatar',
        'bankName', 'bankAccount', 'ifsc', 'branch', 'personalEmail'
      ];
      const filteredData = {};
      for (const key of allowedFields) {
        if (body[key] !== undefined) {
          filteredData[key] = body[key];
        }
      }
      data = filteredData;
    }
    delete data.promotionEffectiveDate;
    delete data.promotionRemarks;
    if (!data.name && data.employeename) data.name = data.employeename;
    if (!data.employeename && data.name) data.employeename = data.name;
    if (!data.mobileNo && (data.contactNumber || data.phone)) data.mobileNo = data.contactNumber || data.phone;
    if (!data.contactNumber && data.mobileNo) data.contactNumber = data.mobileNo;
    if (!data.dateOfBirth && data.dob) data.dateOfBirth = data.dob;
    if (!data.dateOfJoining && (data.hireDate || data.dateofjoin)) data.dateOfJoining = data.hireDate || data.dateofjoin;
    if (!data.emergencyMobileNo && (data.emergencyMobile || data.emergencyContact)) data.emergencyMobileNo = data.emergencyMobile || data.emergencyContact;
    if (!data.emergencyContact && (data.emergencyMobileNo || data.emergencyMobile)) data.emergencyContact = data.emergencyMobileNo || data.emergencyMobile;
    if (!data.highestQualification && data.qualification) data.highestQualification = data.qualification;
    if (!data.qualification && data.highestQualification) data.qualification = data.highestQualification;
    if (!data.designation && (data.position || data.role)) data.designation = data.position || data.role;
    if (!data.position && data.role) data.position = data.role;
    if (!data.position && data.designation) data.position = data.designation;

    // Check if email is already in use by another user
    if (data.email && data.email !== req.user.email) {
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already in use by another user' });
      }
    }

    const permAddrParts = [
      data.permanentAddressLine,
      data.permanentCity,
      data.permanentState,
      data.permanentPincode
    ].filter(Boolean);
    const currAddrParts = [
      data.currentAddressLine,
      data.currentCity,
      data.currentState,
      data.currentPincode
    ].filter(Boolean);
    if (!data.permanentAddress && permAddrParts.length) {
      data.permanentAddress = permAddrParts.join(', ');
    }
    if (!data.currentAddress && currAddrParts.length) {
      data.currentAddress = currAddrParts.join(', ');
    }
    if (Array.isArray(data.previousOrganizations)) {
      data.previousOrganizations = data.previousOrganizations.map(org => {
        const o = { ...org };
        if (!o.designation && (o.position || o.role)) o.designation = o.position || o.role;
        if (!o.position && o.role) o.position = o.role;
        if (!o.position && o.designation) o.position = o.designation;
        delete o.role;
        return o;
      });
    }
    delete data.role;

    const employee = await Employee.findOneAndUpdate(
      { employeeId: empId },
      data,
      { new: true, runValidators: true }
    );
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    if (typeof employee.bankAccount === "string" && employee.bankAccount.trim()) {
      await HolidayAllowance.updateMany(
        { employeeId: employee.employeeId },
        { $set: { accountNumber: employee.bankAccount.trim() } }
      );
    }

    // Sync email change to User record if it exists
    if (data.email && data.email !== req.user.email) {
      await User.findByIdAndUpdate(req.user._id, { email: data.email });
    }

    res.json(employee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update employee - requires admin permissions
router.put('/:id', auth, validateEmployeeUpdate, async (req, res) => {
  try {
    const roleLower = String(req.user.role || '').toLowerCase();
    const hasAccess = req.user.permissions?.includes('user_access') ||
                      req.user.permissions?.includes('employee_access') ||
                      ['admin', 'hr', 'director', 'manager'].includes(roleLower);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const body = req.body || {};
    const data = { ...body };
    const promotionEffectiveDateRaw = data.promotionEffectiveDate;
    const promotionRemarksRaw = data.promotionRemarks;
    delete data.promotionEffectiveDate;
    delete data.promotionRemarks;
    if (!data.name && data.employeename) data.name = data.employeename;
    if (!data.employeename && data.name) data.employeename = data.name;
    if (!data.mobileNo && (data.contactNumber || data.phone)) data.mobileNo = data.contactNumber || data.phone;
    if (!data.contactNumber && data.mobileNo) data.contactNumber = data.mobileNo;
    if (!data.dateOfBirth && data.dob) data.dateOfBirth = data.dob;
    if (!data.dateOfJoining && (data.hireDate || data.dateofjoin)) data.dateOfJoining = data.hireDate || data.dateofjoin;
    if (!data.emergencyMobileNo && (data.emergencyMobile || data.emergencyContact)) data.emergencyMobileNo = data.emergencyMobile || data.emergencyContact;
    if (!data.emergencyContact && (data.emergencyMobileNo || data.emergencyMobile)) data.emergencyContact = data.emergencyMobileNo || data.emergencyMobile;
    if (!data.highestQualification && data.qualification) data.highestQualification = data.qualification;
    if (!data.qualification && data.highestQualification) data.qualification = data.highestQualification;
    if (!data.designation && (data.position || data.role)) data.designation = data.position || data.role;
    if (!data.position && data.role) data.position = data.role;
    if (!data.position && data.designation) data.position = data.designation;
    const permAddrParts = [
      data.permanentAddressLine,
      data.permanentCity,
      data.permanentState,
      data.permanentPincode
    ].filter(Boolean);
    const currAddrParts = [
      data.currentAddressLine,
      data.currentCity,
      data.currentState,
      data.currentPincode
    ].filter(Boolean);
    if (!data.permanentAddress && permAddrParts.length) {
      data.permanentAddress = permAddrParts.join(', ');
    }
    if (!data.currentAddress && currAddrParts.length) {
      data.currentAddress = currAddrParts.join(', ');
    }
    if (Array.isArray(data.previousOrganizations)) {
      data.previousOrganizations = data.previousOrganizations.map(org => {
        const o = { ...org };
        if (!o.designation && (o.position || o.role)) o.designation = o.position || o.role;
        if (!o.position && o.role) o.position = o.role;
        if (!o.position && o.designation) o.position = o.designation;
        delete o.role;
        return o;
      });
    }
    delete data.role;

    const oldEmployee = await Employee.findById(req.params.id);
    if (!oldEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if email is already in use by another user
    if (data.email && data.email !== oldEmployee.email) {
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already in use by another user' });
      }
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    if (employee) {
      await syncCompensationToEmployeeAndPayroll(employee);
    }

    if (employee) {
      const oldDesignation = String(oldEmployee.designation || oldEmployee.position || oldEmployee.role || '').trim();
      const newDesignation = String(employee.designation || employee.position || '').trim();
      const oldNorm = oldDesignation.toLowerCase();
      const newNorm = newDesignation.toLowerCase();

      if (newDesignation && oldNorm !== newNorm) {
        const actor =
          String(req.user?.name || '').trim() ||
          String(req.user?.employeeId || '').trim() ||
          String(req.user?.email || '').trim() ||
          'Unknown';

        const effectiveDateCandidate = promotionEffectiveDateRaw ? new Date(promotionEffectiveDateRaw) : null;
        const effectiveDate = effectiveDateCandidate && !Number.isNaN(effectiveDateCandidate.getTime())
          ? effectiveDateCandidate
          : new Date();

        const promotionRemarks = String(promotionRemarksRaw || '').trim();

        await PromotionHistory.create({
          employeeId: String(employee.employeeId || '').trim(),
          employeeName: String(employee.name || employee.employeename || '').trim() || String(oldEmployee.name || oldEmployee.employeename || '').trim(),
          oldDesignation: oldDesignation || 'Unknown',
          newDesignation,
          effectiveDate,
          remarks: promotionRemarks,
          promotedBy: actor,
          division: String(employee.division || '').trim(),
          status: 'Approved',
          approvedBy: actor,
          approvedAt: new Date()
        });
      }
    }

    if (employee && typeof employee.bankAccount === "string" && employee.bankAccount.trim()) {
      await HolidayAllowance.updateMany(
        { employeeId: employee.employeeId },
        { $set: { accountNumber: employee.bankAccount.trim() } }
      );
    }

    // Sync email/employeeId change to User record
    const emailChanged = data.email && data.email !== oldEmployee.email;
    const empIdChanged = data.employeeId && data.employeeId !== oldEmployee.employeeId;

    if (emailChanged || empIdChanged) {
      // Try to find user by OLD employeeId first
      let user = await User.findOne({ employeeId: oldEmployee.employeeId });

      // If not found by employeeId, try by OLD email
      if (!user) {
        user = await User.findOne({ email: oldEmployee.email });
      }

      if (user) {
        if (emailChanged) user.email = data.email;
        if (empIdChanged) user.employeeId = data.employeeId;
        // Ensure link
        if (!user.employeeId) user.employeeId = data.employeeId || oldEmployee.employeeId;

        await user.save();
      }
    }

    res.json(employee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete employee - requires admin permissions
router.delete('/:id', auth, async (req, res) => {
  try {
    const roleLower = String(req.user.role || '').toLowerCase();
    const hasAccess = req.user.permissions?.includes('user_access') ||
                      req.user.permissions?.includes('employee_access') ||
                      ['admin', 'hr', 'director', 'manager'].includes(roleLower);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
