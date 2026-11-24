const router = require('express').Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
router.use(auth);
router.get('/', async (req, res, next) => {
  try { res.json({ notifications: await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(60).populate('actor', 'username displayName avatarUrl isVerified') }); } catch (e) { next(e); }
});
router.get('/unread-count', async (req, res, next) => {
  try {
    const convs = await Conversation.find({ participants: req.user._id }).select('_id');
    const [notifications, messages] = await Promise.all([
      Notification.countDocuments({ user: req.user._id, read: false }),
      Message.countDocuments({ conversation: { $in: convs.map(c => c._id) }, sender: { $ne: req.user._id }, read: false })
    ]);
    res.json({ notifications, messages });
  } catch (e) { next(e); }
});
router.post('/read-all', async (req, res, next) => {
  try { await Notification.updateMany({ user: req.user._id, read: false }, { read: true }); res.json({ ok: true }); } catch (e) { next(e); }
});
module.exports = router;
