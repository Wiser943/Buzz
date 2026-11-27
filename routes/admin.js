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
const Track = require('../models/Track');
const Ad = require('../models/Ad');
const Opportunity = require('../models/Opportunity');
const Appeal = require('../models/Appeal');
const AuditLog = require('../models/AuditLog');
const Post_ = require('../models/Post');
const audit = require('../services/audit');
const { settle } = require('../services/sports.service');
router.use(auth, (req, res, next) => {
  if (req.user?.role === 'admin' || req.user?.role === 'moderator' || req.user?.username === 'wiser943') return next();
  return allow('moderator', 'admin')(req, res, next);
});
// Every change made through the admin API is written to the audit log (who, what, which record, key fields).
router.use((req, res, next) => {
  if (req.method === 'GET') return next();
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const b = req.body || {}, meta = {}; for (const k of ['action', 'decision', 'status', 'role', 'isVerified', 'promoted', 'note']) if (b[k] !== undefined) meta[k] = b[k];
    audit(req, `${req.method} ${(req.route && req.route.path) || req.path}`, 'admin', (req.params && (req.params.id)) || undefined, meta);
  });
  next();
});
const esc = s => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const userCard = 'username displayName avatarUrl isVerified status role';
router.get('/stats', async (_req, res, next) => {
  try {
    const week = new Date(Date.now() - 7 * 864e5), day = new Date(Date.now() - 864e5);
    const [users, newUsers, posts, newPosts, openReports, pendingVerification, matches, predictions, messagesToday, suspended] = await Promise.all([
      User.countDocuments(), User.countDocuments({ createdAt: { $gte: week } }), Post.countDocuments({ status: 'published' }), Post.countDocuments({ createdAt: { $gte: week } }),
      Report.countDocuments({ status: 'open' }), VerificationRequest.countDocuments({ status: 'pending' }), Match.countDocuments(), Prediction.countDocuments(), Message.countDocuments({ createdAt: { $gte: day } }), User.countDocuments({ status: { $ne: 'active' } })
    ]);
    const [pendingAds, pendingOpps, pendingAppeals, tracks] = await Promise.all([Ad.countDocuments({ status: 'pending' }), Opportunity.countDocuments({ status: 'pending' }), Appeal.countDocuments({ status: 'pending' }), Track.countDocuments({ status: 'published' })]);
    res.json({ users, newUsers, posts, newPosts, openReports, pendingVerification, matches, predictions, messagesToday, suspended, tracks, pendingAds, pendingOpps, pendingAppeals });
  } catch (e) { next(e); }
});
router.get('/reports', async (req, res, next) => {
  try {
    const status = ['open', 'resolved', 'dismissed'].includes(req.query.status) ? req.query.status : 'open';
    res.json({ reports: await Report.find({ status }).sort({ createdAt: -1 }).limit(50).populate('reporter', userCard).populate('targetUser', userCard).populate({ path: 'targetPost', select: 'text media status author' }).populate({ path: 'targetTrack', select: 'title audioUrl status' }) });
  } catch (e) { next(e); }
});
router.post('/reports/:id/resolve', async (req, res, next) => {
  try {
    const r = await Report.findById(req.params.id); if (!r || r.status !== 'open') return res.status(404).json({ error: 'Open report not found.' });
    const { action, note = '' } = req.body || {};
    if (!['remove_post', 'takedown_track', 'suspend_user', 'warn', 'dismiss'].includes(action)) return res.status(400).json({ error: 'Invalid action.' });
    if (action === 'remove_post') { if (!r.targetPost) return res.status(400).json({ error: 'This report has no post.' }); await Post.updateOne({ _id: r.targetPost }, { status: 'removed' }); await notify(r.targetUser, { type: 'moderation', text: 'Your post has been deleted due to a violation', target: { kind: 'post', id: r.targetPost } }); }
    if (action === 'takedown_track') {
      if (!r.targetTrack) return res.status(400).json({ error: 'This report has no track.' });
      await Track.updateOne({ _id: r.targetTrack }, { status: 'removed' });
      // Repeat-infringer policy: 3 strikes suspends the account (can be appealed).
      const owner = await User.findByIdAndUpdate(r.targetUser, { $inc: { strikes: 1 } }, { new: true });
      await notify(r.targetUser, { type: 'takedown', text: r.category === 'copyright' ? 'Your track was removed after a copyright complaint. You can appeal if you believe this is a mistake.' : 'Your track was removed for violating the rules.', target: { kind: 'track', id: r.targetTrack } });
      if (owner && owner.strikes >= 3 && owner.role === 'user' && owner.status === 'active') { owner.status = 'suspended'; await owner.save(); }
    }
    if (action === 'suspend_user') { if (r.targetUser && String((await User.findById(r.targetUser).select('role'))?.role) === 'admin') return res.status(400).json({ error: 'Admins cannot be suspended.' }); await User.updateOne({ _id: r.targetUser }, { status: 'suspended' }); }
    if (action === 'warn') await notify(r.targetUser, { type: 'moderation', text: 'Warning: your account was reported for violating community guidelines.' });
    r.status = action === 'dismiss' ? 'dismissed' : 'resolved'; r.action = action; r.note = String(note).slice(0, 500); r.reviewedBy = req.user._id; await r.save();
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.get('/ads', async (req, res, next) => {
  try { const st = ['pending', 'approved', 'rejected', 'paused', 'ended'].includes(req.query.status) ? req.query.status : 'pending'; res.json({ ads: await Ad.find({ status: st }).sort({ createdAt: 1 }).limit(50).populate('advertiser', userCard) }); } catch (e) { next(e); }
});
router.post('/ads/:id', async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id); if (!ad || ad.status !== 'pending') return res.status(404).json({ error: 'Pending ad not found.' });
    const ok = req.body?.decision === 'approve'; ad.status = ok ? 'approved' : 'rejected'; ad.reviewNote = String(req.body?.note || '').slice(0, 300);
    if (ok) { ad.startsAt = new Date(); ad.endsAt = new Date(Date.now() + ad.days * 864e5); } await ad.save();
    await notify(ad.advertiser, { type: 'system', text: ok ? `Your ad “${ad.title}” was approved and is now running.` : `Your ad “${ad.title}” was not approved.${ad.reviewNote ? ' ' + ad.reviewNote : ''}` });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.get('/opportunities', async (req, res, next) => {
  try { const st = ['pending', 'approved', 'rejected', 'closed'].includes(req.query.status) ? req.query.status : 'pending'; res.json({ opportunities: await Opportunity.find({ status: st }).sort({ createdAt: 1 }).limit(50).populate('poster', userCard) }); } catch (e) { next(e); }
});
router.post('/opportunities/:id', async (req, res, next) => {
  try {
    const o = await Opportunity.findById(req.params.id); if (!o) return res.status(404).json({ error: 'Opportunity not found.' });
    if (req.body?.promoted !== undefined) { o.promoted = !!req.body.promoted; await o.save(); return res.json({ ok: true }); }
    if (o.status !== 'pending') return res.status(400).json({ error: 'Already reviewed.' });
    const ok = req.body?.decision === 'approve'; o.status = ok ? 'approved' : 'rejected'; o.reviewNote = String(req.body?.note || '').slice(0, 300); await o.save();
    await notify(o.poster, { type: 'opportunity', text: ok ? `“${o.title}” is now live in Opportunities.` : `“${o.title}” was not approved.${o.reviewNote ? ' ' + o.reviewNote : ''}` });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.get('/appeals', async (_req, res, next) => {
  try { res.json({ appeals: await Appeal.find({ status: 'pending' }).sort({ createdAt: 1 }).limit(50).populate('user', userCard) }); } catch (e) { next(e); }
});
router.post('/appeals/:id', async (req, res, next) => {
  try {
    const a = await Appeal.findById(req.params.id); if (!a || a.status !== 'pending') return res.status(404).json({ error: 'Pending appeal not found.' });
    const ok = req.body?.decision === 'approve'; a.status = ok ? 'approved' : 'denied'; a.decidedBy = req.user._id; a.note = String(req.body?.note || '').slice(0, 300); await a.save();
    if (ok) {
      if (a.targetType === 'post') await Post_.updateOne({ _id: a.targetId }, { status: 'published' });
      if (a.targetType === 'track') await Track.updateOne({ _id: a.targetId }, { status: 'published' });
      if (a.targetType === 'account') await User.updateOne({ _id: a.user }, { status: 'active', strikes: 0 });
    }
    await notify(a.user, { type: 'appeal', text: ok ? 'Your appeal was approved. Your content or account has been restored.' : `Your appeal was denied.${a.note ? ' ' + a.note : ''}` });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.get('/audit', allow('admin'), async (_req, res, next) => {
  try { res.json({ logs: await AuditLog.find().sort({ _id: -1 }).limit(100).populate('actor', 'username role') }); } catch (e) { next(e); }
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
