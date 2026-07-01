require('dotenv').config();
const { Pool } = require('pg');

let connectionString = (process.env.DATABASE_URL || '').trim();
if (connectionString && !connectionString.includes('sslmode=')) connectionString += '?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    console.log('🗄  Initialising Personal OS database…');

    const tables = [
      // ── TASKS (daily/weekly/monthly/one-time, personal/professional) ──────────
      {
        name: 'task_templates', // the recurring definition
        sql: `CREATE TABLE IF NOT EXISTS task_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(300) NOT NULL,
          category VARCHAR(20) NOT NULL CHECK (category IN ('personal','professional')),
          frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily','weekly','monthly','once')),
          weekday INTEGER, -- 0-6 for weekly tasks (0=Sunday)
          day_of_month INTEGER, -- 1-31 for monthly tasks
          due_date DATE, -- for one-time tasks
          notes TEXT,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );`
      },
      {
        name: 'task_logs', // daily completion records
        sql: `CREATE TABLE IF NOT EXISTS task_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          template_id UUID REFERENCES task_templates(id) ON DELETE CASCADE,
          log_date DATE NOT NULL DEFAULT CURRENT_DATE,
          done BOOLEAN DEFAULT false,
          completed_at TIMESTAMPTZ,
          UNIQUE(template_id, log_date)
        );`
      },
      // ── DEEN ────────────────────────────────────────────────────────────────
      {
        name: 'deen_items',
        sql: `CREATE TABLE IF NOT EXISTS deen_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(150) NOT NULL,
          type VARCHAR(30) DEFAULT 'prayer' CHECK (type IN ('prayer','quran','adhkar','tahajjud','other')),
          sort_order INTEGER DEFAULT 0,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );`
      },
      {
        name: 'deen_logs',
        sql: `CREATE TABLE IF NOT EXISTS deen_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          item_id UUID REFERENCES deen_items(id) ON DELETE CASCADE,
          log_date DATE NOT NULL DEFAULT CURRENT_DATE,
          done BOOLEAN DEFAULT false,
          completed_at TIMESTAMPTZ,
          UNIQUE(item_id, log_date)
        );`
      },
      // ── EXERCISE ────────────────────────────────────────────────────────────
      {
        name: 'workout_types',
        sql: `CREATE TABLE IF NOT EXISTS workout_types (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          sort_order INTEGER DEFAULT 0
        );`
      },
      {
        name: 'workout_exercises',
        sql: `CREATE TABLE IF NOT EXISTS workout_exercises (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workout_type_id UUID REFERENCES workout_types(id) ON DELETE CASCADE,
          name VARCHAR(200) NOT NULL,
          target_sets INTEGER,
          target_reps VARCHAR(30),
          sort_order INTEGER DEFAULT 0
        );`
      },
      {
        name: 'workout_sessions',
        sql: `CREATE TABLE IF NOT EXISTS workout_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workout_type_id UUID REFERENCES workout_types(id) ON DELETE SET NULL,
          session_date DATE NOT NULL DEFAULT CURRENT_DATE,
          duration_minutes INTEGER,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );`
      },
      {
        name: 'workout_logs',
        sql: `CREATE TABLE IF NOT EXISTS workout_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
          exercise_id UUID REFERENCES workout_exercises(id) ON DELETE SET NULL,
          exercise_name VARCHAR(200),
          sets_completed INTEGER,
          reps_completed VARCHAR(50),
          weight VARCHAR(30)
        );`
      },
      // ── DIET ────────────────────────────────────────────────────────────────
      {
        name: 'diet_items', // customizable checklist definitions
        sql: `CREATE TABLE IF NOT EXISTS diet_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(200) NOT NULL,
          item_type VARCHAR(20) DEFAULT 'checkbox' CHECK (item_type IN ('checkbox','progress')),
          target_value NUMERIC, -- e.g. 4 (litres), 4 (bathroom visits)
          unit VARCHAR(30), -- 'L', 'times', etc.
          sort_order INTEGER DEFAULT 0,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );`
      },
      {
        name: 'diet_logs',
        sql: `CREATE TABLE IF NOT EXISTS diet_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          item_id UUID REFERENCES diet_items(id) ON DELETE CASCADE,
          log_date DATE NOT NULL DEFAULT CURRENT_DATE,
          done BOOLEAN DEFAULT false,
          current_value NUMERIC DEFAULT 0,
          UNIQUE(item_id, log_date)
        );`
      },
      {
        name: 'food_logs',
        sql: `CREATE TABLE IF NOT EXISTS food_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          log_date DATE NOT NULL DEFAULT CURRENT_DATE,
          meal VARCHAR(30) DEFAULT 'meal' CHECK (meal IN ('breakfast','lunch','dinner','snack','meal')),
          description TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );`
      },
      // ── FINANCE ─────────────────────────────────────────────────────────────
      {
        name: 'finance_entries',
        sql: `CREATE TABLE IF NOT EXISTS finance_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR(10) NOT NULL CHECK (type IN ('income','expense')),
          category VARCHAR(100),
          description VARCHAR(300) NOT NULL,
          amount NUMERIC(12,2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'USD',
          date DATE DEFAULT CURRENT_DATE,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );`
      },
      {
        name: 'wishlist',
        sql: `CREATE TABLE IF NOT EXISTS wishlist (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          item VARCHAR(300) NOT NULL,
          price NUMERIC(12,2),
          currency VARCHAR(10) DEFAULT 'USD',
          priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
          link VARCHAR(1000),
          notes TEXT,
          purchased BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );`
      },
      // ── WELLNESS (facial, drainage, massage, meditation, stretching, chores) ──
      {
        name: 'wellness_items',
        sql: `CREATE TABLE IF NOT EXISTS wellness_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(200) NOT NULL,
          frequency VARCHAR(20) DEFAULT 'daily' CHECK (frequency IN ('daily','weekly','monthly','every_other_day')),
          weekday INTEGER,
          duration_minutes INTEGER,
          sort_order INTEGER DEFAULT 0,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );`
      },
      {
        name: 'wellness_logs',
        sql: `CREATE TABLE IF NOT EXISTS wellness_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          item_id UUID REFERENCES wellness_items(id) ON DELETE CASCADE,
          log_date DATE NOT NULL DEFAULT CURRENT_DATE,
          done BOOLEAN DEFAULT false,
          UNIQUE(item_id, log_date)
        );`
      },
    ];

    for (const t of tables) { await client.query(t.sql); console.log(`  ✓ ${t.name}`); }

    // ── Seed default data (only if empty) ──────────────────────────────────────
    const deenCount = await client.query(`SELECT COUNT(*) FROM deen_items`);
    if (Number(deenCount.rows[0].count) === 0) {
      const deen = [
        ['Fajr','prayer',1],['Dhuhr','prayer',2],['Asr','prayer',3],['Maghrib','prayer',4],['Isha','prayer',5],
        ['Tahajjud / 100 prayer','tahajjud',6],['Quran / Tilawat','quran',7],
        ['Morning Adhkar','adhkar',8],['Evening Adhkar','adhkar',9],
      ];
      for (const [name,type,order] of deen) await client.query(`INSERT INTO deen_items (name,type,sort_order) VALUES ($1,$2,$3)`,[name,type,order]);
      console.log('  ✓ seeded deen_items');
    }

    const dietCount = await client.query(`SELECT COUNT(*) FROM diet_items`);
    if (Number(dietCount.rows[0].count) === 0) {
      const diet = [
        ['Drink 4L Water','progress',4,'L',1],
        ['Use bathroom 4x','progress',4,'times',2],
        ['Eat 2hrs before bed','checkbox',null,null,3],
        ['Avoid all sugar','checkbox',null,null,4],
        ['Avoid processed foods','checkbox',null,null,5],
      ];
      for (const [name,type,target,unit,order] of diet) await client.query(`INSERT INTO diet_items (name,item_type,target_value,unit,sort_order) VALUES ($1,$2,$3,$4,$5)`,[name,type,target,unit,order]);
      console.log('  ✓ seeded diet_items');
    }

    const wellnessCount = await client.query(`SELECT COUNT(*) FROM wellness_items`);
    if (Number(wellnessCount.rows[0].count) === 0) {
      const wellness = [
        ['Facial exercises (morning)','daily',null,7,1],
        ['Lymphatic drainage','daily',null,6,2],
        ['Facial exercises (afternoon)','daily',null,7,3],
        ['Facial exercises (night)','daily',null,7,4],
        ['Bar hangs (3x daily)','daily',null,3,5],
        ['Massage','every_other_day',null,30,6],
        ['Meditation','daily',null,10,7],
        ['Stretching','daily',null,42,8],
        ['Plant watering','daily',null,6,9],
        ['Room cleaning','daily',null,10,10],
        ['Next-day planning','daily',null,15,11],
        ['Iron clothes','weekly',6,20,12],
        ['Change bed sheets','weekly',6,15,13],
        ['Wardrobe organisation','weekly',6,15,14],
        ['Shoe cleaning + polish','weekly',6,20,15],
        ['Deep room clean','weekly',6,20,16],
        ['Motorcycle oiling','weekly',6,20,17],
        ['Motorcycle waxing','monthly',null,40,18],
        ['Beard trim / shave','monthly',null,20,19],
      ];
      for (const [name,freq,weekday,dur,order] of wellness) await client.query(`INSERT INTO wellness_items (name,frequency,weekday,duration_minutes,sort_order) VALUES ($1,$2,$3,$4,$5)`,[name,freq,weekday,dur,order]);
      console.log('  ✓ seeded wellness_items');
    }

    const workoutCount = await client.query(`SELECT COUNT(*) FROM workout_types`);
    if (Number(workoutCount.rows[0].count) === 0) {
      const types = [['Daily Jump Rope',1],['Upper Body',2],['Lower Body',3],['Shadow Boxing',4],['Recovery / Stretch',5]];
      const typeIds = {};
      for (const [name,order] of types) {
        const r = await client.query(`INSERT INTO workout_types (name,sort_order) VALUES ($1,$2) RETURNING id,name`,[name,order]);
        typeIds[name] = r.rows[0].id;
      }
      const exercises = {
        'Upper Body': [
          ['Pull-ups',3,'8↑'],['Chin-ups',3,'8↑'],['Push-ups',3,'8↑'],['Face pull (band)',3,'8'],
          ['Rotator cuff external rotation',3,'8'],['Dips / band cable pull-down',3,'8'],
          ['Band chest opening / flyes',3,'10'],['Serratus anterior press-out',3,'10'],['Bar hangs',3,'max'],
        ],
        'Lower Body': [
          ['Weighted squats',3,'8↑'],['Single-leg calf raises',3,'12'],['Weighted crunches',3,'10'],
          ['Neck curls',3,'10'],['Stomach vacuum',3,'hold'],['Oblique pullover (band on foot)',3,'10/side'],['Weighted kicks',null,'flexible'],
        ],
        'Shadow Boxing': [['Fast shadow boxing',null,'15m'],['Skill / footwork focus',null,'15m']],
        'Daily Jump Rope': [['Jump rope',null,'30m']],
        'Recovery / Stretch': [['Jump rope (light)',null,'30m'],['Extended stretching',null,'50m+']],
      };
      for (const [typeName, exList] of Object.entries(exercises)) {
        let i = 0;
        for (const [name,sets,reps] of exList) {
          await client.query(`INSERT INTO workout_exercises (workout_type_id,name,target_sets,target_reps,sort_order) VALUES ($1,$2,$3,$4,$5)`,[typeIds[typeName],name,sets,reps,i++]);
        }
      }
      console.log('  ✓ seeded workout_types + exercises');
    }

    const taskCount = await client.query(`SELECT COUNT(*) FROM task_templates`);
    if (Number(taskCount.rows[0].count) === 0) {
      // category, frequency, weekday (0=Sun,1=Mon…6=Sat), title
      // Weekday mapping: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0
      const tasks = [
        // ── DAILY PERSONAL ──────────────────────────────────────────────────────
        ['personal','daily',null,null,null,'Morning Adhkar (15m)'],
        ['personal','daily',null,null,null,'Fajr prayer (15m)'],
        ['personal','daily',null,null,null,'Facial exercises — morning (7m)'],
        ['personal','daily',null,null,null,'Lymphatic drainage (5m)'],
        ['personal','daily',null,null,null,'Quran / Tilawat (48m)'],
        ['personal','daily',null,null,null,'Jump rope — daily cardio (30m)'],
        ['personal','daily',null,null,null,'Breakfast + supplements (30m)'],
        ['personal','daily',null,null,null,'Room clean + water plants (10m)'],
        ['personal','daily',null,null,null,'Dhuhr prayer'],
        ['personal','daily',null,null,null,'Lunch'],
        ['personal','daily',null,null,null,'Asr prayer'],
        ['personal','daily',null,null,null,'Facial exercises — afternoon (7m)'],
        ['personal','daily',null,null,null,'Evening Adhkar (18m)'],
        ['personal','daily',null,null,null,'Maghrib prayer'],
        ['personal','daily',null,null,null,'Dinner'],
        ['personal','daily',null,null,null,'Isha prayer'],
        ['personal','daily',null,null,null,'Stretching (42m)'],
        ['personal','daily',null,null,null,'Shower + hygiene (30m)'],
        ['personal','daily',null,null,null,'Facial exercises — night (7m)'],
        ['personal','daily',null,null,null,'Tahajjud / 100 prayer (30m)'],
        ['personal','daily',null,null,null,'Meditation (10m)'],
        ['personal','daily',null,null,null,'Next-day planning (15m)'],
        ['personal','daily',null,null,null,'Bar hangs — 3x daily (42 sec each)'],
        // ── DAILY PROFESSIONAL ──────────────────────────────────────────────────
        ['professional','daily',null,null,null,'Professional work — Filmelo / Bee\'s Creations'],
        // ── WEEKDAY ONLY (Mon/Tue/Thu — Uni + Full Training) ─────────────────
        ['personal','weekly',1,null,null,'Travel to uni — Japanese listening / lecture review (70m)'],
        ['personal','weekly',1,null,null,'University classes (~4.5h)'],
        ['personal','weekly',1,null,null,'Travel home — Japanese / review (60m)'],
        ['personal','weekly',1,null,null,'Strength training — Upper Body (60m)'],
        ['personal','weekly',2,null,null,'Travel to uni — Japanese listening / lecture review (70m)'],
        ['personal','weekly',2,null,null,'University classes (~4.5h)'],
        ['personal','weekly',2,null,null,'Travel home — Japanese / review (60m)'],
        ['personal','weekly',2,null,null,'Strength training — Lower Body (60m)'],
        ['personal','weekly',4,null,null,'Travel to uni — Japanese listening / lecture review (70m)'],
        ['personal','weekly',4,null,null,'University classes (~4.5h)'],
        ['personal','weekly',4,null,null,'Travel home — Japanese / review (60m)'],
        ['personal','weekly',4,null,null,'Strength training — Upper Body (60m)'],
        // ── WEDNESDAY — Shadow Boxing ────────────────────────────────────────
        ['personal','weekly',3,null,null,'Travel to uni — Japanese listening / lecture review (70m)'],
        ['personal','weekly',3,null,null,'University classes (~4.5h)'],
        ['personal','weekly',3,null,null,'Travel home — Japanese / review (60m)'],
        ['personal','weekly',3,null,null,'Shadow boxing session (30m)'],
        // ── FRIDAY — Recovery ────────────────────────────────────────────────
        ['personal','weekly',5,null,null,'Travel to uni — Japanese listening / lecture review (70m)'],
        ['personal','weekly',5,null,null,'University classes (~4.5h)'],
        ['personal','weekly',5,null,null,'Travel home — Japanese / review (60m)'],
        ['personal','weekly',5,null,null,'Jumu\'ah prayer (30m)'],
        ['personal','weekly',5,null,null,'Extended stretching — recovery day (50m)'],
        // ── SATURDAY ─────────────────────────────────────────────────────────
        ['personal','weekly',6,null,null,'Lower body training (60m)'],
        ['personal','weekly',6,null,null,'Iron clothes + change sheets + wardrobe (45m)'],
        ['personal','weekly',6,null,null,'Motorcycle maintenance / oiling (30m)'],
        ['personal','weekly',6,null,null,'Shoe cleaning + deep room clean (30m)'],
        ['personal','weekly',6,null,null,'Study block (~2h)'],
        ['personal','weekly',6,null,null,'Japanese study (45m)'],
        ['personal','weekly',6,null,null,'Shower + beard trim (45m)'],
        ['professional','weekly',6,null,null,'Professional work — deep uninterrupted client work (2h)'],
        // ── SUNDAY ───────────────────────────────────────────────────────────
        ['personal','weekly',0,null,null,'Upper body training (60m)'],
        ['personal','weekly',0,null,null,'Weekend chore overflow (40m)'],
        ['personal','weekly',0,null,null,'Study block — longest of the week (~3h 20m)'],
        ['personal','weekly',0,null,null,'Japanese study — deepest session of the week (2h)'],
        ['personal','weekly',0,null,null,'Next-day planning — plan the full week ahead'],
        // ── MONTHLY ──────────────────────────────────────────────────────────
        ['personal','monthly',null,1,null,'Motorcycle waxing (40m)'],
        ['personal','monthly',null,1,null,'Beard trim / shave (20m)'],
        // ── STUDY (weekdays) ─────────────────────────────────────────────────
        ['personal','weekly',1,null,null,'Study + Japanese (45m)'],
        ['personal','weekly',2,null,null,'Study + Japanese (45m)'],
        ['personal','weekly',3,null,null,'Study + Japanese (45m)'],
        ['personal','weekly',4,null,null,'Study + Japanese (45m)'],
        ['personal','weekly',5,null,null,'Study + Japanese (45m)'],
        // ── FREE TIME (weekdays) ─────────────────────────────────────────────
        ['personal','weekly',1,null,null,'Free time — cognitive recharge (60m)'],
        ['personal','weekly',2,null,null,'Free time — cognitive recharge (60m)'],
        ['personal','weekly',3,null,null,'Free time — cognitive recharge (60m)'],
        ['personal','weekly',4,null,null,'Free time — cognitive recharge (60m)'],
        ['personal','weekly',5,null,null,'Free time — cognitive recharge (60m)'],
        ['personal','weekly',6,null,null,'Free time — extended weekend recharge (~2h)'],
        ['personal','weekly',0,null,null,'Free time'],
        // ── MASSAGE (every other day — handled as wellness but also a task reminder) ──
        ['personal','daily',null,null,null,'Massage — every other day (30m) [skip if not day]'],
      ];

      for (const [category, frequency, weekday, day_of_month, due_date, title] of tasks) {
        await client.query(
          `INSERT INTO task_templates (title, category, frequency, weekday, day_of_month, due_date)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [title, category, frequency, weekday, day_of_month, due_date]
        );
      }
      console.log(`  ✓ seeded ${tasks.length} task templates`);
    }

    console.log('✅ Database ready');
  } catch (err) {
    console.error('❌ DB init failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
