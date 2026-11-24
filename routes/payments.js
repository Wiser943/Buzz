const router = require('express').Router();
const express = require('express');
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const Payment = require('../models/Payment');
const ps = require('../services/paystack.service');
// Webhook: mounted with a raw body parser so the HMAC signature can be checked.
const webhook = [express.raw({ type: '*/*', limit: '200kb' }), async (req, res) => {
  try {
    if (!ps.validSignature(req.body, req.get('x-paystack-signature'))) return res.status(401).end();
    const ev = JSON.parse(req.body.toString('utf8'));
    if (ev.event === 'charge.success' && ev.data?.reference) { const p = await Payment.findOne({ reference: ev.data.reference }); if (p) await ps.fulfill(p, ev.data); }
    res.status(200).end();
  } catch (e) { console.error('webhook error:', e.message); res.status(200).end(); }
}];
router.get('/config', (_req, res) => res.json({ enabled: ps.enabled(), prices: ps.PRICES }));
router.post('/checkout', auth, rateLimit({ max: 10, by: 'user' }), async (req, res) => {
  if (!ps.enabled()) return res.status(503).json({ error: 'Payments are not configured yet.', fallback: true });
  try { res.json(await ps.initialize(req.user, String(req.body?.plan))); } catch (e) { res.status(e.status || 502).json({ error: e.message }); }
});
router.get('/verify', auth, async (req, res) => {
  if (!ps.enabled()) return res.status(503).json({ error: 'Payments are not configured yet.' });
  try {
    const p = await ps.verify(String(req.query.reference || ''));
    if (!p || String(p.user) !== String(req.user._id)) return res.status(404).json({ error: 'Payment not found.' });
    res.json({ status: p.status, plan: p.plan });
  } catch (e) { res.status(502).json({ error: e.message }); }
});
module.exports = { router, webhook };
