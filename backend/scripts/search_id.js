
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function searchID() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employees';
    await mongoose.connect(uri);
    
    const id = '69df0fbcaee8372ec67ed16a';
    
    const collections = ['compensations', 'employees', 'payrolls', 'selfappraisals'];
    
    for (const colName of collections) {
      const col = mongoose.connection.db.collection(colName);
      const doc = await col.findOne({ _id: new mongoose.Types.ObjectId(id) });
      if (doc) {
        console.log(`Found in ${colName}:`);
        console.log(JSON.stringify(doc, null, 2));
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

searchID();
