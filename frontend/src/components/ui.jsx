import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, Check, Flame } from 'lucide-react';

export const Modal = ({ open, onClose, title, children, size = '' }) => {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${size}`}>
        <div className="modal-header"><div className="modal-title">{title}</div><button className="modal-close" onClick={onClose}><X size={14}/></button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

export const Confirm = ({ open, onClose, onConfirm, title, message, danger }) => {
  const [loading, setLoading] = useState(false);
  const handle = async () => { setLoading(true); try{await onConfirm();onClose();}catch(e){console.error(e);}finally{setLoading(false);} };
  return (
    <Modal open={open} onClose={onClose} title={title||'Confirm'}>
      <p style={{ marginBottom:'1.25rem', color:'var(--text2)', fontSize:'0.875rem' }}>{message}</p>
      <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className={`btn btn-sm ${danger?'btn-danger':'btn-primary'}`} onClick={handle} disabled={loading}>{loading?<Spinner/>:'Confirm'}</button>
      </div>
    </Modal>
  );
};

export const Badge = ({ status, label }) => <span className={`badge badge-${status}`}>{label || status?.replace('_',' ')}</span>;
export const Spinner = ({ lg }) => <div className={`spinner${lg?'-lg spinner':''}`} />;

let _setToasts;
export const toast = {
  success: (msg) => _setToasts?.(p=>[...p,{id:Date.now(),type:'success',msg}]),
  error: (msg)   => _setToasts?.(p=>[...p,{id:Date.now(),type:'error',msg}]),
  info: (msg)    => _setToasts?.(p=>[...p,{id:Date.now(),type:'info',msg}]),
};
export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);
  _setToasts = setToasts;
  useEffect(() => { if (!toasts.length) return; const t=setTimeout(()=>setToasts(p=>p.slice(1)),3500); return ()=>clearTimeout(t); }, [toasts]);
  const icons = { success:<CheckCircle size={14} color="var(--green)"/>, error:<AlertCircle size={14} color="var(--red)"/>, info:<Info size={14} color="var(--slate-l)"/> };
  return <div className="toast-container">{toasts.map(t=><div key={t.id} className={`toast ${t.type}`}>{icons[t.type]}{t.msg}</div>)}</div>;
};

export const EmptyState = ({ icon, title, description, action }) => (
  <div className="empty-state"><div className="empty-state-icon">{icon}</div><h3>{title}</h3><p>{description}</p>{action && <div style={{marginTop:'1rem'}}>{action}</div>}</div>
);

// ── RING PROGRESS ─────────────────────────────────────────────────────────────
export const RingProgress = ({ value, max, size = 64, stroke = 6, color = 'var(--slate)', label, sublabel }) => {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="ring-bg" cx={size/2} cy={size/2} r={r} strokeWidth={stroke} />
        <circle className="ring-fill" cx={size/2} cy={size/2} r={r} strokeWidth={stroke} stroke={color}
          strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <div className="ring-label">
        <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize: size > 50 ? '1rem' : '0.78rem', color:'var(--text)' }}>{label ?? `${Math.round(pct*100)}%`}</div>
        {sublabel && <div style={{ fontSize:'0.55rem', color:'var(--text4)', fontFamily:'var(--font-mono)', textAlign:'center' }}>{sublabel}</div>}
      </div>
    </div>
  );
};

// ── CHECK ITEM ────────────────────────────────────────────────────────────────
export const CheckItem = ({ label, done, onToggle, sub, right }) => (
  <div className={`check-item ${done?'done':''}`}>
    <div className={`check-circle ${done?'checked':''}`} onClick={onToggle}>
      {done && <Check size={12} color="#fff" strokeWidth={3}/>}
    </div>
    <div style={{ flex:1, minWidth:0 }}>
      <div className="check-label">{label}</div>
      {sub && <div style={{ fontSize:'0.68rem', color:'var(--text4)', fontFamily:'var(--font-mono)', marginTop:1 }}>{sub}</div>}
    </div>
    {right}
  </div>
);

// ── PROGRESS ITEM (e.g. water 2/4L) ──────────────────────────────────────────
export const ProgressItem = ({ label, value, target, unit, onIncrement, onDecrement, done }) => (
  <div className={`check-item ${done?'done':''}`} style={{ flexDirection:'column', alignItems:'stretch', gap:'0.5rem' }}>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <span className="check-label">{label}</span>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.74rem', color: done?'var(--green)':'var(--slate-l)', fontWeight:700 }}>{value}/{target}{unit}</span>
    </div>
    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
      <button onClick={onDecrement} style={{ width:24,height:24,borderRadius:6,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--text3)',cursor:'pointer',fontSize:'0.9rem',display:'grid',placeItems:'center' }}>–</button>
      <div className="progress-item-track"><div className="progress-item-fill" style={{ width:`${Math.min(100,(value/target)*100)}%` }}/></div>
      <button onClick={onIncrement} style={{ width:24,height:24,borderRadius:6,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--text3)',cursor:'pointer',fontSize:'0.9rem',display:'grid',placeItems:'center' }}>+</button>
    </div>
  </div>
);

export const Streak = ({ count }) => count > 0 ? <span className="streak-badge"><Flame size={11}/>{count}</span> : null;

// ── HELPERS ───────────────────────────────────────────────────────────────────
export const fmtDate = (d) => { if (!d) return '—'; return new Date(d).toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'}); };
export const fmtMoney = (n, currency='USD') => { if (n==null||n==='') return '—'; return new Intl.NumberFormat('en-US',{style:'currency',currency,minimumFractionDigits:0,maximumFractionDigits:0}).format(n); };
export const todayStr = () => new Date().toISOString().split('T')[0];
