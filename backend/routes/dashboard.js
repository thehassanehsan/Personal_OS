const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const [tasks, deen, diet, wellness, exerciseWeek, finance, wishlist] = await Promise.all([
      pool.query(`SELECT COUNT(*) FILTER (WHERE done) as done, COUNT(*) as total FROM task_logs WHERE log_date=$1`, [today]),
      pool.query(`SELECT COUNT(*) FILTER (WHERE done) as done, COUNT(*) as total FROM deen_logs WHERE log_date=$1`, [today]),
      pool.query(`SELECT COUNT(*) FILTER (WHERE done) as done, COUNT(*) as total FROM diet_logs WHERE log_date=$1`, [today]),
      pool.query(`SELECT COUNT(*) FILTER (WHERE done) as done, COUNT(*) as total FROM wellness_logs WHERE log_date=$1`, [today]),
      pool.query(`SELECT COUNT(*) as count FROM workout_sessions WHERE session_date >= date_trunc('week', CURRENT_DATE)`),
      pool.query(`
        SELECT
          SUM(CASE WHEN type='income' AND date >= date_trunc('month', NOW()) THEN amount ELSE 0 END) as month_income,
          SUM(CASE WHEN type='expense' AND date >= date_trunc('month', NOW()) THEN amount ELSE 0 END) as month_expenses,
          SUM(CASE WHEN type='income' THEN amount ELSE -amount END) as balance
        FROM finance_entries
      `),
      pool.query(`SELECT COUNT(*) as count FROM wishlist WHERE purchased=false`),
    ]);

    // 7-day completion trend across all habit modules combined
    const trend = await pool.query(`
      SELECT log_date,
        SUM(done_count) as done, SUM(total_count) as total
      FROM (
        SELECT log_date, COUNT(*) FILTER (WHERE done) as done_count, COUNT(*) as total_count FROM task_logs WHERE log_date >= CURRENT_DATE - INTERVAL '7 days' GROUP BY log_date
        UNION ALL
        SELECT log_date, COUNT(*) FILTER (WHERE done), COUNT(*) FROM deen_logs WHERE log_date >= CURRENT_DATE - INTERVAL '7 days' GROUP BY log_date
        UNION ALL
        SELECT log_date, COUNT(*) FILTER (WHERE done), COUNT(*) FROM diet_logs WHERE log_date >= CURRENT_DATE - INTERVAL '7 days' GROUP BY log_date
        UNION ALL
        SELECT log_date, COUNT(*) FILTER (WHERE done), COUNT(*) FROM wellness_logs WHERE log_date >= CURRENT_DATE - INTERVAL '7 days' GROUP BY log_date
      ) combined
      GROUP BY log_date ORDER BY log_date ASC
    `);

    res.json({
      tasks: tasks.rows[0], deen: deen.rows[0], diet: diet.rows[0], wellness: wellness.rows[0],
      workoutsThisWeek: exerciseWeek.rows[0].count,
      finance: finance.rows[0], wishlistCount: wishlist.rows[0].count,
      trend: trend.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
