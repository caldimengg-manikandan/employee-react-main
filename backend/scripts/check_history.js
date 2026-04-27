
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkHistory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const history = await db.collection('payrollhistories').find({ employeeId: 'CDE088' }).toArray();
    console.log(`Found ${history.length} history records for CDE088`);
    history.forEach(h => console.log(`Date: ${h.monthYear}, Gross: ${h.totalEarnings}`));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkHistory();
