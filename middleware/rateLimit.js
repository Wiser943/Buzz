// In-memory limiter (one server instance). Use Redis if you scale to several instances.
module.exports = ({ windowMs = 60000, max = 30, by = 'ip', message = 'Too many requests. Slow down and try again shortly.' } = {}) => {
  const hits = new Map();
  setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset < now) hits.delete(k); }, windowMs).unref();
  return (req, res, next) => {
    const key = (by === 'user' && req.user ? String(req.user._id) : req.ip) + ':' + req.baseUrl;
    const now = Date.now(); let h = hits.get(key);
    if (!h || h.reset < now) { h = { n: 0, reset: now + windowMs }; hits.set(key, h); }
    if (++h.n > max) { res.setHeader('Retry-After', Math.ceil((h.reset - now) / 1000)); return res.status(429).json({ error: message }); }
    next();
  };
};
