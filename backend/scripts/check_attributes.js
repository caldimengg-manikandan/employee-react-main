
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkAttributes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const attrs = await db.collection('appraisalattributes').find({}).toArray();
    console.log('Attributes count:', attrs.length);
    if (attrs.length > 0) {
      console.log('Sample Attribute:', JSON.stringify(attrs[0], null, 2));
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAttributes();
