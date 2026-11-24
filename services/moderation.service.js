// Lightweight automatic checks. Rejects words in BANNED_WORDS; flags scams/spam for human review.
const Report = require('../models/Report');
const SCAM = ['double your money', 'send me your password', 'guaranteed profit', 'send btc', 'investment doubling'];
const banned = () => (process.env.BANNED_WORDS || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
function scan(...texts) {
  const t = texts.filter(Boolean).join(' \n ').toLowerCase(), flags = [];
  const hit = banned().find(w => new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(t));
  if (hit) return { reject: true, flags: ['banned_word'] };
  if ((t.match(/https?:\/\//g) || []).length >= 4) flags.push('many_links');
  if (/(.)\1{14,}/.test(t)) flags.push('repeated_characters');
  if (SCAM.some(p => t.includes(p))) flags.push('scam_phrase');
  return { reject: false, flags };
}
async function autoReport({ targetType, targetUser, targetPost, targetTrack, flags }) {
  if (!flags.length) return;
  try { await Report.create({ auto: true, flags, targetType, targetUser, targetPost, targetTrack, reason: 'Automatically flagged: ' + flags.join(', ') }); }
  catch (e) { console.error('autoReport failed:', e.message); }
}
module.exports = { scan, autoReport };
