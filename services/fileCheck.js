// Verifies the real file type from its first bytes (a renamed .exe cannot pass as an image).
const fs = require('fs');
function sniff(b) {
  const hex = b.subarray(0, 12).toString('hex'), ascii = b.subarray(0, 12).toString('latin1');
  if (hex.startsWith('ffd8ff') || hex.startsWith('89504e47') || ascii.startsWith('GIF8') || (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP')) return 'image';
  if (ascii.slice(4, 8) === 'ftyp') return /^(M4A|M4B|mp4a)/.test(ascii.slice(8, 12)) ? 'audio' : 'video';
  if (hex.startsWith('1a45dfa3')) return 'video/audio';
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WAVE') return 'audio';
  if (ascii.startsWith('ID3') || ascii.startsWith('OggS') || ascii.startsWith('fLaC') || /^ff(fb|f3|f2|f1|f9)/.test(hex)) return 'audio';
  return null;
}
async function assertFile(file) {
  const fd = await fs.promises.open(file.path, 'r'); const buf = Buffer.alloc(16);
  try { await fd.read(buf, 0, 16, 0); } finally { await fd.close(); }
  const real = sniff(buf), declared = file.mimetype.split('/')[0];
  const ok = real && (real === declared || real === 'video/audio' && ['video', 'audio'].includes(declared));
  if (!ok) { fs.promises.unlink(file.path).catch(() => {}); const e = new Error('The file contents do not match its type. Upload a real image, video or audio file.'); e.status = 400; throw e; }
}
module.exports = { assertFile, sniff };
