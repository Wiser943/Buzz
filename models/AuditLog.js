const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;
const S = new mongoose.Schema({
  actor: { type: ObjectId, ref: 'User' },
  action: { type: String, required: true, index: true },
  targetType: String, targetId: String,
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: String
}, { timestamps: true });
S.index({ createdAt: -1 });
module.exports = mongoose.model('AuditLog', S);
