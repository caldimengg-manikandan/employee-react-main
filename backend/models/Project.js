const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  division: { type: String, required: true },
  branch: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  status: { type: String, default: "Planning" },
  projectCategory: { type: String, enum: ["Product", "Non-Product"], default: "Product" },
  description: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("Project", ProjectSchema);
