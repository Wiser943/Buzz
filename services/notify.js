const Notification = require('../models/Notification');
const stream = require('./stream');
// Never throws: a failed notification must not break the action that caused it.
module.exports = async function notify(user, { type, actor, post, text = '', target }) {
  try { if (actor && String(actor) === String(user)) return; await Notification.create({ user, type, actor, post, text, target }); stream.push(user, 'notification', { type, text }); }
  catch (e) { console.error('notify failed:', e.message); }
};
