const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;
const TYPES = ['trial', 'tournament', 'job', 'sponsorship', 'event', 'education', 'talent'];
const S = new mongoose.Schema({
  poster: { type: ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: TYPES, required: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  location: { type: String, trim: true, maxlength: 80, default: '' },
  deadline: Date,
  link: { type: String, maxlength: 500, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'closed'], default: 'pending', index: true },
  promoted: { type: Boolean, default: false },
  reviewNote: { type: String, maxlength: 300, default: '' },
  applicationsCount: { type: Number, default: 0 }
}, { timestamps: true });
S.index({ title: 'text', description: 'text' });
module.exports = Object.assign(mongoose.model('Opportunity', S), { TYPES });
