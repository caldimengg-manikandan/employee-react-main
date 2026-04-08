const Employee = require('../models/Employee');

/**
 * Middleware to check if the current user represents an Active employee.
 * Functional modules (Timesheets, Leaves, Appraisals) should block 
 * state-modifying actions if the employee is not 'Active'.
 */
const checkActiveEmployee = async (req, res, next) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.status(403).json({ message: 'Employee ID not linked to user' });
    }

    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee record not found' });
    }

    if (employee.status !== 'Active') {
      return res.status(403).json({ 
        message: 'This employee is inactive and cannot be used for this action.' 
      });
    }

    // Attach employee to request for further use if needed
    req.employee = employee;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error verifying employee status', error: error.message });
  }
};

module.exports = checkActiveEmployee;
