const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 4, maxlength: 24, match: /^[a-zA-Z0-9_]+$/ },
  displayName: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  passwordHash: { type: String, required: true },
  avatarUrl: { type: String, default: '' },
  coverUrl: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 300 },
  isVerified: { type: Boolean, default: false },
  role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
  karma: { type: Number, default: 0, min: 0 },
  predPoints: { type: Number, default: 0, min: 0, index: true },
  status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
  strikes: { type: Number, default: 0 },
  badgePlan: { type: String, enum: ['creator', 'athlete', null], default: null },
  badgeUntil: { type: Date, default: null },
  subscription: {
    plan: { type: String, enum: ['free', 'premium'], default: 'free' },
    status: { type: String, enum: ['inactive', 'active', 'cancelled', 'past_due'], default: 'inactive' },
    expiresAt: { type: Date, default: null }
  },
  streak: { count: { type: Number, default: 0 }, best: { type: Number, default: 0 }, lastDay: { type: Number, default: null } },
  emailVerified: { type: Boolean, default: false },
  passwordChangedAt: { type: Date, default: null },
  settings: {
    notif: {
      likes: { type: Boolean, default: true }, comments: { type: Boolean, default: true }, follows: { type: Boolean, default: true },
      reposts: { type: Boolean, default: true }, mentions: { type: Boolean, default: true }
    },
    privacy: {
      showStreak: { type: Boolean, default: true },
      allowMessages: { type: String, enum: ['mutual', 'nobody'], default: 'mutual' }
    }
  },
  proDashboard: { type: Boolean, default: false },
  gamePoints: { type: Number, default: 0 },
  gameDaily: { day: { type: Number, default: null }, points: { type: Number, default: 0 } },
  aiUsage: { day: { type: Number, default: null }, count: { type: Number, default: 0 } },
  avatarSettings: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });
userSchema.methods.canUploadVideo = function () {
  return this.isVerified || (this.subscription?.plan === 'premium' && this.subscription?.status === 'active');
};
module.exports = mongoose.model('User', userSchema);
