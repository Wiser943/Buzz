const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 24, match: /^[a-zA-Z0-9_]+$/ },
  displayName: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  passwordHash: { type: String, required: true },
  avatarUrl: { type: String, default: '' },
  coverUrl: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 300 },
  isVerified: { type: Boolean, default: false },
  role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
  karma: { type: Number, default: 0, min: 0 },
  subscription: {
    plan: { type: String, enum: ['free', 'premium'], default: 'free' },
    status: { type: String, enum: ['inactive', 'active', 'cancelled', 'past_due'], default: 'inactive' },
    expiresAt: { type: Date, default: null }
  },
  avatarSettings: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });
userSchema.methods.canUploadVideo = function () {
  return this.isVerified || (this.subscription?.plan === 'premium' && this.subscription?.status === 'active');
};
module.exports = mongoose.model('User', userSchema);
