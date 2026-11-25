const User = require('../models/User');
const notify = require('./notify');
// Finds @usernames in text and tells those people (max 5 per post/comment).
async function notifyMentions(text, actor, postId) {
  try {
    const names = [...new Set([...String(text).matchAll(/(^|[^\w@])@([a-zA-Z0-9_]{4,24})\b/g)].map(m => m[2].toLowerCase()))].slice(0, 5);
    if (!names.length) return;
    const users = await User.find({ username: { $in: names }, status: 'active' }).select('_id');
    for (const u of users) await notify(u._id, { type: 'mention', actor, post: postId, text: String(text).slice(0, 80) });
  } catch (_) { }
}
module.exports = { notifyMentions };
