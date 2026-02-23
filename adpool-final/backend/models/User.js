const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName:  { type: String, required: true, trim: true },
  lastName:   { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:   { type: String, required: true, minlength: 8, select: false },
  role:       { type: String, enum: ['investor', 'brand', 'admin'], default: 'investor' },

  // Wallet
  balance:       { type: Number, default: 0 },
  totalInvested: { type: Number, default: 0 },
  totalEarned:   { type: Number, default: 0 },

  // Premium
  isPremium:            { type: Boolean, default: false },
  premiumExpiresAt:     { type: Date, default: null },
  stripeCustomerId:     { type: String, default: null },
  stripeSubscriptionId: { type: String, default: null },

  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: Date.now },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.matchPassword = function(plain) {
  return bcrypt.compare(plain, this.password);
};

// Safe public object
userSchema.methods.toPublic = function() {
  const o = this.toObject();
  delete o.password;
  return o;
};

module.exports = mongoose.model('User', userSchema);
