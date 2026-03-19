const mongoose = require('mongoose');

const RegionalHolidaySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    date: { type: Date, required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

RegionalHolidaySchema.index({ name: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('RegionalHoliday', RegionalHolidaySchema);
