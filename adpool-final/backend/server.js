require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// ── Security ──────────────────────────────
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// ── CORS ──────────────────────────────────
const allowed = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://adpool.vercel.app',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.some(u => origin.startsWith(u))) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ── Stripe webhook needs raw body ─────────
app.use('/api/webhook',
  express.raw({ type: 'application/json' }),
  require('./routes/webhook')
);

// ── Body parser ───────────────────────────
app.use(express.json());

// ── Database ──────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error('❌ MongoDB error:', err.message); process.exit(1); });

// ── Routes ────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/campaigns',   require('./routes/campaigns'));
app.use('/api/investments', require('./routes/investments'));
app.use('/api/payments',    require('./routes/payments'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/admin',       require('./routes/admin'));

// ── Health check ──────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

// ── 404 ───────────────────────────────────
app.use((_, res) => res.status(404).json({ error: 'Not found' }));

// ── Error handler ─────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 AdPool API on port ${PORT}`));
