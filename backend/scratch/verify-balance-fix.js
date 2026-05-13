
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Employee = require('../models/Employee');
const LeaveApplication = require('../models/LeaveApplication');
const LeaveBalance = require('../models/LeaveBalance');
const { calcBalanceForEmployee } = require('../services/leaveService');

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const employeeId = 'CDE110';
  const emp = await Employee.findOne({ employeeId });
  if (!emp) {
    console.log('Employee not found');
    process.exit(1);
  }

  const calcDate = new Date('2026-05-11'); // Today in user's context
  
  // Simulate the new route logic
  const approvals = await LeaveApplication.find({ 
    employeeId, 
    status: 'Approved',
    startDate: { 
      $gte: new Date(calcDate.getFullYear(), 0, 1),
      $lte: new Date(calcDate.getFullYear(), 11, 31, 23, 59, 59)
    }
  }).lean();

  console.log(`Found ${approvals.length} approved leaves for ${employeeId} in ${calcDate.getFullYear()}`);
  approvals.forEach(l => console.log(`- Start: ${l.startDate}, End: ${l.endDate}, Days: ${l.totalDays}, Type: ${l.leaveType}`));

  const systemCalc = calcBalanceForEmployee(emp, approvals, calcDate);
  
  console.log('\n--- Balance Calculation (Current View) ---');
  console.log('Privilege Allocated:', systemCalc.balances.privilege.allocated);
  console.log('Privilege Used:', systemCalc.balances.privilege.used);
  console.log('Privilege Balance:', systemCalc.balances.privilege.balance);

  // Test historical view (e.g. April 30)
  const historicalDate = new Date('2026-04-30');
  const historicalApprovals = approvals.filter(l => new Date(l.startDate).getFullYear() === historicalDate.getFullYear());
  const historicalCalc = calcBalanceForEmployee(emp, historicalApprovals, historicalDate);

  console.log('\n--- Balance Calculation (Historical View: April 30) ---');
  console.log('Privilege Allocated:', historicalCalc.balances.privilege.allocated);
  console.log('Privilege Used:', historicalCalc.balances.privilege.used);
  console.log('Privilege Balance:', historicalCalc.balances.privilege.balance);

  await mongoose.connection.close();
}

verify();
