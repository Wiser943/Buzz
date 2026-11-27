const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;
const S = new mongoose.Schema({
  advertiser: { type: ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 80 },
  text: { type: String, trim: true, maxlength: 300, default: '' },
  mediaUrl: { type: String, default: '' },
  ctaLabel: { type: String, trim: true, maxlength: 24, default: 'Learn more' },
  ctaUrl: { type: String, required: true, maxlength: 500 },
  days: { type: Number, min: 1, max: 30, default: 7 },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'paused', 'ended'], default: 'pending', index: true },
  reviewNote: { type: String, maxlength: 300, default: '' },
  flags: [String],
  startsAt: Date, endsAt: Date,
  impressions: { type: Number, default: 0 }, clicks: { type: Number, default: 0 }
}, { timestamps: true });
module.exports = mongoose.model('Ad', S);
