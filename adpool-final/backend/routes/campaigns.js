const router = require('express').Router();
const Campaign = require('../models/Campaign');
const Investment = require('../models/Investment');
const { protect, optAuth, adminOnly } = require('../middleware/auth');

// GET /api/campaigns — public list with filters
router.get('/', optAuth, async (req, res) => {
  try {
    const { category, sort = 'popular', search, status = 'funding', page = 1, limit = 20 } = req.query;
    const filter = { status };
    if (category && category !== 'All') filter.brandCategory = category;
    if (search) filter.$or = [
      { brandName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];

    const sortMap = {
      popular: { currentPooled: -1 },
      roi:     { projectedROI: -1 },
      closing: { launchDate: 1 },
      newest:  { createdAt: -1 },
    };

    const skip = (Number(page) - 1) * Number(limit);
    const [campaigns, total] = await Promise.all([
      Campaign.find(filter).sort(sortMap[sort] || sortMap.popular).skip(skip).limit(Number(limit)),
      Campaign.countDocuments(filter),
    ]);

    res.json({ campaigns, total, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/campaigns/:id — single campaign
router.get('/:id', optAuth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    campaign.viewCount++;
    await campaign.save({ validateBeforeSave: false });
    const investorCount = await Investment.countDocuments({ campaign: campaign._id, status: 'active' });
    res.json({ campaign: { ...campaign.toJSON(), investorCount } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/campaigns — brand submits campaign
router.post('/', protect, async (req, res) => {
  try {
    const {
      brandName, brandCategory, brandIcon, brandWebsite,
      description, adPlatform, poolCap, revenueSharePct,
      projectedROI, launchDate, durationDays
    } = req.body;

    if (!brandName || !brandCategory || !brandWebsite || !description ||
        !adPlatform || !poolCap || !revenueSharePct || !launchDate || !durationDays)
      return res.status(400).json({ error: 'Missing required fields' });

    const launch = new Date(launchDate);
    const end = new Date(launch);
    end.setDate(end.getDate() + Number(durationDays));

    const campaign = new Campaign({
      createdBy: req.user._id,
      brandName, brandCategory, brandIcon: brandIcon || '🏢',
      brandWebsite, description, adPlatform,
      poolCap: Number(poolCap),
      revenueSharePct: Number(revenueSharePct),
      projectedROI: Number(projectedROI) || 0,
      launchDate: launch, endDate: end,
      durationDays: Number(durationDays),
      status: 'pending',
    });
    campaign.buildUTM();
    await campaign.save();

    res.status(201).json({ campaign, message: 'Submitted for review. Approved within 24hrs.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/campaigns/my/list — campaigns I created
router.get('/my/list', protect, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ campaigns });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
