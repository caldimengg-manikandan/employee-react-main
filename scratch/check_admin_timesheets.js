const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const AdminTimesheet = require('../backend/models/AdminTimesheet');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const docs = await AdminTimesheet.find().limit(5).lean();
  console.log(JSON.stringify(docs, null, 2));
  await mongoose.connection.close();
}

check();
