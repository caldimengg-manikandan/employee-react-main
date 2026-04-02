const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const WishSchema = new mongoose.Schema({
  eventType: String,
}, { strict: false });

const Wish = mongoose.model('DiagnosticWish', WishSchema, 'wishes');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const results = await Wish.aggregate([
    { $group: { _id: "$eventType", count: { $sum: 1 } } }
  ]);
  console.log('Event types across all wishes:', JSON.stringify(results, null, 2));
  process.exit(0);
}

check();
