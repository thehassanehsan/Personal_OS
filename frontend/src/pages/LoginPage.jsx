import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try { await login(password); } catch { setError('Access denied. Wrong password.'); } finally { setLoading(false); }
  };
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-mark">Life OS</div>
        <div className="login-sub">Personal Command Centre</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Access Password</label>
            <div style={{ position:'relative' }}>
              <Lock size={13} style={{ position:'absolute', left:'0.85rem', top:'50%', transform:'translateY(-50%)', color:'var(--text4)', pointerEvents:'none' }}/>
              <input type="password" className="form-input" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" autoFocus style={{ paddingLeft:'2.2rem' }}/>
            </div>
            {error && <div style={{ color:'var(--red)', fontSize:'0.78rem', marginTop:'0.4rem', fontFamily:'var(--font-mono)' }}>{error}</div>}
          </div>
          <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:'0.25rem' }} disabled={loading||!password}>
            {loading ? <span className="spinner"/> : 'Enter'}
          </button>
        </form>
        <div style={{ marginTop:'1.5rem', paddingTop:'1rem', borderTop:'1px solid var(--border)', textAlign:'center', fontFamily:'var(--font-mono)', fontSize:'0.62rem', color:'var(--text4)', letterSpacing:'0.1em' }}>
          PRIVATE — OWNER ONLY
        </div>
      </div>
    </div>
  );
};
