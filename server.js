require('dotenv').config();
const express = require('express');
const path = require('path');
const { connectDatabase } = require('./config/database');
const app = express();
const PORT = process.env.PORT || 3000;
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/health', (_req, res) => {
  const mongoose = require('mongoose');
  res.json({ app: 'Buzzer', status: 'running', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});
app.use('/api/auth', require('./routes/auth'));
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
  }).catch(err => { console.error('MongoDB connection failed:', err.message); process.exitCode = 1; });
} else {
  console.warn('MONGODB_URI is missing. MongoDB-backed endpoints will not work until configured.');
}
app.listen(PORT, () => console.log(`Buzzer is running at http://localhost:${PORT}`));
