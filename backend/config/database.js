const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;

    // Set custom DNS servers only for MongoDB Atlas SRV connections to prevent breaking localhost resolution
    if (uri && uri.startsWith('mongodb+srv://')) {
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
      } catch (e) {
        console.warn('Could not set custom DNS servers:', e.message);
      }
    }

    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;

