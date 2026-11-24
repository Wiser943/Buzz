const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const stream = require('../services/stream');
// EventSource cannot send headers, so the JWT comes in the query string (https only in production).
router.get('/', async (req, res) => {
  try {
    const payload = jwt.verify(String(req.query.token || ''), process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('status');
    if (!user || (user.status || 'active') !== 'active') return res.status(403).end();
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders(); res.write('retry: 4000\n\n'); stream.add(user._id, res);
  } catch (_) { res.status(401).end(); }
});
module.exports = router;
