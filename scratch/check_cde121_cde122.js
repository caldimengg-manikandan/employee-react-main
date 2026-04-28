const mongoose = require('mongoose');
require('dotenv').config();

const payrollSchema = new mongoose.Schema({}, { strict: false });
const Payroll = mongoose.model('Payroll', payrollSchema, 'payrolls');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://kumaresh1905:kumaresh1905@cluster0.db8yv.mongodb.net/test', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const records = await Payroll.find({ employeeId: { $in: ['CDE121', 'CDE122'] } }).lean();
  console.log(JSON.stringify(records, null, 2));
  process.exit(0);
}

check();
