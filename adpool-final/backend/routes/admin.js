const router = require('express').Router();
const Campaign = require('../models/Campaign');
const Investment = require('../models/Investment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

// GET /api/admin/campaigns/pending
router.get('/campaigns/pending', async (req, res) => {
  try {
    const campaigns = await Campaign.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json({ campaigns });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/admin/campaigns/:id/approve
router.put('/campaigns/:id/approve', async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id, { status: 'funding' }, { new: true }
    );
    res.json({ campaign });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/admin/campaigns/:id/reject
router.put('/campaigns/:id/reject', async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id, { status: 'cancelled' }, { new: true }
    );
    res.json({ campaign });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/campaigns/:id/close — close campaign and pay out all investors
router.post('/campaigns/:id/close', async (req, res) => {
  try {
    const { totalRevenue } = req.body;
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    if (campaign.status !== 'live') return res.status(400).json({ error: 'Campaign must be live' });

    const totalProfit   = totalRevenue - campaign.poolCap;
    const consumerPool  = totalProfit * 0.25;
    const adPoolFee     = totalProfit * 0.10;
    const actualROI     = campaign.currentPooled > 0
      ? +((consumerPool / campaign.currentPooled - 1) * 100).toFixed(2) : 0;

    campaign.status       = 'completed';
    campaign.totalRevenue = totalRevenue;
    campaign.totalProfit  = totalProfit;
    campaign.actualROI    = actualROI;
    await campaign.save();

    // Distribute payouts to every active investor
    const investments = await Investment.find({ campaign: campaign._id, status: 'active' });
    let payoutCount = 0;

    for (const inv of investments) {
      const payout = inv.calcPayout(totalProfit);
      inv.status  = 'completed';
      inv.payoutAt = new Date();
      await inv.save();

      const user = await User.findById(inv.user);
      if (user) {
        const before = user.balance;
        user.balance     += payout;
        user.totalEarned += payout;
        await user.save();

        await Transaction.create({
          user: user._id, type: 'payout', amount: payout,
          balanceBefore: before, balanceAfter: user.balance,
          description: `Payout: ${campaign.brandName}`,
          campaign: campaign._id,
        });
        payoutCount++;
      }
    }

    res.json({
      message: `Closed. ${payoutCount} investors paid out.`,
      consumerPool, adPoolFee, actualROI,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [users, campaigns, investments] = await Promise.all([
      User.countDocuments(),
      Campaign.countDocuments(),
      Investment.countDocuments(),
    ]);
    res.json({ users, campaigns, investments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
