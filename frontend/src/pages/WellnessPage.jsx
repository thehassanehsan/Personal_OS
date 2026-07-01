import { useState, useEffect } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { api } from '../utils/api';
import { Modal, CheckItem, RingProgress, EmptyState, Spinner, toast } from '../components/ui';

const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const ItemForm = ({ onSave, onClose }) => {
  const [form, setForm] = useState({ name:'', frequency:'daily', weekday:6, duration_minutes:'' });
  const [loading, setLoading] = useState(false);
  const handleSubmit = async(e) => { e.preventDefault(); setLoading(true); try{await onSave(form);onClose();}catch(err){toast.error(err.message);}finally{setLoading(false);} };
  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group"><label className="form-label">Task *</label><input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required placeholder="e.g. Skincare routine"/></div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Frequency</label>
          <select className="form-select" value={form.frequency} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))}>
            {['daily','weekly','monthly','every_other_day'].map(f => <option key={f} value={f}>{f.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Duration (min)</label><input className="form-input" type="number" value={form.duration_minutes} onChange={e=>setForm(f=>({...f,duration_minutes:e.target.value}))}/></div>
      </div>
      {form.frequency === 'weekly' && (
        <div className="form-group"><label className="form-label">Day</label><div className="day-pills">{WEEKDAYS.map((d,i)=><button key={d} type="button" className={`day-pill ${form.weekday===i?'active':''}`} onClick={()=>setForm(f=>({...f,weekday:i}))}>{d}</button>)}</div></div>
      )}
      <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading?<Spinner/>:'Add'}</button>
      </div>
    </form>
  );
};

export const WellnessPage = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const [i,s] = await Promise.all([api.get('/wellness'), api.get('/wellness/stats?days=14')]); setItems(i); setStats(s); }
    catch(e){toast.error(e.message);} finally{setLoading(false);}
  };
  useEffect(() => { load(); }, []);

  const toggle = async (item) => {
    const u = await api.put(`/wellness/logs/${item.log_id}`, { done: !item.done });
    setItems(prev => prev.map(i => i.log_id===item.log_id ? {...i, done:u.done} : i));
  };

  const handleAdd = async (form) => { await api.post('/wellness/items', form); toast.success('Added'); load(); };

  const done = items.filter(i => i.done).length;

  return (
    <>
      <div className="page-header">
        <div><h1>Wellness</h1><div className="page-sub">{done}/{items.length} completed today</div></div>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal(true)}><Plus size={14}/> Add Task</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'1.25rem', marginBottom:'1.5rem', alignItems:'center' }}>
        <div className="card" style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}>
          <RingProgress value={done} max={items.length||1} size={90} stroke={7} color="var(--cyan)" />
        </div>
        <div className="card">
          <div className="card-header"><div><div className="card-title">14-Day Trend</div><div className="card-sub">Wellness consistency</div></div></div>
          {stats.length === 0 ? <div style={{ color:'var(--text4)', fontSize:'0.78rem', fontFamily:'var(--font-mono)' }}>No history yet</div> : (
            <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:60 }}>
              {stats.map(s => {
                const pct = Number(s.total)>0 ? Number(s.completed)/Number(s.total) : 0;
                return <div key={s.log_date} style={{ flex:1, height:Math.max(3,pct*55), background:'linear-gradient(180deg, var(--cyan), var(--slate))', borderRadius:'3px 3px 0 0' }} title={`${Math.round(pct*100)}%`}/>;
              })}
            </div>
          )}
        </div>
      </div>

      {loading ? <div style={{display:'flex',justifyContent:'center',padding:'3rem'}}><Spinner lg/></div> :
      items.length === 0 ? <div className="card"><EmptyState icon={<div className="empty-state-icon"><Sparkles size={22}/></div>} title="No wellness tasks" description="Add your recurring wellness routine."/></div> :
      (
        <div className="card">
          {items.map(i => (
            <CheckItem key={i.log_id} label={i.name} done={i.done} onToggle={()=>toggle(i)}
              sub={i.duration_minutes ? `${i.duration_minutes}m` : null}/>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title="Add Wellness Task">
        <ItemForm onSave={handleAdd} onClose={()=>setModal(false)}/>
      </Modal>
    </>
  );
};
