const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;
const S = new mongoose.Schema({
  owner: { type: ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  isPublic: { type: Boolean, default: false },
  tracks: [{ type: ObjectId, ref: 'Track' }]
}, { timestamps: true });
module.exports = mongoose.model('Playlist', S);
