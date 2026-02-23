const mongoose = require('mongoose');

const txSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:          { type: String, enum: ['deposit','withdrawal','investment','payout','refund'], required: true },
  amount:        { type: Number, required: true },
  balanceBefore: { type: Number, required: true },
  balanceAfter:  { type: Number, required: true },
  description:   { type: String, required: true },
  campaign:      { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },
  stripeId:      { type: String, default: null },
  status:        { type: String, enum: ['pending','completed','failed'], default: 'completed' },
}, { timestamps: true });

txSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', txSchema);
