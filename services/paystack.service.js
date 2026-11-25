// Paystack (Nigeria) via plain fetch; no SDK needed. Set PAYSTACK_SECRET_KEY and APP_URL.
const crypto = require('crypto');
const User = require('../models/User');
const Payment = require('../models/Payment');
const notify = require('./notify');
const PRICES = { creator: 778000, athlete: 1450000 }; // kobo per month (₦7,780 / ₦14,500)
const key = () => process.env.PAYSTACK_SECRET_KEY;
const enabled = () => !!key();
async function ps(path, opts = {}) {
  const r = await fetch('https://api.paystack.co' + path, { ...opts, headers: { Authorization: 'Bearer ' + key(), 'Content-Type': 'application/json' } });
  const d = await r.json().catch(() => ({})); if (!r.ok || d.status === false) throw new Error(d.message || 'Payment provider error.'); return d.data;
}
async function initialize(user, plan) {
  const amountKobo = PRICES[plan]; if (!amountKobo) throw Object.assign(new Error('Unknown plan.'), { status: 400 });
  const reference = 'BZ-' + Date.now() + '-' + crypto.randomBytes(5).toString('hex');
  await Payment.create({ user: user._id, plan, reference, amountKobo });
  const base = (process.env.APP_URL || '').replace(/\/$/, '');
  const data = await ps('/transaction/initialize', { method: 'POST', body: JSON.stringify({ email: user.email, amount: amountKobo, currency: 'NGN', reference, callback_url: base + '/payments/callback', metadata: { plan, userId: String(user._id) } }) });
  return { url: data.authorization_url, reference };
}
// Idempotent: safe to call from both the redirect check and the webhook.
async function fulfill(payment, tx) {
  if (payment.status === 'success') return payment;
  if (tx.status !== 'success' || tx.amount !== payment.amountKobo || (tx.currency || 'NGN') !== 'NGN') return payment;
  const claimed = await Payment.findOneAndUpdate({ _id: payment._id, status: { $ne: 'success' } }, { status: 'success', paidAt: new Date() }, { new: true });
  if (!claimed) return payment;
  const user = await User.findById(payment.user); if (!user) return claimed;
  const from = user.badgeUntil && user.badgeUntil > new Date() ? user.badgeUntil : new Date();
  user.isVerified = true; user.badgePlan = payment.plan; user.badgeUntil = new Date(from.getTime() + 30 * 864e5); await user.save();
  await notify(user._id, { type: 'payment', text: `Payment received. Your ${payment.plan} badge is active until ${user.badgeUntil.toDateString()}.` });
  return claimed;
}
async function verify(reference) {
  const payment = await Payment.findOne({ reference }); if (!payment) return null;
  if (payment.status !== 'success') { const tx = await ps('/transaction/verify/' + encodeURIComponent(reference)); return fulfill(payment, tx); }
  return payment;
}
function validSignature(raw, sig) {
  if (!key() || !sig) return false;
  const h = crypto.createHmac('sha512', key()).update(raw).digest('hex');
  return h.length === sig.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(String(sig)));
}
async function expireBadges() {
  await User.updateMany({ badgePlan: { $ne: null }, badgeUntil: { $lt: new Date() } }, { isVerified: false, badgePlan: null, badgeUntil: null });
}
module.exports = { enabled, initialize, verify, fulfill, validSignature, expireBadges, PRICES };
