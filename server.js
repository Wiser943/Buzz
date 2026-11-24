require('dotenv').config();
const express = require('express');
const path = require('path');
const { connectDatabase } = require('./config/database');
const app = express();
const PORT = process.env.PORT || 3000;
app.disable('x-powered-by');
app.set('trust proxy', 1); // Render sits behind a proxy; needed for correct client IPs in rate limits
const payments = require('./routes/payments');
app.post('/api/payments/webhook', payments.webhook); // raw body, must come before express.json()
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
// no-cache on html/js/css so a redeploy is picked up immediately (browsers revalidate with ETag)
if (process.env.UPLOAD_DIR) app.use('/uploads', express.static(process.env.UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'public'), { setHeaders: (res, file) => { if (/\.(html|js|css)$/.test(file)) res.setHeader('Cache-Control', 'no-cache'); } }));
app.get('/api/health', (_req, res) => {
  const mongoose = require('mongoose');
  res.json({ app: 'Buzzer', status: 'running', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});
const rateLimit = require('./middleware/rateLimit');
app.use('/api/auth', rateLimit({ windowMs: 15 * 60000, max: 40, message: 'Too many attempts. Try again in a few minutes.' }), require('./routes/auth'));
app.use('/api/stream', require('./routes/stream'));
app.use('/api/search', rateLimit({ max: 60 }), require('./routes/search'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/music', require('./routes/music'));
app.use('/api/communities', require('./routes/communities'));
app.use('/api/opportunities', require('./routes/opportunities'));
app.use('/api/payments', payments.router);
app.use('/api/appeals', require('./routes/appeals'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/sports', require('./routes/sports'));
app.use('/api/safety', require('./routes/safety'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ads', require('./routes/ads'));
app.use('/api/uploads', require('./routes/uploads'));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: 'Unexpected server error.' });
});
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
if (process.env.MONGODB_URI) {
  connectDatabase().then(async () => {
    const emails = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
    if (emails.length) await require('./models/User').updateMany({ email: { $in: emails } }, { role: 'admin' });
    const ps = require('./services/paystack.service');
    await ps.expireBadges(); setInterval(() => ps.expireBadges().catch(e => console.error(e.message)), 3600e3).unref();
  }).catch(err => { console.error('MongoDB connection failed:', err.message); process.exitCode = 1; });
} else {
  console.warn('MONGODB_URI is missing. MongoDB-backed endpoints will not work until configured.');
}
app.listen(PORT, () => console.log(`Buzzer is running at http://localhost:${PORT}`));
