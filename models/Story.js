const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;
const S = new mongoose.Schema({
  author: { type: ObjectId, ref: 'User', required: true, index: true },
  mediaUrl: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video'], required: true },
  text: { type: String, maxlength: 200, default: '' },
  viewers: [{ type: ObjectId, ref: 'User' }],
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 3600e3), index: { expires: 0 } }
}, { timestamps: true });
module.exports = mongoose.model('Story', S);
