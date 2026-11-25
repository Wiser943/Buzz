const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const authService = require('../services/auth.service');
const mailer = require('../services/mailer');
const User = require('../models/User');
const Token = require('../models/Token');
const sha = t => crypto.createHash('sha256').update(t).digest('hex');
const base = req => (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
async function issue(userId, type, ttlMs) {
  await Token.deleteMany({ user: userId, type });
  const raw = crypto.randomBytes(32).toString('hex');
  await Token.create({ user: userId, type, hash: sha(raw), expiresAt: new Date(Date.now() + ttlMs) });
  return raw;
}
async function sendVerification(user, req) {
  const raw = await issue(user._id, 'verify', 24 * 3600e3);
  const m = mailer.template('Confirm your email', `Hi ${user.displayName}, tap the button to confirm your email address and secure your Buzzer account.`, 'Confirm email', `${base(req)}/verify-email?token=${raw}`, 'This link works for 24 hours. If you did not create a Buzzer account, ignore this email.');
  return mailer.send({ to: user.email, subject: 'Confirm your Buzzer email', ...m });
}
router.post('/register', async (req, res) => {
  try {
    const result = await authService.register(req.body || {}); res.status(201).json(result);
    User.findById(result.user.id).then(u => u && sendVerification(u, req)).catch(() => {});
  } catch (e) { if (!res.headersSent) res.status(e.code === 11000 ? 409 : 400).json({ error: e.code === 11000 ? 'Username or email already exists.' : e.message || 'Could not create account.' }); }
});
router.post('/login', async (req, res) => {
  try { res.json(await authService.login(req.body || {})); }
  catch (e) { res.status(401).json({ error: e.message || 'Email or password is incorrect.' }); }
});
router.get('/me', auth, (req, res) => res.json({ user: authService.publicUser(req.user) }));

// Forgot password: always answers the same way so the form cannot be used to find out which emails have accounts.
router.post('/forgot', rateLimit({ windowMs: 3600e3, max: 6, message: 'Too many reset requests. Try again in an hour.' }), async (req, res) => {
  const done = { ok: true, message: 'If that email has an account, a reset link is on its way. Check your inbox and spam folder.' };
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const user = email && await User.findOne({ email });
    if (user && (user.status || 'active') === 'active') {
      const raw = await issue(user._id, 'reset', 3600e3);
      const m = mailer.template('Reset your password', 'We received a request to reset your Buzzer password. This link works for 1 hour.', 'Choose a new password', `${base(req)}/reset-password?token=${raw}`, 'If you did not ask for this, you can safely ignore this email. Your password will not change.');
      await mailer.send({ to: user.email, subject: 'Reset your Buzzer password', ...m });
    }
  } catch (e) { console.error('forgot failed:', e.message); }
  res.json(done);
});
router.post('/reset', rateLimit({ windowMs: 3600e3, max: 20 }), async (req, res) => {
  try {
    const token = String(req.body?.token || ''), password = String(req.body?.password || '');
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    const t = token && await Token.findOne({ hash: sha(token), type: 'reset', expiresAt: { $gt: new Date() } });
    if (!t) return res.status(400).json({ error: 'This reset link is invalid or has expired. Request a new one.' });
    await User.updateOne({ _id: t.user }, { passwordHash: await bcrypt.hash(password, 12), passwordChangedAt: new Date(), emailVerified: true });
    await Token.deleteMany({ user: t.user, type: 'reset' });
    res.json({ ok: true, message: 'Password updated. You can log in now.' });
  } catch (e) { res.status(500).json({ error: 'Could not reset the password.' }); }
});
router.post('/verify/send', auth, rateLimit({ windowMs: 3600e3, max: 4, by: 'user', message: 'Verification email already sent. Check your inbox or try again later.' }), async (req, res) => {
  if (req.user.emailVerified) return res.json({ ok: true, message: 'Your email is already verified.' });
  const sent = await sendVerification(req.user, req);
  res.json({ ok: true, sent, message: sent ? 'Verification email sent. Check your inbox and spam folder.' : 'Email sending is not configured on the server yet.' });
});
router.post('/verify', rateLimit({ windowMs: 3600e3, max: 30 }), async (req, res) => {
  try {
    const token = String(req.body?.token || '');
    const t = token && await Token.findOne({ hash: sha(token), type: 'verify', expiresAt: { $gt: new Date() } });
    if (!t) return res.status(400).json({ error: 'This verification link is invalid or has expired.' });
    await User.updateOne({ _id: t.user }, { emailVerified: true }); await Token.deleteMany({ user: t.user, type: 'verify' });
    res.json({ ok: true, message: 'Email verified. Thank you!' });
  } catch (e) { res.status(500).json({ error: 'Could not verify the email.' }); }
});
module.exports = router;
