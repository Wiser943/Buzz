const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;
const S = new mongoose.Schema({
  community: { type: ObjectId, ref: 'Community', required: true },
  user: { type: ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['owner', 'member'], default: 'member' }
}, { timestamps: true });
S.index({ community: 1, user: 1 }, { unique: true });
module.exports = mongoose.model('Membership', S);
