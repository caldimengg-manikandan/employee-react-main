/**
 * verify_payroll_structure.js
 *
 * Prints a summary of all payrolls showing whether Special Allowance
 * is correctly calculated (i.e. not equal to HRA).
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Payroll = require('../models/Payroll');

async function verify() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const payrolls = await Payroll.find({}).sort({ employeeId: 1 });
    console.log(`\n${'Emp ID'.padEnd(10)} ${'Name'.padEnd(22)} ${'Gross'.padStart(8)} ${'Basic'.padStart(8)} ${'HRA'.padStart(8)} ${'Special'.padStart(8)} ${'Net'.padStart(8)} ${'CTC'.padStart(8)}  Status`);
    console.log('─'.repeat(110));

    let issueCount = 0;

    for (const p of payrolls) {
      const gross   = Number(p.totalEarnings || 0);
      const basic   = Number(p.basicDA || 0);
      const hra     = Number(p.hra || 0);
      const special = Number(p.specialAllowance || 0);
      const net     = Number(p.netSalary || 0);
      const ctc     = Number(p.ctc || 0);
      const empPF   = Number(p.employeePfContribution || 0);
      const emrPF   = Number(p.employerPfContribution || 0);
      const esi     = Number(p.esi || 0);

      // Expected special under correct formula
      const expectedSpecial = Math.max(0, gross - basic - hra - empPF - emrPF - esi);
      const diff = Math.abs(special - expectedSpecial);
      const flag = diff > 1 ? ' ⚠️  WRONG' : '';

      if (diff > 1) issueCount++;

      console.log(
        `${(p.employeeId || '').padEnd(10)} ` +
        `${(p.employeeName || '').substring(0, 22).padEnd(22)} ` +
        `${String(gross).padStart(8)} ` +
        `${String(basic).padStart(8)} ` +
        `${String(hra).padStart(8)} ` +
        `${String(special).padStart(8)} ` +
        `${String(net).padStart(8)} ` +
        `${String(ctc).padStart(8)} ` +
        flag
      );
    }

    console.log('─'.repeat(110));
    console.log(`\nTotal records: ${payrolls.length}  |  Issues found: ${issueCount}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verify();
