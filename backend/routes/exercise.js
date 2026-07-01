const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth } = require('../middleware/auth');

// GET /api/exercise/types — with their exercises
router.get('/types', auth, async (req, res) => {
  const types = await pool.query(`SELECT * FROM workout_types ORDER BY sort_order`);
  const exercises = await pool.query(`SELECT * FROM workout_exercises ORDER BY sort_order`);
  const result = types.rows.map(t => ({ ...t, exercises: exercises.rows.filter(e => e.workout_type_id === t.id) }));
  res.json(result);
});

// GET /api/exercise/sessions
router.get('/sessions', auth, async (req, res) => {
  const r = await pool.query(`
    SELECT ws.*, wt.name as type_name,
      COALESCE(json_agg(json_build_object(
        'id', wl.id, 'exercise_name', wl.exercise_name,
        'sets_completed', wl.sets_completed, 'reps_completed', wl.reps_completed, 'weight', wl.weight
      )) FILTER (WHERE wl.id IS NOT NULL), '[]') as logs
    FROM workout_sessions ws
    LEFT JOIN workout_types wt ON wt.id = ws.workout_type_id
    LEFT JOIN workout_logs wl ON wl.session_id = ws.id
    GROUP BY ws.id, wt.name
    ORDER BY ws.session_date DESC, ws.created_at DESC
    LIMIT 60
  `);
  res.json(r.rows);
});

// POST /api/exercise/sessions — log a full workout session
router.post('/sessions', auth, async (req, res) => {
  const { workout_type_id, session_date, duration_minutes, notes, exercises } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const s = await client.query(
      `INSERT INTO workout_sessions (workout_type_id,session_date,duration_minutes,notes) VALUES ($1,$2,$3,$4) RETURNING *`,
      [workout_type_id||null, session_date||new Date().toISOString().split('T')[0], duration_minutes||null, notes||null]
    );
    const sessionId = s.rows[0].id;
    for (const ex of (exercises || [])) {
      await client.query(
        `INSERT INTO workout_logs (session_id,exercise_id,exercise_name,sets_completed,reps_completed,weight)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [sessionId, ex.exercise_id||null, ex.exercise_name, ex.sets_completed||null, ex.reps_completed||null, ex.weight||null]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(s.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

router.delete('/sessions/:id', auth, async (req, res) => {
  await pool.query(`DELETE FROM workout_sessions WHERE id=$1`, [req.params.id]);
  res.json({ ok: true });
});

// GET /api/exercise/stats — sessions per week, type breakdown
router.get('/stats', auth, async (req, res) => {
  const days = parseInt(req.query.days) || 60;
  const byDate = await pool.query(`
    SELECT session_date, COUNT(*) as count FROM workout_sessions
    WHERE session_date >= CURRENT_DATE - ($1 || ' days')::interval
    GROUP BY session_date ORDER BY session_date ASC
  `, [days]);
  const byType = await pool.query(`
    SELECT wt.name, COUNT(*) as count FROM workout_sessions ws
    LEFT JOIN workout_types wt ON wt.id = ws.workout_type_id
    WHERE ws.session_date >= CURRENT_DATE - ($1 || ' days')::interval
    GROUP BY wt.name
  `, [days]);
  res.json({ byDate: byDate.rows, byType: byType.rows });
});

module.exports = router;
