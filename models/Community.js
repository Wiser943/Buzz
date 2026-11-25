const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;
const S = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 3, maxlength: 40 },
  slug: { type: String, required: true, unique: true, lowercase: true },
  sport: { type: String, trim: true, maxlength: 30, default: '' },
  description: { type: String, trim: true, maxlength: 300, default: '' },
  owner: { type: ObjectId, ref: 'User', required: true },
  membersCount: { type: Number, default: 1 }
}, { timestamps: true });
S.index({ name: 'text', sport: 'text' });
module.exports = mongoose.model('Community', S);
