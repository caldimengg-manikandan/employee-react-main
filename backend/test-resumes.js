const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const Resume = require('./models/Resume');

// Connect to MongoDB
const uri = process.env.MONGODB_URI || 'mongodb+srv://caldimenggcloud_db_user:Caldim12345678@cluster0.wwy0lqb.mongodb.net/?appName=Cluster0';
console.log('Connecting to MongoDB...');

mongoose.connect(uri)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Fetch all resumes
    const resumes = await Resume.find().sort({ createdAt: -1 });
    console.log(`Found ${resumes.length} resumes`);
    
    for (const res of resumes) {
      console.log('------------------------------------------------');
      console.log(`ID: ${res._id}`);
      console.log(`Name: ${res.candidateName}`);
      console.log(`File Path: ${res.filePath}`);
    }
    
    process.exit();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
