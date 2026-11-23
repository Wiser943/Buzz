const Notification = require('../models/Notification');
// Never throws: a failed notification must not break the action that caused it.
module.exports = async function notify(user, { type, actor, post, text = '' }) {
  try { if (actor && String(actor) === String(user)) return; await Notification.create({ user, type, actor, post, text }); }
  catch (e) { console.error('notify failed:', e.message); }
};
