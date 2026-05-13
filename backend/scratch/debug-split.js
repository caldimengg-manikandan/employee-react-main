const mongoose = require('mongoose');
const { getPendingDeductions, calculateLeaveSplit } = require('../services/leaveService');
require('dotenv').config({ path: './backend/.env' });

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected');
    
    const agg = await getPendingDeductions('CDE025');
    console.log('Pending:', agg);
    
    const split = calculateLeaveSplit(4, {
      casual: { balance: 2 },
      sick: { balance: 2 },
      privilege: { balance: 1.5 }
    });
    console.log('Split:', split);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
