const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

router.post('/login', (req, res) => {
  const { password } = req.body;
  const ownerPass = process.env.OWNER_PASSWORD || 'Hassan@Life2025!';
  if (password !== ownerPass) return res.status(401).json({ error: 'Wrong password' });
  const token = jwt.sign({ id:'owner', name:'Hassan' }, process.env.JWT_SECRET || 'personal-os-secret', { expiresIn:'30d' });
  res.json({ token, user: { id:'owner', name:'Hassan' } });
});

router.get('/me', (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'personal-os-secret');
    res.json({ user: payload });
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

module.exports = router;
