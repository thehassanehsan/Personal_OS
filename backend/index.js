require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db/schema');

const app = express();
app.use(cors({ origin:true, credentials:true, methods:['GET','POST','PUT','DELETE','OPTIONS','PATCH'], allowedHeaders:['Content-Type','Authorization'] }));
app.options('*', cors());
app.use(express.json({ limit:'5mb' }));

app.get('/health', (_,res) => res.json({ status:'ok', app:'Personal OS', time:new Date().toISOString() }));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/tasks',     require('./routes/tasks'));
app.use('/api/deen',      require('./routes/deen'));
app.use('/api/exercise',  require('./routes/exercise'));
app.use('/api/diet',      require('./routes/diet'));
app.use('/api/finance',   require('./routes/finance'));
app.use('/api/wellness',  require('./routes/wellness'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.use((req,res) => res.status(404).json({ error:`Not found: ${req.method} ${req.path}` }));
app.use((err,req,res,next) => { console.error(err.stack); res.status(500).json({ error:'Server error', message:err.message }); });

const PORT = process.env.PORT || 4100;
initDB()
  .then(() => app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Personal OS backend on port ${PORT}`)))
  .catch(err => { console.error('❌ Startup failed:', err.message); process.exit(1); });
