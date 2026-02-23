const router = require('express').Router();
const User = require('../models/User');
const Investment = require('../models/Investment');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

// GET /api/users/dashboard
router.get('/dashboard', protect, async (req, res) => {
  try {
    const [user, investments, transactions] = await Promise.all([
      User.findById(req.user._id),
      Investment.find({ user: req.user._id })
        .populate('campaign','brandName brandCategory brandIcon status launchDate projectedROI actualROI durationDays')
        .sort({ createdAt: -1 }),
      Transaction.find({ user: req.user._id })
        .sort({ createdAt: -1 }).limit(10)
        .populate('campaign','brandName'),
    ]);

    const completed = investments.filter(i => i.status === 'completed');
    const totalEarned = completed.reduce((s,i) => s+(i.actualPayout||0), 0);

    res.json({
      user: user.toPublic(),
      stats: {
        balance: user.balance,
        totalInvested: user.totalInvested,
        totalEarned: Math.max(totalEarned, user.totalEarned),
        activeCampaigns: investments.filter(i=>i.status==='active').length,
        isPremium: user.isPremium,
      },
      investments,
      transactions,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
