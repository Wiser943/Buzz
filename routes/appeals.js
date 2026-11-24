const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const Appeal = require('../models/Appeal');
const Post = require('../models/Post');
const Track = require('../models/Track');
const User = require('../models/User');
// Public: suspended users cannot log in, so they appeal with their email. Response is always generic (no email enumeration).
router.post('/account', rateLimit({ windowMs: 3600e3, max: 5, message: 'Too many appeals from this network. Try again later.' }), async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase(), reason = String(req.body?.reason || '').trim();
    if (reason.length < 10 || reason.length > 1000) return res.status(400).json({ error: 'Explain your appeal in 10–1000 characters.' });
    const u = await User.findOne({ email });
    if (u && u.status !== 'active' && !(await Appeal.exists({ user: u._id, targetType: 'account', status: 'pending' }))) await Appeal.create({ user: u._id, targetType: 'account', reason });
    res.json({ ok: true, message: 'If that account is suspended, your appeal has been sent for review.' });
  } catch (e) { next(e); }
});
router.post('/', auth, rateLimit({ windowMs: 3600e3, max: 10, by: 'user' }), async (req, res, next) => {
  try {
    const { targetType, targetId } = req.body || {}, reason = String(req.body?.reason || '').trim();
    if (!['post', 'track'].includes(targetType) || !mongoose.isValidObjectId(targetId)) return res.status(400).json({ error: 'Invalid appeal.' });
    if (reason.length < 10 || reason.length > 1000) return res.status(400).json({ error: 'Explain your appeal in 10–1000 characters.' });
    const t = targetType === 'post' ? await Post.findById(targetId) : await Track.findById(targetId);
    const owner = t && String(t.author || t.owner);
    if (!t || owner !== String(req.user._id) || t.status !== 'removed') return res.status(404).json({ error: 'Nothing to appeal.' });
    if (await Appeal.exists({ user: req.user._id, targetType, targetId, status: 'pending' })) return res.status(409).json({ error: 'You already have a pending appeal for this.' });
    await Appeal.create({ user: req.user._id, targetType, targetId, reason }); res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});
router.get('/mine', auth, async (req, res, next) => { try { res.json({ appeals: await Appeal.find({ user: req.user._id }).sort({ _id: -1 }).limit(30) }); } catch (e) { next(e); } });
module.exports = router;
