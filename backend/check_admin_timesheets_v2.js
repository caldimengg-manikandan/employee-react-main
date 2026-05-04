const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const AdminTimesheet = require('./models/AdminTimesheet');

async function check() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env');
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const docs = await AdminTimesheet.find().limit(2).lean();
  console.log(JSON.stringify(docs, null, 2));
  await mongoose.connection.close();
}

check();
