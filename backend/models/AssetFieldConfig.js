const mongoose = require("mongoose");

const AssetFieldConfigSchema = new mongoose.Schema({
  fields: [{
    key: { type: String, required: true },
    label: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    type: { type: String, default: "text" }
  }]
}, { timestamps: true });

module.exports = mongoose.model("AssetFieldConfig", AssetFieldConfigSchema);
