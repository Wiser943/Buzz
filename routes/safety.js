const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Post = require('../models/Post');
const Report = require('../models/Report');
const Block = require('../models/Block');
const VerificationRequest = require('../models/VerificationRequest');
router.use(auth);
router.post('/reports', async (req, res, next) => {
  try {
    const { targetType, username, postId, reason = '' } = req.body || {};
    if (!['user', 'post', 'profile_picture'].includes(targetType)) return res.status(400).json({ error: 'Invalid report type.' });
    const doc = { reporter: req.user._id, targetType, reason: String(reason).slice(0, 500) };
    if (targetType === 'post') {
      if (!mongoose.isValidObjectId(postId)) return res.status(400).json({ error: 'Invalid post.' });
      const post = await Post.findById(postId); if (!post) return res.status(404).json({ error: 'Post not found.' });
      doc.targetPost = post._id; doc.targetUser = post.author;
    } else {
      const u = await User.findOne({ username: String(username || '').toLowerCase() }); if (!u) return res.status(404).json({ error: 'User not found.' });
      if (String(u._id) === String(req.user._id)) return res.status(400).json({ error: 'You cannot report yourself.' });
      doc.targetUser = u._id;
    }
    if (await Report.exists({ reporter: req.user._id, status: 'open', targetType, targetUser: doc.targetUser, targetPost: doc.targetPost })) return res.json({ ok: true, duplicate: true });
    await Report.create(doc); res.status(201).json({ ok: true });
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
