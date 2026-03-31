const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Employee = require("../models/Employee");
const Payroll = require("../models/Payroll");
const PayrollHistory = require("../models/PayrollHistory");
const { getFinancialYear } = require("../utils/payrollSync");

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function migrate() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected Successfully.");

        // 1. Fetch current payroll records
        const currentPayrolls = await Payroll.find();
        console.log(`Found ${currentPayrolls.length} active payroll records.`);

        const BASE_DATE = new Date("2025-04-01");
        const fy = getFinancialYear(BASE_DATE);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const pr of currentPayrolls) {
            const emp = await Employee.findOne({ employeeId: pr.employeeId });
            
            if (!emp) {
                console.warn(`⚠️  Skip: No Employee for ID ${pr.employeeId}`);
                skippedCount++;
                continue;
            }

            const existing = await PayrollHistory.findOne({ 
                employeeId: emp._id, 
                source: "manual",
                effectiveFrom: BASE_DATE 
            });

            const salary = pr.ctc || emp.ctc || 0;
            const components = {
                basic: Number(pr.basicDA || emp.basicDA || 0),
                hra: Number(pr.hra || emp.hra || 0),
                special: Number(pr.specialAllowance || emp.specialAllowance || 0),
                gross: Number(pr.totalEarnings || emp.totalEarnings || 0),
                net: Number(pr.netSalary || emp.netSalary || 0)
            };

            const data = {
                employeeId: emp._id,
                employeeIdString: emp.employeeId,
                employeeName: emp.name || emp.employeename,
                financialYear: fy.label,
                fyStart: fy.start,
                fyEnd: fy.end,
                salary: salary,
                components,
                effectiveFrom: BASE_DATE,
                effectiveTo: null,
                source: "manual",
                notes: "Baseline sync from active Payroll collection"
            };

            if (existing) {
                await PayrollHistory.findByIdAndUpdate(existing._id, data);
            } else {
                await PayrollHistory.create(data);
            }
            
            migratedCount++;
            if (migratedCount % 20 === 0) console.log(`Processed ${migratedCount} records...`);
        }

        console.log("\n✅ Migration Completed!");
        console.log(`Updated/Migrated: ${migratedCount}`);
        process.exit(0);

    } catch (err) {
        console.error("Migration Failed:", err.message);
        process.exit(1);
    }
}

migrate();
