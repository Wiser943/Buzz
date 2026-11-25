const router = require('express').Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
const optionalAuth = require('../middleware/optionalAuth');
const A = 'username displayName avatarUrl isVerified';
async function hiddenIds(user) {
  if (!user) return [];
  const bs = await Block.find({ $or: [{ blocker: user._id }, { blocked: user._id }] });
  return bs.map(b => String(b.blocker) === String(user._id) ? b.blocked : b.blocker);
}
// Trending: likes + 2x comments + 3x reposts over the last 14 days; falls back to the newest posts on a quiet network.
router.get('/trending', optionalAuth, async (req, res, next) => {
  try {
    const hidden = await hiddenIds(req.user);
    const base = { status: 'published', visibility: 'public', isRepost: false, threadRoot: null };
    if (hidden.length) base.author = { $nin: hidden };
    const rows = await Post.aggregate([
      { $match: { ...base, createdAt: { $gte: new Date(Date.now() - 14 * 864e5) } } },
      { $addFields: { score: { $add: [{ $size: { $ifNull: ['$likes', []] } }, { $multiply: [{ $ifNull: ['$commentsCount', 0] }, 2] }, { $multiply: [{ $ifNull: ['$repostsCount', 0] }, 3] }] } } },
      { $match: { score: { $gt: 0 } } }, { $sort: { score: -1, _id: -1 } }, { $limit: 12 }
    ]);
    let posts = rows;
    if (posts.length < 6) {
      const have = posts.map(p => p._id);
      const more = await Post.find({ ...base, _id: { $nin: have } }).sort({ _id: -1 }).limit(12 - posts.length).lean();
      posts = [...posts, ...more];
    }
    res.json({ posts: await Post.populate(posts, { path: 'author', select: A }) });
  } catch (e) { next(e); }
});
router.get('/people', optionalAuth, async (req, res, next) => {
  try {
    const exclude = await hiddenIds(req.user);
    if (req.user) { exclude.push(req.user._id); exclude.push(...(await Follow.find({ follower: req.user._id }).select('following')).map(f => f.following)); }
    const users = await User.find({ status: 'active', _id: { $nin: exclude } }).sort({ karma: -1, createdAt: -1 }).limit(12).select(A + ' bio');
    res.json({ users });
  } catch (e) { next(e); }
});
module.exports = router;
