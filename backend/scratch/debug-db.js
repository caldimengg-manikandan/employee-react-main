const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employee-management');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    const employees = await mongoose.connection.collection('employees').find({}).limit(5).toArray();
    console.log('Employees:', JSON.stringify(employees, null, 2));
    
    const payrolls = await mongoose.connection.collection('monthlypayrolls').find({}).limit(5).toArray();
    console.log('Payrolls:', JSON.stringify(payrolls, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB();
