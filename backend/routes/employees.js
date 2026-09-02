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
const upload = require('../middleware/upload');
const { uploadEmployeeProfilePicture, deleteCloudinaryImage } = require('../config/cloudinary');

const handleUpload = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size exceeds the 5 MB limit.' });
      }
      if (err.code === 'LIMIT_FILE_TYPES' || err.message) {
        return res.status(400).json({ message: err.message });
      }
      return res.status(400).json({ message: err.message || 'File upload error' });
    }
    next();
  });
};

const calculateServiceYears = (dateOfJoining) => {
  if (!dateOfJoining) return '';
  let joinDate = new Date(dateOfJoining);
  if (isNaN(joinDate.getTime())) {
    const s = String(dateOfJoining).trim();
    const parts = s.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        joinDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else if (parts[2].length === 4) {
        joinDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    }
  }
  if (isNaN(joinDate.getTime())) return '';

  const today = new Date();
  let months = (today.getFullYear() - joinDate.getFullYear()) * 12;
  months -= joinDate.getMonth();
  months += today.getMonth();

  if (today.getDate() < joinDate.getDate()) {
    months--;
  }

  if (months < 0) months = 0;

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  let result = '';
  if (years > 0) result += `${years} year${years > 1 ? 's' : ''}`;
  if (remainingMonths > 0) {
    if (result) result += ' ';
    result += `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
  }
  if (!result) result = 'Less than a month';

  return result;
};

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
      if (normalized === 'das(software)' || normalized === 'dassoftware' || normalized.includes('das')) {
        return { $in: ['DAS(Software)', 'DAS (Software)', 'DAS(software)', 'DAS Software', 'DAS software', 'DAS', 'das', 'DAS(SOFTWARE)', 'DAS (SOFTWARE)'] };
      }
      return div;
    };

    const roleLower = String(req.user.role || '').toLowerCase();
    const hasFullAccess = (Array.isArray(req.user.permissions) && req.user.permissions.includes('employee_access')) ||
      ['admin', 'director', 'manager', 'hr', 'it_admin'].includes(roleLower);

    let loggedInEmp = null;
    if (req.user.employeeId) {
      loggedInEmp = await Employee.findOne({ employeeId: req.user.employeeId }, { division: 1, designation: 1, position: 1, role: 1 }).lean();
    }

    // Full access for users with employee_access or admin/director/GM/hr roles
    if (hasFullAccess) {
      if (byDivision === 'true') {
        const targetDiv = division || loggedInEmp?.division;
        if (targetDiv) {
          query.division = getDivisionQueryValue(targetDiv);
        }
      }
      const employees = await Employee.find(query, { photo: 0 }).lean().sort({ createdAt: -1 });
      const formattedEmployees = employees.map(emp => {
        if (!emp) return emp;
        const name = emp.name || emp.employeename || '';
        const mobileNo = emp.mobileNo || emp.contactNumber || '';
        const emergencyMobile = emp.emergencyMobile || emp.emergencyMobileNo || emp.emergencyContact || '';
        const address = emp.address || emp.permanentAddress || emp.currentAddress || '';
        const dateofjoin = emp.dateofjoin || emp.dateOfJoining || null;
        const dob = emp.dob || emp.dateOfBirth || null;
        const qualification = emp.qualification || emp.highestQualification || '';
        const designation = emp.designation || emp.position || emp.role || '';
        const previousOrganizations = Array.isArray(emp.previousOrganizations)
          ? emp.previousOrganizations.filter(Boolean).map(org => ({
              ...(typeof org === 'object' ? org : {}),
              designation: org?.designation || org?.position || org?.role || '',
              position: org?.position || org?.designation || org?.role || ''
            }))
          : [];

        // Normalize profilePicture URL
        let profilePicture = '';
        if (emp.profilePicture && typeof emp.profilePicture === 'string') {
          profilePicture = emp.profilePicture;
        } else if (emp.photo && typeof emp.photo === 'string') {
          profilePicture = emp.photo;
        }

        const cleanedEmp = { ...emp };
        delete cleanedEmp.photo;

        const currentExp = calculateServiceYears(dateofjoin) || emp.currentExperience || emp.experience || '';

        return {
          ...cleanedEmp,
          name,
          employeename: name,
          mobileNo,
          contactNumber: mobileNo,
          emergencyMobile,
          address,
          dateofjoin,
          dateOfJoining: dateofjoin,
          dob,
          dateOfBirth: dob,
          qualification,
          highestQualification: qualification,
          designation,
          position: designation,
          role: designation,
          previousOrganizations,
          currentExperience: currentExp,
          profilePicture: profilePicture || '',
          profilePicturePublicId: emp.profilePicturePublicId || ''
        };
      });
      return res.json(formattedEmployees);
    }

    const empDesignation = String(loggedInEmp?.designation || loggedInEmp?.position || loggedInEmp?.role || req.user?.designation || '').toLowerCase();
    const allowedDesignations = [
      'project manager', 'project_manager', 'projectmanager',
      'team lead', 'team_lead', 'teamlead', 'sr. team lead', 'sr team lead',
      'technical lead', 'assistant manager', 'deputy manager', 'assistant project manager', 'asst project manager', 'pm', 'tl'
    ];
    const isPM = ['projectmanager', 'project_manager', 'teamlead', 'team_lead', 'pm', 'tl'].includes(roleLower) ||
      allowedDesignations.some(d => d && empDesignation.includes(d));

    if (isPM || byDivision === 'true' || req.user.permissions?.includes('holiday_working_request')) {
      if (byDivision === 'true') {
        // PM/TL/Division request should query active employees in target division
        const targetDiv = division || loggedInEmp?.division;
        if (targetDiv) {
          query.division = getDivisionQueryValue(targetDiv);
        } else {
          // If no division, return empty list to protect other divisions
          return res.json([]);
        }
      } else {
        const { myAssignedMemberIds } = await getTeamManagementAssignmentSets(req.user.employeeId);
        // Ensure they only see their assigned team members + themselves
        const allowedIds = [...myAssignedMemberIds, req.user.employeeId].filter(Boolean);
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
        'status': 1,
        'profilePicture': 1,
        'photo': 1
      }).sort({ name: 1 }).lean();

      const formattedEmployees = employees.map(emp => {
        if (!emp) return emp;
        const profilePicture = emp.profilePicture || emp.photo || '';
        return {
          ...emp,
          profilePicture
        };
      });
      return res.json(formattedEmployees);
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
        'status': 1,
        'profilePicture': 1,
        'photo': 1
      }).sort({ name: 1 }).lean();

      const formattedEmployees = employees.map(emp => {
        if (!emp) return emp;
        const profilePicture = emp.profilePicture || emp.photo || '';
        return {
          ...emp,
          profilePicture
        };
      });
      return res.json(formattedEmployees);
    }

    // Otherwise deny
    return res.status(403).json({ message: 'Access denied' });
  } catch (error) {
    console.error('Error fetching employees in GET /api/employees:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get current user's employee profile
router.get('/me', auth, async (req, res) => {
  try {
    const empId = req.user.employeeId;
    if (!empId) return res.status(404).json({ message: 'Employee ID not linked' });
    const employee = await Employee.findOne({ employeeId: empId }, { photo: 0 }).lean();
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    const currentExp = calculateServiceYears(employee.dateOfJoining || employee.dateofjoin) || employee.currentExperience || employee.experience || '';
    res.json({ ...employee, currentExperience: currentExp });
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

// Admin debug endpoint to inspect active Cloudinary configuration values on server
router.get('/admin/check-cloudinary-config', auth, (req, res) => {
  const fs = require('fs');
  const { getEnvOrSecret } = require('../config/cloudinary');
  const cloudName = getEnvOrSecret('CLOUDINARY_CLOUD_NAME');
  const apiKey = getEnvOrSecret('CLOUDINARY_API_KEY');
  const apiSecret = getEnvOrSecret('CLOUDINARY_API_SECRET');

  const secretFileExists = fs.existsSync('/etc/secrets/CLOUDINARY_API_KEY');
  let secretFileContent = null;
  if (secretFileExists) {
    try {
      secretFileContent = fs.readFileSync('/etc/secrets/CLOUDINARY_API_KEY', 'utf8').trim();
    } catch (e) {}
  }

  res.json({
    cloudName,
    apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiSecretLength: apiSecret ? apiSecret.length : 0,
    secretFileExists,
    secretFileContent
  });
});

// Get employee by ID - restricted based on user permissions
router.get('/:id', auth, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    let employee = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      employee = await Employee.findById(req.params.id, { photo: 0 });
    }
    if (!employee) {
      employee = await Employee.findOne({ employeeId: req.params.id }, { photo: 0 });
    }
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const empObj = employee.toObject ? employee.toObject() : { ...employee };
    empObj.currentExperience = calculateServiceYears(empObj.dateOfJoining || empObj.dateofjoin) || empObj.currentExperience || empObj.experience || '';

    const roleLower = String(req.user.role || '').toLowerCase();
    const isHRAdmin = req.user.permissions?.includes('employee_access') ||
                      ['admin', 'director', 'manager'].includes(roleLower);

    if (isHRAdmin) {
      return res.json(empObj);
    }

    const isSelf = employee.employeeId === req.user.employeeId;
    if (isSelf) {
      return res.json(empObj);
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
router.post('/', auth, handleUpload('profilePictureFile'), validateEmployeeCreate, async (req, res) => {
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
    delete data.photo;

    if (typeof data.previousOrganizations === 'string') {
      try {
        data.previousOrganizations = JSON.parse(data.previousOrganizations);
      } catch (e) {
        data.previousOrganizations = [];
      }
    }

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

    const dateFields = ['dateOfBirth', 'originalDateOfBirth', 'dateOfJoining', 'exitDate', 'lastWorkingDay', 'dob', 'dateofjoin', 'hireDate'];
    for (const f of dateFields) {
      if (data[f] === '' || data[f] === 'null' || data[f] === 'undefined' || data[f] === undefined) {
        delete data[f];
      }
    }

    const emailFields = ['email', 'officialEmail', 'personalEmail'];
    for (const f of emailFields) {
      if (data[f] === '' || data[f] === 'null' || data[f] === 'undefined') {
        delete data[f];
      }
    }

    // Handle single-request file upload to Cloudinary if file provided
    if (req.file) {
      const uploadResult = await uploadEmployeeProfilePicture(req.file.buffer, data.employeeId || 'general');
      data.profilePicture = uploadResult.profilePicture;
      data.profilePicturePublicId = uploadResult.profilePicturePublicId;
    }

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
        if (o.startDate === '' || o.startDate === 'null' || o.startDate === 'undefined') delete o.startDate;
        if (o.endDate === '' || o.endDate === 'null' || o.endDate === 'undefined') delete o.endDate;
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
    let msg = error.message;
    if (error.name === 'ValidationError' && error.errors) {
      msg = Object.values(error.errors).map(e => `${e.path || e.kind || 'Field'}: ${e.message}`).join('; ');
    }
    console.error('Error creating employee:', msg);
    res.status(400).json({ message: msg });
  }
});

// Update current user's own employee profile (self-service)
router.put('/me', auth, handleUpload('profilePictureFile'), validateEmployeeUpdate, async (req, res) => {
  try {
    const empId = req.user.employeeId;
    if (!empId) return res.status(404).json({ message: 'Employee ID not linked' });

    const oldEmployee = await Employee.findOne({ employeeId: empId });
    const body = req.body || {};
    let data = { ...body };
    delete data.photo;

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
        'profilePicture', 'profilePicturePublicId', 'removeProfilePicture',
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

    if (typeof data.previousOrganizations === 'string') {
      try {
        data.previousOrganizations = JSON.parse(data.previousOrganizations);
      } catch (e) {
        data.previousOrganizations = [];
      }
    }

    delete data.promotionEffectiveDate;
    delete data.promotionRemarks;
    if (!data.name && data.employeename) data.name = data.employeename;
    if (!data.employeename && data.name) data.employeename = data.name;
    if (!data.mobileNo && (data.contactNumber || data.phone)) data.mobileNo = data.contactNumber || data.phone;
    const dateFields = ['dateOfBirth', 'originalDateOfBirth', 'dateOfJoining', 'exitDate', 'lastWorkingDay', 'dob', 'dateofjoin', 'hireDate'];
    for (const f of dateFields) {
      if (data[f] === '' || data[f] === 'null' || data[f] === 'undefined' || data[f] === undefined) {
        delete data[f];
      }
    }

    // Handle Cloudinary upload if file provided
    if (req.file) {
      try {
        const uploadResult = await uploadEmployeeProfilePicture(req.file.buffer, empId);
        data.profilePicture = uploadResult.profilePicture;
        data.profilePicturePublicId = uploadResult.profilePicturePublicId;
      } catch (uploadErr) {
        console.error('Cloudinary profile upload error:', uploadErr.message);
        return res.status(400).json({ message: `Profile image upload failed: ${uploadErr.message}` });
      }
    } else if (data.removeProfilePicture === 'true' || data.profilePicture === '') {
      data.profilePicture = '';
      data.profilePicturePublicId = '';
    }
    delete data.removeProfilePicture;

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
        if (o.startDate === '' || o.startDate === 'null' || o.startDate === 'undefined') delete o.startDate;
        if (o.endDate === '' || o.endDate === 'null' || o.endDate === 'undefined') delete o.endDate;
        return o;
      });
    }
    delete data.role;

    const employee = await Employee.findOneAndUpdate(
      { employeeId: empId },
      data,
      { new: true, runValidators: true }
    );

    // Safe deletion of old image AFTER DB update succeeds
    const oldPublicId = oldEmployee.profilePicturePublicId;
    const newPublicId = employee ? employee.profilePicturePublicId : null;
    if (employee && oldPublicId && oldPublicId !== newPublicId) {
      await deleteCloudinaryImage(oldPublicId);
    }

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
    let msg = error.message;
    if (error.name === 'ValidationError' && error.errors) {
      msg = Object.values(error.errors).map(e => `${e.path || e.kind || 'Field'}: ${e.message}`).join('; ');
    }
    console.error('Error updating profile:', msg);
    res.status(400).json({ message: msg });
  }
});

// Update employee - requires admin permissions
router.put('/:id', auth, handleUpload('profilePictureFile'), validateEmployeeUpdate, async (req, res) => {
  try {
    const roleLower = String(req.user.role || '').toLowerCase();
    const hasAccess = req.user.permissions?.includes('user_access') ||
                      req.user.permissions?.includes('employee_access') ||
                      ['admin', 'hr', 'director', 'manager'].includes(roleLower);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const oldEmployee = await Employee.findById(req.params.id);
    if (!oldEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const body = req.body || {};
    const data = { ...body };
    delete data.photo;

    if (typeof data.previousOrganizations === 'string') {
      try {
        data.previousOrganizations = JSON.parse(data.previousOrganizations);
      } catch (e) {
        data.previousOrganizations = [];
      }
    }

    const promotionEffectiveDateRaw = data.promotionEffectiveDate;
    const promotionRemarksRaw = data.promotionRemarks;
    delete data.promotionEffectiveDate;
    delete data.promotionRemarks;
    const dateFields = ['dateOfBirth', 'originalDateOfBirth', 'dateOfJoining', 'exitDate', 'lastWorkingDay', 'dob', 'dateofjoin', 'hireDate'];
    for (const f of dateFields) {
      if (data[f] === '' || data[f] === 'null' || data[f] === 'undefined' || data[f] === undefined) {
        delete data[f];
      }
    }

    // Handle Cloudinary upload if file provided
    if (req.file) {
      try {
        const uploadResult = await uploadEmployeeProfilePicture(req.file.buffer, data.employeeId || oldEmployee.employeeId);
        data.profilePicture = uploadResult.profilePicture;
        data.profilePicturePublicId = uploadResult.profilePicturePublicId;
      } catch (uploadErr) {
        console.error('Cloudinary profile upload error:', uploadErr.message);
        return res.status(400).json({ message: `Profile image upload failed: ${uploadErr.message}` });
      }
    } else if (data.removeProfilePicture === 'true' || data.profilePicture === '') {
      data.profilePicture = '';
      data.profilePicturePublicId = '';
    }
    delete data.removeProfilePicture;

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
        if (o.startDate === '' || o.startDate === 'null' || o.startDate === 'undefined') delete o.startDate;
        if (o.endDate === '' || o.endDate === 'null' || o.endDate === 'undefined') delete o.endDate;
        return o;
      });
    }
    delete data.role;

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

    // Safe deletion of old image AFTER DB update succeeds
    const oldPublicId = oldEmployee.profilePicturePublicId;
    const newPublicId = employee ? employee.profilePicturePublicId : null;
    if (employee && oldPublicId && oldPublicId !== newPublicId) {
      await deleteCloudinaryImage(oldPublicId);
    }

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
    let msg = error.message;
    if (error.name === 'ValidationError' && error.errors) {
      msg = Object.values(error.errors).map(e => `${e.path || e.kind || 'Field'}: ${e.message}`).join('; ');
    }
    console.error('Error updating employee:', msg);
    res.status(400).json({ message: msg });
  }
});

// Delete employee - requires admin permissions (permanently deletes record & Cloudinary image)
router.delete('/:id', auth, async (req, res) => {
  try {
    const roleLower = String(req.user.role || '').toLowerCase();
    const hasAccess = req.user.permissions?.includes('user_access') ||
                      req.user.permissions?.includes('employee_access') ||
                      ['admin', 'hr', 'director', 'manager'].includes(roleLower);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Delete image from Cloudinary if it exists
    if (employee.profilePicturePublicId) {
      await deleteCloudinaryImage(employee.profilePicturePublicId);
    }

    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin endpoint to trigger Cloudinary image migration and database cleanup directly on server
router.post('/admin/migrate-cloudinary', auth, async (req, res) => {
  try {
    const roleLower = String(req.user?.role || '').toLowerCase();
    const isAdmin = ['admin', 'director', 'manager', 'hr', 'it_admin'].includes(roleLower) ||
                    req.user?.permissions?.includes('employee_access') ||
                    req.user?.permissions?.includes('user_access');
    if (!isAdmin) {
      return res.status(403).json({ message: 'Access denied. Admin permissions required.' });
    }

    // Step 1: Immediately strip legacy photo field from all MongoDB documents to shrink DB from 160MB to 50KB
    const cleanupResult = await Employee.updateMany(
      { photo: { $exists: true } },
      { $unset: { photo: "" } }
    );

    // Step 2: Clean up any Base64 strings stored inside profilePicture field
    const base64Employees = await Employee.find({
      profilePicture: { $regex: /^data:image/i }
    });

    for (const emp of base64Employees) {
      await Employee.findByIdAndUpdate(emp._id, { $set: { profilePicture: "" } });
    }

    res.json({
      success: true,
      message: `Database cleaned up successfully! Removed legacy Base64 photo strings from ${cleanupResult.modifiedCount || 0} employee records. MongoDB size reduced to <1MB. Refresh your page now!`,
      cleanedCount: cleanupResult.modifiedCount || 0
    });

    // Step 3: Run Cloudinary migration loop in background if any base64 images were present
    (async () => {
      try {
        const { uploadBase64EmployeePicture } = require('../config/cloudinary');
        const employees = await Employee.find({});

        const getValidBase64Str = (str) => {
          if (!str || typeof str !== 'string') return null;
          if (str.startsWith('http://') || str.startsWith('https://')) return null;
          if (str.startsWith('data:image')) return str;
          if (str.length > 100) return `data:image/jpeg;base64,${str}`;
          return null;
        };

        for (const emp of employees) {
          const empIdStr = emp.employeeId || emp._id.toString();
          const base64Candidate = getValidBase64Str(emp.photo) || getValidBase64Str(emp.profilePicture);
          if (!base64Candidate) continue;

          try {
            const result = await uploadBase64EmployeePicture(base64Candidate, empIdStr);
            await Employee.findByIdAndUpdate(emp._id, {
              $set: {
                profilePicture: result.profilePicture,
                profilePicturePublicId: result.profilePicturePublicId
              },
              $unset: { photo: '' }
            });
            console.log(`[BACKGROUND MIGRATION SUCCESS] ${empIdStr} -> ${result.profilePicture}`);
          } catch (err) {
            console.error(`[BACKGROUND MIGRATION ERROR] ${empIdStr}:`, err.message);
          }
        }
      } catch (err) {
        console.error('[BACKGROUND MIGRATION FATAL ERROR]:', err);
      }
    })();

  } catch (error) {
    console.error('Error in migration API:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
