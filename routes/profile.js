const router = require('express').Router();
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const profileService = require('../services/profile.service');

router.get('/me', auth, async (req, res) => {
  const profile = await profileService.getProfile(req.user.username, true);
  res.json({ ...profile, isFollowing: false });
});
router.patch('/me', auth, async (req, res) => {
  try { const user = await profileService.updateProfile(req.user._id, req.body || {}); res.json({ user }); }
  catch (e) { res.status(400).json({ error: e.message || 'Could not update profile.' }); }
});
router.get('/:username', optionalAuth, async (req, res) => {
  const profile = await profileService.getProfile(req.params.username);
  if (!profile) return res.status(404).json({ error: 'Profile not found.' });
  const isFollowing = await profileService.isFollowing(req.user?._id, profile.user._id);
  res.json({ user: profile.user, stats: profile.stats, isFollowing });
});
router.post('/:username/follow', auth, async (req, res) => {
  const result = await profileService.follow(req.user._id, req.params.username);
  res.status(result.status || 200).json(result);
});
router.delete('/:username/follow', auth, async (req, res) => {
  const result = await profileService.unfollow(req.user._id, req.params.username);
  res.status(result.status || 200).json(result);
});
module.exports = router;
