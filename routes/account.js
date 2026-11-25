const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const authService = require('../services/auth.service');
const { view: streakView } = require('../services/streak');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
const Token = require('../models/Token');
const lazy = n => { try { return require('../models/' + n); } catch (_) { return null; } };
router.use(auth);
const card = 'username displayName avatarUrl isVerified';
const bool = v => typeof v === 'boolean';

router.get('/settings', (req, res) => {
  const u = req.user, s = u.settings || {};
  res.json({ email: u.email, emailVerified: !!u.emailVerified, supportEmail: process.env.SUPPORT_EMAIL || '', aiEnabled: !!process.env.GEMINI_API_KEY, isAdmin: u.role === 'admin', settings: { notif: { likes: true, comments: true, follows: true, reposts: true, mentions: true, ...(s.notif?.toObject?.() || s.notif || {}) }, privacy: { showStreak: true, allowMessages: 'mutual', ...(s.privacy?.toObject?.() || s.privacy || {}) } }, proDashboard: !!u.proDashboard });
});
router.patch('/settings', async (req, res, next) => {
  try {
    const set = {}, n = req.body?.notif || {}, p = req.body?.privacy || {};
    for (const k of ['likes', 'comments', 'follows', 'reposts', 'mentions']) if (bool(n[k])) set['settings.notif.' + k] = n[k];
    if (bool(p.showStreak)) set['settings.privacy.showStreak'] = p.showStreak;
    if (['mutual', 'nobody'].includes(p.allowMessages)) set['settings.privacy.allowMessages'] = p.allowMessages;
    if (!Object.keys(set).length) return res.status(400).json({ error: 'Nothing to update.' });
    await User.updateOne({ _id: req.user._id }, { $set: set });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.post('/password', rateLimit({ windowMs: 3600e3, max: 10, by: 'user', message: 'Too many attempts. Try again later.' }), async (req, res, next) => {
  try {
    const cur = String(req.body?.current || ''), next_ = String(req.body?.next || '');
    if (next_.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    const u = await User.findById(req.user._id);
    if (!(await bcrypt.compare(cur, u.passwordHash))) return res.status(400).json({ error: 'Current password is incorrect.' });
    u.passwordHash = await bcrypt.hash(next_, 12); u.passwordChangedAt = new Date(); await u.save();
    res.json({ ok: true, token: authService.tokenFor(u) });
  } catch (e) { next(e); }
});
router.get('/blocked', async (req, res, next) => {
  try { res.json({ users: (await Block.find({ blocker: req.user._id }).sort({ _id: -1 }).limit(200).populate('blocked', card)).map(b => b.blocked).filter(Boolean) }); } catch (e) { next(e); }
});
router.get('/export', rateLimit({ windowMs: 3600e3, max: 5, by: 'user' }), async (req, res, next) => {
  try {
    const me = req.user._id, Prediction = lazy('Prediction');
    const [posts, comments, following, followers] = await Promise.all([
      Post.find({ author: me, status: 'published' }).select('text media mediaType createdAt likes commentsCount repostsCount').lean(),
      Comment.find({ author: me }).select('text createdAt post').lean(),
      Follow.find({ follower: me }).populate('following', 'username').lean(), Follow.find({ following: me }).populate('follower', 'username').lean()
    ]);
    const predictions = Prediction ? await Prediction.find({ user: me }).lean() : [];
    const u = req.user.toObject(); delete u.passwordHash;
    res.setHeader('Content-Disposition', 'attachment; filename="buzzer-data.json"');
    res.json({ exportedAt: new Date(), profile: u, posts: posts.map(p => ({ ...p, likes: (p.likes || []).length })), comments, following: following.map(f => f.following?.username).filter(Boolean), followers: followers.map(f => f.follower?.username).filter(Boolean), predictions });
  } catch (e) { next(e); }
});
// Permanent deletion. Posts are removed from view, personal records are erased, then the account itself is deleted.
router.delete('/', rateLimit({ windowMs: 3600e3, max: 5, by: 'user' }), async (req, res, next) => {
  try {
    const u = await User.findById(req.user._id);
    if (!(await bcrypt.compare(String(req.body?.password || ''), u.passwordHash))) return res.status(400).json({ error: 'Password is incorrect.' });
    if (u.role === 'admin' && (await User.countDocuments({ role: 'admin' })) <= 1) return res.status(400).json({ error: 'You are the only admin. Make someone else admin first.' });
    const me = u._id, run = async f => { try { await f(); } catch (e) { console.error('delete-account step failed:', e.message); } };
    await run(() => Post.updateMany({ author: me }, { status: 'removed', pinned: false }));
    await run(() => Comment.deleteMany({ author: me }));
    await run(() => Follow.deleteMany({ $or: [{ follower: me }, { following: me }] }));
    await run(() => Block.deleteMany({ $or: [{ blocker: me }, { blocked: me }] }));
    await run(() => Token.deleteMany({ user: me }));
    for (const [name, field] of [['Story', 'author'], ['Notification', 'user'], ['Prediction', 'user'], ['Playlist', 'owner'], ['Membership', 'user']]) { const M = lazy(name); if (M) await run(() => M.deleteMany({ [field]: me })); }
    const Track = lazy('Track'); if (Track) await run(() => Track.updateMany({ owner: me }, { status: 'removed' }));
    await User.deleteOne({ _id: me });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/karma', async (req, res, next) => {
  try { res.json({ karma: req.user.karma || 0, comments: await Comment.countDocuments({ author: req.user._id }), joinedAt: req.user.createdAt, streak: streakView(req.user.streak) }); } catch (e) { next(e); }
});

// ----- Professional dashboard -----
router.post('/pro/activate', async (req, res, next) => { try { await User.updateOne({ _id: req.user._id }, { proDashboard: true }); res.json({ ok: true }); } catch (e) { next(e); } });
router.get('/pro/overview', async (req, res, next) => {
  try {
    if (!req.user.proDashboard) return res.status(403).json({ error: 'Activate the Professional Dashboard first.' });
    const me = req.user._id, day = 864e5, since = new Date(Date.now() - 7 * day);
    const [posts, followers, recent] = await Promise.all([
      Post.find({ author: me, status: 'published', isRepost: false }).select('text media mediaType likes commentsCount repostsCount views createdAt').lean(),
      Follow.countDocuments({ following: me }), Follow.find({ following: me, createdAt: { $gte: since } }).select('createdAt').lean()
    ]);
    const t = posts.reduce((a, p) => ({ likes: a.likes + (p.likes || []).length, comments: a.comments + (p.commentsCount || 0), reposts: a.reposts + (p.repostsCount || 0), views: a.views + (p.views || 0) }), { likes: 0, comments: 0, reposts: 0, views: 0 });
    const bucket = (d) => Math.max(0, Math.min(6, 6 - Math.floor((Date.now() - new Date(d).getTime()) / day)));
    const newFollowers = Array(7).fill(0), postsPerDay = Array(7).fill(0), likesPerPostDay = Array(7).fill(0);
    recent.forEach(f => { newFollowers[bucket(f.createdAt)]++; });
    posts.filter(p => p.createdAt >= since).forEach(p => { postsPerDay[bucket(p.createdAt)]++; likesPerPostDay[bucket(p.createdAt)] += (p.likes || []).length; });
    const score = p => (p.likes || []).length + 2 * (p.commentsCount || 0) + 3 * (p.repostsCount || 0);
    const top = [...posts].sort((a, b) => score(b) - score(a)).slice(0, 5).map(p => ({ _id: p._id, text: (p.text || '').slice(0, 90), hasMedia: !!(p.media || []).length, likes: (p.likes || []).length, comments: p.commentsCount || 0, reposts: p.repostsCount || 0, views: p.views || 0 }));
    res.json({ totals: { posts: posts.length, followers, ...t, avgInteractions: posts.length ? Math.round((t.likes + t.comments + t.reposts) / posts.length * 10) / 10 : 0 }, days: { newFollowers, postsPerDay, likesPerPostDay }, top, streak: streakView(req.user.streak) });
  } catch (e) { next(e); }
});
module.exports = router;
