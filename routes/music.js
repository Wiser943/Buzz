const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const rateLimit = require('../middleware/rateLimit');
const Track = require('../models/Track');
const Playlist = require('../models/Playlist');
const { scan, autoReport } = require('../services/moderation.service');
const U = 'username displayName avatarUrl isVerified';
const KINDS = ['original', 'cover', 'mix', 'other'];
const present = (t, me) => { const o = t.toObject ? t.toObject() : t; return { ...o, likes: undefined, likesCount: (t.likes || []).length, liked: !!me && (t.likes || []).some(id => String(id) === String(me)) }; };
const validId = (req, res, next) => mongoose.isValidObjectId(req.params.id) ? next() : res.status(400).json({ error: 'Invalid id.' });
const plays = new Map(); // dedupe plays: one count per viewer per track per 30 minutes
setInterval(() => { const n = Date.now(); for (const [k, t] of plays) if (n - t > 18e5) plays.delete(k); }, 6e5).unref();

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const q = {}; q.status = 'published';
    if (mongoose.isValidObjectId(req.query.owner)) q.owner = req.query.owner;
    if (req.query.genre) q.genre = new RegExp('^' + String(req.query.genre).replace(/[^\w ]/g, '') + '$', 'i');
    if (KINDS.includes(req.query.kind)) q.kind = req.query.kind;
    const sort = req.query.sort === 'plays' ? { plays: -1 } : { _id: -1 };
    const tracks = await Track.find(q).sort(sort).limit(40).populate('owner', U);
    res.json({ tracks: tracks.map(t => present(t, req.user?._id)) });
  } catch (e) { next(e); }
});
router.get('/charts', optionalAuth, async (req, res, next) => {
  try {
    const rows = await Track.aggregate([{ $match: { status: 'published' } }, { $addFields: { score: { $add: ['$plays', { $multiply: [5, { $size: '$likes' }] }] } } }, { $sort: { score: -1, _id: -1 } }, { $limit: 20 }, { $project: { _id: 1 } }]);
    const tracks = await Track.find({ _id: { $in: rows.map(r => r._id) } }).populate('owner', U); const by = new Map(tracks.map(t => [String(t._id), t]));
    res.json({ tracks: rows.map(r => by.get(String(r._id))).filter(Boolean).map(t => present(t, req.user?._id)) });
  } catch (e) { next(e); }
});
// ---- playlists (declared before /:id) ----
router.get('/playlists/mine', auth, async (req, res, next) => { try { res.json({ playlists: await Playlist.find({ owner: req.user._id }).sort({ updatedAt: -1 }).limit(50) }); } catch (e) { next(e); } });
router.post('/playlists', auth, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim(); if (name.length < 1 || name.length > 60) return res.status(400).json({ error: 'Playlist name must be 1–60 characters.' });
    if (await Playlist.countDocuments({ owner: req.user._id }) >= 30) return res.status(400).json({ error: 'You have reached the playlist limit.' });
    res.status(201).json({ playlist: await Playlist.create({ owner: req.user._id, name, isPublic: !!req.body?.isPublic }) });
  } catch (e) { next(e); }
});
router.get('/playlists/:id', optionalAuth, validId, async (req, res, next) => {
  try {
    const p = await Playlist.findById(req.params.id).populate({ path: 'tracks', match: { status: 'published' }, populate: { path: 'owner', select: U } }).populate('owner', U);
    if (!p || (!p.isPublic && String(p.owner._id) !== String(req.user?._id))) return res.status(404).json({ error: 'Playlist not found.' });
    res.json({ playlist: { ...p.toObject(), tracks: p.tracks.map(t => present(t, req.user?._id)) } });
  } catch (e) { next(e); }
});
router.post('/playlists/:id/tracks', auth, validId, async (req, res, next) => {
  try {
    const p = await Playlist.findOne({ _id: req.params.id, owner: req.user._id }); if (!p) return res.status(404).json({ error: 'Playlist not found.' });
    if (!mongoose.isValidObjectId(req.body?.trackId) || !(await Track.exists({ _id: req.body.trackId, status: 'published' }))) return res.status(404).json({ error: 'Track not found.' });
    if (p.tracks.length >= 200) return res.status(400).json({ error: 'Playlist is full.' });
    p.tracks.addToSet(req.body.trackId); await p.save(); res.json({ ok: true, count: p.tracks.length });
  } catch (e) { next(e); }
});
router.delete('/playlists/:id/tracks/:trackId', auth, validId, async (req, res, next) => {
  try { await Playlist.updateOne({ _id: req.params.id, owner: req.user._id }, { $pull: { tracks: req.params.trackId } }); res.json({ ok: true }); } catch (e) { next(e); }
});
router.delete('/playlists/:id', auth, validId, async (req, res, next) => { try { await Playlist.deleteOne({ _id: req.params.id, owner: req.user._id }); res.json({ ok: true }); } catch (e) { next(e); } });
// ---- tracks ----
router.post('/', auth, rateLimit({ windowMs: 3600e3, max: 10, by: 'user', message: 'Upload limit reached. Try again in an hour.' }), async (req, res, next) => {
  try {
    const b = req.body || {}, title = String(b.title || '').trim(), description = String(b.description || '').trim();
    if (title.length < 1 || title.length > 120) return res.status(400).json({ error: 'Title must be 1–120 characters.' });
    if (b.rightsConfirmed !== true) return res.status(400).json({ error: 'Confirm that you own the rights or have permission to share this audio.' });
    if (typeof b.audioUrl !== 'string' || !/^\/uploads\/[\w.-]+$/.test(b.audioUrl)) return res.status(400).json({ error: 'Upload the audio file first.' });
    if (b.coverUrl && (typeof b.coverUrl !== 'string' || b.coverUrl.length > 2048)) return res.status(400).json({ error: 'Invalid cover image.' });
    const peaks = Array.isArray(b.peaks) ? b.peaks.slice(0, 80).map(Number).filter(n => n >= 0 && n <= 1) : [];
    const s = scan(title, description, b.genre); if (s.reject) return res.status(400).json({ error: 'Your title or description contains disallowed words.' });
    const track = await Track.create({ owner: req.user._id, title, description: description.slice(0, 1000), kind: KINDS.includes(b.kind) ? b.kind : 'original', genre: String(b.genre || '').trim().slice(0, 40), audioUrl: b.audioUrl, coverUrl: b.coverUrl || '', duration: Math.min(Math.max(Number(b.duration) || 0, 0), 7200), peaks, rightsConfirmed: true });
    await autoReport({ targetType: 'track', targetUser: req.user._id, targetTrack: track._id, flags: s.flags });
    res.status(201).json({ track: present(track, req.user._id) });
  } catch (e) { next(e); }
});
router.get('/:id', optionalAuth, validId, async (req, res, next) => {
  try { const t = await Track.findById(req.params.id).populate('owner', U); if (!t || t.status !== 'published') return res.status(404).json({ error: 'Track not found.' }); res.json({ track: present(t, req.user?._id) }); } catch (e) { next(e); }
});
router.post('/:id/play', optionalAuth, validId, async (req, res, next) => {
  try {
    const key = (req.user ? 'u' + req.user._id : 'ip' + req.ip) + ':' + req.params.id, now = Date.now();
    if (!plays.has(key) || now - plays.get(key) > 18e5) { plays.set(key, now); await Track.updateOne({ _id: req.params.id, status: 'published' }, { $inc: { plays: 1 } }); }
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.post('/:id/like', auth, validId, async (req, res, next) => {
  try {
    const t = await Track.findById(req.params.id); if (!t || t.status !== 'published') return res.status(404).json({ error: 'Track not found.' });
    const liked = t.likes.some(i => i.equals(req.user._id)); liked ? t.likes.pull(req.user._id) : t.likes.addToSet(req.user._id); await t.save();
    res.json({ liked: !liked, likesCount: t.likes.length });
  } catch (e) { next(e); }
});
router.delete('/:id', auth, validId, async (req, res, next) => {
  try {
    const t = await Track.findById(req.params.id); if (!t) return res.status(404).json({ error: 'Track not found.' });
    if (String(t.owner) !== String(req.user._id)) return res.status(403).json({ error: 'You can only delete your own tracks.' });
    t.status = 'removed'; await t.save(); res.json({ ok: true });
  } catch (e) { next(e); }
});
module.exports = router;
