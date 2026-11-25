const mongoose = require('mongoose');
const S = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['like', 'comment', 'mention', 'follow', 'repost', 'moderation', 'takedown', 'appeal', 'verification', 'payment', 'opportunity', 'system'], required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  text: { type: String, maxlength: 300, default: '' },
  target: { kind: { type: String, enum: ['post', 'track', 'account'] }, id: { type: mongoose.Schema.Types.ObjectId } },
  read: { type: Boolean, default: false }
}, { timestamps: true });
S.index({ user: 1, createdAt: -1 });
module.exports = mongoose.model('Notification', S);
