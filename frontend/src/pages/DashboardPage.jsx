import { useState, useEffect } from 'react';
import { CheckSquare, Moon, Dumbbell, Apple, Sparkles, Wallet, TrendingUp, ShoppingBag } from 'lucide-react';
import { api } from '../utils/api';
import { RingProgress, Spinner, fmtMoney } from '../components/ui';

export const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/dashboard').then(setData).catch(console.error).finally(()=>setLoading(false)); }, []);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:'4rem' }}><Spinner lg/></div>;

  const rings = [
    { label:'Tasks',    icon:CheckSquare, data:data.tasks,    color:'var(--slate-l)', to:'/tasks' },
    { label:'Deen',     icon:Moon,        data:data.deen,     color:'var(--purple)',  to:'/deen' },
    { label:'Diet',     icon:Apple,       data:data.diet,     color:'var(--green)',   to:'/diet' },
    { label:'Wellness', icon:Sparkles,    data:data.wellness, color:'var(--cyan)',    to:'/wellness' },
  ];

  const trend = data.trend || [];
  const maxTrend = Math.max(...trend.map(t => Number(t.total)), 1);

  return (
    <>
      <div style={{ marginBottom:'1.75rem' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--slate-l)', textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:'0.3rem' }}>Today's overview</div>
        <h1 style={{ fontSize:'1.6rem' }}>Hassan</h1>
      </div>

      {/* Ring progress row */}
      <div className="stats-row" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))' }}>
        {rings.map(r => {
          const done = Number(r.data?.done || 0);
          const total = Number(r.data?.total || 0);
          return (
            <div key={r.label} className="stat-card" style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
              <RingProgress value={done} max={total} size={56} stroke={5} color={r.color} />
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:6, color:r.color, marginBottom:2 }}>
                  <r.icon size={13}/><span style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.08em' }}>{r.label}</span>
                </div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.1rem' }}>{done}/{total}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem', marginBottom:'1.25rem' }}>
        {/* 7-day trend */}
        <div className="card">
          <div className="card-header"><div><div className="card-title">Weekly Consistency</div><div className="card-sub">All habits combined, last 7 days</div></div></div>
          {trend.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'var(--text4)', fontFamily:'var(--font-mono)', fontSize:'0.75rem' }}>No data yet</div>
          ) : (
            <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:100 }}>
              {trend.map(t => {
                const pct = Number(t.total) > 0 ? (Number(t.done)/Number(t.total)) : 0;
                const h = Math.max(4, pct * 90);
                const d = new Date(t.log_date);
                return (
                  <div key={t.log_date} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.6rem', color:'var(--text3)' }}>{Math.round(pct*100)}%</div>
                    <div style={{ width:'100%', height:90, display:'flex', alignItems:'flex-end' }}>
                      <div style={{ width:'100%', height:h, background: pct>=0.8?'linear-gradient(180deg,var(--green),var(--slate))':'linear-gradient(180deg,var(--slate-l),var(--slate-d))', borderRadius:'4px 4px 0 0', transition:'height 0.6s cubic-bezier(0.34,1.2,0.64,1)' }}/>
                    </div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.58rem', color:'var(--text4)' }}>{d.toLocaleDateString('en-US',{weekday:'short'})}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="card">
          <div className="card-header"><div><div className="card-title">This Week</div><div className="card-sub">Snapshot</div></div></div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
              <div style={{ width:36, height:36, background:'rgba(108,127,232,0.12)', borderRadius:9, display:'grid', placeItems:'center', color:'var(--slate-l)' }}><Dumbbell size={16}/></div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.1rem' }}>{data.workoutsThisWeek}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--text4)' }}>Workout sessions logged</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
              <div style={{ width:36, height:36, background:'rgba(52,211,153,0.12)', borderRadius:9, display:'grid', placeItems:'center', color:'var(--green)' }}><Wallet size={16}/></div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.1rem', color: Number(data.finance?.balance||0)>=0 ? 'var(--green)':'var(--red)' }}>{fmtMoney(data.finance?.balance||0)}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--text4)' }}>Current balance</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
              <div style={{ width:36, height:36, background:'rgba(251,191,36,0.12)', borderRadius:9, display:'grid', placeItems:'center', color:'var(--amber)' }}><ShoppingBag size={16}/></div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.1rem' }}>{data.wishlistCount}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--text4)' }}>Items on wishlist</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
              <div style={{ width:36, height:36, background:'rgba(34,211,238,0.12)', borderRadius:9, display:'grid', placeItems:'center', color:'var(--cyan)' }}><TrendingUp size={16}/></div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.1rem' }}>{fmtMoney(data.finance?.month_income||0)}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--text4)' }}>Income this month</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
