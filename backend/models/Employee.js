// models/Employee.js
const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  location: String,
  dateOfBirth: Date,
  bloodGroup: String,
  position: String,
  division: String,
  dateOfJoining: Date,
  experience: String,
  qualification: String,
  mobileNo: String,
  guardianName: String,
  emergencyMobileNo: String,
  pan: String,
  aadhaar: String,
  address: String,
  email: String,
  bankName: String,
  bankAccount: String,
  branch: String,
  uan: String,
  basicDA: Number,
  hra: Number,
  specialAllowance: Number,
  gratuity: Number,
  lop: Number,
  pf: Number,
  esi: Number,
  tax: Number,
  professionalTax: Number,
  loanDeduction: Number,
  totalEarnings: Number,
  totalDeductions: Number,
  netSalary: Number,
  ctc: Number,
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended'],
    default: 'Active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Employee', employeeSchema);