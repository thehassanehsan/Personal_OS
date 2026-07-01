const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const items = await pool.query(`SELECT * FROM deen_items WHERE active=true ORDER BY sort_order`);
    for (const item of items.rows) {
      await pool.query(`INSERT INTO deen_logs (item_id,log_date,done) VALUES ($1,$2,false) ON CONFLICT (item_id,log_date) DO NOTHING`, [item.id, date]);
    }
    const logs = await pool.query(`
      SELECT dl.id as log_id, dl.done, dl.completed_at,
             di.id as item_id, di.name, di.type, di.sort_order
      FROM deen_logs dl JOIN deen_items di ON di.id = dl.item_id
      WHERE dl.log_date=$1 AND di.active=true ORDER BY di.sort_order
    `, [date]);
    res.json(logs.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/logs/:id', auth, async (req, res) => {
  const { done } = req.body;
  const r = await pool.query(`UPDATE deen_logs SET done=$1,completed_at=$2 WHERE id=$3 RETURNING *`,
    [done, done?new Date().toISOString():null, req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error:'Not found' });
  res.json(r.rows[0]);
});

router.post('/items', auth, async (req, res) => {
  const { name, type } = req.body;
  if (!name?.trim()) return res.status(400).json({ error:'Name required' });
  const r = await pool.query(`INSERT INTO deen_items (name,type,sort_order) VALUES ($1,$2,99) RETURNING *`, [name, type||'other']);
  res.status(201).json(r.rows[0]);
});

router.delete('/items/:id', auth, async (req, res) => {
  await pool.query(`UPDATE deen_items SET active=false WHERE id=$1`, [req.params.id]);
  res.json({ ok:true });
});

// Streak + stats
router.get('/stats', auth, async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const r = await pool.query(`
    SELECT log_date, COUNT(*) FILTER (WHERE done) as completed, COUNT(*) as total
    FROM deen_logs WHERE log_date >= CURRENT_DATE - ($1 || ' days')::interval
    GROUP BY log_date ORDER BY log_date ASC
  `, [days]);
  res.json(r.rows);
});

module.exports = router;
