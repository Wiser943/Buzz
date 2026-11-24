const router = require('express').Router();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const Block = require('../models/Block');
const notify = require('../services/notify');
const streak = require('../services/streak');
const rateLimit = require('../middleware/rateLimit');
const Membership = require('../models/Membership');
const User = require('../models/User');
const { scan, autoReport } = require('../services/moderation.service');

const populateAuthor = { path: 'author', select: 'username displayName avatarUrl isVerified' };
const populateRepost = { path: 'repostOf', select: 'text media mediaType author createdAt status likes commentsCount repostsCount', populate: populateAuthor };
const visible = p => !p.isRepost || (p.repostOf && p.repostOf.status === 'published');

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const query = { status: 'published', visibility: 'public', threadRoot: null };
    if (req.user) { const hidden = (await Block.find({ $or: [{ blocker: req.user._id }, { blocked: req.user._id }] })).map(b => String(b.blocker) === String(req.user._id) ? b.blocked : b.blocker); if (hidden.length) query.author = { $nin: hidden }; }
    if (req.query.before && mongoose.isValidObjectId(req.query.before)) query._id = { $lt: req.query.before };
    if (mongoose.isValidObjectId(req.query.community)) query.community = req.query.community;
    const posts = (await Post.find(query).sort({ _id: -1 }).limit(limit).populate(populateAuthor).populate(populateRepost)).filter(visible);
    res.json({ posts, nextCursor: posts.length === limit ? posts[posts.length - 1]._id : null });
  } catch (err) { next(err); }
});
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid post id.' });
    const post = await Post.findById(req.params.id).populate(populateAuthor).populate(populateRepost);
    if (!post || post.status !== 'published') return res.status(404).json({ error: 'Post not found.' });
    res.json({ post });
  } catch (err) { next(err); }
});
router.post('/', auth, rateLimit({ windowMs: 3600e3, max: 40, by: 'user', message: 'Posting limit reached. Try again later.' }), async (req, res, next) => {
  try {
    const { text = '', media = [], mediaType = 'none', communityId, threadOf } = req.body || {};
    const cleanText = typeof text === 'string' ? text.trim() : '';
    if (!cleanText && (!Array.isArray(media) || !media.length)) return res.status(400).json({ error: 'A post needs text or media.' });
    if (cleanText.length > 5000) return res.status(400).json({ error: 'Post text is too long.' });
    if (!['none', 'image', 'video'].includes(mediaType)) return res.status(400).json({ error: 'Invalid media type.' });
    if (mediaType === 'video' && !req.user.canUploadVideo()) return res.status(403).json({ error: 'Video upload requires active Premium or a Verified badge.' });
    if (!Array.isArray(media) || media.length > 4 || media.some(x => typeof x !== 'string' || x.length > 2048)) return res.status(400).json({ error: 'Invalid media list.' });
    const sc = scan(cleanText); if (sc.reject) return res.status(400).json({ error: 'Your post contains disallowed words.' });
    let community = null;
    if (communityId) { if (!mongoose.isValidObjectId(communityId) || !(await Membership.exists({ community: communityId, user: req.user._id }))) return res.status(403).json({ error: 'Join the community before posting in it.' }); community = communityId; }
    let root = null;
    if (threadOf) {
      if (!mongoose.isValidObjectId(threadOf)) return res.status(400).json({ error: 'Invalid thread.' });
      root = await Post.findById(threadOf);
      if (!root || root.status !== 'published' || root.isRepost || root.threadRoot) return res.status(404).json({ error: 'Thread not found.' });
      if (!root.author.equals(req.user._id)) return res.status(403).json({ error: 'You can only add to your own thread.' });
      if (root.threadCount >= 24) return res.status(400).json({ error: 'A thread can have up to 25 posts.' });
      community = root.community;
    }
    const post = await Post.create({ author: req.user._id, text: cleanText, media, mediaType, community, threadRoot: root ? root._id : null });
    if (root) await Post.updateOne({ _id: root._id }, { $inc: { threadCount: 1 } });
    streak.touch(req.user._id);
    await autoReport({ targetType: 'post', targetUser: req.user._id, targetPost: post._id, flags: sc.flags });
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
    if (!liked) await notify(post.author, { type: 'like', actor: req.user._id, post: post._id });
    res.json({ liked: !liked, likesCount: post.likes.length });
  } catch (err) { next(err); }
});
router.get('/:id/thread', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid post id.' });
    const p = await Post.findById(req.params.id).select('threadRoot status');
    if (!p || p.status !== 'published') return res.status(404).json({ error: 'Post not found.' });
    const rootId = p.threadRoot || p._id;
    const root = await Post.findOne({ _id: rootId, status: 'published' }).populate(populateAuthor);
    if (!root) return res.status(404).json({ error: 'Thread not found.' });
    const parts = await Post.find({ threadRoot: rootId, status: 'published' }).sort({ _id: 1 }).limit(24).populate(populateAuthor);
    res.json({ root, parts });
  } catch (err) { next(err); }
});
router.get('/:id/likes', optionalAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid post id.' });
    const post = await Post.findById(req.params.id).populate({ path: 'likes', select: 'username displayName avatarUrl isVerified', options: { limit: 100 } });
    if (!post || post.status !== 'published') return res.status(404).json({ error: 'Post not found.' });
    res.json({ users: post.likes, total: post.likes.length });
  } catch (err) { next(err); }
});
router.post('/:id/pin', auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid post id.' });
    const post = await Post.findById(req.params.id);
    if (!post || post.status !== 'published') return res.status(404).json({ error: 'Post not found.' });
    if (!post.author.equals(req.user._id)) return res.status(403).json({ error: 'You can only pin your own posts.' });
    if (!post.pinned && await Post.countDocuments({ author: req.user._id, pinned: true, status: 'published' }) >= 3) return res.status(400).json({ error: 'You can pin up to 3 posts. Unpin one first.' });
    post.pinned = !post.pinned; await post.save();
    res.json({ pinned: post.pinned });
  } catch (err) { next(err); }
});
router.delete('/:id', auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid post id.' });
    const post = await Post.findById(req.params.id);
    if (!post || post.status === 'removed') return res.status(404).json({ error: 'Post not found.' });
    if (!post.author.equals(req.user._id)) return res.status(403).json({ error: 'You can only delete your own posts.' });
    post.status = 'removed'; post.pinned = false; await post.save();
    if (post.threadCount > 0) await Post.updateMany({ threadRoot: post._id, status: 'published' }, { status: 'removed' });
    if (post.threadRoot) await Post.updateOne({ _id: post.threadRoot, threadCount: { $gt: 0 } }, { $inc: { threadCount: -1 } });
    if (post.isRepost && post.repostOf) await Post.updateOne({ _id: post.repostOf, repostsCount: { $gt: 0 } }, { $inc: { repostsCount: -1 } });
    res.json({ deleted: true });
  } catch (err) { next(err); }
});
router.post('/:id/repost', auth, rateLimit({ max: 30, by: 'user' }), async (req, res, next) => {
  try {
    const orig = await Post.findById(req.params.id);
    if (!orig || orig.status !== 'published' || orig.isRepost) return res.status(404).json({ error: 'Post not found.' });
    if (orig.author.equals(req.user._id)) return res.status(400).json({ error: 'You cannot repost your own post.' });
    const mine = await Post.findOne({ author: req.user._id, repostOf: orig._id, status: 'published' });
    if (mine) { mine.status = 'removed'; await mine.save(); await Post.updateOne({ _id: orig._id, repostsCount: { $gt: 0 } }, { $inc: { repostsCount: -1 } }); return res.json({ reposted: false, repostsCount: Math.max(0, orig.repostsCount - 1) }); }
    await Post.create({ author: req.user._id, repostOf: orig._id, isRepost: true, text: '' });
    await Post.updateOne({ _id: orig._id }, { $inc: { repostsCount: 1 } });
    await notify(orig.author, { type: 'repost', actor: req.user._id, post: orig._id });
    res.status(201).json({ reposted: true, repostsCount: orig.repostsCount + 1 });
  } catch (err) { next(err); }
});
router.get('/:id/comments', optionalAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid post id.' });
    const me = req.user ? String(req.user._id) : null;
    const rows = await Comment.find({ post: req.params.id }).sort({ createdAt: 1 }).limit(100).populate('author', 'username displayName avatarUrl isVerified');
    const comments = rows.map(c => { const o = c.toObject(); delete o.up; delete o.down; return { ...o, score: c.up.length - c.down.length, myVote: me ? (c.up.some(i => String(i) === me) ? 1 : c.down.some(i => String(i) === me) ? -1 : 0) : 0 }; });
    res.json({ comments });
  } catch (err) { next(err); }
});
router.post('/:id/comments', auth, rateLimit({ windowMs: 600e3, max: 40, by: 'user', message: 'You are commenting too fast.' }), async (req, res, next) => {
  try {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text || text.length > 1200) return res.status(400).json({ error: 'Comment must be between 1 and 1200 characters.' });
    const sc = scan(text); if (sc.reject) return res.status(400).json({ error: 'Your comment contains disallowed words.' });
    const post = await Post.findById(req.params.id);
    if (!post || post.status !== 'published') return res.status(404).json({ error: 'Post not found.' });
    const comment = await Comment.create({ post: post._id, author: req.user._id, text });
    post.commentsCount += 1;
    await post.save();
    streak.touch(req.user._id);
    await notify(post.author, { type: 'comment', actor: req.user._id, post: post._id, text: text.slice(0, 80) });
    await comment.populate('author', 'username displayName avatarUrl isVerified');
    res.status(201).json({ comment, commentsCount: post.commentsCount });
  } catch (err) { next(err); }
});
router.post('/:id/comments/:cid/vote', auth, rateLimit({ max: 120, by: 'user' }), async (req, res, next) => {
  try {
    const dir = Number(req.body?.dir); if (![-1, 0, 1].includes(dir)) return res.status(400).json({ error: 'Invalid vote.' });
    const c = await Comment.findOne({ _id: req.params.cid, post: req.params.id }); if (!c) return res.status(404).json({ error: 'Comment not found.' });
    const wasUp = c.up.some(i => i.equals(req.user._id));
    c.up.pull(req.user._id); c.down.pull(req.user._id); if (dir === 1) c.up.addToSet(req.user._id); if (dir === -1) c.down.addToSet(req.user._id); await c.save();
    // Karma: +1 for each upvote received, -1 when withdrawn (never below zero, no self-votes).
    if (!c.author.equals(req.user._id)) {
      if (!wasUp && dir === 1) await User.updateOne({ _id: c.author }, { $inc: { karma: 1 } });
      if (wasUp && dir !== 1) await User.updateOne({ _id: c.author, karma: { $gt: 0 } }, { $inc: { karma: -1 } });
    }
    res.json({ score: c.up.length - c.down.length, myVote: dir });
  } catch (err) { next(err); }
});
module.exports = router;
