const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Post = require('../models/Post');
const Report = require('../models/Report');
const Block = require('../models/Block');
const VerificationRequest = require('../models/VerificationRequest');
const Track = require('../models/Track');
const notify = require('../services/notify');
const audit = require('../services/audit');
const rateLimit = require('../middleware/rateLimit');
const AUTO_HIDE = parseInt(process.env.AUTO_HIDE_REPORTS) || 3;
router.use(auth);
router.post('/reports', rateLimit({ windowMs: 3600e3, max: 30, by: 'user' }), async (req, res, next) => {
  try {
    const { targetType, username, postId, trackId, reason = '', category = 'general', claimant } = req.body || {};
    if (!['user', 'post', 'profile_picture', 'track'].includes(targetType)) return res.status(400).json({ error: 'Invalid report type.' });
    const doc = { reporter: req.user._id, targetType, reason: String(reason).slice(0, 500), category: category === 'copyright' ? 'copyright' : 'general' };
    if (targetType === 'post') {
      if (!mongoose.isValidObjectId(postId)) return res.status(400).json({ error: 'Invalid post.' });
      const post = await Post.findById(postId); if (!post) return res.status(404).json({ error: 'Post not found.' });
      doc.targetPost = post._id; doc.targetUser = post.author;
    } else if (targetType === 'track') {
      if (!mongoose.isValidObjectId(trackId)) return res.status(400).json({ error: 'Invalid track.' });
      const t = await Track.findById(trackId); if (!t) return res.status(404).json({ error: 'Track not found.' });
      doc.targetTrack = t._id; doc.targetUser = t.owner;
      if (doc.category === 'copyright') {
        const c = claimant || {};
        if (!String(c.name || '').trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c.email || '')) || String(c.detail || '').trim().length < 20) return res.status(400).json({ error: 'A copyright claim needs your name, a valid email and at least 20 characters describing the work you own.' });
        doc.claimant = { name: String(c.name).trim().slice(0, 80), email: String(c.email).trim().slice(0, 120), detail: String(c.detail).trim().slice(0, 1000) };
      }
    } else {
      const u = await User.findOne({ username: String(username || '').toLowerCase() }); if (!u) return res.status(404).json({ error: 'User not found.' });
      if (String(u._id) === String(req.user._id)) return res.status(400).json({ error: 'You cannot report yourself.' });
      doc.targetUser = u._id;
    }
    const same = { status: 'open', targetType, targetUser: doc.targetUser, targetPost: doc.targetPost, targetTrack: doc.targetTrack };
    if (await Report.exists({ ...same, reporter: req.user._id })) return res.json({ ok: true, duplicate: true });
    await Report.create(doc);
    // Several different people reporting the same post/track hides it automatically until a moderator reviews it.
    if (doc.targetPost || doc.targetTrack) {
      const who = await Report.distinct('reporter', same);
      if (who.length >= AUTO_HIDE) {
        if (doc.targetPost && (await Post.updateOne({ _id: doc.targetPost, status: 'published' }, { status: 'removed' })).modifiedCount) { await notify(doc.targetUser, { type: 'moderation', text: 'Your post was hidden after multiple reports and is waiting for review.', target: { kind: 'post', id: doc.targetPost } }); await audit({ ip: req.ip }, 'auto_hide.post', 'post', doc.targetPost); }
        if (doc.targetTrack && (await Track.updateOne({ _id: doc.targetTrack, status: 'published' }, { status: 'removed' })).modifiedCount) { await notify(doc.targetUser, { type: 'moderation', text: 'Your track was hidden after multiple reports and is waiting for review.', target: { kind: 'track', id: doc.targetTrack } }); await audit({ ip: req.ip }, 'auto_hide.track', 'track', doc.targetTrack); }
      }
    }
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});
router.get('/blocks', async (req, res, next) => { try { res.json({ blocked: (await Block.find({ blocker: req.user._id }).select('blocked')).map(b => b.blocked) }); } catch (e) { next(e); } });
router.post('/block/:username', async (req, res, next) => {
  try {
    const u = await User.findOne({ username: String(req.params.username).toLowerCase() }); if (!u) return res.status(404).json({ error: 'User not found.' });
    if (String(u._id) === String(req.user._id)) return res.status(400).json({ error: 'You cannot block yourself.' });
    await Block.updateOne({ blocker: req.user._id, blocked: u._id }, { $setOnInsert: {} }, { upsert: true }); res.json({ ok: true });
  } catch (e) { next(e); }
});
router.delete('/block/:username', async (req, res, next) => {
  try { const u = await User.findOne({ username: String(req.params.username).toLowerCase() }); if (u) await Block.deleteOne({ blocker: req.user._id, blocked: u._id }); res.json({ ok: true }); } catch (e) { next(e); }
});
router.post('/verification-request', async (req, res, next) => {
  try {
    const plan = req.body?.plan; if (!['creator', 'athlete'].includes(plan)) return res.status(400).json({ error: 'Choose a badge.' });
    if (req.user.isVerified) return res.status(400).json({ error: 'You are already verified.' });
    if (await VerificationRequest.exists({ user: req.user._id, status: 'pending' })) return res.status(400).json({ error: 'You already have a pending request.' });
    await VerificationRequest.create({ user: req.user._id, plan }); res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});
module.exports = router;
