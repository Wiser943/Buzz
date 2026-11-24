const AuditLog = require('../models/AuditLog');
module.exports = async function audit(req, action, targetType, targetId, meta = {}) {
  try { await AuditLog.create({ actor: req?.user?._id, action, targetType, targetId: targetId ? String(targetId) : undefined, meta, ip: req?.ip }); }
  catch (e) { console.error('audit failed:', e.message); }
};
