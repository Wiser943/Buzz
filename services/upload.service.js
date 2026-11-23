const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const uploadRoot = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(uploadRoot, { recursive: true });
const imageTypes = new Map([
  ['image/jpeg', '.jpg'], ['image/png', '.png'], ['image/webp', '.webp'], ['image/gif', '.gif']
]);
const videoTypes = new Map([
  ['video/mp4', '.mp4'], ['video/webm', '.webm'], ['video/quicktime', '.mov']
]);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = (imageTypes.get(file.mimetype) || videoTypes.get(file.mimetype));
    cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`);
  }
});
function fileFilter(allowVideo) {
  return (_req, file, cb) => {
    const isVideo = videoTypes.has(file.mimetype);
    if (isVideo && allowVideo && _req.user && typeof _req.user.canUploadVideo === 'function' && !_req.user.canUploadVideo()) return cb(new Error('Video uploads require active Premium or Sports Verified status.'));
    const valid = imageTypes.has(file.mimetype) || (allowVideo && isVideo);
    cb(valid ? null : new Error('Unsupported media type. Use JPG, PNG, WEBP, GIF' + (allowVideo ? ', MP4, WEBM or MOV.' : '.')), valid);
  };
}
function createUpload({ allowVideo = false, maxBytes = 10 * 1024 * 1024 } = {}) {
  return multer({ storage, fileFilter: fileFilter(allowVideo), limits: { fileSize: maxBytes, files: 1 } }).single('file');
}
module.exports = { createUpload, imageTypes, videoTypes };
