const router = require('express').Router();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');

const populateAuthor = { path: 'author', select: 'username displayName avatarUrl isVerified' };

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const query = { status: 'published', visibility: 'public' };
    if (req.query.before && mongoose.isValidObjectId(req.query.before)) query._id = { $lt: req.query.before };
    const posts = await Post.find(query).sort({ _id: -1 }).limit(limit).populate(populateAuthor);
    res.json({ posts, nextCursor: posts.length === limit ? posts[posts.length - 1]._id : null });
  } catch (err) { next(err); }
});
router.post('/', auth, async (req, res, next) => {
  try {
    const { text = '', media = [], mediaType = 'none' } = req.body || {};
    const cleanText = typeof text === 'string' ? text.trim() : '';
    if (!cleanText && (!Array.isArray(media) || !media.length)) return res.status(400).json({ error: 'A post needs text or media.' });
    if (cleanText.length > 5000) return res.status(400).json({ error: 'Post text is too long.' });
    if (!['none', 'image', 'video'].includes(mediaType)) return res.status(400).json({ error: 'Invalid media type.' });
    if (mediaType === 'video' && !req.user.canUploadVideo()) return res.status(403).json({ error: 'Video upload requires active Premium or a Verified badge.' });
    if (!Array.isArray(media) || media.length > 4 || media.some(x => typeof x !== 'string' || x.length > 2048)) return res.status(400).json({ error: 'Invalid media list.' });
    const post = await Post.create({ author: req.user._id, text: cleanText, media, mediaType });
    await post.populate(populateAuthor);
    res.status(201).json({ post });
  } catch (err) { next(err); }
});
router.post('/:id/like', auth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.status !== 'published') return res.status(404).json({ error: 'Post not found.' });
    const liked = post.likes.some(id => id.equals(req.user._id));
    if (liked) post.likes.pull(req.user._id); else post.likes.addToSet(req.user._id);
    await post.save();
    res.json({ liked: !liked, likesCount: post.likes.length });
  } catch (err) { next(err); }
});
router.get('/:id/comments', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid post id.' });
    const comments = await Comment.find({ post: req.params.id }).sort({ createdAt: 1 }).limit(100).populate('author', 'username displayName avatarUrl isVerified');
    res.json({ comments });
  } catch (err) { next(err); }
});
router.post('/:id/comments', auth, async (req, res, next) => {
  try {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text || text.length > 1200) return res.status(400).json({ error: 'Comment must be between 1 and 1200 characters.' });
    const post = await Post.findById(req.params.id);
    if (!post || post.status !== 'published') return res.status(404).json({ error: 'Post not found.' });
    const comment = await Comment.create({ post: post._id, author: req.user._id, text });
    post.commentsCount += 1;
    await post.save();
    await comment.populate('author', 'username displayName avatarUrl isVerified');
    res.status(201).json({ comment, commentsCount: post.commentsCount });
  } catch (err) { next(err); }
});
module.exports = router;
