const mongoose = require('mongoose');
const S = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  read: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model('Message', S);
