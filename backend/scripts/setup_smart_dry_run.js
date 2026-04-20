const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/*
 * This script populates payroll_DRY_RUN with the best available salary data:
 *
 * - For employees with an "effective" appraisal: use the `releaseRevisedSnapshot`
 *   values (the actual revised structure approved and released to them).
 * - For all other employees: use their current payrolls entry.
 *
 * In both cases the 50/25/25 normalized structure is re-derived from the gross
 * so that fields like totalDeductions / netSalary are always consistent.
 */

// Effective appraisal statuses (post-acceptance / finalized)
const EFFECTIVE_STATUSES = ['effective', 'accepted', 'accepted_pending_effect', 'completed'];

// 50/25/25 standard calculation logic (mirrors performanceUtils.js)
function calcSalary(gross) {
  const g = Math.round(gross || 0);
  const basic = Math.round(g * 0.50);
  const hra   = Math.round(g * 0.25);
  const empPF  = 1800;
  const emprPF = 1950;
  const special = Math.max(0, g - basic - hra - empPF - emprPF);
  const net     = basic + hra + special;
  const gratuity = Math.round(basic * 0.0486);
  const ctc     = Math.round(g + gratuity);
  const totalDed = empPF + emprPF;
  return { basic, hra, special, net, empPF, emprPF, totalDed, gratuity, ctc, gross: g };
}

function mapSnapshot(snap) {
  // `snap` can be a plain object or a Mongo Map
  if (!snap) return null;
  const obj = typeof snap.toObject === 'function' ? snap.toObject() : snap;
  // Key names used in the appraisal snapshot
  const gross =
    Number(obj.gross || obj.totalEarnings || 0);
  if (!gross) return null;
  return gross;
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

    // ── 1. Load all payroll records ────────────────────────────────────────────
    console.log('Loading payrolls...');
    const payrolls = await payrollsCol.find({}).toArray();
    console.log(`  Found ${payrolls.length} payroll records.`);

    // ── 2. Load employees to map employeeId → Mongo ObjectId ──────────────────
    const employees = await employeesCol.find({}, { projection: { _id: 1, employeeId: 1 } }).toArray();
    const empIdToObjectId = {};
    employees.forEach(e => { empIdToObjectId[String(e.employeeId)] = e._id; });

    // ── 3. Load all EFFECTIVE appraisals and build a lookup by employeeId ─────
    console.log('Loading effective appraisals...');
    const effectiveAppraisals = await appraisalCol.find({
      status: { $in: EFFECTIVE_STATUSES }
    }).toArray();
    console.log(`  Found ${effectiveAppraisals.length} effective appraisals.`);

    // Map: employeeId (string) → releaseRevisedSnapshot gross
    const revisedGrossMap = {};
    for (const appraisal of effectiveAppraisals) {
      // employeeId field is stored as an ObjectId reference
      const appraisalEmpObjectId = String(appraisal.employeeId);
      // find the human-readable employee ID
      const empRecord = employees.find(e => String(e._id) === appraisalEmpObjectId);
      if (!empRecord) continue;
      
      const empId = String(empRecord.employeeId);
      const revisedGross = mapSnapshot(appraisal.releaseRevisedSnapshot);
      
      if (revisedGross && revisedGross > 0) {
        revisedGrossMap[empId] = revisedGross;
      }
    }
    console.log(`  Resolved ${Object.keys(revisedGrossMap).length} employees with revised gross.`);

    // ── 4. Build normalized dry run records ───────────────────────────────────
    const dryRunRecords = payrolls.map(record => {
      const { _id, ...base } = record;
      const empId = String(record.employeeId);

      // Pick the right gross: Revised if effective, else current
      const useRevisedGross = revisedGrossMap.hasOwnProperty(empId);
      const srcGross = useRevisedGross
        ? revisedGrossMap[empId]
        : Number(record.totalEarnings || 0);

      const calc = calcSalary(srcGross);

      return {
        ...base,
        basicDA               : calc.basic,
        hra                   : calc.hra,
        specialAllowance      : calc.special,
        employeePfContribution: calc.empPF,
        employerPfContribution: calc.emprPF,
        esi                   : srcGross > 21000 ? 0 : Number(record.esi || 0),
        tax                   : 0,
        professionalTax       : Number(record.professionalTax || 0),
        totalDeductions       : calc.totalDed,
        totalEarnings         : calc.gross,
        netSalary             : calc.net,
        gratuity              : calc.gratuity,
        ctc                   : calc.ctc,
        _dataSource           : useRevisedGross ? 'APPRAISAL_REVISED' : 'CURRENT_PAYROLL',
        calculationNote       : useRevisedGross
          ? `Revised Salary from effective appraisal (Gross ₹${calc.gross})`
          : `Current Salary - no effective appraisal (Gross ₹${calc.gross})`
      };
    });

    // ── 5. Clear and repopulate ────────────────────────────────────────────────
    console.log('\nClearing payroll_DRY_RUN...');
    await dryRunCol.deleteMany({});

    await dryRunCol.insertMany(dryRunRecords);
    console.log(`Successfully inserted ${dryRunRecords.length} normalized records into payroll_DRY_RUN.`);

    // ── 6. Summary ─────────────────────────────────────────────────────────────
    const revisedCount  = dryRunRecords.filter(r => r._dataSource === 'APPRAISAL_REVISED').length;
    const currentCount  = dryRunRecords.filter(r => r._dataSource === 'CURRENT_PAYROLL').length;
    console.log(`\nSummary:`);
    console.log(`  Employees with REVISED salary (effective appraisal): ${revisedCount}`);
    console.log(`  Employees with CURRENT salary (no effective appraisal): ${currentCount}`);

    // Print CDE005 and CDE007 as spot checks
    const spotChecks = ['CDE005', 'CDE007', 'CDE100'];
    for (const id of spotChecks) {
      const rec = dryRunRecords.find(r => r.employeeId === id);
      if (rec) {
        console.log(`\n  Spot Check [${id}] ${rec.employeeName}:`);
        console.log(`    Source       : ${rec._dataSource}`);
        console.log(`    Gross        : ₹${rec.totalEarnings}`);
        console.log(`    Basic (50%)  : ₹${rec.basicDA}`);
        console.log(`    HRA (25%)    : ₹${rec.hra}`);
        console.log(`    Special      : ₹${rec.specialAllowance}`);
        console.log(`    Employee PF  : ₹${rec.employeePfContribution}`);
        console.log(`    Employer PF  : ₹${rec.employerPfContribution}`);
        console.log(`    Net Salary   : ₹${rec.netSalary}`);
        console.log(`    Gratuity     : ₹${rec.gratuity}`);
        console.log(`    CTC          : ₹${rec.ctc}`);
        const mathOk = rec.totalEarnings - rec.totalDeductions === rec.netSalary;
        console.log(`    Math OK?     : ${mathOk} (${rec.totalEarnings} - ${rec.totalDeductions} = ${rec.netSalary})`);
      }
    }

    mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
