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
app.use('/api/ads', require('./routes/ads'));
app.use('/api/uploads', require('./routes/uploads'));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: 'Unexpected server error.' });
});
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
if (process.env.MONGODB_URI) {
  connectDatabase().catch(err => { console.error('MongoDB connection failed:', err.message); process.exitCode = 1; });
} else {
  console.warn('MONGODB_URI is missing. MongoDB-backed endpoints will not work until configured.');
}
app.listen(PORT, () => console.log(`Buzzer is running at http://localhost:${PORT}`));
