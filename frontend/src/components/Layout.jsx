import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Moon, Dumbbell, Apple, Wallet, Sparkles, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { section: 'Overview', items: [{ label:'Dashboard', icon:LayoutDashboard, to:'/' }] },
  { section: 'Daily Life', items: [
    { label:'Tasks',    icon:CheckSquare, to:'/tasks' },
    { label:'Deen',     icon:Moon,        to:'/deen' },
    { label:'Exercise', icon:Dumbbell,    to:'/exercise' },
    { label:'Diet',     icon:Apple,       to:'/diet' },
    { label:'Wellness', icon:Sparkles,    to:'/wellness' },
  ]},
  { section: 'Money', items: [{ label:'Finance', icon:Wallet, to:'/finance' }] },
];

export const Sidebar = ({ onClose }) => {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const isActive = (to) => to==='/' ? loc.pathname==='/' : loc.pathname.startsWith(to);
  return (
    <aside className="sidebar">
      <div className="sidebar-logo"><div className="sidebar-logo-mark">Life OS</div><div className="sidebar-logo-sub">Personal System</div></div>
      <nav className="sidebar-nav">
        {NAV.map(sec => (
          <div key={sec.section}>
            <div className="sidebar-section">{sec.section}</div>
            {sec.items.map(item => (
              <NavLink key={item.to} to={item.to} className={`nav-item ${isActive(item.to)?'active':''}`} onClick={onClose}>
                <item.icon size={14}/>{item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-avatar">H</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="sidebar-user-name">{user?.name || 'Hassan'}</div>
          <div className="sidebar-user-role">Owner</div>
        </div>
        <button onClick={logout} style={{ background:'none', border:'none', color:'var(--text4)', cursor:'pointer', display:'grid', placeItems:'center', padding:'4px', borderRadius:'6px', transition:'color 0.15s' }}
          onMouseOver={e=>e.currentTarget.style.color='var(--red)'} onMouseOut={e=>e.currentTarget.style.color='var(--text4)'} title="Sign out">
          <LogOut size={14}/>
        </button>
      </div>
    </aside>
  );
};

const PAGE_TITLES = { '/':'Dashboard', '/tasks':'Tasks', '/deen':'Deen', '/exercise':'Exercise', '/diet':'Diet Tracker', '/wellness':'Wellness', '/finance':'Finance' };

export const AppLayout = ({ children }) => {
  const loc = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t=setInterval(()=>setTime(new Date()),1000); return ()=>clearInterval(t); }, []);
  const title = Object.entries(PAGE_TITLES).find(([k])=>k==='/'?loc.pathname==='/':loc.pathname.startsWith(k))?.[1] || 'Life OS';
  const timeStr = time.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true});
  const dateStr = time.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  return (
    <div className="app-shell">
      {sidebarOpen && <div onClick={()=>setSidebarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:49, backdropFilter:'blur(4px)' }}/>}
      <div className={`sidebar ${sidebarOpen?'open':''}`}><Sidebar onClose={()=>setSidebarOpen(false)}/></div>
      <div className="main-area">
        <header className="topbar">
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <button id="mob-menu" className="topbar-btn" onClick={()=>setSidebarOpen(v=>!v)}>{sidebarOpen?<X size={15}/>:<Menu size={15}/>}</button>
            <span className="topbar-title">{title}</span>
          </div>
          <div className="topbar-right">
            <div className="topbar-time"><span style={{ color:'var(--slate-l)' }}>{timeStr}</span><span style={{ margin:'0 0.4rem', color:'var(--text4)' }}>·</span><span>{dateStr}</span></div>
          </div>
        </header>
        <main className="page">{children}</main>
      </div>
    </div>
  );
};
