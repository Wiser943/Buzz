const mongoose = require('mongoose');
const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, maxlength: 5000, default: '' },
  media: [{ type: String }],
  mediaType: { type: String, enum: ['none', 'image', 'video'], default: 'none' },
  visibility: { type: String, enum: ['public', 'followers'], default: 'public' },
  status: { type: String, enum: ['pending', 'published', 'removed'], default: 'published' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  commentsCount: { type: Number, default: 0 },
  isRepost: { type: Boolean, default: false },
  repostOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  repostsCount: { type: Number, default: 0 },
  pinned: { type: Boolean, default: false },
  threadRoot: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null, index: true },
  threadCount: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  editedAt: { type: Date, default: null },
  community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', default: null, index: true }
}, { timestamps: true });
module.exports = mongoose.model('Post', postSchema);
