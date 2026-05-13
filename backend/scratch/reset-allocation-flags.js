const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const LeaveBalance = require('../models/LeaveBalance');

async function reset() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    // Clear the allocation flags for the current month/year to allow a re-run
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    const result = await LeaveBalance.updateMany(
      { lastAllocationMonth: month, lastAllocationYear: year },
      { $unset: { lastAllocationMonth: "", lastAllocationYear: "" } }
    );

    console.log(`Reset allocation flags for ${result.modifiedCount} records for ${month}/${year}`);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

reset();
