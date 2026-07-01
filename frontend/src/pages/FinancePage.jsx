import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Wallet, ShoppingBag, ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react';
import { api } from '../utils/api';
import { Modal, Confirm, Badge, EmptyState, Spinner, fmtMoney, fmtDate, toast, todayStr } from '../components/ui';

const EntryForm = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial || { type:'expense', category:'', description:'', amount:'', date:todayStr(), notes:'' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const handleSubmit = async(e) => { e.preventDefault(); setLoading(true); try{await onSave(form);onClose();}catch(err){toast.error(err.message);}finally{setLoading(false);} };
  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Type</label>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          {['income','expense'].map(t => (
            <button key={t} type="button" onClick={()=>setForm(f=>({...f,type:t}))} style={{ flex:1, padding:'0.55rem', borderRadius:'var(--radius)', border:`1px solid ${form.type===t?'var(--slate)':'var(--border)'}`, background:form.type===t?'var(--slate-soft)':'var(--surface2)', color:form.type===t?'var(--slate-l)':'var(--text3)', fontSize:'0.84rem', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              {t==='income'?<ArrowUpRight size={14}/>:<ArrowDownRight size={14}/>}{t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="form-group"><label className="form-label">Description *</label><input className="form-input" value={form.description} onChange={set('description')} required placeholder="e.g. Groceries, Salary…"/></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Amount *</label><input className="form-input" type="number" step="0.01" value={form.amount} onChange={set('amount')} required placeholder="50"/></div>
        <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={form.date} onChange={set('date')}/></div>
      </div>
      <div className="form-group"><label className="form-label">Category</label><input className="form-input" value={form.category} onChange={set('category')} placeholder="Food, Transport, Salary…"/></div>
      <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" style={{minHeight:56}} value={form.notes} onChange={set('notes')}/></div>
      <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading?<Spinner/>:(initial?'Save':'Add Entry')}</button>
      </div>
    </form>
  );
};

const WishForm = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial || { item:'', price:'', priority:'medium', link:'', notes:'' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const handleSubmit = async(e) => { e.preventDefault(); setLoading(true); try{await onSave(form);onClose();}catch(err){toast.error(err.message);}finally{setLoading(false);} };
  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group"><label className="form-label">Item *</label><input className="form-input" value={form.item} onChange={set('item')} required placeholder="e.g. New jump rope"/></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Price</label><input className="form-input" type="number" value={form.price} onChange={set('price')} placeholder="50"/></div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="form-select" value={form.priority} onChange={set('priority')}>
            {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group"><label className="form-label">Link</label><input className="form-input" value={form.link} onChange={set('link')} placeholder="https://…"/></div>
      <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" style={{minHeight:56}} value={form.notes} onChange={set('notes')}/></div>
      <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading?<Spinner/>:(initial?'Save':'Add to Wishlist')}</button>
      </div>
    </form>
  );
};

export const FinancePage = () => {
  const [tab, setTab] = useState('overview');
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [wishModal, setWishModal] = useState(null);
  const [del, setDel] = useState(null);
  const [delWish, setDelWish] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [e,s,w] = await Promise.all([api.get('/finance'), api.get('/finance/summary'), api.get('/finance/wishlist/all')]);
      setEntries(e); setSummary(s); setWishlist(w);
    } catch(e){toast.error(e.message);} finally{setLoading(false);}
  };
  useEffect(() => { load(); }, []);

  const handleSaveEntry = async (form) => {
    if (modal?.entry) { const u=await api.put(`/finance/${modal.entry.id}`,form); setEntries(p=>p.map(e=>e.id===u.id?u:e)); }
    else { const c=await api.post('/finance',form); setEntries(p=>[c,...p]); }
    const s = await api.get('/finance/summary'); setSummary(s);
    toast.success('Saved');
  };
  const handleDeleteEntry = async () => { await api.delete(`/finance/${del.id}`); setEntries(p=>p.filter(e=>e.id!==del.id)); const s=await api.get('/finance/summary'); setSummary(s); toast.success('Deleted'); };

  const handleSaveWish = async (form) => {
    if (wishModal?.item) { const u=await api.put(`/finance/wishlist/${wishModal.item.id}`,form); setWishlist(p=>p.map(w=>w.id===u.id?u:w)); }
    else { const c=await api.post('/finance/wishlist',form); setWishlist(p=>[c,...p]); }
    toast.success('Saved');
  };
  const handleDeleteWish = async () => { await api.delete(`/finance/wishlist/${delWish.id}`); setWishlist(p=>p.filter(w=>w.id!==delWish.id)); toast.success('Removed'); };
  const togglePurchased = async (item) => { const u = await api.put(`/finance/wishlist/${item.id}`, {...item, purchased: !item.purchased}); setWishlist(p=>p.map(w=>w.id===u.id?u:w)); };

  const tot = summary?.totals || {};
  const balance = Number(tot.total_income||0) - Number(tot.total_expenses||0);
  const monthly = (summary?.monthly||[]).slice(-6);
  const maxVal = Math.max(...monthly.map(m=>Math.max(Number(m.income),Number(m.expenses))),1);

  return (
    <>
      <div className="page-header">
        <div><h1>Finance</h1><div className="page-sub">Balance sheet & wishlist</div></div>
        <button className="btn btn-primary btn-sm" onClick={()=>tab==='wishlist'?setWishModal('add'):setModal('add')}><Plus size={14}/> {tab==='wishlist'?'Add to Wishlist':'Add Entry'}</button>
      </div>

      <div className="stats-row">
        <div className="stat-card"><div className="stat-value" style={{ color:'var(--green)' }}>{fmtMoney(tot.total_income||0)}</div><div className="stat-label">Total Income</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color:'var(--red)' }}>{fmtMoney(tot.total_expenses||0)}</div><div className="stat-label">Total Expenses</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: balance>=0?'var(--slate-l)':'var(--red)' }}>{fmtMoney(balance)}</div><div className="stat-label">Balance</div></div>
        <div className="stat-card"><div className="stat-value">{wishlist.filter(w=>!w.purchased).length}</div><div className="stat-label">Wishlist Items</div></div>
      </div>

      <div className="tabs">
        {[['overview','Overview'],['entries','Transactions'],['wishlist','Wishlist']].map(([v,l]) => (
          <button key={v} className={`tab-btn${tab===v?' active':''}`} onClick={()=>setTab(v)}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="card">
          <div className="card-header"><div><div className="card-title">Monthly Balance Sheet</div><div className="card-sub">Last 6 months</div></div></div>
          {monthly.length === 0 ? <div style={{ color:'var(--text4)', fontSize:'0.78rem', fontFamily:'var(--font-mono)', textAlign:'center', padding:'2rem' }}>No data yet</div> : (
            <div style={{ display:'flex', alignItems:'flex-end', gap:10, height:110 }}>
              {monthly.map(m => {
                const inc=Number(m.income), exp=Number(m.expenses);
                return (
                  <div key={m.month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <div style={{ display:'flex', gap:3, alignItems:'flex-end', height:90 }}>
                      <div style={{ width:14, height:Math.max(2,(inc/maxVal)*85), background:'var(--green)', borderRadius:'3px 3px 0 0' }} title={fmtMoney(inc)}/>
                      <div style={{ width:14, height:Math.max(2,(exp/maxVal)*85), background:'var(--red)', borderRadius:'3px 3px 0 0' }} title={fmtMoney(exp)}/>
                    </div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.6rem', color:'var(--text4)' }}>{m.month?.slice(5)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'entries' && (
        loading ? <div style={{display:'flex',justifyContent:'center',padding:'3rem'}}><Spinner lg/></div> :
        entries.length === 0 ? <div className="card"><EmptyState icon={<div className="empty-state-icon"><Wallet size={22}/></div>} title="No transactions" description="Add your first entry."/></div> :
        <div className="card" style={{padding:0}}>
          <div className="table-wrap"><table>
            <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Category</th><th>Amount</th><th></th></tr></thead>
            <tbody>{entries.map(e=>(
              <tr key={e.id}>
                <td className="td-mono" style={{fontSize:'0.72rem'}}>{fmtDate(e.date)}</td>
                <td><span style={{ display:'flex',alignItems:'center',gap:4,fontSize:'0.75rem',fontFamily:'var(--font-mono)',color:e.type==='income'?'var(--green)':'var(--red)' }}>{e.type==='income'?<ArrowUpRight size={11}/>:<ArrowDownRight size={11}/>}{e.type}</span></td>
                <td className="td-main">{e.description}</td>
                <td style={{fontSize:'0.75rem'}}>{e.category||'—'}</td>
                <td className="td-mono" style={{color:e.type==='income'?'var(--green)':'var(--red)',fontWeight:700}}>{e.type==='income'?'+':'-'}{fmtMoney(Math.abs(e.amount))}</td>
                <td><div style={{display:'flex',gap:'0.25rem'}}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setModal({entry:e})}><Edit2 size={12}/></button>
                  <button className="btn btn-danger btn-icon btn-sm" onClick={()=>setDel(e)}><Trash2 size={12}/></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>
      )}

      {tab === 'wishlist' && (
        loading ? <div style={{display:'flex',justifyContent:'center',padding:'3rem'}}><Spinner lg/></div> :
        wishlist.length === 0 ? <div className="card"><EmptyState icon={<div className="empty-state-icon"><ShoppingBag size={22}/></div>} title="Wishlist empty" description="Add things you want to buy, ranked by priority."/></div> :
        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
          {wishlist.map(w => (
            <div key={w.id} className="card" style={{ padding:'0.85rem 1.1rem', display:'flex', alignItems:'center', gap:'0.75rem', opacity:w.purchased?0.5:1 }}>
              <div className={`check-circle ${w.purchased?'checked':''}`} onClick={()=>togglePurchased(w)} style={{ flexShrink:0 }}>
                {w.purchased && <span style={{ color:'#fff', fontSize:10 }}>✓</span>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:'0.86rem', textDecoration:w.purchased?'line-through':'' }}>{w.item}</div>
                <div style={{ display:'flex', gap:8, marginTop:2, alignItems:'center' }}>
                  {w.price>0 && <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.7rem', color:'var(--slate-l)' }}>{fmtMoney(w.price)}</span>}
                  {w.link && <a href={w.link} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:2, fontSize:'0.7rem' }}><ExternalLink size={10}/>Link</a>}
                </div>
              </div>
              <Badge status={w.priority}/>
              <div style={{display:'flex',gap:'0.25rem'}}>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setWishModal({item:w})}><Edit2 size={12}/></button>
                <button className="btn btn-danger btn-icon btn-sm" onClick={()=>setDelWish(w)}><Trash2 size={12}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={()=>setModal(null)} title={modal?.entry?'Edit Entry':'New Entry'}>
        {modal && <EntryForm initial={modal?.entry} onSave={handleSaveEntry} onClose={()=>setModal(null)}/>}
      </Modal>
      <Modal open={!!wishModal} onClose={()=>setWishModal(null)} title={wishModal?.item?'Edit Item':'New Wishlist Item'}>
        {wishModal && <WishForm initial={wishModal?.item} onSave={handleSaveWish} onClose={()=>setWishModal(null)}/>}
      </Modal>
      <Confirm open={!!del} onClose={()=>setDel(null)} onConfirm={handleDeleteEntry} title="Delete Entry" message={`Delete "${del?.description}"?`} danger/>
      <Confirm open={!!delWish} onClose={()=>setDelWish(null)} onConfirm={handleDeleteWish} title="Remove Item" message={`Remove "${delWish?.item}" from wishlist?`} danger/>
    </>
  );
};
