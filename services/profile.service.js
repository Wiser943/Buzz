const User = require('../models/User');
const Follow = require('../models/Follow');
const notify = require('./notify');
const { view: streakView } = require('./streak');

const publicFields = 'username displayName avatarUrl coverUrl bio isVerified role karma subscription.plan subscription.status avatarSettings createdAt streak';
async function getProfile(username, self = false) {
  const user = await User.findOne({ username: String(username).toLowerCase() }).select(publicFields + ' settings.privacy.showStreak' + (self ? ' emailVerified proDashboard' : ''));
  if (!user) return null;
  const [followers, following] = await Promise.all([
    Follow.countDocuments({ following: user._id }),
    Follow.countDocuments({ follower: user._id })
  ]);
  const o = user.toObject(), hide = !self && o.settings?.privacy?.showStreak === false; delete o.settings;
  return { user: { ...o, streak: hide ? null : streakView(user.streak) }, stats: { followers, following } };
}
async function updateProfile(userId, data) {
  const allowed = ['displayName', 'bio', 'avatarUrl', 'coverUrl', 'avatarSettings'];
  const update = {};
  for (const key of allowed) if (data[key] !== undefined) update[key] = data[key];
  if (update.displayName !== undefined && (!String(update.displayName).trim() || String(update.displayName).length > 60)) throw new Error('Display name must be 1–60 characters.');
  if (update.bio !== undefined && String(update.bio).length > 300) throw new Error('Bio must be 300 characters or fewer.');
  for (const key of ['avatarUrl', 'coverUrl']) if (update[key] !== undefined && String(update[key]).length > 2000) throw new Error(`${key} is too long.`);
  return User.findByIdAndUpdate(userId, { $set: update }, { new: true, runValidators: true }).select(publicFields);
}
async function follow(followerId, username) {
  const target = await User.findOne({ username: String(username).toLowerCase() });
  if (!target) return { error: 'User not found', status: 404 };
  if (String(target._id) === String(followerId)) return { error: 'You cannot follow yourself.', status: 400 };
  try { await Follow.create({ follower: followerId, following: target._id }); await notify(target._id, { type: 'follow', actor: followerId }); }
  catch (e) { if (e.code !== 11000) throw e; }
  return { ok: true, following: true };
}
async function unfollow(followerId, username) {
  const target = await User.findOne({ username: String(username).toLowerCase() });
  if (!target) return { error: 'User not found', status: 404 };
  await Follow.deleteOne({ follower: followerId, following: target._id });
  return { ok: true, following: false };
}
async function isFollowing(followerId, targetId) {
  if (!followerId) return false;
  return !!(await Follow.exists({ follower: followerId, following: targetId }));
}
module.exports = { getProfile, updateProfile, follow, unfollow, isFollowing };
