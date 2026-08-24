const mongoose = require("mongoose");

const AssetSchema = new mongoose.Schema({
  assetId: {
    type: String,
    required: [true, "Asset ID is required"],
    unique: true,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  brandName: {
    type: String,
    trim: true
  },
  division: {
    type: String,
    required: false,
    trim: true
  },
  processor: {
    type: String,
    trim: true
  },
  version: {
    type: String,
    trim: true
  },
  ram: {
    type: String
  },
  hardDisk: {
    type: String
  },
  seatNo: {
    type: String,
    trim: true,
    index: false
  },
  serialNumber: {
    type: String,
    trim: true
  },
  screenSize: {
    type: String,
    trim: true
  },
  keyboardType: {
    type: String,
    trim: true
  },
  mouseType: {
    type: String,
    trim: true
  },
  headsetType: {
    type: String,
    trim: true
  },
  purchaseDate: {
    type: String
  },
  condition: {
    type: String
  },
  location: {
    type: String
  },
  status: {
    type: String,
    required: true,
    enum: ["Available", "Assigned", "Under Maintenance", "Damaged", "Scrapped"],
    default: "Available"
  }
}, { timestamps: true, strict: false });

const Asset = mongoose.model("Asset", AssetSchema);

// Safeguard: Ensure problematic unique index on seatNo is dropped if present
Asset.on('index', async () => {
  try {
    const indexes = await Asset.collection.indexes();
    for (const idx of indexes) {
      if (idx.name === 'seatNo_1' || (idx.key && idx.key.seatNo && idx.unique)) {
        await Asset.collection.dropIndex(idx.name);
      }
    }
  } catch (_) {}
});

module.exports = Asset;
