const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth } = require('../middleware/auth');

// GET /api/diet?date=
router.get('/', auth, async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const items = await pool.query(`SELECT * FROM diet_items WHERE active=true ORDER BY sort_order`);
    for (const item of items.rows) {
      await pool.query(`INSERT INTO diet_logs (item_id,log_date,done,current_value) VALUES ($1,$2,false,0) ON CONFLICT (item_id,log_date) DO NOTHING`, [item.id, date]);
    }
    const logs = await pool.query(`
      SELECT dl.id as log_id, dl.done, dl.current_value,
             di.id as item_id, di.name, di.item_type, di.target_value, di.unit, di.sort_order
      FROM diet_logs dl JOIN diet_items di ON di.id = dl.item_id
      WHERE dl.log_date=$1 AND di.active=true ORDER BY di.sort_order
    `, [date]);
    const food = await pool.query(`SELECT * FROM food_logs WHERE log_date=$1 ORDER BY created_at ASC`, [date]);
    res.json({ checklist: logs.rows, food: food.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/logs/:id', auth, async (req, res) => {
  const { done, current_value } = req.body;
  const r = await pool.query(`UPDATE diet_logs SET done=$1, current_value=$2 WHERE id=$3 RETURNING *`,
    [done??false, current_value??0, req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error:'Not found' });
  res.json(r.rows[0]);
});

router.post('/items', auth, async (req, res) => {
  const { name, item_type, target_value, unit } = req.body;
  if (!name?.trim()) return res.status(400).json({ error:'Name required' });
  const r = await pool.query(`INSERT INTO diet_items (name,item_type,target_value,unit,sort_order) VALUES ($1,$2,$3,$4,99) RETURNING *`,
    [name, item_type||'checkbox', target_value||null, unit||null]);
  res.status(201).json(r.rows[0]);
});

router.delete('/items/:id', auth, async (req, res) => {
  await pool.query(`UPDATE diet_items SET active=false WHERE id=$1`, [req.params.id]);
  res.json({ ok:true });
});

// Food log
router.post('/food', auth, async (req, res) => {
  const { meal, description, log_date } = req.body;
  if (!description?.trim()) return res.status(400).json({ error:'Description required' });
  const r = await pool.query(`INSERT INTO food_logs (meal,description,log_date) VALUES ($1,$2,$3) RETURNING *`,
    [meal||'meal', description, log_date||new Date().toISOString().split('T')[0]]);
  res.status(201).json(r.rows[0]);
});

router.delete('/food/:id', auth, async (req, res) => {
  await pool.query(`DELETE FROM food_logs WHERE id=$1`, [req.params.id]);
  res.json({ ok:true });
});

router.get('/stats', auth, async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const r = await pool.query(`
    SELECT log_date, COUNT(*) FILTER (WHERE done) as completed, COUNT(*) as total
    FROM diet_logs WHERE log_date >= CURRENT_DATE - ($1 || ' days')::interval
    GROUP BY log_date ORDER BY log_date ASC
  `, [days]);
  res.json(r.rows);
});

module.exports = router;
