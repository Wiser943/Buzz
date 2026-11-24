const mongoose = require('mongoose');
const S = new mongoose.Schema({
  league: { type: String, trim: true, maxlength: 80, default: '' },
  home: { type: String, required: true, trim: true, maxlength: 60 },
  away: { type: String, required: true, trim: true, maxlength: 60 },
  kickoff: { type: Date, required: true, index: true },
  status: { type: String, enum: ['upcoming', 'finished'], default: 'upcoming' },
  homeScore: { type: Number, default: null },
  awayScore: { type: Number, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
module.exports = mongoose.model('Match', S);
