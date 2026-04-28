/**
 * master_payroll_fix.js
 *
 * Fixes ALL payroll records to the correct schema:
 *   - Basic  = 50% of Gross
 *   - HRA    = 25% of Gross
 *   - Special = Gross - Basic - HRA - empPF - emrPF - ESI
 *   - totalEarnings = Gross (NOT Net)
 *   - employeePfContribution / employerPfContribution (split from old `pf`)
 *
 * Priority order per employee:
 *   1. If a released appraisal exists → use releaseRevisedSnapshot exactly
 *   2. Otherwise → recalculate from existing Gross using 50/25/25 formula
 *
 * PF Rules:
 *   - Old schema: pf = combined (empPF+emrPF), totalEarnings = Net
 *     → True Gross = totalEarnings (Net) + pf
 *     → empPF = round(pf * 12/25), emrPF = round(pf * 13/25)
 *   - New schema: employeePfContribution set, totalEarnings = Gross
 *   - Opted out: pf=0 and employeePfContribution=0 → no PF
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Employee = require('../models/Employee');
const Payroll  = require('../models/Payroll');
const SelfAppraisal = require('../models/SelfAppraisal');

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcStructure(gross, empPF, emrPF, esi = 0) {
  const g       = Math.round(gross);
  const basic   = Math.round(g * 0.50);
  const hra     = Math.round(g * 0.25);
  const special = Math.max(0, g - basic - hra - empPF - emrPF - esi);
  const net     = basic + hra + special;
  const gratuity = Math.round(basic * 0.0486);
  const ctc     = g + gratuity;
  return { basic, hra, special, net, empPF, emrPF, esi, gross: g, gratuity, ctc,
           totalDeductions: empPF + emrPF + esi };
}

function snapshotToObj(snap) {
  if (!snap) return null;
  try {
    if (typeof snap.toObject === 'function') return snap.toObject();
    if (typeof snap.toJSON   === 'function') return snap.toJSON();
  } catch (_) {}
  return snap;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.\n');

  // ── Build released-appraisal map ─────────────────────────────────────────
  const employees = await Employee.find({}, 'employeeId _id');
  const mongoIdToEmpId = {};
  for (const e of employees) mongoIdToEmpId[e._id.toString()] = e.employeeId;

  const releasedAppraisals = await SelfAppraisal.find({
    status: { $in: ['released', 'accepted', 'effective', 'COMPLETED'] }
  });

  // empId → releaseRevisedSnapshot
  const releasedMap = {};
  for (const a of releasedAppraisals) {
    const empId = a.empId || mongoIdToEmpId[a.employeeId?.toString()];
    if (!empId) continue;
    const snap = snapshotToObj(a.releaseRevisedSnapshot);
    if (snap && (snap.gross || snap.basic)) releasedMap[empId.toUpperCase()] = snap;
  }
  console.log(`Released appraisals found: ${Object.keys(releasedMap).length}`);

  // ── Process every payroll record ─────────────────────────────────────────
  const payrolls = await Payroll.find({});
  console.log(`Payroll records to process: ${payrolls.length}\n`);

  const header =
    `${'EmpID'.padEnd(10)} ${'Name'.padEnd(22)} ${'Gross'.padStart(7)} ${'Basic'.padStart(7)}` +
    ` ${'HRA'.padStart(7)} ${'Special'.padStart(8)} ${'Net'.padStart(7)} ` +
    `${'empPF'.padStart(6)} ${'emrPF'.padStart(6)} ${'Grty'.padStart(5)} ${'CTC'.padStart(7)}  Source`;
  console.log(header);
  console.log('─'.repeat(115));

  let updated = 0, skipped = 0, noChange = 0;

  for (const p of payrolls) {
    const empId = (p.employeeId || '').toUpperCase();

    // ── Determine correct salary structure ───────────────────────────────
    let s;

    if (releasedMap[empId]) {
      // Priority 1: Use release snapshot
      const snap = releasedMap[empId];
      const gross   = Math.round(snap.gross || snap.totalEarnings || 0);
      const basic   = Math.round(snap.basic || snap.basicDA || 0);
      const hra     = Math.round(snap.hra || 0);
      const special = Math.round(snap.special || snap.specialAllowance || 0);
      const empPF   = Math.round(snap.employeePfContribution || 0);
      const emrPF   = Math.round(snap.employerPfContribution || 0);
      const esi     = Math.round(snap.esi || 0);
      const net     = basic + hra + special;
      const gratuity = Math.round(snap.gratuity || Math.round(basic * 0.0486));
      const ctc     = Math.round(snap.ctc || (gross + gratuity));
      s = { basic, hra, special, net, empPF, emrPF, esi, gross, gratuity, ctc,
            totalDeductions: empPF + emrPF + esi };

    } else {
      // Priority 2: Recalculate from stored data
      const oldPF    = Number(p.pf || 0);
      const newEmpPF = Number(p.employeePfContribution || 0);
      const newEmrPF = Number(p.employerPfContribution || 0);
      const esi      = Number(p.esi || 0);
      const storedTE = Number(p.totalEarnings || 0);

      let gross, empPF, emrPF;

      if (storedTE <= 0) {
        console.log(`  ⚠️  ${empId}: totalEarnings=0, skipping.`);
        skipped++; continue;
      }

      if (newEmpPF > 0 || newEmrPF > 0) {
        // Already new schema — totalEarnings IS Gross
        gross = storedTE;
        empPF = newEmpPF;
        emrPF = newEmrPF;
      } else if (oldPF > 0) {
        // Old schema — totalEarnings is Net, Gross = Net + pf
        gross = storedTE + oldPF;
        // Split combined pf in 12:13 ratio (empPF:emrPF)
        empPF = Math.round(oldPF * 12 / 25);
        emrPF = oldPF - empPF;
      } else {
        // No PF (opted out) — totalEarnings might be Net or Gross (same)
        gross = storedTE;
        empPF = 0;
        emrPF = 0;
      }

      s = calcStructure(gross, empPF, emrPF, esi);
    }

    // ── Check if update is needed (tolerance ±1 for rounding) ───────────
    const same =
      Math.abs(Number(p.basicDA            || 0) - s.basic)   <= 1 &&
      Math.abs(Number(p.hra                || 0) - s.hra)     <= 1 &&
      Math.abs(Number(p.specialAllowance   || 0) - s.special) <= 1 &&
      Math.abs(Number(p.totalEarnings      || 0) - s.gross)   <= 1 &&
      Math.abs(Number(p.netSalary          || 0) - s.net)     <= 1 &&
      Number(p.employeePfContribution || 0) === s.empPF &&
      Number(p.employerPfContribution || 0) === s.emrPF;

    const src = releasedMap[empId] ? 'RELEASE_LETTER' : 'CALCULATED';

    console.log(
      `${(p.employeeId||'').padEnd(10)} ${(p.employeeName||'').substring(0,22).padEnd(22)}` +
      ` ${String(s.gross).padStart(7)} ${String(s.basic).padStart(7)}` +
      ` ${String(s.hra).padStart(7)} ${String(s.special).padStart(8)}` +
      ` ${String(s.net).padStart(7)} ${String(s.empPF).padStart(6)}` +
      ` ${String(s.emrPF).padStart(6)} ${String(s.gratuity).padStart(5)}` +
      ` ${String(s.ctc).padStart(7)}  ${same ? '✓' : '→ UPDATE'} [${src}]`
    );

    if (same) { noChange++; continue; }

    await Payroll.updateOne(
      { _id: p._id },
      {
        $set: {
          basicDA: s.basic,
          hra: s.hra,
          specialAllowance: s.special,
          employeePfContribution: s.empPF,
          employerPfContribution: s.emrPF,
          esi: s.esi,
          totalEarnings: s.gross,
          totalDeductions: s.totalDeductions,
          netSalary: s.net,
          gratuity: s.gratuity,
          ctc: s.ctc,
          // Clear old pf field
          pf: 0,
          updatedAt: new Date()
        }
      }
    );
    updated++;
  }

  console.log('─'.repeat(115));
  console.log(`\nTotal: ${payrolls.length}  |  Updated: ${updated}  |  Already correct: ${noChange}  |  Skipped: ${skipped}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
