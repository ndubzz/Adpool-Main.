const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Require valid JWT
const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(id).select('-password');
    if (!req.user || !req.user.isActive) return res.status(401).json({ error: 'Unauthorized' });
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Attach user if token present, but don't fail if not
const optAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const { id } = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(id).select('-password');
    }
  } catch {}
  next();
};

const adminOnly = (req, res, next) =>
  req.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Admin only' });

const makeToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

module.exports = { protect, optAuth, adminOnly, makeToken };
