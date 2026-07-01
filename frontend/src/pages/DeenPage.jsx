import { useState, useEffect } from 'react';
import { Plus, Moon, BookOpen, Sunrise, Sunset } from 'lucide-react';
import { api } from '../utils/api';
import { Modal, CheckItem, RingProgress, EmptyState, Spinner, toast } from '../components/ui';

const TYPE_ICONS = { prayer: Sunrise, quran: BookOpen, adhkar: Sunset, tahajjud: Moon, other: Moon };

const ItemForm = ({ onSave, onClose }) => {
  const [form, setForm] = useState({ name:'', type:'prayer' });
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); try{await onSave(form);onClose();}catch(err){toast.error(err.message);}finally{setLoading(false);} };
  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required placeholder="e.g. Surah Mulk before sleep"/></div>
      <div className="form-group">
        <label className="form-label">Type</label>
        <select className="form-select" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
          {['prayer','quran','adhkar','tahajjud','other'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
        </select>
      </div>
      <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading?<Spinner/>:'Add'}</button>
      </div>
    </form>
  );
};

export const DeenPage = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [d, s] = await Promise.all([api.get('/deen'), api.get('/deen/stats?days=14')]);
      setItems(d); setStats(s);
    } catch(e){toast.error(e.message);} finally{setLoading(false);}
  };
  useEffect(() => { load(); }, []);

  const toggle = async (item) => {
    const u = await api.put(`/deen/logs/${item.log_id}`, { done: !item.done });
    setItems(prev => prev.map(i => i.log_id === item.log_id ? { ...i, done: u.done } : i));
  };

  const handleAdd = async (form) => { await api.post('/deen/items', form); toast.success('Added'); load(); };

  const done = items.filter(i => i.done).length;
  const maxStat = Math.max(...stats.map(s => Number(s.total)), 1);

  return (
    <>
      <div className="page-header">
        <div><h1>Deen</h1><div className="page-sub">{done}/{items.length} fulfilled today</div></div>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal(true)}><Plus size={14}/> Add Item</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'1.25rem', marginBottom:'1.5rem', alignItems:'center' }}>
        <div className="card" style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}>
          <RingProgress value={done} max={items.length||1} size={90} stroke={7} color="var(--purple)" />
        </div>
        <div className="card">
          <div className="card-header"><div><div className="card-title">14-Day Consistency</div><div className="card-sub">Daily fulfillment rate</div></div></div>
          {stats.length === 0 ? <div style={{ color:'var(--text4)', fontSize:'0.78rem', fontFamily:'var(--font-mono)' }}>No history yet</div> : (
            <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:60 }}>
              {stats.map(s => {
                const pct = Number(s.total)>0 ? Number(s.completed)/Number(s.total) : 0;
                return <div key={s.log_date} style={{ flex:1, height:Math.max(3,pct*55), background:'linear-gradient(180deg, var(--purple), var(--slate))', borderRadius:'3px 3px 0 0', transition:'height 0.5s ease' }} title={`${Math.round(pct*100)}%`}/>;
              })}
            </div>
          )}
        </div>
      </div>

      {loading ? <div style={{display:'flex',justifyContent:'center',padding:'3rem'}}><Spinner lg/></div> :
      items.length === 0 ? <div className="card"><EmptyState icon={<div className="empty-state-icon"><Moon size={22}/></div>} title="No deen items" description="Add your prayers and spiritual practices."/></div> :
      (
        <div className="card">
          {['prayer','quran','adhkar','tahajjud','other'].map(type => {
            const typeItems = items.filter(i => i.type === type);
            if (!typeItems.length) return null;
            const Icon = TYPE_ICONS[type];
            return (
              <div key={type} style={{ marginBottom:'1.25rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:'0.5rem', color:'var(--purple)' }}>
                  <Icon size={13}/><span style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.1em' }}>{type}</span>
                </div>
                {typeItems.map(i => <CheckItem key={i.log_id} label={i.name} done={i.done} onToggle={()=>toggle(i)}/>)}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title="Add Deen Item">
        <ItemForm onSave={handleAdd} onClose={()=>setModal(false)}/>
      </Modal>
    </>
  );
};
