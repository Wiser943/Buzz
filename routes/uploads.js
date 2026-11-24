const router = require('express').Router();
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { createUpload, imageTypes, videoTypes, hostImage } = require('../services/upload.service');
const { assertFile } = require('../services/fileCheck');
const mediaUpload = createUpload({ allowVideo: true, maxBytes: 100 * 1024 * 1024 });
const audioUpload = createUpload({ allowAudio: true, maxBytes: 30 * 1024 * 1024 });
const profileUpload = createUpload({ maxBytes: 8 * 1024 * 1024 });
const limit = rateLimit({ windowMs: 600e3, max: 40, by: 'user', message: 'Too many uploads. Try again in a few minutes.' });
const sendError = (err, res) => {
  if (!err) return false;
  res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : err.status || 400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the upload size limit.' : err.message || 'Upload failed.' });
  return true;
};
const fail = (res, e) => res.status(e.status || 502).json({ error: e.message || 'Upload failed.' });
router.post('/post-media', auth, limit, (req, res) => {
  mediaUpload(req, res, async err => {
    if (sendError(err, res)) return;
    if (!req.file) return res.status(400).json({ error: 'Choose a file to upload.' });
    try {
      await assertFile(req.file);
      const isVideo = videoTypes.has(req.file.mimetype);
      if (isVideo && !req.user.canUploadVideo()) return res.status(403).json({ error: 'Video uploads require active Premium or Sports Verified status.' });
      res.status(201).json({ url: isVideo ? `/uploads/${req.file.filename}` : await hostImage(req.file), mediaType: isVideo ? 'video' : 'image', fileSize: req.file.size });
    } catch (e) { fail(res, e); }
  });
});
router.post('/audio', auth, limit, (req, res) => {
  audioUpload(req, res, async err => {
    if (sendError(err, res)) return;
    if (!req.file) return res.status(400).json({ error: 'Choose an audio file.' });
    try { await assertFile(req.file); res.status(201).json({ url: `/uploads/${req.file.filename}`, fileSize: req.file.size }); } catch (e) { fail(res, e); }
  });
});
const profileImage = (field, label) => (req, res) => {
  profileUpload(req, res, async err => {
    if (sendError(err, res)) return;
    if (!req.file || !imageTypes.has(req.file.mimetype)) return res.status(400).json({ error: `Upload a ${label} image.` });
    try { await assertFile(req.file); req.user[field] = await hostImage(req.file); await req.user.save(); res.status(201).json({ url: req.user[field], mediaType: 'image' }); }
    catch (e) { fail(res, e); }
  });
};
router.post('/avatar', auth, limit, profileImage('avatarUrl', 'profile'));
router.post('/cover', auth, limit, profileImage('coverUrl', 'cover'));
module.exports = router;
