const router = require('express').Router();
const Investment = require('../models/Investment');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

// POST /api/investments — fund a campaign
router.post('/', protect, async (req, res) => {
  try {
    const { campaignId, amount } = req.body;
    const amt = Number(amount);

    if (amt < 10) return res.status(400).json({ error: 'Minimum investment is $10' });

    const [campaign, user] = await Promise.all([
      Campaign.findById(campaignId),
      User.findById(req.user._id),
    ]);

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (!['funding', 'approved'].includes(campaign.status))
      return res.status(400).json({ error: 'Campaign not accepting investments' });

    const remaining = campaign.poolCap - campaign.currentPooled;
    if (amt > remaining)
      return res.status(400).json({ error: `Only $${remaining.toFixed(2)} remaining in pool` });

    if (user.balance < amt)
      return res.status(400).json({ error: 'Insufficient balance. Deposit funds first.' });

    // Pool share
    const poolSharePct = (amt / campaign.poolCap) * 100;

    // Estimate payout
    const estRevenue = campaign.poolCap * (1 + campaign.projectedROI / 100);
    const estProfit  = estRevenue - campaign.poolCap;
    const estPayout  = (poolSharePct / 100) * estProfit * 0.25;

    // Create investment
    const investment = await Investment.create({
      user: user._id,
      campaign: campaign._id,
      amount: amt,
      poolSharePct,
      estimatedPayout: +estPayout.toFixed(2),
      status: 'active',
      paidAt: new Date(),
    });

    // Deduct balance
    const balanceBefore = user.balance;
    user.balance -= amt;
    user.totalInvested += amt;
    await user.save();

    // Update campaign
    campaign.currentPooled += amt;
    campaign.investorCount += 1;
    await campaign.save();

    // Transaction record
    await Transaction.create({
      user: user._id,
      type: 'investment',
      amount: -amt,
      balanceBefore,
      balanceAfter: user.balance,
      description: `Invested in ${campaign.brandName}`,
      campaign: campaign._id,
    });

    res.status(201).json({ investment, newBalance: user.balance });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/investments/mine — all my investments
router.get('/mine', protect, async (req, res) => {
  try {
    const investments = await Investment.find({ user: req.user._id })
      .populate('campaign', 'brandName brandCategory brandIcon status launchDate projectedROI actualROI durationDays')
      .sort({ createdAt: -1 });
    res.json({ investments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/investments/summary — portfolio summary
router.get('/summary', protect, async (req, res) => {
  try {
    const all = await Investment.find({ user: req.user._id });
    const active    = all.filter(i => i.status === 'active');
    const completed = all.filter(i => i.status === 'completed');
    const totalEarned = completed.reduce((s, i) => s + (i.actualPayout || 0), 0);
    const avgROI = completed.length
      ? completed.reduce((s, i) => s + (i.actualROI || 0), 0) / completed.length : 0;
    const winRate = completed.length
      ? Math.round(completed.filter(i => (i.actualROI || 0) > 0).length / completed.length * 100) : 0;

    res.json({ totalInvested: all.reduce((s,i)=>s+i.amount,0), totalEarned, avgROI: +avgROI.toFixed(1), activeCampaigns: active.length, winRate });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
