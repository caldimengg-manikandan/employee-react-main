const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Assuming MonthlyPayroll model exists
const MonthlyPayroll = mongoose.model('MonthlyPayroll', new mongoose.Schema({}, { strict: false }));

async function checkPayroll() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employee-management');
    console.log('Connected to MongoDB');

    const ids = ['CDE092', 'CDE100'];
    const payrolls = await MonthlyPayroll.find({ employeeId: { $in: ids }, month: 1, year: 2026 });

    console.log('--- Payroll Records (Jan 2026) ---');
    payrolls.forEach(p => {
      console.log(`ID: ${p.employeeId}, Month: ${p.month}, Year: ${p.year}, Location: ${p.location}`);
    });

    await mongoose.disconnect();
    console.log('Disconnected');
  } catch (err) {
    console.error(err);
  }
}

checkPayroll();
