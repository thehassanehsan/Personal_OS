const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'personal-os-secret');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { auth };
