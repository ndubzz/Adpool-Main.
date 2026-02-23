const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },

  amount:         { type: Number, required: true, min: 10 },
  poolSharePct:   { type: Number, required: true },   // (amount/poolCap)*100

  estimatedPayout:{ type: Number, default: 0 },
  actualPayout:   { type: Number, default: null },
  actualROI:      { type: Number, default: null },

  status: {
    type: String,
    enum: ['active','completed','refunded'],
    default: 'active'
  },

  stripePaymentId: { type: String, default: null },
  paidAt:  { type: Date, default: null },
  payoutAt:{ type: Date, default: null },
}, { timestamps: true });

investmentSchema.index({ user: 1, campaign: 1 });

// Calculate final payout when campaign closes
investmentSchema.methods.calcPayout = function(totalProfit) {
  const consumerPool = totalProfit * 0.25;
  const payout = (this.poolSharePct / 100) * consumerPool;
  this.actualPayout = +payout.toFixed(2);
  this.actualROI = +((payout / this.amount - 1) * 100).toFixed(2);
  return this.actualPayout;
};

module.exports = mongoose.model('Investment', investmentSchema);
