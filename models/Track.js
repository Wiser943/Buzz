const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;
const S = new mongoose.Schema({
  owner: { type: ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  kind: { type: String, enum: ['original', 'cover', 'mix', 'other'], default: 'original' },
  genre: { type: String, trim: true, maxlength: 40, default: '' },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  audioUrl: { type: String, required: true },
  coverUrl: { type: String, default: '' },
  duration: { type: Number, default: 0, min: 0, max: 7200 },
  peaks: [{ type: Number, min: 0, max: 1 }],
  plays: { type: Number, default: 0 },
  likes: [{ type: ObjectId, ref: 'User' }],
  rightsConfirmed: { type: Boolean, required: true },
  status: { type: String, enum: ['published', 'removed'], default: 'published', index: true }
}, { timestamps: true });
S.index({ title: 'text', genre: 'text' });
module.exports = mongoose.model('Track', S);
