# Life OS — Personal Command Centre

Private daily-life management system: tasks, deen, exercise, diet, wellness, and finance — all with auto-resetting checklists and progress visualizations.

## Deploy

### Backend → Render
1. New Web Service, root directory `backend`
2. Build: `npm install` · Start: `node index.js`
3. Env vars: `DATABASE_URL`, `JWT_SECRET`, `OWNER_PASSWORD` (default `Hassan@Life2025!`), `NODE_ENV=production`

Tables auto-create and seed your default deen items, diet rules, wellness tasks, and workout exercises on first boot.

### Frontend → Vercel
1. New project, root directory `frontend`, framework Vite
2. Env var: `VITE_API_URL` = your Render backend URL
3. Deploy

### Login
Visit your Vercel URL → enter `OWNER_PASSWORD`.

## Modules

- **Dashboard** — ring progress for all habit modules, 7-day consistency trend, weekly snapshot
- **Tasks** — daily/weekly/monthly/one-time, personal vs professional, auto-resets each cycle
- **Deen** — prayers, Quran, Adhkar, Tahajjud with 14-day consistency chart
- **Exercise** — manually pick workout type (Upper/Lower/Shadow Boxing/Recovery/Jump Rope), log sets/reps, activity charts
- **Diet** — customizable checklist (checkbox or progress-bar style like water/bathroom count) + free-form food log
- **Wellness** — facial exercises, massage, meditation, stretching, chores — daily/weekly/monthly/every-other-day
- **Finance** — income/expense balance sheet with monthly chart + wishlist ranked by priority

## Local Dev
```bash
cd backend && cp .env.example .env && npm install && npm run dev
cd frontend && cp .env.example .env && npm install && npm run dev
```
