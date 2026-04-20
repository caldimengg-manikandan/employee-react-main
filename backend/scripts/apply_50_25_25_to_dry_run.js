const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/*
 * Populates payroll_DRY_RUN using:
 *
 *   - RELEASED/ACCEPTED/EFFECTIVE employees → revised gross from releaseRevisedSnapshot
 *   - ALL OTHER employees                   → current gross from payrolls.totalEarnings
 *
 * In BOTH cases the full 50/25/25 structure is re-derived from that gross.
 *
 * Statuses that carry a released salary:
 *   released, accepted_pending_effect, accepted, effective, completed
 */

const RELEASED_STATUSES = [
  'released', 'Released', 'RELEASED',
  'released letter', 'Released Letter',
  'accepted_pending_effect',
  'accepted', 'Accepted',
  'effective', 'completed', 'COMPLETED'
];

// 50/25/25 formula ─────────────────────────────────────────────────────────
function calcSalary(gross) {
  const g       = Math.round(gross || 0);
  const basic   = Math.round(g * 0.50);
  const hra     = Math.round(g * 0.25);
  const empPF   = 1800;
  const emprPF  = 1950;
  const special = Math.max(0, g - basic - hra - empPF - emprPF);
  const net     = basic + hra + special;
  const totalDed= empPF + emprPF;
  const gratuity= Math.round(basic * 0.0486);
  const ctc     = Math.round(g + gratuity);
  return { g, basic, hra, special, empPF, emprPF, totalDed, net, gratuity, ctc };
}

// Safely pull gross from a snapshot (stored as Map or plain object)
function extractGross(snapshot) {
  if (!snapshot) return null;
  const obj = typeof snapshot.toObject === 'function' ? snapshot.toObject() : snapshot;
  const g = Number(obj.gross || obj.totalEarnings || 0);
  return g > 0 ? g : null;
}

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const payrollsCol   = db.collection('payrolls');
    const appraisalCol  = db.collection('selfappraisals');
    const dryRunCol     = db.collection('payroll_DRY_RUN');
    const employeesCol  = db.collection('employees');

    // ── Load payrolls (truth source) ───────────────────────────────────────
    console.log('Loading payrolls...');
    const payrolls = await payrollsCol.find({}).toArray();
    console.log(`  Found ${payrolls.length} records.`);

    // ── Load employees: ObjectId → human employeeId ────────────────────────
    const employees = await employeesCol.find({}, { projection: { _id: 1, employeeId: 1 } }).toArray();
    const objectIdToEmpId = {};
    employees.forEach(e => { objectIdToEmpId[String(e._id)] = String(e.employeeId); });

    // ── Load all RELEASED appraisals ───────────────────────────────────────
    console.log('Loading released appraisals...');
    const releasedAppraisals = await appraisalCol.find({
      status: { $in: RELEASED_STATUSES }
    }).toArray();
    console.log(`  Found ${releasedAppraisals.length} released appraisals.`);

    // Build map: humanEmployeeId → revised gross from releaseRevisedSnapshot
    const revisedGrossMap = {};
    for (const app of releasedAppraisals) {
      const empId = objectIdToEmpId[String(app.employeeId)];
      if (!empId) continue;

      const g = extractGross(app.releaseRevisedSnapshot);
      if (g && g > 0) {
        // If multiple appraisals, keep the most recent (highest gross as proxy)
        if (!revisedGrossMap[empId] || g > revisedGrossMap[empId]) {
          revisedGrossMap[empId] = g;
        }
      }
    }

    const resolvedCount = Object.keys(revisedGrossMap).length;
    console.log(`  Resolved revised gross for ${resolvedCount} employees.`);
    if (resolvedCount > 0) {
      console.log('  Employees with revised gross:');
      Object.entries(revisedGrossMap).forEach(([id, g]) => {
        console.log(`    ${id}: ₹${g}`);
      });
    }

    // ── Build normalized dry-run records ───────────────────────────────────
    let revisedCount2 = 0, currentCount = 0;

    const dryRunRecords = payrolls.map(record => {
      const { _id, ...base } = record;
      const empId = String(record.employeeId);

      const useRevised = revisedGrossMap.hasOwnProperty(empId);
      const srcGross   = useRevised
        ? revisedGrossMap[empId]
        : Number(record.totalEarnings || 0);

      if (useRevised) revisedCount2++; else currentCount++;

      const c = calcSalary(srcGross);

      return {
        ...base,
        basicDA:                c.basic,
        hra:                    c.hra,
        specialAllowance:       c.special,
        employeePfContribution: c.empPF,
        employerPfContribution: c.emprPF,
        totalEarnings:          c.g,
        totalDeductions:        c.totalDed,
        netSalary:              c.net,
        gratuity:               c.gratuity,
        ctc:                    c.ctc,
        esi:                    c.g > 21000 ? 0 : Number(record.esi || 0),
        tax:                    0,
        professionalTax:        Number(record.professionalTax || 0),
        _dataSource:            useRevised ? 'APPRAISAL_REVISED' : 'CURRENT_PAYROLL',
        calculationNote:        useRevised
          ? `Revised from appraisal snapshot (Gross ₹${c.g})`
          : `Current payroll with 50/25/25 applied (Gross ₹${c.g})`
      };
    });

    // ── Clear and repopulate ───────────────────────────────────────────────
    console.log('\nClearing payroll_DRY_RUN...');
    await dryRunCol.deleteMany({});
    await dryRunCol.insertMany(dryRunRecords);
    console.log(`Inserted ${dryRunRecords.length} records.`);

    // Math check
    const mathErrors = dryRunRecords.filter(r => r.totalEarnings - r.totalDeductions !== r.netSalary);
    if (mathErrors.length === 0) {
      console.log('All records passed math check ✅');
    } else {
      console.warn(`${mathErrors.length} records failed math check ⚠️`);
    }

    console.log(`\nSummary:`);
    console.log(`  Using REVISED salary (from released appraisal): ${revisedCount2}`);
    console.log(`  Using CURRENT salary (no released appraisal)  : ${currentCount}`);

    // ── Spot checks ────────────────────────────────────────────────────────
    const spotIds = ['CDE005', 'CDE007', 'CDE100'];
    console.log('\n--- Spot Checks ---');
    for (const id of spotIds) {
      const r = dryRunRecords.find(x => x.employeeId === id);
      if (!r) { console.log(`  [${id}] Not found`); continue; }
      console.log(`\n  [${id}] ${r.employeeName} [${r._dataSource}]`);
      console.log(`    Gross (totalEarnings)  : ₹${r.totalEarnings}`);
      console.log(`    Basic (50%)            : ₹${r.basicDA}`);
      console.log(`    HRA (25%)              : ₹${r.hra}`);
      console.log(`    Special Allowance      : ₹${r.specialAllowance}`);
      console.log(`    Employee PF            : ₹${r.employeePfContribution}`);
      console.log(`    Employer PF            : ₹${r.employerPfContribution}`);
      console.log(`    Total Deductions       : ₹${r.totalDeductions}`);
      console.log(`    Net Salary             : ₹${r.netSalary}`);
      console.log(`    Gratuity               : ₹${r.gratuity}`);
      console.log(`    CTC                    : ₹${r.ctc}`);
      const ok = r.totalEarnings - r.totalDeductions === r.netSalary;
      console.log(`    Math (G-D=N)?          : ${ok}`);
    }

    mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
