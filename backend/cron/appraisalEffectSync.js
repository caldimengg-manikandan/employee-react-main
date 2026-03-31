const cron = require("node-cron");
const SelfAppraisal = require("../models/SelfAppraisal");
const { applyAppraisalToPayroll } = require("../utils/payrollSync");

/**
 * Daily job (at midnight) to apply payroll changes once effectiveDate is reached.
 * Uses ATOMIC LOCK (findOneAndUpdate) to prevent multiple instances from processing same record.
 */
const setupAppraisalEffectSync = () => {
    cron.schedule("0 0 * * *", async () => {
        console.log(`[${new Date().toISOString()}] Starting Atomic Appraisal Effect Sync Job...`);
        const today = new Date();

        try {
            // Find but don't loop yet, we use findOneAndUpdate inside for each eligible candidate
            const candidates = await SelfAppraisal.find({
                status: "accepted_pending_effect",
                effectiveDate: { $lte: today },
                payrollProcessed: false
            }).select('_id');

            console.log(`Found ${candidates.length} candidates for effective date processing.`);

            for (const candidate of candidates) {
                // 🔒 ATOMIC LOCK: Try to update and get the record in one go
                const record = await SelfAppraisal.findOneAndUpdate(
                    {
                        _id: candidate._id,
                        payrollProcessed: false,
                        status: "accepted_pending_effect",
                        effectiveDate: { $lte: today }
                    },
                    {
                        $set: {
                            payrollProcessed: true,
                            payrollProcessedAt: new Date(),
                            status: "effective" // Move to final state
                        }
                    },
                    { new: true }
                );

                if (!record) {
                    console.log(`Candidate ${candidate._id} already locked by another process or no longer eligible.`);
                    continue;
                }

                // ➕ Only ONE process ever reaches here for this specific ID
                try {
                    console.log(`Applying payroll changes for Appraisal: ${record._id}`);
                    await applyAppraisalToPayroll(record);
                    console.log(`Successfully sync'd payroll for appraisal: ${record._id}`);
                } catch (err) {
                    console.error(`ERROR processing appraisal ${record._id}:`, err);
                    
                    // 🛑 ROLLBACK LOCK on error so we can retry tomorrow
                    await SelfAppraisal.updateOne(
                        { _id: record._id },
                        { 
                            $set: { 
                                payrollProcessed: false, 
                                status: "accepted_pending_effect" 
                            },
                            $unset: { payrollProcessedAt: "" }
                        }
                    );
                    console.log(`Rollback complete for: ${record._id}. Will retry later.`);
                }
            }
            
        } catch (err) {
            console.error("Critical error in Atomic Appraisal Effect Job:", err);
        }
    });
};

module.exports = setupAppraisalEffectSync;
