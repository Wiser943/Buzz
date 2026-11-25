const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
// On Render, mount a persistent disk and set UPLOAD_DIR to it (e.g. /var/data/uploads) so files survive redeploys.
const uploadRoot = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(uploadRoot, { recursive: true });
const imageTypes = new Map([
  ['image/jpeg', '.jpg'], ['image/png', '.png'], ['image/webp', '.webp'], ['image/gif', '.gif']
]);
const videoTypes = new Map([
  ['video/mp4', '.mp4'], ['video/webm', '.webm'], ['video/quicktime', '.mov']
]);
const audioTypes = new Map([
  ['audio/mpeg', '.mp3'], ['audio/mp3', '.mp3'], ['audio/wav', '.wav'], ['audio/x-wav', '.wav'], ['audio/mp4', '.m4a'], ['audio/x-m4a', '.m4a'], ['audio/aac', '.aac'], ['audio/ogg', '.ogg'], ['audio/webm', '.weba']
]);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = (imageTypes.get(file.mimetype) || videoTypes.get(file.mimetype) || audioTypes.get(file.mimetype));
    cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`);
  }
});
function fileFilter(allowVideo, allowAudio) {
  return (_req, file, cb) => {
    if (allowAudio) return cb(audioTypes.has(file.mimetype) ? null : new Error('Unsupported audio type. Use MP3, WAV, M4A, AAC or OGG.'), audioTypes.has(file.mimetype));
    const isVideo = videoTypes.has(file.mimetype);
    if (isVideo && allowVideo && _req.user && typeof _req.user.canUploadVideo === 'function' && !_req.user.canUploadVideo()) return cb(new Error('Video uploads require active Premium or Sports Verified status.'));
    const valid = imageTypes.has(file.mimetype) || (allowVideo && isVideo);
    cb(valid ? null : new Error('Unsupported media type. Use JPG, PNG, WEBP, GIF' + (allowVideo ? ', MP4, WEBM or MOV.' : '.')), valid);
  };
}
function createUpload({ allowVideo = false, allowAudio = false, maxBytes = 10 * 1024 * 1024 } = {}) {
  return multer({ storage, fileFilter: fileFilter(allowVideo, allowAudio), limits: { fileSize: maxBytes, files: 1 } }).single('file');
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
module.exports = { createUpload, imageTypes, videoTypes, audioTypes, hostImage, uploadRoot };
