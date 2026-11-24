const mongoose = require('mongoose');
const S = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
  home: { type: Number, required: true, min: 0, max: 30 },
  away: { type: Number, required: true, min: 0, max: 30 },
  points: { type: Number, default: null }
}, { timestamps: true });
S.index({ user: 1, match: 1 }, { unique: true });
module.exports = mongoose.model('Prediction', S);
