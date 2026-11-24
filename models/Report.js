const mongoose = require('mongoose');
const S = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['user', 'post', 'profile_picture'], required: true },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  reason: { type: String, trim: true, maxlength: 500, default: '' },
  status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open', index: true },
  action: { type: String, default: '' },
  note: { type: String, maxlength: 500, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
module.exports = mongoose.model('Report', S);
