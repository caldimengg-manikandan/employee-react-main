const cron = require('node-cron');
const { runMonthlyAllocation } = require('../services/leaveService');
const LeaveAllocationLog = require('../models/LeaveAllocationLog');

const setupLeaveBalanceSync = () => {
  // Helper to run allocation and log only if actual allocations occurred or if it failed
  const executeAllocation = async (triggerSource) => {
    const now = new Date();
    try {
      const result = await runMonthlyAllocation(now);
      
      // Only write to the DB log if we actually allocated leaves to at least one employee.
      // This prevents bloating the DB with daily logs showing 0 processed.
      if (result.processedCount > 0) {
        console.log(`[LeaveAllocation ${triggerSource}] Completed. Allocated for ${result.processedCount} employee(s), skipped ${result.skippedCount}.`);
        await LeaveAllocationLog.create({
          performedBy: `SYSTEM_${triggerSource.toUpperCase()}`,
          performedByName: `Automatic ${triggerSource} Run`,
          targetMonth: now.getMonth() + 1,
          targetYear: now.getFullYear(),
          processedCount: result.processedCount,
          status: 'Success',
          details: result.details
        });
      } else {
        console.log(`[LeaveAllocation ${triggerSource}] Checked. No new allocations needed (all active employees already allocated/skipped).`);
      }
    } catch (err) {
      console.error(`[LeaveAllocation ${triggerSource}] Error:`, err.message);
      try {
        await LeaveAllocationLog.create({
          performedBy: `SYSTEM_${triggerSource.toUpperCase()}`,
          performedByName: `Automatic ${triggerSource} Run`,
          targetMonth: now.getMonth() + 1,
          targetYear: now.getFullYear(),
          processedCount: 0,
          status: 'Failed',
          error: err.message
        });
      } catch (_) {}
    }
  };

  // 1. Run check on server startup (catch-up if server was offline or timezone offset delayed the run)
  console.log('[LeaveAllocation] Running initial startup leave allocation check...');
  executeAllocation('Startup');

  // 2. Run check daily at 12:00 AM (to catch up automatically if the 1st of the month was missed)
  cron.schedule('0 0 * * *', async () => {
    console.log('[LeaveAllocation Cron] Running scheduled daily leave allocation check...');
    await executeAllocation('Daily_Cron');
  });

  console.log('[LeaveAllocation Cron] Scheduled: Daily check at 12:00 AM');
};

module.exports = setupLeaveBalanceSync;

