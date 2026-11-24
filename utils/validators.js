const usernamePattern = /^[a-zA-Z0-9_]{4,24}$/;
function normalizeUsername(value) { return String(value || '').trim().toLowerCase(); }
function validUsername(value) { return usernamePattern.test(String(value || '').trim()); }
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim()); }
module.exports = { normalizeUsername, validUsername, validEmail };
