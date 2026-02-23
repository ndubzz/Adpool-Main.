const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const Transaction = require('../models/Transaction');

router.post('/', async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (e) {
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        if (pi.metadata?.type === 'deposit') {
          const user = await User.findById(pi.metadata.userId);
          if (user && !(await Transaction.findOne({ stripeId: pi.id }))) {
            const amount = pi.amount / 100;
            const balanceBefore = user.balance;
            user.balance += amount;
            await user.save();
            await Transaction.create({
              user: user._id, type: 'deposit', amount,
              balanceBefore, balanceAfter: user.balance,
              description: 'Wallet deposit (webhook)', stripeId: pi.id,
            });
          }
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        if (sub.status === 'active') {
          await User.findOneAndUpdate(
            { stripeCustomerId: sub.customer },
            { isPremium: true, stripeSubscriptionId: sub.id, premiumExpiresAt: new Date(sub.current_period_end * 1000) }
          );
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await User.findOneAndUpdate(
          { stripeCustomerId: sub.customer },
          { isPremium: false, stripeSubscriptionId: null, premiumExpiresAt: null }
        );
        break;
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error('Webhook handler error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
