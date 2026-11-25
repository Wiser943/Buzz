const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Story = require('../models/Story');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
const { scan } = require('../services/moderation.service');
router.use(auth);
const U = 'username displayName avatarUrl isVerified';
router.post('/', async (req, res, next) => {
  try {
    const { mediaUrl, mediaType, text = '' } = req.body || {};
    if (typeof mediaUrl !== 'string' || mediaUrl.length > 2048 || !['image', 'video'].includes(mediaType)) return res.status(400).json({ error: 'A story needs one photo or video.' });
    if (mediaType === 'video' && !req.user.canUploadVideo()) return res.status(403).json({ error: 'Video stories require Premium or a Verified badge.' });
    if (await Story.countDocuments({ author: req.user._id }) >= 20) return res.status(400).json({ error: 'You have too many active stories.' });
    const s = scan(text); if (s.reject) return res.status(400).json({ error: 'Your caption contains disallowed words.' });
    res.status(201).json({ story: await Story.create({ author: req.user._id, mediaUrl, mediaType, text: String(text).slice(0, 200) }) });
  } catch (e) { next(e); }
});
router.get('/', async (req, res, next) => {
  try {
    const following = (await Follow.find({ follower: req.user._id }).select('following')).map(f => f.following);
    const blocked = (await Block.find({ $or: [{ blocker: req.user._id }, { blocked: req.user._id }] })).map(b => String(b.blocker) === String(req.user._id) ? String(b.blocked) : String(b.blocker));
    const authors = [req.user._id, ...following].filter(a => !blocked.includes(String(a)));
    const stories = await Story.find({ author: { $in: authors }, expiresAt: { $gt: new Date() } }).sort({ createdAt: 1 }).populate('author', U).lean();
    const groups = new Map();
    for (const s of stories) {
      const k = String(s.author._id); if (!groups.has(k)) groups.set(k, { user: s.author, stories: [], mine: k === String(req.user._id) });
      groups.get(k).stories.push({ _id: s._id, mediaUrl: s.mediaUrl, mediaType: s.mediaType, text: s.text, createdAt: s.createdAt, seen: s.viewers.some(v => String(v) === String(req.user._id)), views: k === String(req.user._id) ? s.viewers.length : undefined });
    }
    const out = [...groups.values()].map(g => ({ ...g, seen: g.stories.every(s => s.seen) }));
    out.sort((a, b) => (b.mine - a.mine) || (a.seen - b.seen));
    res.json({ groups: out });
  } catch (e) { next(e); }
});
router.post('/:id/view', async (req, res, next) => {
  try { if (mongoose.isValidObjectId(req.params.id)) await Story.updateOne({ _id: req.params.id }, { $addToSet: { viewers: req.user._id } }); res.json({ ok: true }); } catch (e) { next(e); }
});
router.delete('/:id', async (req, res, next) => {
  try { await Story.deleteOne({ _id: req.params.id, author: req.user._id }); res.json({ ok: true }); } catch (e) { next(e); }
});
module.exports = router;
