const router = require('express').Router();
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const User = require('../models/User');
const Match = require('../models/Match');
const Prediction = require('../models/Prediction');
const { POINTS } = require('../services/sports.service');
router.get('/matches', optionalAuth, async (req, res, next) => {
  try {
    const matches = await Match.find().sort({ kickoff: -1 }).limit(60).lean();
    const mine = req.user ? await Prediction.find({ user: req.user._id, match: { $in: matches.map(m => m._id) } }).lean() : [];
    const by = new Map(mine.map(p => [String(p.match), p]));
    const now = Date.now();
    res.json({ points: POINTS, matches: matches.map(m => ({ ...m, locked: m.status !== 'upcoming' || new Date(m.kickoff) <= now, myPrediction: by.get(String(m._id)) || null })) });
  } catch (e) { next(e); }
});
router.post('/matches/:id/predict', auth, async (req, res, next) => {
  try {
    const home = Number(req.body.home), away = Number(req.body.away);
    if (![home, away].every(n => Number.isInteger(n) && n >= 0 && n <= 30)) return res.status(400).json({ error: 'Enter whole-number scores between 0 and 30.' });
    const m = await Match.findById(req.params.id);
    if (!m) return res.status(404).json({ error: 'Match not found.' });
    if (m.status !== 'upcoming' || m.kickoff <= new Date()) return res.status(400).json({ error: 'Predictions are closed for this match.' });
    const prediction = await Prediction.findOneAndUpdate({ user: req.user._id, match: m._id }, { home, away }, { upsert: true, new: true, setDefaultsOnInsert: true });
    res.json({ prediction });
  } catch (e) { next(e); }
});
router.get('/leaderboard', optionalAuth, async (req, res, next) => {
  try {
    const top = await User.find({ predPoints: { $gt: 0 }, status: 'active' }).sort({ predPoints: -1, createdAt: 1 }).limit(50).select('username displayName avatarUrl isVerified predPoints');
    let me = null;
    if (req.user) me = { points: req.user.predPoints || 0, rank: (await User.countDocuments({ predPoints: { $gt: req.user.predPoints || 0 }, status: 'active' })) + 1 };
    res.json({ leaders: top, me });
  } catch (e) { next(e); }
});
module.exports = router;
