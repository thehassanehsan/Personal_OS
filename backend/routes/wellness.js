const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth } = require('../middleware/auth');

const appliesOn = (item, date) => {
  const d = new Date(date + 'T00:00:00');
  const weekday = d.getDay();
  if (item.frequency === 'daily') return true;
  if (item.frequency === 'weekly') return item.weekday === weekday;
  if (item.frequency === 'monthly') return d.getDate() === 1; // simplistic: 1st of month
  if (item.frequency === 'every_other_day') {
    const epoch = Math.floor(d.getTime() / 86400000);
    return epoch % 2 === 0;
  }
  return false;
};

router.get('/', auth, async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const items = await pool.query(`SELECT * FROM wellness_items WHERE active=true ORDER BY sort_order`);
    const applicable = items.rows.filter(i => appliesOn(i, date));
    for (const item of applicable) {
      await pool.query(`INSERT INTO wellness_logs (item_id,log_date,done) VALUES ($1,$2,false) ON CONFLICT (item_id,log_date) DO NOTHING`, [item.id, date]);
    }
    const logs = await pool.query(`
      SELECT wl.id as log_id, wl.done,
             wi.id as item_id, wi.name, wi.frequency, wi.duration_minutes, wi.sort_order
      FROM wellness_logs wl JOIN wellness_items wi ON wi.id = wl.item_id
      WHERE wl.log_date=$1 AND wi.active=true ORDER BY wi.sort_order
    `, [date]);
    res.json(logs.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/logs/:id', auth, async (req, res) => {
  const { done } = req.body;
  const r = await pool.query(`UPDATE wellness_logs SET done=$1 WHERE id=$2 RETURNING *`, [done, req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error:'Not found' });
  res.json(r.rows[0]);
});

router.post('/items', auth, async (req, res) => {
  const { name, frequency, weekday, duration_minutes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error:'Name required' });
  const r = await pool.query(`INSERT INTO wellness_items (name,frequency,weekday,duration_minutes,sort_order) VALUES ($1,$2,$3,$4,99) RETURNING *`,
    [name, frequency||'daily', weekday??null, duration_minutes||null]);
  res.status(201).json(r.rows[0]);
});

router.delete('/items/:id', auth, async (req, res) => {
  await pool.query(`UPDATE wellness_items SET active=false WHERE id=$1`, [req.params.id]);
  res.json({ ok:true });
});

router.get('/stats', auth, async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const r = await pool.query(`
    SELECT log_date, COUNT(*) FILTER (WHERE done) as completed, COUNT(*) as total
    FROM wellness_logs WHERE log_date >= CURRENT_DATE - ($1 || ' days')::interval
    GROUP BY log_date ORDER BY log_date ASC
  `, [days]);
  res.json(r.rows);
});

module.exports = router;
