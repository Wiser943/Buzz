const router = require('express').Router();
const auth = require('../middleware/auth');
const authService = require('../services/auth.service');
router.post('/register', async (req, res) => {
  try { const result = await authService.register(req.body || {}); res.status(201).json(result); }
  catch (e) { res.status(e.code === 11000 ? 409 : 400).json({ error: e.code === 11000 ? 'Username or email already exists.' : e.message || 'Could not create account.' }); }
});
router.post('/login', async (req, res) => {
  try { res.json(await authService.login(req.body || {})); }
  catch (e) { res.status(401).json({ error: e.message || 'Email or password is incorrect.' }); }
});
router.get('/me', auth, (req, res) => res.json({ user: authService.publicUser(req.user) }));
module.exports = router;
