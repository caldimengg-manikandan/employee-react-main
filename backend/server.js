const express = require('express');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/database');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// File upload (optional if you use multer)
const upload = multer();

// --- ROUTES --- //
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/timesheets', require('./routes/timesheets'));

// ✅ Timesheet History Route
app.use('/api/timesheet-history', require('./routes/timesheetHistory'));

// --- BASE ROUTE --- //
app.get('/', (req, res) => {
  res.json({ message: 'Caldim Employees API is running successfully 🚀' });
});

// --- ERROR HANDLER --- //
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// --- SERVER LISTEN --- //
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
