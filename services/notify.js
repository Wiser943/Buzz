const Notification = require('../models/Notification');
const User = require('../models/User');
const stream = require('./stream');
const PREF = { like: 'likes', comment: 'comments', follow: 'follows', repost: 'reposts', mention: 'mentions' };
// Never throws: a failed notification must not break the action that caused it.
module.exports = async function notify(user, { type, actor, post, text = '', target }) {
  try {
    if (actor && String(actor) === String(user)) return;
    if (PREF[type]) { const u = await User.findById(user).select('settings.notif'); if (u?.settings?.notif?.[PREF[type]] === false) return; }
    await Notification.create({ user, type, actor, post, text, target }); stream.push(user, 'notification', { type, text });
  } catch (e) { console.error('notify failed:', e.message); }
};
