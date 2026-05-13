const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/user/Desktop/Projects/Employee_management/employee-react-main/backend/.env' });

const debug = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    
    const user = await mongoose.connection.db.collection('users').findOne({ employeeId: 'CDE100' });
    console.log('User for CDE100:', JSON.stringify(user, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

debug();
