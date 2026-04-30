
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const SelfAppraisal = require('../models/SelfAppraisal');
const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Loan = require('../models/Loan');
const MonthlyPayroll = require('../models/MonthlyPayroll');

async function auditPayroll() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employees';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB:', uri);


    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in DB:', collections.map(c => c.name));

    const empIds = ['CDE015', 'CDE075', 'CDE004', 'CDE082', 'CDE013'];

    const db = mongoose.connection.db;
    const fySnapshotCollection = db.collection('payroll_FY24-25');

    const loansAll = await Loan.find({});
    console.log(`\nTotal Loan Records in DB: ${loansAll.length}`);
    if (loansAll.length > 0) {
      console.log('Sample Loan Names:', loansAll.slice(0, 5).map(l => l.employeeName).join(', '));
    }

    const mpAll = await MonthlyPayroll.find({});
    console.log(`Total Monthly Payroll Records in DB: ${mpAll.length}`);
    if (mpAll.length > 0) {
      console.log('Sample MP Names:', mpAll.slice(0, 5).map(l => l.employeeName).join(', '));
    }

    for (const empId of empIds) {
      console.log(`\n==========================================================`);
      console.log(`AUDIT FOR EMPLOYEE: ${empId}`);
      console.log(`==========================================================`);
      
      const employee = await Employee.findOne({ employeeId: empId });
      if (!employee) {
        console.log(`Employee ${empId} not found in database.`);
        continue;
      }
      console.log(`Name: ${employee.name}`);

      // 0. Check Snapshot
      const snapshot = await fySnapshotCollection.findOne({ 
        employeeId: { $regex: new RegExp(`^${empId}$`, 'i') } 
      });
      if (snapshot) {
        console.log(`\n[FY24-25 Snapshot]`);
        console.log(`Total Earnings (Gross in snapshot?): ${snapshot.totalEarnings}`);
        console.log(`Net Salary: ${snapshot.netSalary}`);
        console.log(`Basic: ${snapshot.basicDA}`);
      } else {
        console.log(`\n[FY24-25 Snapshot]: NOT FOUND`);
      }

      console.log(`Designation: ${employee.designation}`);

      // 1. Check Appraisal (Director Approval source)
      const appraisal = await SelfAppraisal.findOne({ 
        $or: [
          { employeeId: employee._id },
          { empId: empId }
        ]
      }).sort({ createdAt: -1 });

      if (appraisal) {
        console.log(`\n[Director Approval / Appraisal Table]`);
        console.log(`Status: ${appraisal.status}`);
        console.log(`Year: ${appraisal.year}`);
        console.log(`Increment %: ${appraisal.incrementPercentage}`);
        console.log(`Correction %: ${appraisal.incrementCorrectionPercentage}`);
        console.log(`Total Increment %: ${(appraisal.incrementPercentage || 0) + (appraisal.incrementCorrectionPercentage || 0)}%`);
        console.log(`Revised Salary (Gross): ${appraisal.revisedSalary}`);
        console.log(`Current Salary Snapshot: ${appraisal.currentSalarySnapshot}`);
        
        if (appraisal.releaseSalarySnapshot) {
          console.log(`Release Salary Snapshot (Current):`, JSON.stringify(appraisal.releaseSalarySnapshot, null, 2));
        }
        if (appraisal.releaseRevisedSnapshot) {
          console.log(`Release Revised Snapshot (Revised):`, JSON.stringify(appraisal.releaseRevisedSnapshot, null, 2));
        }
      } else {
        console.log(`\n[Appraisal Table]: NOT FOUND`);
      }

      // 2. Check Production Payroll
      const payroll = await Payroll.findOne({ employeeId: { $regex: new RegExp(`^${empId}$`, 'i') } });
      if (payroll) {
        console.log(`\n[Production Payroll Table]`);
        console.log(`Gross Earnings: ${payroll.totalEarnings}`);
        console.log(`Basic: ${payroll.basicDA}`);
        console.log(`HRA: ${payroll.hra}`);
        console.log(`Special Allowance: ${payroll.specialAllowance}`);
        console.log(`Total Deductions: ${payroll.totalDeductions}`);
        console.log(`Net Salary: ${payroll.netSalary}`);
        console.log(`CTC: ${payroll.ctc}`);
        console.log(`Volunteer PF: ${payroll.volunteerPF || 0}`);
      } else {
        console.log(`\n[Production Payroll Table]: NOT FOUND`);
      }

      // 3. Check Loans (Search by empId and Name)
      const loans = await Loan.find({ 
        $or: [
          { employeeId: empId },
          { employeeName: { $regex: new RegExp(employee.name, 'i') } }
        ]
      });
      if (loans.length > 0) {
        console.log(`\n[Loan Records]`);
        loans.forEach(loan => {
          console.log(JSON.stringify(loan, null, 2));
        });
      } else {
        console.log(`\n[Loan Records]: NONE FOUND`);
      }

      // 4. Check Recent Monthly Payroll (Search by empId and Name)
      const monthlyPayrolls = await MonthlyPayroll.find({ 
        $or: [
          { employeeId: empId },
          { employeeName: { $regex: new RegExp(employee.name, 'i') } }
        ]
      }).sort({ salaryMonth: -1 }).limit(3);

      if (monthlyPayrolls.length > 0) {
        console.log(`\n[Monthly Payroll Records]`);
        monthlyPayrolls.forEach(mp => {
           console.log(`- Month: ${mp.salaryMonth}, Gross: ${mp.totalEarnings}, Loan: ${mp.loanDeduction || 0}, Net: ${mp.netSalary}`);
        });
      } else {
        console.log(`\n[Monthly Payroll Records]: NONE FOUND`);
      }
    }

    await mongoose.disconnect();
    console.log('\nAudit complete.');
  } catch (error) {
    console.error('Audit Error:', error);
  }
}

auditPayroll();
