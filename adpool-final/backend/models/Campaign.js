const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');

const campaignSchema = new mongoose.Schema({
  // Unique ID used in UTM tracking links
  trackingId: { type: String, unique: true, default: uuid },

  // Who created it
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Brand info
  brandName:     { type: String, required: true, trim: true },
  brandCategory: {
    type: String, required: true,
    enum: ['Sustainable Fashion','Food & Beverage','Beauty & Wellness',
           'Consumer Electronics','Sports & Fitness','Home & Living','Other']
  },
  brandIcon:   { type: String, default: '🏢' },
  brandWebsite:{ type: String, required: true },

  // Campaign details
  description: { type: String, required: true },
  adPlatform:  { type: String, required: true, enum: ['Meta','TikTok','Google','YouTube','Pinterest'] },

  // Money
  poolCap:            { type: Number, required: true },   // max $ investors can put in
  currentPooled:      { type: Number, default: 0 },       // $ currently pooled
  revenueSharePct:    { type: Number, required: true, min: 5, max: 30 }, // % of profit → investors
  projectedROI:       { type: Number, default: 0 },

  // Results (filled by admin when closing)
  totalRevenue:  { type: Number, default: 0 },
  totalProfit:   { type: Number, default: 0 },
  actualROI:     { type: Number, default: 0 },

  // Dates
  launchDate: { type: Date, required: true },
  endDate:    { type: Date, required: true },
  durationDays:{ type: Number, required: true },

  // Status
  status: {
    type: String,
    enum: ['pending','approved','funding','live','completed','cancelled'],
    default: 'pending'
  },
  isPremium:  { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },

  // Tracking
  utmLink:    { type: String, default: '' },

  // Counts
  viewCount:     { type: Number, default: 0 },
  investorCount: { type: Number, default: 0 },
}, { timestamps: true, toJSON: { virtuals: true } });

// Virtual: fill %
campaignSchema.virtual('fillPct').get(function() {
  return this.poolCap ? Math.min(100, Math.round((this.currentPooled / this.poolCap) * 100)) : 0;
});

// Virtual: days left
campaignSchema.virtual('daysLeft').get(function() {
  return Math.max(0, Math.ceil((this.launchDate - Date.now()) / 86400000));
});

// Generate UTM link
campaignSchema.methods.buildUTM = function() {
  const p = new URLSearchParams({
    utm_source: 'adpool',
    utm_medium: this.adPlatform.toLowerCase(),
    utm_campaign: this.trackingId,
  });
  this.utmLink = `${this.brandWebsite}?${p}`;
};

module.exports = mongoose.model('Campaign', campaignSchema);
