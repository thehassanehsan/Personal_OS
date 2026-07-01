import { useState, useEffect } from 'react';
import { Plus, Trash2, CheckSquare, Settings2 } from 'lucide-react';
import { api } from '../utils/api';
import { Modal, Confirm, Badge, CheckItem, EmptyState, Spinner, toast, todayStr } from '../components/ui';

const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const TaskForm = ({ onSave, onClose }) => {
  const [form, setForm] = useState({ title:'', category:'personal', frequency:'daily', weekday:1, day_of_month:1, due_date: todayStr(), notes:'' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));
  const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); try { await onSave(form); onClose(); } catch(err){toast.error(err.message);} finally{setLoading(false);} };
  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group"><label className="form-label">Task *</label><input className="form-input" value={form.title} onChange={set('title')} required placeholder="e.g. Review client deliverables"/></div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Category</label>
          <div style={{ display:'flex', gap:'0.5rem' }}>
            {['personal','professional'].map(c => (
              <button key={c} type="button" onClick={()=>setForm(f=>({...f,category:c}))} style={{ flex:1, padding:'0.55rem', borderRadius:'var(--radius)', border:`1px solid ${form.category===c?'var(--slate)':'var(--border)'}`, background:form.category===c?'var(--slate-soft)':'var(--surface2)', color:form.category===c?'var(--slate-l)':'var(--text3)', fontSize:'0.82rem', fontWeight:600, cursor:'pointer', textTransform:'capitalize' }}>{c}</button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Frequency</label>
          <select className="form-select" value={form.frequency} onChange={set('frequency')}>
            {['daily','weekly','monthly','once'].map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>)}
          </select>
        </div>
      </div>
      {form.frequency === 'weekly' && (
        <div className="form-group">
          <label className="form-label">Day of Week</label>
          <div className="day-pills">{WEEKDAYS.map((d,i) => <button key={d} type="button" className={`day-pill ${form.weekday===i?'active':''}`} onClick={()=>setForm(f=>({...f,weekday:i}))}>{d}</button>)}</div>
        </div>
      )}
      {form.frequency === 'monthly' && (
        <div className="form-group"><label className="form-label">Day of Month</label><input className="form-input" type="number" min="1" max="31" value={form.day_of_month} onChange={set('day_of_month')}/></div>
      )}
      {form.frequency === 'once' && (
        <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={form.due_date} onChange={set('due_date')}/></div>
      )}
      <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" style={{minHeight:60}} value={form.notes} onChange={set('notes')}/></div>
      <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading?<Spinner/>:'Add Task'}</button>
      </div>
    </form>
  );
};

export const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [del, setDel] = useState(null);
  const [catFilter, setCatFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try { setTasks(await api.get('/tasks')); }
    catch(e){toast.error(e.message);}
    finally{setLoading(false);}
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async (form) => {
    await api.post('/tasks/templates', form);
    toast.success('Task added');
    load();
  };

  const handleDelete = async () => {
    await api.delete(`/tasks/templates/${del.id}`);
    toast.success('Task removed');
    setTemplates(p => p.filter(t => t.id !== del.id));
    load();
  };

  const toggle = async (task) => {
    const u = await api.put(`/tasks/logs/${task.log_id}`, { done: !task.done });
    setTasks(prev => prev.map(t => t.log_id === task.log_id ? { ...t, done: u.done } : t));
  };

  const openManage = async () => {
    setManageOpen(true);
    try { setTemplates(await api.get('/tasks/templates')); } catch(e) { toast.error(e.message); }
  };

  const filtered = catFilter === 'all' ? tasks : tasks.filter(t => t.category === catFilter);
  const grouped = ['daily','weekly','monthly','once'].map(freq => ({ freq, items: filtered.filter(t => t.frequency === freq) })).filter(g => g.items.length);

  const doneCount = filtered.filter(t => t.done).length;

  return (
    <>
      <div className="page-header">
        <div><h1>Tasks</h1><div className="page-sub">{doneCount}/{filtered.length} completed today</div></div>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={openManage}><Settings2 size={14}/> Manage</button>
          <button className="btn btn-primary btn-sm" onClick={()=>setModal(true)}><Plus size={14}/> Add Task</button>
        </div>
      </div>

      <div className="tabs">
        {[['all','All'],['personal','Personal'],['professional','Professional']].map(([v,l]) => (
          <button key={v} className={`tab-btn${catFilter===v?' active':''}`} onClick={()=>setCatFilter(v)}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{display:'flex',justifyContent:'center',padding:'3rem'}}><Spinner lg/></div> :
      filtered.length === 0 ? (
        <div className="card"><EmptyState icon={<div className="empty-state-icon"><CheckSquare size={22}/></div>} title="No tasks today" description="Add a task to get started." action={<button className="btn btn-primary btn-sm" onClick={()=>setModal(true)}><Plus size={13}/> Add Task</button>}/></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
          {grouped.map(g => (
            <div key={g.freq}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.6rem' }}>
                <span className={`badge badge-${g.freq}`}>{g.freq}</span>
                <div style={{ flex:1, height:1, background:'var(--border)' }}/>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--text4)' }}>{g.items.filter(t=>t.done).length}/{g.items.length}</span>
              </div>
              {g.items.map(t => (
                <CheckItem key={t.log_id} label={t.title} done={t.done} onToggle={()=>toggle(t)}
                  sub={t.notes}
                  right={<Badge status={t.category}/>} />
              ))}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title="New Task" size="modal-lg">
        <TaskForm onSave={handleAdd} onClose={()=>setModal(false)}/>
      </Modal>

      <Modal open={manageOpen} onClose={()=>setManageOpen(false)} title="Manage Task Templates" size="modal-lg">
        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', maxHeight:400, overflowY:'auto' }}>
          {templates.length === 0 ? <p style={{ color:'var(--text3)', fontSize:'0.84rem' }}>No templates yet.</p> : templates.map(t => (
            <div key={t.id} style={{ display:'flex', alignItems:'center', gap:'0.65rem', padding:'0.6rem 0.8rem', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'0.84rem', fontWeight:600 }}>{t.title}</div>
                <div style={{ display:'flex', gap:6, marginTop:3 }}>
                  <Badge status={t.category}/><Badge status={t.frequency}/>
                </div>
              </div>
              <button className="btn btn-danger btn-icon btn-sm" onClick={()=>setDel(t)}><Trash2 size={12}/></button>
            </div>
          ))}
        </div>
      </Modal>

      <Confirm open={!!del} onClose={()=>setDel(null)} onConfirm={handleDelete} title="Delete Task Template" message={`Delete "${del?.title}"? This removes it from all future days.`} danger/>
    </>
  );
};
