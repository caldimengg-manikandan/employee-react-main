/**
 * Fix Employer PF values in payroll_FY24-25 snapshot and released appraisals
 * 
 * Problem: Some employees have legacy employerPfContribution values (e.g., 2695)
 *          instead of the standard 1950. This causes the "Current Salary" column
 *          in release letters to show incorrect Employer PF.
 * 
 * Fix:
 *   1. Normalize employerPfContribution to 1950 in payroll_FY24-25 snapshot
 *   2. Normalize employeePfContribution to 1800 in payroll_FY24-25 snapshot
 *   3. Recalculate specialAllowance, netSalary, totalDeductions using 50/25/25 rule
 *   4. Fix releaseSalarySnapshot in already-released appraisals
 * 
 * Usage: node backend/scripts/fix_snapshot_employer_pf.js [--dry-run]
 */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DRY_RUN = process.argv.includes('--dry-run');

async function run() {
  try {
    console.log(`\n=== Fix Employer PF in Snapshots ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'} ===\n`);
    
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    // ─── Part 1: Fix payroll_FY24-25 snapshot ───
    const snapshotCol = db.collection('payroll_FY24-25');
    const snapshots = await snapshotCol.find({}).toArray();
    
    let snapshotFixed = 0;
    let snapshotSkipped = 0;

    console.log(`Found ${snapshots.length} records in payroll_FY24-25\n`);

    for (const record of snapshots) {
      const currentEmprPF = Number(record.employerPfContribution || 0);
      const currentEmpPF = Number(record.employeePfContribution || 0);
      
      // Check if PF values need fixing
      if (currentEmprPF === 1950 && currentEmpPF === 1800) {
        snapshotSkipped++;
        continue;
      }

      const gross = Number(record.totalEarnings || 0);
      const basic = Math.round(gross * 0.50);
      const hra = Math.round(gross * 0.25);
      const empPF = 1800;
      const emprPF = 1950;
      const esi = Number(record.esi || 0);

      // 50/25/25 Rule: Special = Gross - Basic - HRA - EmpPF - EmprPF - ESI
      const special = Math.max(0, gross - basic - hra - empPF - emprPF - esi);
      const net = basic + hra + special;
      const totalDeductions = empPF + emprPF + esi;
      const gratuity = Math.round(basic * 0.0486);
      const ctc = Math.round(gross + gratuity);

      console.log(`[SNAPSHOT] ${record.employeeId} | ${record.employeeName || 'N/A'}`);
      console.log(`  Employer PF: ${currentEmprPF} → ${emprPF} | Employee PF: ${currentEmpPF} → ${empPF}`);
      console.log(`  Special: ${record.specialAllowance} → ${special} | Net: ${record.netSalary} → ${net}`);

      if (!DRY_RUN) {
        await snapshotCol.updateOne(
          { _id: record._id },
          {
            $set: {
              employeePfContribution: empPF,
              employerPfContribution: emprPF,
              specialAllowance: special,
              netSalary: net,
              totalDeductions: totalDeductions,
              gratuity: gratuity,
              ctc: ctc
            }
          }
        );
      }
      snapshotFixed++;
    }

    console.log(`\nSnapshot: ${snapshotFixed} fixed, ${snapshotSkipped} already correct\n`);

    // ─── Part 2: Fix releaseSalarySnapshot in released appraisals ───
    const appraisalCol = db.collection('selfappraisals');
    const released = await appraisalCol.find({
      status: { $in: ['released', 'accepted', 'effective', 'COMPLETED'] },
      'releaseSalarySnapshot': { $exists: true }
    }).toArray();

    let appraisalFixed = 0;
    let appraisalSkipped = 0;

    console.log(`Found ${released.length} released appraisals with salary snapshots\n`);

    for (const app of released) {
      const snap = app.releaseSalarySnapshot || {};
      const currentEmprPF = Number(snap.employerPfContribution || 0);

      if (currentEmprPF === 1950) {
        appraisalSkipped++;
        continue;
      }

      // Recalculate current salary snapshot with standard PF
      const gross = Number(snap.gross || 0);
      if (gross <= 0) {
        appraisalSkipped++;
        continue;
      }

      const basic = Number(snap.basic || 0);
      const hra = Number(snap.hra || 0);
      const empPF = 1800;
      const emprPF = 1950;
      const esi = Number(snap.esi || 0);
      const special = Math.max(0, gross - basic - hra - empPF - emprPF - esi);
      const net = basic + hra + special;
      const gratuity = Math.round(basic * 0.0486);
      const ctc = Math.round(gross + gratuity);

      const empName = app.employeeName || '';
      console.log(`[APPRAISAL] ${empName} | Employer PF: ${currentEmprPF} → ${emprPF} | Special: ${snap.special} → ${special}`);

      if (!DRY_RUN) {
        await appraisalCol.updateOne(
          { _id: app._id },
          {
            $set: {
              'releaseSalarySnapshot.employeePfContribution': empPF,
              'releaseSalarySnapshot.employerPfContribution': emprPF,
              'releaseSalarySnapshot.special': special,
              'releaseSalarySnapshot.net': net,
              'releaseSalarySnapshot.totalDeductions': empPF + emprPF + esi,
              'releaseSalarySnapshot.gratuity': gratuity,
              'releaseSalarySnapshot.ctc': ctc
            }
          }
        );
      }
      appraisalFixed++;
    }

    console.log(`\nAppraisals: ${appraisalFixed} fixed, ${appraisalSkipped} already correct`);
    console.log(`\n=== Done ${DRY_RUN ? '(DRY RUN - no changes made)' : '(LIVE - changes applied)'} ===\n`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
