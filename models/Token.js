const mongoose = require('mongoose');
// One-time links for email verification and password reset. Only a hash is stored.
const S = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['verify', 'reset'], required: true },
  hash: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
});
module.exports = mongoose.model('Token', S);
