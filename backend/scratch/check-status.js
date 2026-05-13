const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Employee = require('../models/Employee');
const LeaveBalance = require('../models/LeaveBalance');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const empIds = ['CDE004', 'CDE005', 'CDE007'];
    for (const id of empIds) {
      const emp = await Employee.findOne({ employeeId: id });
      const balance = await LeaveBalance.findOne({ employeeId: id });
      
      console.log(`\nEmployee: ${id}`);
      console.log(`Status: ${emp ? emp.status : 'NOT FOUND'}`);
      console.log(`Designation: ${emp ? emp.designation : 'N/A'}`);
      console.log(`DOJ: ${emp ? emp.dateOfJoining : 'N/A'}`);
      console.log(`Balance Doc: ${balance ? 'FOUND' : 'NOT FOUND'}`);
      if (balance) {
        console.log(`Last Allocation: ${balance.lastAllocationMonth}/${balance.lastAllocationYear}`);
        console.log(`PL Balance: ${balance.balances.privilege.balance}`);
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
