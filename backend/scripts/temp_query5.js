const mongoose = require('mongoose');
require('dotenv').config({path: '../.env'});
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    
    let found = [];
    const snaps = await db.collection('payroll_FY24-25').find({}).toArray();
    snaps.forEach(p => {
        const js = JSON.stringify(p);
        if (js.includes('22000') || js.includes('22,000')) {
            found.push('FY24-25: ' + p.employeeId);
        }
    });

    const payrolls = await db.collection('payrolls').find({}).toArray();
    payrolls.forEach(p => {
        const js = JSON.stringify(p);
        if (js.includes('22000') || js.includes('22,000')) {
            found.push('payrolls: ' + p.employeeId);
        }
    });

    console.log('Found 22000:', found);
    process.exit(0);
});
