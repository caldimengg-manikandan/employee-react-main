
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listCollections() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employees';
    await mongoose.connect(uri);
    const cols = await mongoose.connection.db.listCollections().toArray();
    console.log(cols.map(c => c.name));
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

listCollections();
