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
// Images go to ImgBB when IMGBB_API_KEY is set (Node 18+ global fetch/FormData). Without a key they stay on local disk.
async function hostImage(file) {
  const key = process.env.IMGBB_API_KEY;
  if (!key) { console.warn('IMGBB_API_KEY is not set: storing image locally (ephemeral on most hosts).'); return `/uploads/${file.filename}`; }
  const form = new FormData();
  form.append('image', (await fs.promises.readFile(file.path)).toString('base64'));
  const r = await fetch('https://api.imgbb.com/1/upload?key=' + encodeURIComponent(key), { method: 'POST', body: form });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d?.data?.url) throw new Error(d?.error?.message || 'Image host rejected the upload.');
  fs.promises.unlink(file.path).catch(() => {});
  return d.data.display_url || d.data.url;
}
module.exports = { createUpload, imageTypes, videoTypes, hostImage };
