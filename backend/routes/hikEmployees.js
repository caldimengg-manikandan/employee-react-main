const express = require("express");
const Employee = require("../models/Employee");
const auth = require("../middleware/auth");
const { hikPost } = require("../utils/hikvision");

const router = express.Router();

/**
 * 🔄 SYNC EMPLOYEES FROM HIKCENTRAL
 * Fetches employee data from HikCentral and syncs with local database
 */
router.post("/sync-employees", auth, async (req, res) => {
  try {
    const apiPath = "/artemis/api/pms/v1/person/list";
    
    const requestBody = {
      pageNo: 1,
      pageSize: 1000
    };

    const response = await hikPost(apiPath, requestBody);
    const hikEmployees = response?.data?.list || [];

    let syncedCount = 0;
    let updatedCount = 0;
    let errors = [];

    for (const hikEmployee of hikEmployees) {
      try {
        // Check if employee already exists
        const existingEmployee = await Employee.findOne({ 
          employeeId: hikEmployee.personId 
        });

        const employeeData = {
          employeeId: hikEmployee.personId,
          name: hikEmployee.personName || "Unknown",
          email: hikEmployee.email || `${hikEmployee.personId}@company.com`,
          phone: hikEmployee.phoneNo || "",
          department: hikEmployee.orgName || "Unassigned",
          position: hikEmployee.jobNo || "Staff",
          status: hikEmployee.status === 1 ? "active" : "inactive",
          gender: hikEmployee.gender === 1 ? "male" : hikEmployee.gender === 2 ? "female" : "other",
          dateOfBirth: hikEmployee.birthday || null,
          hireDate: hikEmployee.hireDate || new Date(),
          hikCentralId: hikEmployee.personId,
          lastSyncAt: new Date()
        };

        if (existingEmployee) {
          // Update existing employee
          await Employee.findByIdAndUpdate(existingEmployee._id, employeeData);
          updatedCount++;
        } else {
          // Create new employee
          await Employee.create(employeeData);
          syncedCount++;
        }
      } catch (error) {
        errors.push({
          employeeId: hikEmployee.personId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: "HikCentral Employee Sync Completed",
      synced: syncedCount,
      updated: updatedCount,
      total: hikEmployees.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("HikCentral Employee Sync Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to sync employees from HikCentral",
      error: error.message 
    });
  }
});

/**
 * 📋 GET EMPLOYEES FROM HIKCENTRAL (REAL-TIME)
 * Fetches current employee data directly from HikCentral without syncing
 */
router.get("/hik-employees", auth, async (req, res) => {
  try {
    const apiPath = "/artemis/api/pms/v1/person/list";
    const { pageNo = 1, pageSize = 100, department = "", status = "" } = req.query;
    
    const requestBody = {
      pageNo: parseInt(pageNo),
      pageSize: parseInt(pageSize),
      ...(department && { orgName: department }),
      ...(status && { status: status === "active" ? 1 : 0 })
    };

    const response = await hikPost(apiPath, requestBody);
    const hikEmployees = response?.data?.list || [];
    const total = response?.data?.total || 0;

    // Transform HikCentral data to match your employee schema
    const transformedEmployees = hikEmployees.map(emp => ({
      employeeId: emp.personId,
      name: emp.personName || "Unknown",
      email: emp.email || `${emp.personId}@company.com`,
      phone: emp.phoneNo || "",
      department: emp.orgName || "Unassigned",
      position: emp.jobNo || "Staff",
      status: emp.status === 1 ? "active" : "inactive",
      gender: emp.gender === 1 ? "male" : emp.gender === 2 ? "female" : "other",
      dateOfBirth: emp.birthday || null,
      hireDate: emp.hireDate || null,
      hikCentralId: emp.personId,
      lastSyncAt: new Date()
    }));

    res.json({
      success: true,
      employees: transformedEmployees,
      pagination: {
        pageNo: parseInt(pageNo),
        pageSize: parseInt(pageSize),
        total: total,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error) {
    console.error("HikCentral Employee Fetch Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch employees from HikCentral",
      error: error.message 
    });
  }
});

/**
 * 🔍 GET SINGLE EMPLOYEE FROM HIKCENTRAL
 * Fetches detailed information for a specific employee
 */
router.get("/hik-employees/:personId", auth, async (req, res) => {
  try {
    const { personId } = req.params;
    const apiPath = "/artemis/api/pms/v1/person/info";
    
    const requestBody = {
      personId: personId
    };

    const response = await hikPost(apiPath, requestBody);
    const hikEmployee = response?.data;

    if (!hikEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found in HikCentral"
      });
    }

    const transformedEmployee = {
      employeeId: hikEmployee.personId,
      name: hikEmployee.personName || "Unknown",
      email: hikEmployee.email || `${hikEmployee.personId}@company.com`,
      phone: hikEmployee.phoneNo || "",
      department: hikEmployee.orgName || "Unassigned",
      position: hikEmployee.jobNo || "Staff",
      status: hikEmployee.status === 1 ? "active" : "inactive",
      gender: hikEmployee.gender === 1 ? "male" : hikEmployee.gender === 2 ? "female" : "other",
      dateOfBirth: hikEmployee.birthday || null,
      hireDate: hikEmployee.hireDate || null,
      certificateType: hikEmployee.certificateType,
      certificateNo: hikEmployee.certificateNo,
      address: hikEmployee.address || "",
      hikCentralId: hikEmployee.personId,
      lastSyncAt: new Date()
    };

    res.json({
      success: true,
      employee: transformedEmployee
    });

  } catch (error) {
    console.error("HikCentral Single Employee Fetch Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch employee from HikCentral",
      error: error.message 
    });
  }
});

module.exports = router;