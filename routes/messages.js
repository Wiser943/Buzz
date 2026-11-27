const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const stream = require('../services/stream');
const rateLimit = require('../middleware/rateLimit');
const { scan } = require('../services/moderation.service');
const mongoose = require('mongoose');
router.use(auth);
const card = 'username displayName avatarUrl isVerified';
const keyOf = (a, b) => [String(a), String(b)].sort().join(':');
// Only people who follow you AND whom you follow can be messaged (matches the app's rule).
async function canMessage(me, other) {
  const [a, b, blocked, o] = await Promise.all([
    Follow.exists({ follower: me, following: other }), Follow.exists({ follower: other, following: me }),
    Block.exists({ $or: [{ blocker: me, blocked: other }, { blocker: other, blocked: me }] }),
    User.findById(other).select('settings.privacy.allowMessages')
  ]);
  return !!(a && b && !blocked && o?.settings?.privacy?.allowMessages !== 'nobody');
}
// People the current user can message or add to a group: mutual follows, not blocked, accepting messages.
async function contactIds(meId) {
  const [mine, theirs, blocks] = await Promise.all([Follow.find({ follower: meId }).select('following'), Follow.find({ following: meId }).select('follower'), Block.find({ $or: [{ blocker: meId }, { blocked: meId }] })]);
  const back = new Set(theirs.map(f => String(f.follower))), blocked = new Set(blocks.map(b => String(b.blocker) === String(meId) ? String(b.blocked) : String(b.blocker)));
  return mine.map(f => f.following).filter(id => back.has(String(id)) && !blocked.has(String(id)));
}
router.get('/contacts', async (req, res, next) => {
  try { res.json({ users: await User.find({ _id: { $in: await contactIds(req.user._id) }, status: 'active', 'settings.privacy.allowMessages': { $ne: 'nobody' } }).select(card).sort({ displayName: 1 }).limit(200) }); } catch (e) { next(e); }
});
router.get('/conversations', async (req, res, next) => {
  try {
    const me = req.user._id, convs = await Conversation.find({ participants: me }).sort({ lastAt: -1 }).limit(60).lean();
    const otherIds = convs.filter(c => !c.isGroup).map(c => c.participants.find(p => String(p) !== String(me))).filter(Boolean);
    const users = new Map((await User.find({ _id: { $in: otherIds } }).select(card)).map(u => [String(u._id), u]));
    const out = await Promise.all(convs.map(async c => {
      if (c.isGroup) return { id: c._id, isGroup: true, name: c.name, members: c.participants.length, lastMessage: c.lastMessage, lastSenderName: c.lastSenderName, mine: String(c.lastSender) === String(me), lastAt: c.lastAt, unread: await Message.countDocuments({ conversation: c._id, sender: { $ne: me }, readBy: { $ne: me } }) };
      const other = users.get(String(c.participants.find(p => String(p) !== String(me))));
      return other ? { id: c._id, user: other, lastMessage: c.lastMessage, mine: String(c.lastSender) === String(me), lastAt: c.lastAt, unread: await Message.countDocuments({ conversation: c._id, sender: { $ne: me }, read: false }) } : null;
    }));
    res.json({ conversations: out.filter(Boolean) });
  } catch (e) { next(e); }
});
router.get('/with/:username', async (req, res, next) => {
  try {
    const other = await User.findOne({ username: String(req.params.username).toLowerCase() }).select(card);
    if (!other) return res.status(404).json({ error: 'User not found.' });
    const conv = await Conversation.findOne({ key: keyOf(req.user._id, other._id) });
    const q = { conversation: conv?._id };
    if (req.query.after && !isNaN(Date.parse(req.query.after))) q.createdAt = { $gt: new Date(req.query.after) };
    const messages = conv ? await Message.find(q).sort({ createdAt: 1 }).limit(200) : [];
    if (conv) await Message.updateMany({ conversation: conv._id, sender: other._id, read: false }, { read: true });
    res.json({ user: other, messages, canMessage: await canMessage(req.user._id, other._id) });
  } catch (e) { next(e); }
});
router.post('/with/:username', rateLimit({ windowMs: 60000, max: 40, by: 'user', message: 'You are sending messages too fast.' }), async (req, res, next) => {
  try {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text || text.length > 2000) return res.status(400).json({ error: 'Message must be 1–2000 characters.' });
    const other = await User.findOne({ username: String(req.params.username).toLowerCase() }).select('_id');
    if (!other) return res.status(404).json({ error: 'User not found.' });
    if (!(await canMessage(req.user._id, other._id))) return res.status(403).json({ error: 'You can only message users who follow you and whom you follow.' });
    const key = keyOf(req.user._id, other._id);
    const conv = await Conversation.findOneAndUpdate({ key }, { $setOnInsert: { key, participants: [req.user._id, other._id] } }, { upsert: true, new: true });
    if (scan(text).reject) return res.status(400).json({ error: 'Your message contains disallowed words.' });
    const message = await Message.create({ conversation: conv._id, sender: req.user._id, text });
    stream.push(other._id, 'message', { from: req.user.username, text: text.slice(0, 80) });
    conv.lastMessage = text.slice(0, 120); conv.lastSender = req.user._id; conv.lastAt = message.createdAt; await conv.save();
    res.status(201).json({ message });
  } catch (e) { next(e); }
});
// ----- Group chats (up to 200 people; members must be your mutual follows) -----
const groupFor = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(400).json({ error: 'Invalid group.' }); return null; }
  const g = await Conversation.findOne({ _id: req.params.id, isGroup: true, participants: req.user._id });
  if (!g) res.status(404).json({ error: 'Group not found or you are not a member.' });
  return g;
};
async function mutualsFrom(req, usernames) {
  const names = [...new Set((Array.isArray(usernames) ? usernames : []).map(x => String(x).toLowerCase()))].slice(0, 199);
  const allowed = new Set((await contactIds(req.user._id)).map(String));
  const users = await User.find({ username: { $in: names }, status: 'active', 'settings.privacy.allowMessages': { $ne: 'nobody' } }).select('_id');
  return users.map(u => u._id).filter(id => allowed.has(String(id)));
}
router.post('/groups', rateLimit({ windowMs: 3600e3, max: 10, by: 'user', message: 'You are creating groups too fast.' }), async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (name.length < 2 || name.length > 50) return res.status(400).json({ error: 'Group name must be 2–50 characters.' });
    if (scan(name).reject) return res.status(400).json({ error: 'That group name contains disallowed words.' });
    const ids = await mutualsFrom(req, req.body?.usernames);
    if (!ids.length) return res.status(400).json({ error: 'Add at least one person you follow and who follows you back.' });
    const g = await Conversation.create({ key: 'group:' + new mongoose.Types.ObjectId(), isGroup: true, name, owner: req.user._id, participants: [req.user._id, ...ids], lastMessage: 'Group created', lastAt: new Date() });
    res.status(201).json({ id: g._id });
  } catch (e) { next(e); }
});
router.get('/groups/:id', async (req, res, next) => {
  try {
    const g = await groupFor(req, res); if (!g) return;
    const q = { conversation: g._id };
    if (req.query.after && !isNaN(Date.parse(req.query.after))) q.createdAt = { $gt: new Date(req.query.after) };
    const [messages, members] = await Promise.all([Message.find(q).sort({ createdAt: 1 }).limit(200).populate('sender', card), req.query.after ? [] : User.find({ _id: { $in: g.participants } }).select(card)]);
    await Message.updateMany({ conversation: g._id, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } }, { $addToSet: { readBy: req.user._id } });
    res.json({ group: { id: g._id, name: g.name, owner: g.owner, count: g.participants.length }, members, messages });
  } catch (e) { next(e); }
});
router.post('/groups/:id/messages', rateLimit({ windowMs: 60000, max: 40, by: 'user', message: 'You are sending messages too fast.' }), async (req, res, next) => {
  try {
    const g = await groupFor(req, res); if (!g) return;
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text || text.length > 2000) return res.status(400).json({ error: 'Message must be 1–2000 characters.' });
    if (scan(text).reject) return res.status(400).json({ error: 'Your message contains disallowed words.' });
    const message = await Message.create({ conversation: g._id, sender: req.user._id, text, readBy: [req.user._id] });
    g.lastMessage = text.slice(0, 120); g.lastSender = req.user._id; g.lastSenderName = req.user.displayName || req.user.username; g.lastAt = message.createdAt; await g.save();
    g.participants.forEach(p => { if (String(p) !== String(req.user._id)) stream.push(p, 'message', { from: req.user.username, text: text.slice(0, 80), group: g.name }); });
    res.status(201).json({ message });
  } catch (e) { next(e); }
});
router.post('/groups/:id/members', async (req, res, next) => {
  try {
    const g = await groupFor(req, res); if (!g) return;
    if (String(g.owner) !== String(req.user._id)) return res.status(403).json({ error: 'Only the group owner can add people.' });
    const ids = (await mutualsFrom(req, req.body?.usernames)).filter(id => !g.participants.some(p => String(p) === String(id)));
    if (g.participants.length + ids.length > 200) return res.status(400).json({ error: 'A group can have up to 200 people.' });
    if (!ids.length) return res.status(400).json({ error: 'Nobody new to add.' });
    g.participants.push(...ids); await g.save(); res.json({ added: ids.length });
  } catch (e) { next(e); }
});
router.post('/groups/:id/remove', async (req, res, next) => {
  try {
    const g = await groupFor(req, res); if (!g) return;
    if (String(g.owner) !== String(req.user._id)) return res.status(403).json({ error: 'Only the group owner can remove people.' });
    const u = await User.findOne({ username: String(req.body?.username || '').toLowerCase() }).select('_id');
    if (!u || String(u._id) === String(g.owner)) return res.status(400).json({ error: 'Cannot remove that member.' });
    g.participants = g.participants.filter(p => String(p) !== String(u._id)); await g.save(); res.json({ ok: true });
  } catch (e) { next(e); }
});
router.post('/groups/:id/leave', async (req, res, next) => {
  try {
    const g = await groupFor(req, res); if (!g) return;
    g.participants = g.participants.filter(p => String(p) !== String(req.user._id));
    if (!g.participants.length) { await Message.deleteMany({ conversation: g._id }); await g.deleteOne(); return res.json({ ok: true }); }
    if (String(g.owner) === String(req.user._id)) g.owner = g.participants[0];
    await g.save(); res.json({ ok: true });
  } catch (e) { next(e); }
});
module.exports = router;

