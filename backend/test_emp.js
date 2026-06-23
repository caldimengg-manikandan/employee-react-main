require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Employee = require('./models/Employee');

connectDB().then(async () => {
  const emps = await Employee.find({ employeeId: { $in: ['CDE088', 'CDE100', 'CDE129', 'CDE130', 'CDE131', 'CDE133', 'CDE134', 'CDE137'] } });
  console.log('Found Employees Count:', emps.length);
  emps.forEach(e => console.log(e.employeeId, e.status));
  process.exit(0);
});
