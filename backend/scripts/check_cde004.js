const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Employee = require('../models/Employee');
const SelfAppraisal = require('../models/SelfAppraisal');
const Payroll = require('../models/Payroll');

async function checkEmployee() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.\n');

    // Check payroll for CDE004
    const payroll = await Payroll.findOne({ employeeId: /^CDE004$/i });
    console.log('CDE004 Payroll:', JSON.stringify({
      basicDA: payroll?.basicDA,
      hra: payroll?.hra,
      specialAllowance: payroll?.specialAllowance,
      totalEarnings: payroll?.totalEarnings,
      netSalary: payroll?.netSalary,
      ctc: payroll?.ctc
    }, null, 2));

    // Check if CDE004 has an appraisal
    const emp = await Employee.findOne({ employeeId: /^CDE004$/i });
    console.log('\nEmployee _id:', emp?._id);

    const appraisals = await SelfAppraisal.find({ employeeId: emp?._id });
    console.log('\nAppraisals for CDE004:');
    for (const a of appraisals) {
      console.log(` - status: ${a.status}, revisedSalary: ${a.revisedSalary}, hasSnapshot: ${!!(a.releaseRevisedSnapshot && Object.keys(a.releaseRevisedSnapshot).length > 0)}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkEmployee();
