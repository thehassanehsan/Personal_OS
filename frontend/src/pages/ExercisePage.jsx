import { useState, useEffect } from 'react';
import { Plus, Dumbbell, Trash2, Calendar } from 'lucide-react';
import { api } from '../utils/api';
import { Modal, Confirm, EmptyState, Spinner, fmtDate, toast, todayStr } from '../components/ui';

const LogForm = ({ types, onSave, onClose }) => {
  const [typeId, setTypeId] = useState(types[0]?.id || '');
  const [sessionDate, setSessionDate] = useState(todayStr());
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [exerciseLogs, setExerciseLogs] = useState({});
  const [loading, setLoading] = useState(false);

  const selectedType = types.find(t => t.id === typeId);

  useEffect(() => {
    if (!selectedType) return;
    const init = {};
    selectedType.exercises.forEach(ex => { init[ex.id] = { sets:'', reps:'' }; });
    setExerciseLogs(init);
  }, [typeId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const exercises = Object.entries(exerciseLogs)
        .filter(([_,v]) => v.sets || v.reps)
        .map(([exId,v]) => {
          const ex = selectedType.exercises.find(x => x.id === exId);
          return { exercise_id: exId, exercise_name: ex.name, sets_completed: v.sets||null, reps_completed: v.reps||null };
        });
      await onSave({ workout_type_id: typeId, session_date: sessionDate, duration_minutes: duration||null, notes, exercises });
      onClose();
    } catch(err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Workout Type</label>
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
          {types.map(t => (
            <button key={t.id} type="button" onClick={()=>setTypeId(t.id)} style={{ padding:'0.5rem 0.9rem', borderRadius:'var(--radius)', border:`1px solid ${typeId===t.id?'var(--slate)':'var(--border)'}`, background:typeId===t.id?'var(--slate-soft)':'var(--surface2)', color:typeId===t.id?'var(--slate-l)':'var(--text3)', fontSize:'0.8rem', fontWeight:600, cursor:'pointer' }}>{t.name}</button>
          ))}
        </div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={sessionDate} onChange={e=>setSessionDate(e.target.value)}/></div>
        <div className="form-group"><label className="form-label">Duration (min)</label><input className="form-input" type="number" value={duration} onChange={e=>setDuration(e.target.value)} placeholder="60"/></div>
      </div>

      {selectedType && selectedType.exercises.length > 0 && (
        <div className="form-group">
          <label className="form-label">Exercises</label>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', maxHeight:280, overflowY:'auto' }}>
            {selectedType.exercises.map(ex => (
              <div key={ex.id} style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.5rem 0.7rem', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)' }}>
                <div style={{ flex:1, fontSize:'0.8rem', fontWeight:600 }}>{ex.name}<div style={{ fontFamily:'var(--font-mono)', fontSize:'0.62rem', color:'var(--text4)' }}>Target: {ex.target_sets?`${ex.target_sets}×`:''}{ex.target_reps}</div></div>
                <input className="form-input" style={{ width:60, padding:'0.4rem 0.5rem' }} placeholder="sets" value={exerciseLogs[ex.id]?.sets||''} onChange={e=>setExerciseLogs(p=>({...p,[ex.id]:{...p[ex.id],sets:e.target.value}}))}/>
                <input className="form-input" style={{ width:70, padding:'0.4rem 0.5rem' }} placeholder="reps" value={exerciseLogs[ex.id]?.reps||''} onChange={e=>setExerciseLogs(p=>({...p,[ex.id]:{...p[ex.id],reps:e.target.value}}))}/>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" style={{minHeight:56}} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="How did it feel? Any PRs?"/></div>

      <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading?<Spinner/>:'Log Workout'}</button>
      </div>
    </form>
  );
};

export const ExercisePage = () => {
  const [types, setTypes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [del, setDel] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [t,s,st] = await Promise.all([api.get('/exercise/types'), api.get('/exercise/sessions'), api.get('/exercise/stats?days=28')]);
      setTypes(t); setSessions(s); setStats(st);
    } catch(e){toast.error(e.message);} finally{setLoading(false);}
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (form) => { await api.post('/exercise/sessions', form); toast.success('Workout logged!'); load(); };
  const handleDelete = async () => { await api.delete(`/exercise/sessions/${del.id}`); setSessions(p=>p.filter(s=>s.id!==del.id)); toast.success('Deleted'); };

  const maxByDate = Math.max(...(stats?.byDate||[]).map(d=>Number(d.count)), 1);

  return (
    <>
      <div className="page-header">
        <div><h1>Exercise</h1><div className="page-sub">{sessions.length} sessions logged</div></div>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal(true)}><Plus size={14}/> Log Workout</button>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem', marginBottom:'1.5rem' }}>
        <div className="card">
          <div className="card-header"><div><div className="card-title">Activity — Last 28 Days</div><div className="card-sub">Sessions per day</div></div></div>
          {!stats?.byDate?.length ? <div style={{ color:'var(--text4)', fontSize:'0.78rem', fontFamily:'var(--font-mono)' }}>No sessions yet</div> : (
            <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:60 }}>
              {stats.byDate.map(d => (
                <div key={d.session_date} style={{ flex:1, height:Math.max(3,(Number(d.count)/maxByDate)*55), background:'linear-gradient(180deg, var(--cyan), var(--slate))', borderRadius:'2px 2px 0 0' }} title={`${d.count} on ${fmtDate(d.session_date)}`}/>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-header"><div><div className="card-title">By Type</div><div className="card-sub">Distribution this period</div></div></div>
          {!stats?.byType?.length ? <div style={{ color:'var(--text4)', fontSize:'0.78rem', fontFamily:'var(--font-mono)' }}>No data yet</div> : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {stats.byType.filter(t=>t.name).map(t => {
                const total = stats.byType.reduce((a,x)=>a+Number(x.count),1);
                return (
                  <div key={t.name}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.74rem', marginBottom:2 }}><span style={{ color:'var(--text2)' }}>{t.name}</span><span style={{ fontFamily:'var(--font-mono)', color:'var(--text4)' }}>{t.count}</span></div>
                    <div className="progress-track"><div className="progress-fill" style={{ width:`${(Number(t.count)/total)*100}%` }}/></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Session history */}
      {loading ? <div style={{display:'flex',justifyContent:'center',padding:'3rem'}}><Spinner lg/></div> :
      sessions.length === 0 ? <div className="card"><EmptyState icon={<div className="empty-state-icon"><Dumbbell size={22}/></div>} title="No workouts logged" description="Log your first session." action={<button className="btn btn-primary btn-sm" onClick={()=>setModal(true)}><Plus size={13}/> Log Workout</button>}/></div> :
      (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
          {sessions.map(s => (
            <div key={s.id} className="card" style={{ padding:'0.9rem 1.1rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom: s.logs?.length ? '0.6rem' : 0 }}>
                <div style={{ width:36, height:36, background:'rgba(108,127,232,0.12)', borderRadius:9, display:'grid', placeItems:'center', color:'var(--slate-l)', flexShrink:0 }}><Dumbbell size={15}/></div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:'0.88rem' }}>{s.type_name || 'Workout'}</div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--text4)', display:'flex', gap:8 }}>
                    <span><Calendar size={10} style={{display:'inline',marginRight:2}}/>{fmtDate(s.session_date)}</span>
                    {s.duration_minutes && <span>{s.duration_minutes}m</span>}
                  </div>
                </div>
                <button className="btn btn-danger btn-icon btn-sm" onClick={()=>setDel(s)}><Trash2 size={12}/></button>
              </div>
              {s.logs?.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem', paddingLeft:'3rem' }}>
                  {s.logs.map(l => (
                    <span key={l.id} style={{ fontSize:'0.7rem', fontFamily:'var(--font-mono)', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:6, padding:'2px 8px', color:'var(--text2)' }}>
                      {l.exercise_name}: {l.sets_completed}×{l.reps_completed}
                    </span>
                  ))}
                </div>
              )}
              {s.notes && <p style={{ fontSize:'0.78rem', color:'var(--text3)', marginTop:'0.5rem', paddingLeft:'3rem', fontStyle:'italic' }}>{s.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title="Log Workout" size="modal-lg">
        {types.length > 0 && <LogForm types={types} onSave={handleSave} onClose={()=>setModal(false)}/>}
      </Modal>
      <Confirm open={!!del} onClose={()=>setDel(null)} onConfirm={handleDelete} title="Delete Session" message="Delete this workout session?" danger/>
    </>
  );
};
