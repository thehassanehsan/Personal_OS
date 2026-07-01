import { useState, useEffect } from 'react';
import { Plus, Apple, Trash2, Utensils } from 'lucide-react';
import { api } from '../utils/api';
import { Modal, Confirm, CheckItem, ProgressItem, RingProgress, EmptyState, Spinner, toast } from '../components/ui';

const ItemForm = ({ onSave, onClose }) => {
  const [form, setForm] = useState({ name:'', item_type:'checkbox', target_value:'', unit:'' });
  const [loading, setLoading] = useState(false);
  const handleSubmit = async(e) => { e.preventDefault(); setLoading(true); try{await onSave(form);onClose();}catch(err){toast.error(err.message);}finally{setLoading(false);} };
  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group"><label className="form-label">Rule *</label><input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required placeholder="e.g. No caffeine after 4pm"/></div>
      <div className="form-group">
        <label className="form-label">Type</label>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          {['checkbox','progress'].map(t => (
            <button key={t} type="button" onClick={()=>setForm(f=>({...f,item_type:t}))} style={{ flex:1, padding:'0.55rem', borderRadius:'var(--radius)', border:`1px solid ${form.item_type===t?'var(--slate)':'var(--border)'}`, background:form.item_type===t?'var(--slate-soft)':'var(--surface2)', color:form.item_type===t?'var(--slate-l)':'var(--text3)', fontSize:'0.82rem', fontWeight:600, cursor:'pointer', textTransform:'capitalize' }}>{t}</button>
          ))}
        </div>
      </div>
      {form.item_type === 'progress' && (
        <div className="form-row">
          <div className="form-group"><label className="form-label">Target</label><input className="form-input" type="number" value={form.target_value} onChange={e=>setForm(f=>({...f,target_value:e.target.value}))} placeholder="4"/></div>
          <div className="form-group"><label className="form-label">Unit</label><input className="form-input" value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} placeholder="L, times, mg…"/></div>
        </div>
      )}
      <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading?<Spinner/>:'Add'}</button>
      </div>
    </form>
  );
};

export const DietPage = () => {
  const [checklist, setChecklist] = useState([]);
  const [food, setFood] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [foodInput, setFoodInput] = useState('');
  const [foodMeal, setFoodMeal] = useState('meal');

  const load = async () => {
    setLoading(true);
    try { const d = await api.get('/diet'); setChecklist(d.checklist); setFood(d.food); }
    catch(e){toast.error(e.message);} finally{setLoading(false);}
  };
  useEffect(() => { load(); }, []);

  const toggleCheckbox = async (item) => {
    const u = await api.put(`/diet/logs/${item.log_id}`, { done: !item.done, current_value: item.current_value });
    setChecklist(prev => prev.map(i => i.log_id===item.log_id ? {...i, done:u.done} : i));
  };

  const adjustProgress = async (item, delta) => {
    const newVal = Math.max(0, Number(item.current_value||0) + delta);
    const done = newVal >= Number(item.target_value);
    const u = await api.put(`/diet/logs/${item.log_id}`, { done, current_value: newVal });
    setChecklist(prev => prev.map(i => i.log_id===item.log_id ? {...i, current_value:u.current_value, done:u.done} : i));
  };

  const handleAdd = async (form) => { await api.post('/diet/items', form); toast.success('Added'); load(); };

  const addFood = async () => {
    if (!foodInput.trim()) return;
    const f = await api.post('/diet/food', { description: foodInput, meal: foodMeal });
    setFood(p => [...p, f]);
    setFoodInput('');
    toast.success('Logged');
  };

  const deleteFood = async (id) => { await api.delete(`/diet/food/${id}`); setFood(p => p.filter(f=>f.id!==id)); };

  const doneCount = checklist.filter(i => i.done).length;

  return (
    <>
      <div className="page-header">
        <div><h1>Diet Tracker</h1><div className="page-sub">{doneCount}/{checklist.length} rules followed today</div></div>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal(true)}><Plus size={14}/> Add Rule</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'1.25rem', marginBottom:'1.5rem', alignItems:'center' }}>
        <div className="card" style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}>
          <RingProgress value={doneCount} max={checklist.length||1} size={90} stroke={7} color="var(--green)" />
        </div>
        <div className="card">
          <div className="card-header"><div><div className="card-title">Today's Discipline</div><div className="card-sub">Diet checklist</div></div></div>
          <div className="progress-track" style={{ height:8 }}><div className="progress-fill" style={{ width:`${checklist.length?(doneCount/checklist.length)*100:0}%`, background:'linear-gradient(90deg, var(--green), var(--slate))' }}/></div>
        </div>
      </div>

      {loading ? <div style={{display:'flex',justifyContent:'center',padding:'3rem'}}><Spinner lg/></div> :
      checklist.length === 0 ? <div className="card"><EmptyState icon={<div className="empty-state-icon"><Apple size={22}/></div>} title="No diet rules" description="Add your nutrition rules to track."/></div> :
      (
        <div className="card" style={{ marginBottom:'1.5rem' }}>
          {checklist.map(item => item.item_type === 'progress' ? (
            <ProgressItem key={item.log_id} label={item.name} value={Number(item.current_value)||0} target={Number(item.target_value)} unit={item.unit}
              done={item.done} onIncrement={()=>adjustProgress(item,1)} onDecrement={()=>adjustProgress(item,-1)}/>
          ) : (
            <CheckItem key={item.log_id} label={item.name} done={item.done} onToggle={()=>toggleCheckbox(item)}/>
          ))}
        </div>
      )}

      {/* Food log */}
      <div className="card">
        <div className="card-header"><div><div className="card-title">What I Ate Today</div><div className="card-sub">Free-form food log</div></div></div>
        <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem' }}>
          <select className="form-select" style={{ width:120 }} value={foodMeal} onChange={e=>setFoodMeal(e.target.value)}>
            {['breakfast','lunch','dinner','snack','meal'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
          </select>
          <input className="form-input" value={foodInput} onChange={e=>setFoodInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),addFood())} placeholder="What did you eat?"/>
          <button className="btn btn-primary btn-sm" onClick={addFood}><Plus size={14}/></button>
        </div>
        {food.length === 0 ? (
          <div style={{ textAlign:'center', padding:'1.5rem', color:'var(--text4)', fontFamily:'var(--font-mono)', fontSize:'0.75rem' }}>Nothing logged yet today</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
            {food.map(f => (
              <div key={f.id} style={{ display:'flex', alignItems:'center', gap:'0.65rem', padding:'0.55rem 0.8rem', background:'var(--surface2)', borderRadius:'var(--radius)', border:'1px solid var(--border)' }}>
                <Utensils size={13} color="var(--green)"/>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.62rem', color:'var(--text4)', textTransform:'uppercase', width:60 }}>{f.meal}</span>
                <span style={{ flex:1, fontSize:'0.84rem' }}>{f.description}</span>
                <button onClick={()=>deleteFood(f.id)} style={{ background:'none', border:'none', color:'var(--text4)', cursor:'pointer' }}><Trash2 size={12}/></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="Add Diet Rule">
        <ItemForm onSave={handleAdd} onClose={()=>setModal(false)}/>
      </Modal>
    </>
  );
};
