
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Compensation = require('../models/Compensation');

async function listComp() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employees';
    await mongoose.connect(uri);
    
    const cs = await Compensation.find().limit(5);
    console.log(JSON.stringify(cs.map(c => ({ id: c._id, name: c.name })), null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

listComp();
