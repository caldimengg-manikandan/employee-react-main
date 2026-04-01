const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const AppraisalAttributeMaster = require('./models/AppraisalAttributeMaster');

async function cleanAttributes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employee-management');
    console.log('Connected.');

    const master = await AppraisalAttributeMaster.findOne();
    if (!master) {
      console.log('No master attributes found.');
      return;
    }

    const sections = ['knowledgeSubItems', 'processSubItems', 'technicalSubItems', 'growthSubItems'];
    let changed = false;

    sections.forEach(s => {
      const original = master[s] || [];
      const seenKeys = new Set();
      const unique = [];

      original.forEach(item => {
        if (!seenKeys.has(item.key)) {
          seenKeys.add(item.key);
          unique.push(item);
        } else {
          console.log(`Removing duplicate key ${item.key} from ${s}`);
          changed = true;
        }
      });

      master[s] = unique;
    });

    if (changed) {
      await master.save();
      console.log('Cleaned duplicates successfully.');
    } else {
      console.log('No duplicates found.');
    }

    await mongoose.connection.close();
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

cleanAttributes();
