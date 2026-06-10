const mongoose = require('mongoose');
const { calcBalanceForEmployee, monthsBetween } = require('./services/leaveService');
const Employee = require('./models/Employee');
const LeaveBalance = require('./models/LeaveBalance');
const LeaveApplication = require('./models/LeaveApplication');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee-management');
  console.log('Connected');
  
  const employees = await Employee.find({ status: 'Active' }).sort({ name: 1 }).lean();
  const empIds = employees.map(e => e.employeeId).filter(Boolean);
  const calcDate = new Date();
  const currentYear = calcDate.getFullYear();
  
  const approvals = await LeaveApplication.find({ 
    employeeId: { $in: empIds }, 
    status: 'Approved',
    startDate: { 
      $gte: new Date(currentYear, 0, 1),
      $lte: new Date(currentYear, 11, 31, 23, 59, 59)
    }
  }).lean();
  
  const storedBalances = await LeaveBalance.find({ employeeId: { $in: empIds } }).lean();
  
  const usedMap = {};
  for (const rec of approvals) {
    if (!usedMap[rec.employeeId]) usedMap[rec.employeeId] = [];
    usedMap[rec.employeeId].push(rec);
  }
  
  const storedBalancesMap = {};
  for (const bal of storedBalances) {
    storedBalancesMap[bal.employeeId] = bal;
  }
  
  try {
    const result = employees.map(emp => {
      const stored = storedBalancesMap[emp.employeeId];
      const storedYear = stored ? (stored.year || new Date(stored.updatedAt || stored.createdAt).getFullYear()) : 0;
      
      const systemCalc = calcBalanceForEmployee(emp, usedMap[emp.employeeId] || [], calcDate);
      
      if (stored && stored.balances && storedYear === currentYear) {
        return {
          employeeId: emp.employeeId,
          monthsOfService: monthsBetween(emp.dateOfJoining || emp.hireDate || emp.createdAt, calcDate),
          balances: stored.balances
        };
      }
      return {
        employeeId: emp.employeeId,
        monthsOfService: systemCalc.monthsOfService,
        balances: systemCalc.balances
      };
    });
    console.log('Success, processed', result.length);
  } catch (err) {
    console.error('ERROR OCCURRED:', err);
  }
  process.exit(0);
}

test();
