const router = require('express').Router();
const auth = require('../middleware/auth');
const { createUpload, imageTypes, videoTypes } = require('../services/upload.service');
const mediaUpload = createUpload({ allowVideo: true, maxBytes: 100 * 1024 * 1024 });
const profileUpload = createUpload({ maxBytes: 8 * 1024 * 1024 });
const asUrl = file => `/uploads/${file.filename}`;
const sendMulterError = (err, res) => {
  if (!err) return false;
  const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  res.status(status).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the upload size limit.' : err.message || 'Upload failed.' });
  return true;
};
router.post('/post-media', auth, (req, res) => {
  mediaUpload(req, res, err => {
    if (sendMulterError(err, res)) return;
    if (!req.file) return res.status(400).json({ error: 'Choose a file to upload.' });
    const isVideo = videoTypes.has(req.file.mimetype);
    if (isVideo && !req.user.canUploadVideo()) {
      return res.status(403).json({ error: 'Video uploads require active Premium or Sports Verified status.' });
    }
    res.status(201).json({ url: asUrl(req.file), mediaType: isVideo ? 'video' : 'image', fileSize: req.file.size });
  });
});
router.post('/avatar', auth, (req, res) => {
  profileUpload(req, res, err => {
    if (sendMulterError(err, res)) return;
    if (!req.file || !imageTypes.has(req.file.mimetype)) return res.status(400).json({ error: 'Upload a profile image.' });
    req.user.avatarUrl = asUrl(req.file);
    req.user.save().then(() => res.status(201).json({ url: req.user.avatarUrl, mediaType: 'image' })).catch(() => res.status(500).json({ error: 'Could not save avatar.' }));
  });
});
router.post('/cover', auth, (req, res) => {
  profileUpload(req, res, err => {
    if (sendMulterError(err, res)) return;
    if (!req.file || !imageTypes.has(req.file.mimetype)) return res.status(400).json({ error: 'Upload a cover image.' });
    req.user.coverUrl = asUrl(req.file);
    req.user.save().then(() => res.status(201).json({ url: req.user.coverUrl, mediaType: 'image' })).catch(() => res.status(500).json({ error: 'Could not save cover.' }));
  });
});
module.exports = router;
