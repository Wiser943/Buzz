const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const allow = require('../middleware/role');
const User = require('../models/User');
const Post = require('../models/Post');
const Report = require('../models/Report');
const Match = require('../models/Match');
const Prediction = require('../models/Prediction');
const Message = require('../models/Message');
const VerificationRequest = require('../models/VerificationRequest');
const notify = require('../services/notify');
const { settle } = require('../services/sports.service');
router.use(auth, allow('moderator', 'admin'));
const esc = s => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const userCard = 'username displayName avatarUrl isVerified status role';
router.get('/stats', async (_req, res, next) => {
  try {
    const week = new Date(Date.now() - 7 * 864e5), day = new Date(Date.now() - 864e5);
    const [users, newUsers, posts, newPosts, openReports, pendingVerification, matches, predictions, messagesToday, suspended] = await Promise.all([
      User.countDocuments(), User.countDocuments({ createdAt: { $gte: week } }), Post.countDocuments({ status: 'published' }), Post.countDocuments({ createdAt: { $gte: week } }),
      Report.countDocuments({ status: 'open' }), VerificationRequest.countDocuments({ status: 'pending' }), Match.countDocuments(), Prediction.countDocuments(), Message.countDocuments({ createdAt: { $gte: day } }), User.countDocuments({ status: { $ne: 'active' } })
    ]);
    res.json({ users, newUsers, posts, newPosts, openReports, pendingVerification, matches, predictions, messagesToday, suspended });
  } catch (e) { next(e); }
});
router.get('/reports', async (req, res, next) => {
  try {
    const status = ['open', 'resolved', 'dismissed'].includes(req.query.status) ? req.query.status : 'open';
    res.json({ reports: await Report.find({ status }).sort({ createdAt: -1 }).limit(50).populate('reporter', userCard).populate('targetUser', userCard).populate({ path: 'targetPost', select: 'text media status author' }) });
  } catch (e) { next(e); }
});
router.post('/reports/:id/resolve', async (req, res, next) => {
  try {
    const r = await Report.findById(req.params.id); if (!r || r.status !== 'open') return res.status(404).json({ error: 'Open report not found.' });
    const { action, note = '' } = req.body || {};
    if (!['remove_post', 'suspend_user', 'warn', 'dismiss'].includes(action)) return res.status(400).json({ error: 'Invalid action.' });
    if (action === 'remove_post') { if (!r.targetPost) return res.status(400).json({ error: 'This report has no post.' }); await Post.updateOne({ _id: r.targetPost }, { status: 'removed' }); await notify(r.targetUser, { type: 'moderation', text: 'Your post has been deleted due to a violation' }); }
    if (action === 'suspend_user') { if (r.targetUser && String((await User.findById(r.targetUser).select('role'))?.role) === 'admin') return res.status(400).json({ error: 'Admins cannot be suspended.' }); await User.updateOne({ _id: r.targetUser }, { status: 'suspended' }); }
    if (action === 'warn') await notify(r.targetUser, { type: 'moderation', text: 'Warning: your account was reported for violating community guidelines.' });
    r.status = action === 'dismiss' ? 'dismissed' : 'resolved'; r.action = action; r.note = String(note).slice(0, 500); r.reviewedBy = req.user._id; await r.save();
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.get('/users', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim(), f = q ? { $or: ['username', 'displayName', 'email'].map(k => ({ [k]: new RegExp(esc(q), 'i') })) } : {};
    res.json({ users: await User.find(f).sort({ createdAt: -1 }).limit(30).select(userCard + ' email karma predPoints createdAt') });
  } catch (e) { next(e); }
});
router.patch('/users/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid user.' });
    const u = await User.findById(req.params.id); if (!u) return res.status(404).json({ error: 'User not found.' });
    const { status, isVerified, role } = req.body || {};
    if (String(u._id) === String(req.user._id) && (status || role)) return res.status(400).json({ error: 'You cannot change your own status or role.' });
    if (u.role === 'admin' && req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can change admins.' });
    if (status !== undefined) { if (!['active', 'suspended', 'banned'].includes(status)) return res.status(400).json({ error: 'Invalid status.' }); u.status = status; }
    if (isVerified !== undefined) u.isVerified = !!isVerified;
    if (role !== undefined) { if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can change roles.' }); if (!['user', 'moderator', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role.' }); u.role = role; }
    await u.save(); res.json({ ok: true });
  } catch (e) { next(e); }
});
router.get('/verification', async (_req, res, next) => {
  try { res.json({ requests: await VerificationRequest.find({ status: 'pending' }).sort({ createdAt: 1 }).limit(50).populate('user', userCard + ' createdAt karma') }); } catch (e) { next(e); }
});
router.post('/verification/:id', async (req, res, next) => {
  try {
    const v = await VerificationRequest.findById(req.params.id); if (!v || v.status !== 'pending') return res.status(404).json({ error: 'Pending request not found.' });
    const approve = req.body?.decision === 'approve'; v.status = approve ? 'approved' : 'rejected'; v.reviewedBy = req.user._id; await v.save();
    if (approve) await User.updateOne({ _id: v.user }, { isVerified: true });
    await notify(v.user, { type: 'verification', text: approve ? 'Your verification request was approved.' : 'Your verification request was not approved.' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.post('/matches', async (req, res, next) => {
  try {
    const { league = '', home, away, kickoff } = req.body || {};
    if (!home || !away || isNaN(Date.parse(kickoff))) return res.status(400).json({ error: 'Home, away and a valid kickoff are required.' });
    res.status(201).json({ match: await Match.create({ league, home, away, kickoff, createdBy: req.user._id }) });
  } catch (e) { next(e); }
});
router.post('/matches/:id/settle', async (req, res, next) => {
  try {
    const h = Number(req.body.homeScore), a = Number(req.body.awayScore);
    if (![h, a].every(n => Number.isInteger(n) && n >= 0 && n <= 30)) return res.status(400).json({ error: 'Enter whole-number scores.' });
    const m = await Match.findById(req.params.id); if (!m) return res.status(404).json({ error: 'Match not found.' });
    res.json({ settled: await settle(m, h, a) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/matches/:id', async (req, res, next) => {
  try { const m = await Match.findById(req.params.id); if (!m) return res.status(404).json({ error: 'Match not found.' }); if (m.status === 'finished') return res.status(400).json({ error: 'Settled matches cannot be deleted.' }); await Prediction.deleteMany({ match: m._id }); await m.deleteOne(); res.json({ ok: true }); } catch (e) { next(e); }
});
module.exports = router;
