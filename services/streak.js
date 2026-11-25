// Daily activity streak: a day counts when the user posts, replies or continues a thread (UTC day).
const User = require('../models/User');
const dayIdx = () => Math.floor(Date.now() / 864e5);
async function touch(userId) {
  try {
    const today = dayIdx();
    const u = await User.findById(userId).select('streak');
    if (!u) return null;
    const s = u.streak || {};
    if (s.lastDay === today) return view(s);
    const count = s.lastDay === today - 1 ? (s.count || 0) + 1 : 1;
    const next = { count, best: Math.max(s.best || 0, count), lastDay: today };
    // Conditional write: two requests in the same moment cannot both extend the streak.
    await User.updateOne({ _id: userId, 'streak.lastDay': { $ne: today } }, { $set: { streak: next } });
    return view(next);
  } catch (_) { return null; }
}
// What the UI shows: a streak that was not extended yesterday or today has ended.
function view(s = {}) {
  const today = dayIdx(), alive = s.lastDay === today || s.lastDay === today - 1;
  return { count: alive ? (s.count || 0) : 0, best: s.best || 0, today: s.lastDay === today };
}
module.exports = { touch, view };
