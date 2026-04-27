
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkMatrix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const matrix = await db.collection('incrementmatrixes').find({}).toArray();
    console.log('Matrix count:', matrix.length);
    if (matrix.length > 0) {
       console.log('Sample Matrix:', JSON.stringify(matrix[0], null, 2));
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkMatrix();
