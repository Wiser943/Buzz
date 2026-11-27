const router = require('express').Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Track = require('../models/Track');
const Community = require('../models/Community');
const Opportunity = require('../models/Opportunity');
const { LESSONS } = require('./learn');
const { LABS } = require('./labs');
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const U = 'username displayName avatarUrl isVerified';
router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 60);
    if (q.length < 2) return res.json({ lessons: [], labs: [], users: [], posts: [], tracks: [], communities: [], opportunities: [] });
    const term = q.toLowerCase();
    const re = new RegExp(esc(q.replace(/^#/, '')), 'i');

    // In-memory STEM & AI search (fast & offline capable)
    const lessons = LESSONS.filter(l =>
      l.title.toLowerCase().includes(term) ||
      l.summary.toLowerCase().includes(term) ||
      l.content.toLowerCase().includes(term) ||
      l.category.toLowerCase().includes(term)
    ).slice(0, 10).map(({ content, quiz, ...meta }) => meta);

    const labs = LABS.filter(l =>
      l.title.toLowerCase().includes(term) ||
      l.description.toLowerCase().includes(term) ||
      l.concepts.some(c => c.toLowerCase().includes(term)) ||
      l.category.toLowerCase().includes(term)
    ).slice(0, 10);

    let users = [], posts = [], tracks = [], communities = [], opportunities = [];
    try {
      [users, posts, tracks, communities, opportunities] = await Promise.all([
        User.find({ status: 'active', $or: [{ username: re }, { displayName: re }] }).limit(10).select(U),
        Post.find({ status: 'published', visibility: 'public', text: re }).sort({ _id: -1 }).limit(15).populate('author', U),
        Track.find({ status: 'published', $or: [{ title: re }, { genre: re }] }).sort({ plays: -1 }).limit(10).populate('owner', U),
        Community.find({ $or: [{ name: re }, { sport: re }] }).limit(10),
        Opportunity.find({ status: 'approved', $or: [{ title: re }, { description: re }] }).limit(10)
      ]);
    } catch (_) {
      // If DB is offline, return what we have
    }

    res.json({ lessons, labs, users, posts, tracks, communities, opportunities });
  } catch (e) { next(e); }
});
module.exports = router;
