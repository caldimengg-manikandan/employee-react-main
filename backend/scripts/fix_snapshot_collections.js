/**
 * fix_snapshot_collections.js
 *
 * Fixes payroll_DRY_RUN and payroll_FY24-25 collections to use the
 * correct 50/25/25 formula:
 *   Basic  = 50% of Gross
 *   HRA    = 25% of Gross
 *   Special = Gross - Basic - HRA - empPF - emrPF - ESI
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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

async function fixCollection(db, colName) {
  console.log(`\n── Fixing: ${colName} ──`);
  const col  = db.collection(colName);
  const docs = await col.find({}).toArray();
  console.log(`  Records: ${docs.length}`);

  let updated = 0, noChange = 0, skipped = 0;

  for (const d of docs) {
    const empId = d.employeeId || '?';

    // Resolve Gross
    const oldPF    = Number(d.pf || 0);
    const newEmpPF = Number(d.employeePfContribution || 0);
    const newEmrPF = Number(d.employerPfContribution || 0);
    const esi      = Number(d.esi || 0);
    const storedTE = Number(d.totalEarnings || 0);

    if (storedTE <= 0) { console.log(`  ⚠️  ${empId}: totalEarnings=0, skipped.`); skipped++; continue; }

    let gross, empPF, emrPF;
    if (newEmpPF > 0 || newEmrPF > 0) {
      gross = storedTE;
      empPF = newEmpPF;
      emrPF = newEmrPF;
    } else if (oldPF > 0) {
      gross = storedTE + oldPF;
      empPF = Math.round(oldPF * 12 / 25);
      emrPF = oldPF - empPF;
    } else {
      gross = storedTE;
      empPF = 0;
      emrPF = 0;
    }

    const s = calcStructure(gross, empPF, emrPF, esi);

    const same =
      Math.abs(Number(d.basicDA          || 0) - s.basic)   <= 1 &&
      Math.abs(Number(d.hra              || 0) - s.hra)     <= 1 &&
      Math.abs(Number(d.specialAllowance || 0) - s.special) <= 1 &&
      Math.abs(Number(d.totalEarnings    || 0) - s.gross)   <= 1;

    console.log(
      `  ${String(empId).padEnd(8)} ${(d.employeeName||'').substring(0,20).padEnd(20)}` +
      ` Gross:${s.gross} Basic:${s.basic} HRA:${s.hra} Special:${s.special} Net:${s.net}` +
      (same ? '  ✓' : '  → UPDATE')
    );

    if (same) { noChange++; continue; }

    await col.updateOne(
      { _id: d._id },
      { $set: {
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
          pf: 0
        }
      }
    );
    updated++;
  }

  console.log(`  ✅ Updated: ${updated}  Already correct: ${noChange}  Skipped: ${skipped}`);
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');
  const db = mongoose.connection.db;

  await fixCollection(db, 'payroll_DRY_RUN');
  await fixCollection(db, 'payroll_FY24-25');

  // Also check/fix payroll_FY25-26 if it exists
  const cols = await db.listCollections({ name: 'payroll_FY25-26' }).toArray();
  if (cols.length > 0) await fixCollection(db, 'payroll_FY25-26');

  console.log('\nDone.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
