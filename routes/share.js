// Serves the app shell with Open Graph tags so links shared on WhatsApp, X, Telegram etc. show a title, text and image.
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');
const FILE = path.join(__dirname, '..', 'public', 'index.html');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const origin = req => (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
const abs = (req, u) => !u ? '' : /^https?:/i.test(u) ? u : origin(req) + (u.startsWith('/') ? u : '/' + u);
function page(req, { title, desc, image, type = 'website' }) {
  let html = fs.readFileSync(FILE, 'utf8');
  const url = origin(req) + req.originalUrl.split('?')[0], img = abs(req, image) || origin(req) + '/icon-512.png';
  const tags = `<meta property="og:site_name" content="Buzzer"><meta property="og:type" content="${type}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(img)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(img)}"><meta name="description" content="${esc(desc)}">`;
  html = /<title>[\s\S]*?<\/title>/i.test(html) ? html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`) : html.replace('</head>', `<title>${esc(title)}</title></head>`);
  return html.replace('</head>', tags + '</head>');
}
router.get('/post/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return next();
    const p = await Post.findById(req.params.id).populate('author', 'username displayName avatarUrl');
    if (!p || p.status !== 'published') return next();
    const by = p.author?.displayName || p.author?.username || 'Buzzer member';
    const image = p.mediaType === 'image' && p.media?.[0] ? p.media[0] : p.author?.avatarUrl;
    res.type('html').send(page(req, { title: `${by} on Buzzer`, desc: (p.text || 'Check out this post on Buzzer.').slice(0, 200), image, type: 'article' }));
  } catch (e) { next(); }
});
router.get('/u/:username', async (req, res, next) => {
  try {
    const u = await User.findOne({ username: String(req.params.username).toLowerCase(), status: 'active' }).select('username displayName avatarUrl bio');
    if (!u) return next();
    res.type('html').send(page(req, { title: `${u.displayName} (@${u.username}) on Buzzer`, desc: u.bio || `Follow ${u.displayName} on Buzzer.`, image: u.avatarUrl, type: 'profile' }));
  } catch (e) { next(); }
});
module.exports = router;
