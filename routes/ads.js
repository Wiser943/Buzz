const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const Ad = require('../models/Ad');
const { scan } = require('../services/moderation.service');
const audit = require('../services/audit');
// Google AdSense: set ADSENSE_CLIENT (ca-pub-xxxx) and ADSENSE_SLOT to show Google ads in the feed.
router.get('/config', (_req, res) => res.json({ adsense: process.env.ADSENSE_CLIENT && process.env.ADSENSE_SLOT ? { client: process.env.ADSENSE_CLIENT, slot: process.env.ADSENSE_SLOT } : null }));
router.post('/', auth, rateLimit({ windowMs: 3600e3, max: 10, by: 'user' }), async (req, res, next) => {
  try {
    const b = req.body || {}, title = String(b.title || '').trim(), text = String(b.text || '').trim(), ctaUrl = String(b.ctaUrl || '').trim();
    if (title.length < 3 || title.length > 80) return res.status(400).json({ error: 'Title must be 3–80 characters.' });
    let u; try { u = new URL(ctaUrl); } catch { return res.status(400).json({ error: 'Enter a valid link starting with https://' }); }
    if (u.protocol !== 'https:') return res.status(400).json({ error: 'The link must use https://' });
    if (b.mediaUrl && (typeof b.mediaUrl !== 'string' || b.mediaUrl.length > 2048)) return res.status(400).json({ error: 'Invalid image.' });
    const s = scan(title, text, b.ctaLabel); if (s.reject) return res.status(400).json({ error: 'Your ad contains disallowed words.' });
    const ad = await Ad.create({ advertiser: req.user._id, title, text: text.slice(0, 300), mediaUrl: b.mediaUrl || '', ctaLabel: String(b.ctaLabel || 'Learn more').trim().slice(0, 24) || 'Learn more', ctaUrl: u.href, days: Math.min(Math.max(parseInt(b.days) || 7, 1), 30), flags: s.flags });
    res.status(201).json({ ad });
  } catch (e) { next(e); }
});
router.get('/mine', auth, async (req, res, next) => { try { res.json({ ads: await Ad.find({ advertiser: req.user._id }).sort({ _id: -1 }).limit(50) }); } catch (e) { next(e); } });
router.patch('/:id', auth, async (req, res, next) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, advertiser: req.user._id }); if (!ad) return res.status(404).json({ error: 'Ad not found.' });
    if (req.body?.status === 'paused' && ad.status === 'approved') ad.status = 'paused';
    else if (req.body?.status === 'approved' && ad.status === 'paused') ad.status = 'approved';
    else return res.status(400).json({ error: 'You can only pause or resume an approved ad.' });
    await ad.save(); res.json({ ad });
  } catch (e) { next(e); }
});
router.get('/serve', async (_req, res, next) => {
  try {
    const now = new Date(), live = await Ad.find({ status: 'approved', startsAt: { $lte: now }, endsAt: { $gte: now } }).select('title text mediaUrl ctaLabel ctaUrl').limit(30);
    res.json({ ad: live.length ? live[Math.floor(Math.random() * live.length)] : null });
    Ad.updateMany({ status: 'approved', endsAt: { $lt: now } }, { status: 'ended' }).catch(() => {});
  } catch (e) { next(e); }
});
const counter = field => async (req, res, next) => { try { if (mongoose.isValidObjectId(req.params.id)) await Ad.updateOne({ _id: req.params.id, status: 'approved' }, { $inc: { [field]: 1 } }); res.json({ ok: true }); } catch (e) { next(e); } };
router.post('/:id/impression', rateLimit({ max: 120 }), counter('impressions'));
router.post('/:id/click', rateLimit({ max: 60 }), counter('clicks'));
module.exports = router;
