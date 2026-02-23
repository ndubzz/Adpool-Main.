const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

// POST /api/payments/deposit-intent — create Stripe PaymentIntent
router.post('/deposit-intent', protect, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (amount < 10) return res.status(400).json({ error: 'Min deposit $10' });

    // Get or create Stripe customer
    let custId = req.user.stripeCustomerId;
    if (!custId) {
      const cust = await stripe.customers.create({
        email: req.user.email,
        name: `${req.user.firstName} ${req.user.lastName}`,
        metadata: { userId: req.user._id.toString() },
      });
      custId = cust.id;
      await User.findByIdAndUpdate(req.user._id, { stripeCustomerId: custId });
    }

    const pi = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: custId,
      metadata: { userId: req.user._id.toString(), type: 'deposit' },
    });

    res.json({
      clientSecret: pi.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/payments/deposit-confirm — after Stripe payment succeeds on frontend
router.post('/deposit-confirm', protect, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== 'succeeded') return res.status(400).json({ error: 'Payment not completed' });
    if (pi.metadata.userId !== req.user._id.toString()) return res.status(403).json({ error: 'Mismatch' });

    // Idempotency check
    if (await Transaction.findOne({ stripeId: paymentIntentId }))
      return res.status(400).json({ error: 'Already processed' });

    const amount = pi.amount / 100;
    const user = await User.findById(req.user._id);
    const balanceBefore = user.balance;
    user.balance += amount;
    await user.save();

    await Transaction.create({
      user: user._id, type: 'deposit', amount,
      balanceBefore, balanceAfter: user.balance,
      description: 'Wallet deposit', stripeId: paymentIntentId,
    });

    res.json({ newBalance: user.balance, amount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/payments/withdraw
router.post('/withdraw', protect, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (amount < 10) return res.status(400).json({ error: 'Min withdrawal $10' });

    const user = await User.findById(req.user._id);
    if (user.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

    const balanceBefore = user.balance;
    user.balance -= amount;
    await user.save();

    await Transaction.create({
      user: user._id, type: 'withdrawal', amount: -amount,
      balanceBefore, balanceAfter: user.balance,
      description: 'Withdrawal to bank', status: 'pending',
    });

    res.json({ message: 'Withdrawal submitted. 2-3 business days.', newBalance: user.balance });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/payments/transactions
router.get('/transactions', protect, async (req, res) => {
  try {
    const txs = await Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1 }).limit(50)
      .populate('campaign', 'brandName');
    res.json({ transactions: txs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
