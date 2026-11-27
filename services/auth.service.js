const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { normalizeUsername, validUsername, validEmail } = require('../utils/validators');
function publicUser(user) {
  return { id: user._id, username: user.username, displayName: user.displayName, email: user.email, avatarUrl: user.avatarUrl, coverUrl: user.coverUrl, bio: user.bio, isVerified: user.isVerified, role: user.role, emailVerified: !!user.emailVerified, settings: user.settings || {}, proDashboard: !!user.proDashboard, karma: user.karma, subscription: user.subscription, avatarSettings: user.avatarSettings };
}
function tokenFor(user) { return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' }); }
async function register(input) {
  const username = normalizeUsername(input.username);
  const email = String(input.email || '').trim().toLowerCase();
  const displayName = (String(input.displayName || '').trim() || username).slice(0, 60);
  const password = String(input.password || '');
  if (!validUsername(username)) throw new Error('Username must be 4–24 characters and use only letters, numbers or underscores.');
  if (!validEmail(email)) throw new Error('Enter a valid email address.');
  if (displayName.length < 1 || displayName.length > 60) throw new Error('Display name must be 1–60 characters.');
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');
  const passwordHash = await bcrypt.hash(password, 12);
  const adminEmails = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
  const user = await User.create({ username, displayName, email, passwordHash, role: adminEmails.includes(email) ? 'admin' : 'user' });
  return { token: tokenFor(user), user: publicUser(user) };
}
async function login(input) {
  const email = String(input.email || '').trim().toLowerCase();
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(String(input.password || ''), user.passwordHash))) throw new Error('Email or password is incorrect.');
  if ((user.status || 'active') !== 'active') throw new Error('Your account is suspended. Visit /appeal to request a review.');
  return { token: tokenFor(user), user: publicUser(user) };
}
module.exports = { register, login, publicUser, tokenFor };
