require('dotenv').config();
const { MongoClient } = require('mongodb');

const LOCAL_URI = 'mongodb://127.0.0.1:27017/employees';
const ATLAS_URI = process.env.MONGODB_URI;

// Set DNS servers for Atlas SRV resolution
try {
  require('dns').setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

async function migrate() {
  console.log('Starting Migration from Local MongoDB to Atlas...');
  console.log('Local URI:', LOCAL_URI);
  console.log('Atlas URI:', ATLAS_URI.replace(/:[^:@]+@/, ':****@'));

  const localClient = new MongoClient(LOCAL_URI);
  const atlasClient = new MongoClient(ATLAS_URI);

  try {
    await localClient.connect();
    console.log('✅ Connected to Local MongoDB');

    await atlasClient.connect();
    console.log('✅ Connected to MongoDB Atlas');

    const localDb = localClient.db();
    const atlasDb = atlasClient.db();

    const collections = await localDb.listCollections().toArray();
    console.log(`Found ${collections.length} collections to migrate.\n`);

    for (const col of collections) {
      const colName = col.name;
      if (colName.startsWith('system.')) continue;

      const docs = await localDb.collection(colName).find({}).toArray();
      if (docs.length === 0) {
        console.log(`- ${colName}: 0 documents, skipped.`);
        continue;
      }

      console.log(`Migrating ${colName} (${docs.length} documents)...`);
      // Clear target collection in Atlas first to avoid duplication
      await atlasDb.collection(colName).deleteMany({});

      // Insert in batches of 500
      const BATCH_SIZE = 500;
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = docs.slice(i, i + BATCH_SIZE);
        await atlasDb.collection(colName).insertMany(batch);
      }
      console.log(`  ✅ Successfully migrated ${docs.length} documents to ${colName}`);
    }

    console.log('\n🎉 Data Migration Completed Successfully!');
  } catch (err) {
    console.error('❌ Migration Error:', err);
  } finally {
    await localClient.close();
    await atlasClient.close();
    process.exit(0);
  }
}

migrate();
