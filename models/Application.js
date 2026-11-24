const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;
const S = new mongoose.Schema({
  opportunity: { type: ObjectId, ref: 'Opportunity', required: true, index: true },
  applicant: { type: ObjectId, ref: 'User', required: true, index: true },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  contact: { type: String, trim: true, maxlength: 120, default: '' }
}, { timestamps: true });
S.index({ opportunity: 1, applicant: 1 }, { unique: true });
module.exports = mongoose.model('Application', S);
