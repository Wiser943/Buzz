const router = require('express').Router();
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const Community = require('../models/Community');
const Membership = require('../models/Membership');
const Post = require('../models/Post');
const { scan } = require('../services/moderation.service');
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const slugify = s => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const q = {}; if (req.query.q) q.$or = [{ name: new RegExp(esc(req.query.q), 'i') }, { sport: new RegExp(esc(req.query.q), 'i') }];
    let list;
    if (req.query.mine && req.user) { const ms = await Membership.find({ user: req.user._id }).select('community'); list = await Community.find({ _id: { $in: ms.map(m => m.community) } }).sort({ updatedAt: -1 }).limit(50); }
    else list = await Community.find(q).sort({ membersCount: -1, _id: -1 }).limit(50);
    res.json({ communities: list });
  } catch (e) { next(e); }
});
router.post('/', auth, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim(), sport = String(req.body?.sport || '').trim().slice(0, 30), description = String(req.body?.description || '').trim().slice(0, 300);
    if (name.length < 3 || name.length > 40) return res.status(400).json({ error: 'Name must be 3–40 characters.' });
    const s = scan(name, description, sport); if (s.reject) return res.status(400).json({ error: 'Your text contains disallowed words.' });
    if (await Community.countDocuments({ owner: req.user._id }) >= 3) return res.status(400).json({ error: 'You can own up to 3 communities.' });
    const slug = slugify(name); if (slug.length < 3) return res.status(400).json({ error: 'Choose a name with letters or numbers.' });
    if (await Community.exists({ slug })) return res.status(409).json({ error: 'A community with that name already exists.' });
    const c = await Community.create({ name, slug, sport, description, owner: req.user._id });
    await Membership.create({ community: c._id, user: req.user._id, role: 'owner' });
    res.status(201).json({ community: c });
  } catch (e) { next(e); }
});
router.get('/:slug', optionalAuth, async (req, res, next) => {
  try {
    const c = await Community.findOne({ slug: String(req.params.slug).toLowerCase() }).populate('owner', 'username displayName'); if (!c) return res.status(404).json({ error: 'Community not found.' });
    res.json({ community: c, isMember: req.user ? !!(await Membership.exists({ community: c._id, user: req.user._id })) : false });
  } catch (e) { next(e); }
});
router.get('/:slug/posts', async (req, res, next) => {
  try {
    const c = await Community.findOne({ slug: String(req.params.slug).toLowerCase() }); if (!c) return res.status(404).json({ error: 'Community not found.' });
    res.json({ posts: await Post.find({ community: c._id, status: 'published', threadRoot: null }).sort({ _id: -1 }).limit(30).populate('author', 'username displayName avatarUrl isVerified') });
  } catch (e) { next(e); }
});
router.post('/:slug/join', auth, async (req, res, next) => {
  try {
    const c = await Community.findOne({ slug: String(req.params.slug).toLowerCase() }); if (!c) return res.status(404).json({ error: 'Community not found.' });
    const r = await Membership.updateOne({ community: c._id, user: req.user._id }, { $setOnInsert: { role: 'member' } }, { upsert: true });
    if (r.upsertedCount) await Community.updateOne({ _id: c._id }, { $inc: { membersCount: 1 } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.delete('/:slug/leave', auth, async (req, res, next) => {
  try {
    const c = await Community.findOne({ slug: String(req.params.slug).toLowerCase() }); if (!c) return res.status(404).json({ error: 'Community not found.' });
    if (String(c.owner) === String(req.user._id)) return res.status(400).json({ error: 'Owners cannot leave their community.' });
    const r = await Membership.deleteOne({ community: c._id, user: req.user._id }); if (r.deletedCount) await Community.updateOne({ _id: c._id }, { $inc: { membersCount: -1 } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
module.exports = router;
