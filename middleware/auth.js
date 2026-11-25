const jwt = require('jsonwebtoken');
const User = require('../models/User');
module.exports = async function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(payload.sub).select('-passwordHash');
    if (!req.user) return res.status(401).json({ error: 'Account not found.' });
    if (req.user.passwordChangedAt && payload.iat < Math.floor(req.user.passwordChangedAt.getTime() / 1000)) return res.status(401).json({ error: 'Your password was changed. Please log in again.' });
    if ((req.user.status || 'active') !== 'active') return res.status(403).json({ error: 'Your account is suspended. Visit /appeal to request a review.' });
    next();
  } catch (_err) { return res.status(401).json({ error: 'Invalid or expired token.' }); }
};
