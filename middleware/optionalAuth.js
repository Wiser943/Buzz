const jwt = require('jsonwebtoken');
const User = require('../models/User');
module.exports = async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      req.user = await User.findById(payload.sub);
    }
  } catch (_) { /* public profile can be viewed without auth */ }
  next();
};
