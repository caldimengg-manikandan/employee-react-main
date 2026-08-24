const mongoose = require("mongoose");

const AssetCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Category name is required"],
    unique: true,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model("AssetCategory", AssetCategorySchema);
