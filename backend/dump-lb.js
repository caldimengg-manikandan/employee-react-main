const mongoose = require('mongoose');
const LeaveBalance = require('./models/LeaveBalance');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/employee-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  const lb = await LeaveBalance.findOne({ employeeId: 'CDE096' }).lean();
  console.log(JSON.stringify(lb, null, 2));
  process.exit(0);
})
.catch(err => {
  console.error(err);
  process.exit(1);
});
