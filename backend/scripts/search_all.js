const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/employees');
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  for (let c of collections) {
    const count = await db.collection(c.name).countDocuments({
      $or: [
        { empId: 'CDE085' },
        { employeeId: 'CDE085' }
      ]
    });
    if (count > 0) console.log(c.name, count);
  }
  process.exit(0);
}
run();
