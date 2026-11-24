const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;
const S = new mongoose.Schema({
  user: { type: ObjectId, ref: 'User', required: true, index: true },
  plan: { type: String, enum: ['creator', 'athlete'], required: true },
  reference: { type: String, required: true, unique: true },
  amountKobo: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  paidAt: Date
}, { timestamps: true });
module.exports = mongoose.model('Payment', S);
