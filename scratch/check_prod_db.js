const mongoose = require('mongoose');
const uri = "mongodb+srv://caldimenggcloud_db_user:Caldim12345678@cluster0.wwy0lqb.mongodb.net/Master_DB?retryWrites=true&w=majority";

async function checkConnection() {
  try {
    console.log('Connecting to Cloud DB...');
    await mongoose.connect(uri);
    console.log('Connected!');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    const Payroll = mongoose.model('Payroll', new mongoose.Schema({}, { strict: false }), 'payrolls');
    const count = await Payroll.countDocuments();
    console.log('Total Payroll records:', count);
    
    const sample = await Payroll.findOne({ employeeId: 'CDE019' });
    if (sample) {
      console.log('Sample CDE019:', JSON.stringify({
        employeeId: sample.employeeId,
        pf: sample.pf,
        totalDeductions: sample.totalDeductions,
        volunteerPF: sample.volunteerPF
      }, null, 2));
    } else {
      console.log('CDE019 not found in payrolls collection');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkConnection();
