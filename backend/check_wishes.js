const mongoose = require('mongoose');
const Wish = require('./models/Wish');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const wishes = await Wish.find({}).limit(10);
    console.log('Sample Wishes:', JSON.stringify(wishes, null, 2));
    const types = await Wish.distinct('eventType');
    console.log('Distinct Event Types:', types);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
