const router = require('express').Router();
const Post = require('../models/Post');
const auth = require('../middleware/auth');
router.get('/', async (_req, res) => {
  const posts = await Post.find({ status: 'published', visibility: 'public' }).sort({ createdAt: -1 }).limit(50).populate('author', 'username displayName avatarUrl isVerified');
  res.json({ posts });
});
router.post('/', auth, async (req, res) => {
  const { text = '', media = [], mediaType = 'none' } = req.body || {};
  if (!text.trim() && !media.length) return res.status(400).json({ error: 'A post needs text or media.' });
  if (mediaType === 'video' && !req.user.canUploadVideo()) return res.status(403).json({ error: 'Video upload requires active Premium or a Verified badge.' });
  const post = await Post.create({ author: req.user._id, text, media, mediaType });
  res.status(201).json({ post });
});
module.exports = router;
