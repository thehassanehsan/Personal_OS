const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const r = await pool.query(`SELECT * FROM finance_entries ORDER BY date DESC, created_at DESC`);
  res.json(r.rows);
});

router.get('/summary', auth, async (req, res) => {
  const monthly = await pool.query(`
    SELECT TO_CHAR(date,'YYYY-MM') as month,
      SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expenses
    FROM finance_entries WHERE date >= NOW() - INTERVAL '12 months'
    GROUP BY month ORDER BY month ASC
  `);
  const totals = await pool.query(`
    SELECT
      SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_expenses
    FROM finance_entries
  `);
  const byCategory = await pool.query(`
    SELECT category, SUM(amount) as total FROM finance_entries
    WHERE type='expense' AND date >= date_trunc('month', NOW())
    GROUP BY category ORDER BY total DESC
  `);
  res.json({ monthly: monthly.rows, totals: totals.rows[0], byCategory: byCategory.rows });
});

router.post('/', auth, async (req, res) => {
  const { type, category, description, amount, currency, date, notes } = req.body;
  if (!type || !description || !amount) return res.status(400).json({ error:'type, description, amount required' });
  const r = await pool.query(`INSERT INTO finance_entries (type,category,description,amount,currency,date,notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [type,category,description,amount,currency||'USD',date||null,notes]);
  res.status(201).json(r.rows[0]);
});

router.put('/:id', auth, async (req, res) => {
  const { type, category, description, amount, currency, date, notes } = req.body;
  const r = await pool.query(`UPDATE finance_entries SET type=$1,category=$2,description=$3,amount=$4,currency=$5,date=$6,notes=$7 WHERE id=$8 RETURNING *`,
    [type,category,description,amount,currency,date||null,notes,req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error:'Not found' });
  res.json(r.rows[0]);
});

router.delete('/:id', auth, async (req, res) => {
  await pool.query(`DELETE FROM finance_entries WHERE id=$1`, [req.params.id]);
  res.json({ ok:true });
});

// ── WISHLIST ──────────────────────────────────────────────────────────────────
router.get('/wishlist/all', auth, async (req, res) => {
  const r = await pool.query(`SELECT * FROM wishlist ORDER BY purchased ASC, CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, created_at DESC`);
  res.json(r.rows);
});

router.post('/wishlist', auth, async (req, res) => {
  const { item, price, currency, priority, link, notes } = req.body;
  if (!item?.trim()) return res.status(400).json({ error:'Item required' });
  const r = await pool.query(`INSERT INTO wishlist (item,price,currency,priority,link,notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [item, price||null, currency||'USD', priority||'medium', link, notes]);
  res.status(201).json(r.rows[0]);
});

router.put('/wishlist/:id', auth, async (req, res) => {
  const { item, price, currency, priority, link, notes, purchased } = req.body;
  const r = await pool.query(`UPDATE wishlist SET item=$1,price=$2,currency=$3,priority=$4,link=$5,notes=$6,purchased=$7 WHERE id=$8 RETURNING *`,
    [item,price||null,currency,priority,link,notes,purchased??false,req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error:'Not found' });
  res.json(r.rows[0]);
});

router.delete('/wishlist/:id', auth, async (req, res) => {
  await pool.query(`DELETE FROM wishlist WHERE id=$1`, [req.params.id]);
  res.json({ ok:true });
});

module.exports = router;
