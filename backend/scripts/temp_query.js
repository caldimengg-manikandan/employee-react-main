const mongoose = require('mongoose');
require('dotenv').config({path: '../.env'});
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    
    // Check appraisals
    const appraisals = await db.collection('selfappraisals').find({}).toArray();
    console.log('Appraisals with revisedSalary=24200:', appraisals.filter(a => a.revisedSalary === 24200).map(a => a.empId || a.employeeId));
    console.log('Appraisals with snapshot.gross=24200:', appraisals.filter(a => a.releaseRevisedSnapshot && a.releaseRevisedSnapshot.gross === 24200).map(a => a.empId || a.employeeId));
    
    // Check what dry run calculated
    const dr = await db.collection('payroll_DRY_RUN').find({ totalEarnings: { $gt: 23500, $lt: 24500 } }).toArray();
    console.log('DRY RUN close to 24200:', dr.map(x => x.employeeId + ':' + x.totalEarnings));
    
    process.exit(0);
});
