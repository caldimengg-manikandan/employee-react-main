const express = require("express");
const router = express.Router();
const Compensation = require("../models/Compensation");

// ➕ CREATE Compensation
router.post("/", async (req, res) => {
  try {
    const compensation = new Compensation(req.body);
    await compensation.save();
    res.status(201).json(compensation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 📥 GET all Compensations
router.get("/", async (req, res) => {
  try {
    const compensations = await Compensation.find().sort({ createdAt: -1 });
    res.json(compensations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 👁️ GET single Compensation by ID
router.get("/:id", async (req, res) => {
  try {
    const compensation = await Compensation.findById(req.params.id);
    if (!compensation) return res.status(404).json({ message: "Not found" });
    res.json(compensation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✏️ UPDATE Compensation
router.put("/:id", async (req, res) => {
  try {
    const updated = await Compensation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ❌ DELETE Compensation
router.delete("/:id", async (req, res) => {
  try {
    await Compensation.findByIdAndDelete(req.params.id);
    res.json({ message: "Compensation deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
