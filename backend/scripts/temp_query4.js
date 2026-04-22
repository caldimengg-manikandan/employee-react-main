const mongoose = require('mongoose');
require('dotenv').config({path: '../.env'});
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    
    const apps = await db.collection('selfappraisals').find({}).toArray();
    const snaps = await db.collection('payroll_FY24-25').find({}).toArray();
    const payrolls = await db.collection('payrolls').find({}).toArray();
    const employees = await db.collection('employees').find({}).toArray();

    apps.forEach(app => {
        let empObj = employees.find(e => String(e._id) === String(app.employeeId));
        if (!empObj) {
            empObj = employees.find(e => (e.employeeId || '').toLowerCase() === (app.employeeIdValue || app.empId || '').toLowerCase());
        }
        if (!empObj) return;

        const empIdString = empObj.employeeId;
        const snapshot = snaps.find(s => s.employeeId === empIdString);
        const pr = payrolls.find(p => p.employeeId === empIdString);
        
        const baselineGross = snapshot ? Number(snapshot.totalEarnings || 0) : (pr ? Number(pr.totalEarnings || 0) : 0);
        
        const pct = Number(app.incrementPercentage || 0) + Number(app.incrementCorrectionPercentage || 0);
        const rg = Math.round(baselineGross * (1 + pct / 100));
        
        if (rg === 24200 || (rg > 24000 && rg < 24400)) {
            console.log('Match!', empIdString, 'baseline:', baselineGross, 'pct:', pct, 'rg:', rg);
        }
    });

    process.exit(0);
});
