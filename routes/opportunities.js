const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const rateLimit = require('../middleware/rateLimit');
const Opportunity = require('../models/Opportunity');
const Application = require('../models/Application');
const notify = require('../services/notify');
const { scan, autoReport } = require('../services/moderation.service');
const U = 'username displayName avatarUrl isVerified';
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const validId = (req, res, next) => mongoose.isValidObjectId(req.params.id) ? next() : res.status(400).json({ error: 'Invalid id.' });
router.get('/', async (req, res, next) => {
  try {
    const q = { status: 'approved' };
    if (Opportunity.TYPES.includes(req.query.type)) q.type = req.query.type;
    if (req.query.q) q.$or = [{ title: new RegExp(esc(req.query.q), 'i') }, { location: new RegExp(esc(req.query.q), 'i') }];
    const list = await Opportunity.find(q).sort({ promoted: -1, _id: -1 }).limit(50).populate('poster', U);
    res.json({ opportunities: list.filter(o => !o.deadline || o.deadline > new Date(Date.now() - 864e5)) });
  } catch (e) { next(e); }
});
router.get('/mine', auth, async (req, res, next) => {
  try {
    const [posted, applied] = await Promise.all([Opportunity.find({ poster: req.user._id }).sort({ _id: -1 }).limit(50), Application.find({ applicant: req.user._id }).sort({ _id: -1 }).limit(50).populate({ path: 'opportunity', select: 'title type status' })]);
    res.json({ posted, applied });
  } catch (e) { next(e); }
});
router.post('/', auth, rateLimit({ windowMs: 3600e3, max: 5, by: 'user' }), async (req, res, next) => {
  try {
    const b = req.body || {}, title = String(b.title || '').trim(), description = String(b.description || '').trim();
    if (!Opportunity.TYPES.includes(b.type)) return res.status(400).json({ error: 'Choose a type.' });
    if (title.length < 5 || title.length > 100) return res.status(400).json({ error: 'Title must be 5–100 characters.' });
    if (description.length < 20 || description.length > 2000) return res.status(400).json({ error: 'Description must be 20–2000 characters.' });
    let link = ''; if (b.link) { try { const u = new URL(String(b.link)); if (u.protocol !== 'https:') throw 0; link = u.href; } catch { return res.status(400).json({ error: 'The link must start with https://' }); } }
    const deadline = b.deadline && !isNaN(Date.parse(b.deadline)) ? new Date(b.deadline) : undefined;
    const s = scan(title, description, b.location); if (s.reject) return res.status(400).json({ error: 'Your text contains disallowed words.' });
    let coverUrl = ''; if (b.coverUrl) { try { const u = new URL(String(b.coverUrl)); if (u.protocol !== 'https:') throw 0; coverUrl = u.href; } catch { return res.status(400).json({ error: 'The cover image must be an https:// link (upload it as a post image first).' }); } }
    const spots = Number.isInteger(Number(b.spots)) && Number(b.spots) > 0 ? Number(b.spots) : null, startsAt = b.startsAt && !isNaN(Date.parse(b.startsAt)) ? new Date(b.startsAt) : undefined;
    const o = await Opportunity.create({ poster: req.user._id, type: b.type, title, description, location: String(b.location || '').trim().slice(0, 80), deadline, link, coverUrl, fee: String(b.fee || '').trim().slice(0, 40), spots, startsAt, sport: String(b.sport || '').trim().slice(0, 40) });
    await autoReport({ targetType: 'user', targetUser: req.user._id, flags: s.flags });
    res.status(201).json({ opportunity: o, message: 'Submitted for review. It goes live once approved.' });
  } catch (e) { next(e); }
});
router.get('/:id', optionalAuth, validId, async (req, res, next) => {
  try {
    const o = await Opportunity.findById(req.params.id).populate('poster', U);
    if (!o || (o.status !== 'approved' && String(o.poster._id) !== String(req.user?._id) && !['admin', 'moderator'].includes(req.user?.role))) return res.status(404).json({ error: 'Opportunity not found.' });
    res.json({ opportunity: o, applied: req.user ? !!(await Application.exists({ opportunity: o._id, applicant: req.user._id })) : false });
  } catch (e) { next(e); }
});
router.post('/:id/apply', auth, validId, rateLimit({ max: 20, by: 'user' }), async (req, res, next) => {
  try {
    const o = await Opportunity.findById(req.params.id); if (!o || o.status !== 'approved') return res.status(404).json({ error: 'Opportunity not found.' });
    if (String(o.poster) === String(req.user._id)) return res.status(400).json({ error: 'You cannot apply to your own listing.' });
    if (o.deadline && o.deadline < new Date()) return res.status(400).json({ error: 'The deadline has passed.' });
    const message = String(req.body?.message || '').trim(); if (message.length < 10 || message.length > 1000) return res.status(400).json({ error: 'Write 10–1000 characters about yourself.' });
    try { await Application.create({ opportunity: o._id, applicant: req.user._id, message, contact: String(req.body?.contact || '').trim().slice(0, 120) }); }
    catch (e) { if (e.code === 11000) return res.status(409).json({ error: 'You already applied.' }); throw e; }
    await Opportunity.updateOne({ _id: o._id }, { $inc: { applicationsCount: 1 } });
    await notify(o.poster, { type: 'opportunity', actor: req.user._id, text: `New application for “${o.title.slice(0, 60)}”` });
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});
router.get('/:id/applications', auth, validId, async (req, res, next) => {
  try {
    const o = await Opportunity.findOne({ _id: req.params.id, poster: req.user._id }); if (!o) return res.status(404).json({ error: 'Opportunity not found.' });
    res.json({ applications: await Application.find({ opportunity: o._id }).sort({ _id: -1 }).limit(100).populate('applicant', U) });
  } catch (e) { next(e); }
});
router.post('/:id/close', auth, validId, async (req, res, next) => {
  try { await Opportunity.updateOne({ _id: req.params.id, poster: req.user._id, status: 'approved' }, { status: 'closed' }); res.json({ ok: true }); } catch (e) { next(e); }
});
module.exports = router;
