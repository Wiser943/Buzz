const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;
const S = new mongoose.Schema({
  user: { type: ObjectId, ref: 'User', required: true, index: true },
  targetType: { type: String, enum: ['post', 'track', 'account'], required: true },
  targetId: { type: ObjectId },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending', index: true },
  decidedBy: { type: ObjectId, ref: 'User' },
  note: { type: String, maxlength: 300, default: '' }
}, { timestamps: true });
module.exports = mongoose.model('Appeal', S);
