const mongoose = require('mongoose');
const S = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isGroup: { type: Boolean, default: false },
  name: { type: String, trim: true, maxlength: 50, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastSenderName: { type: String, default: '' },
  lastMessage: { type: String, default: '' },
  lastSender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastAt: { type: Date, default: Date.now }
}, { timestamps: true });
S.index({ participants: 1, lastAt: -1 });
module.exports = mongoose.model('Conversation', S);
