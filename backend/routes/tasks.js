const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth } = require('../middleware/auth');

// Helper: does this template apply "today" (or a given date)?
const appliesOn = (tpl, date) => {
  const d = new Date(date + 'T00:00:00');
  const weekday = d.getDay(); // 0=Sun
  const dayOfMonth = d.getDate();
  if (tpl.frequency === 'daily') return true;
  if (tpl.frequency === 'weekly') return tpl.weekday === weekday;
  if (tpl.frequency === 'monthly') return tpl.day_of_month === dayOfMonth;
  if (tpl.frequency === 'once') return tpl.due_date === date;
  return false;
};

// GET /api/tasks?date=YYYY-MM-DD — returns today's tasks (auto-creating logs as needed)
router.get('/', auth, async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const templates = await pool.query(`SELECT * FROM task_templates WHERE active=true`);
    const applicable = templates.rows.filter(t => appliesOn(t, date));

    // Ensure a log row exists for each applicable template on this date
    for (const tpl of applicable) {
      await pool.query(
        `INSERT INTO task_logs (template_id, log_date, done) VALUES ($1,$2,false)
         ON CONFLICT (template_id, log_date) DO NOTHING`,
        [tpl.id, date]
      );
    }

    const logs = await pool.query(`
      SELECT tl.id as log_id, tl.done, tl.completed_at, tl.log_date,
             tt.id as template_id, tt.title, tt.category, tt.frequency, tt.notes
      FROM task_logs tl
      JOIN task_templates tt ON tt.id = tl.template_id
      WHERE tl.log_date = $1 AND tt.active = true
      ORDER BY tt.category, tt.frequency, tt.title
    `, [date]);

    res.json(logs.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/templates — manage templates
router.get('/templates', auth, async (req, res) => {
  const r = await pool.query(`SELECT * FROM task_templates ORDER BY created_at DESC`);
  res.json(r.rows);
});

router.post('/templates', auth, async (req, res) => {
  const { title, category, frequency, weekday, day_of_month, due_date, notes } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' });
  const r = await pool.query(
    `INSERT INTO task_templates (title,category,frequency,weekday,day_of_month,due_date,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [title, category||'personal', frequency||'daily', weekday??null, day_of_month??null, due_date||null, notes]
  );
  res.status(201).json(r.rows[0]);
});

router.put('/templates/:id', auth, async (req, res) => {
  const { title, category, frequency, weekday, day_of_month, due_date, notes, active } = req.body;
  const r = await pool.query(
    `UPDATE task_templates SET title=$1,category=$2,frequency=$3,weekday=$4,day_of_month=$5,
     due_date=$6,notes=$7,active=$8 WHERE id=$9 RETURNING *`,
    [title,category,frequency,weekday??null,day_of_month??null,due_date||null,notes,active??true,req.params.id]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(r.rows[0]);
});

router.delete('/templates/:id', auth, async (req, res) => {
  await pool.query(`DELETE FROM task_templates WHERE id=$1`, [req.params.id]);
  res.json({ ok: true });
});

// PUT /api/tasks/logs/:id — toggle done
router.put('/logs/:id', auth, async (req, res) => {
  const { done } = req.body;
  const r = await pool.query(
    `UPDATE task_logs SET done=$1, completed_at=$2 WHERE id=$3 RETURNING *`,
    [done, done ? new Date().toISOString() : null, req.params.id]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(r.rows[0]);
});

// GET /api/tasks/stats?days=30 — completion rate over time
router.get('/stats', auth, async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const r = await pool.query(`
    SELECT log_date,
      COUNT(*) FILTER (WHERE done) as completed,
      COUNT(*) as total
    FROM task_logs
    WHERE log_date >= CURRENT_DATE - ($1 || ' days')::interval
    GROUP BY log_date ORDER BY log_date ASC
  `, [days]);
  res.json(r.rows);
});

module.exports = router;
