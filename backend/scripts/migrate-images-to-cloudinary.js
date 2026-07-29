require('dotenv').config();
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const { uploadBase64EmployeePicture } = require('../config/cloudinary');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employees';

async function migrateEmployeeImages() {
  console.log('=== STARTING CLOUDINARY IMAGE MIGRATION ===');
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}...`);

  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully.');

    // Fetch all employees
    const employees = await Employee.find({});
    console.log(`Found ${employees.length} total employee records in MongoDB.\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const emp of employees) {
      const empIdStr = emp.employeeId || emp._id.toString();
      const empName = emp.name || emp.employeename || 'Unknown';

      // Check if already migrated (profilePicture is a valid URL)
      if (emp.profilePicture && (emp.profilePicture.startsWith('http://') || emp.profilePicture.startsWith('https://'))) {
        console.log(`[SKIPPED] Employee ${empIdStr} (${empName}): Already using Cloudinary URL.`);
        // Clean up legacy photo field if still present
        if (emp.photo) {
          await Employee.findByIdAndUpdate(emp._id, { $unset: { photo: '' } });
        }
        skippedCount++;
        continue;
      }

      // Check for Base64 image data in photo or profilePicture
      const base64Candidate = (emp.photo && emp.photo.startsWith('data:image'))
        ? emp.photo
        : ((emp.profilePicture && emp.profilePicture.startsWith('data:image')) ? emp.profilePicture : null);

      if (!base64Candidate) {
        console.log(`[SKIPPED] Employee ${empIdStr} (${empName}): No Base64 profile photo found.`);
        skippedCount++;
        continue;
      }

      try {
        console.log(`[UPLOADING] Migrating Base64 photo for Employee ${empIdStr} (${empName}) to Cloudinary...`);
        const result = await uploadBase64EmployeePicture(base64Candidate, empIdStr);

        await Employee.findByIdAndUpdate(emp._id, {
          $set: {
            profilePicture: result.profilePicture,
            profilePicturePublicId: result.profilePicturePublicId
          },
          $unset: {
            photo: ''
          }
        });

        console.log(`[SUCCESS] Employee ${empIdStr} (${empName}) migrated -> ${result.profilePicture}`);
        migratedCount++;
      } catch (err) {
        console.error(`[ERROR] Failed to migrate image for Employee ${empIdStr} (${empName}):`, err.message);
        failedCount++;
      }
    }

    console.log('\n===========================================');
    console.log('=== MIGRATION SUMMARY ===');
    console.log(`Total Employees Checked: ${employees.length}`);
    console.log(`Successfully Migrated  : ${migratedCount}`);
    console.log(`Skipped (No Base64/Already Cloudinary): ${skippedCount}`);
    console.log(`Failed                 : ${failedCount}`);
    console.log('===========================================\n');

  } catch (error) {
    console.error('Fatal error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

migrateEmployeeImages();
