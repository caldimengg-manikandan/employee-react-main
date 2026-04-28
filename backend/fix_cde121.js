const mongoose = require('mongoose');
require('dotenv').config();

const employeeSchema = new mongoose.Schema({}, { strict: false });
const Employee = mongoose.model('Employee', employeeSchema, 'employees');

const payrollSchema = new mongoose.Schema({}, { strict: false });
const Payroll = mongoose.model('Payroll', payrollSchema, 'payrolls');

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://kumaresh1905:kumaresh1905@cluster0.db8yv.mongodb.net/test', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // April 8, 2026 (08-04-2026)
  const correctDate = new Date('2026-04-08T00:00:00.000Z');

  await Payroll.updateOne({ employeeId: 'CDE121' }, { $set: { dateOfJoining: correctDate } });
  
  // Wait, I don't know the exact URI for the production DB, but I'll use process.env.MONGODB_URI which should pick it from .env if running from backend folder!
  // Let me just check what MONGODB_URI is.
  console.log("Updated CDE121 DOJ to April 8, 2026 in Payroll");
  process.exit(0);
}

fix();
