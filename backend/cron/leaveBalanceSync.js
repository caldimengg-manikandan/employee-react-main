const cron = require('node-cron');
const { runMonthlyAllocation } = require('../services/leaveService');

const setupLeaveBalanceSync = () => {
  // Run on the 1st of every month at 00:30 AM
  cron.schedule('30 0 1 * *', async () => {
    console.log('Running Monthly Leave Allocation cron job...');
    
    try {
      const result = await runMonthlyAllocation();
      console.log(`Monthly Leave Allocation completed. Processed ${result.processedCount} employees.`);
    } catch (err) {
      console.error('Error in monthly leave allocation cron:', err);
    }
  });
  
  // Optional: Keep a daily sync for general maintenance if needed, 
  // but for now we focus on the monthly allocation requirement.
};

module.exports = setupLeaveBalanceSync;
