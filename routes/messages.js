const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
router.use(auth);
const card = 'username displayName avatarUrl isVerified';
const keyOf = (a, b) => [String(a), String(b)].sort().join(':');
// Only people who follow you AND whom you follow can be messaged (matches the app's rule).
async function canMessage(me, other) {
  const [a, b, blocked] = await Promise.all([
    Follow.exists({ follower: me, following: other }), Follow.exists({ follower: other, following: me }),
    Block.exists({ $or: [{ blocker: me, blocked: other }, { blocker: other, blocked: me }] })
  ]);
  return !!(a && b && !blocked);
}
router.get('/contacts', async (req, res, next) => {
  try {
    const [mine, theirs] = await Promise.all([Follow.find({ follower: req.user._id }).select('following'), Follow.find({ following: req.user._id }).select('follower')]);
    const followers = new Set(theirs.map(f => String(f.follower)));
    const ids = mine.map(f => f.following).filter(id => followers.has(String(id)));
    res.json({ users: await User.find({ _id: { $in: ids }, status: { $ne: 'banned' } }).select(card).limit(200) });
  } catch (e) { next(e); }
});
router.get('/conversations', async (req, res, next) => {
  try {
    const convs = await Conversation.find({ participants: req.user._id }).sort({ lastAt: -1 }).limit(50).populate('participants', card);
    const out = await Promise.all(convs.map(async c => ({
      id: c._id, user: c.participants.find(p => String(p._id) !== String(req.user._id)), lastMessage: c.lastMessage, lastAt: c.lastAt,
      unread: await Message.countDocuments({ conversation: c._id, sender: { $ne: req.user._id }, read: false })
    })));
    res.json({ conversations: out.filter(c => c.user) });
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
router.post('/with/:username', async (req, res, next) => {
  try {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text || text.length > 2000) return res.status(400).json({ error: 'Message must be 1–2000 characters.' });
    const other = await User.findOne({ username: String(req.params.username).toLowerCase() }).select('_id');
    if (!other) return res.status(404).json({ error: 'User not found.' });
    if (!(await canMessage(req.user._id, other._id))) return res.status(403).json({ error: 'You can only message users who follow you and whom you follow.' });
    const key = keyOf(req.user._id, other._id);
    const conv = await Conversation.findOneAndUpdate({ key }, { $setOnInsert: { key, participants: [req.user._id, other._id] } }, { upsert: true, new: true });
    const message = await Message.create({ conversation: conv._id, sender: req.user._id, text });
    conv.lastMessage = text.slice(0, 120); conv.lastSender = req.user._id; conv.lastAt = message.createdAt; await conv.save();
    res.status(201).json({ message });
  } catch (e) { next(e); }
});
module.exports = router;
