const mongoose = require('mongoose');
require('dotenv').config({path: '../.env'});
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    
    // Check all self appraisals for 24200
    const apps = await db.collection('selfappraisals').find({}).toArray();
    apps.forEach(a => {
        const js = JSON.stringify(a);
        if (js.includes('24200') || js.includes('24,200')) {
            console.log('Found in SelfAppraisal:', a._id, a.employeeId);
        }
    });

    const payrolls = await db.collection('payrolls').find({}).toArray();
    payrolls.forEach(p => {
        const js = JSON.stringify(p);
        if (js.includes('24200') || js.includes('24,200')) {
            console.log('Found in payrolls:', p.employeeId, p.employeeName);
        }
    });

    const dryrun = await db.collection('payroll_DRY_RUN').find({}).toArray();
    dryrun.forEach(d => {
        if (d.totalEarnings === 24200) {
            console.log('Found in DRY_RUN:', d.employeeId, d.employeeName);
        }
    });
    
    process.exit(0);
});
