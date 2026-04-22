const mongoose = require('mongoose');
require('dotenv').config({path: '../.env'});
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    
    // Check employees collection
    const emps = await db.collection('employees').find({}).toArray();
    emps.forEach(e => {
        const js = JSON.stringify(e);
        if (js.includes('24200') || js.includes('24,200')) {
            console.log('Found in employees:', e.employeeId, e.firstName);
        }
    });

    const payrolls = await db.collection('payrolls').find({}).toArray();
    payrolls.forEach(p => {
        const js = JSON.stringify(p);
        if (js.includes('24200') || js.includes('24,200')) {
            console.log('Found in payrolls:', p.employeeId, p.employeeName);
        }
    });

    const snaps = await db.collection('payroll_FY24-25').find({}).toArray();
    snaps.forEach(p => {
        const js = JSON.stringify(p);
        if (js.includes('24200') || js.includes('24,200')) {
            console.log('Found in payroll_FY24-25:', p.employeeId, p.employeeName);
        }
    });

    process.exit(0);
});
