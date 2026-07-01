import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
const Ctx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem('los_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me').then(d=>setUser(d.user)).catch(()=>localStorage.removeItem('los_token')).finally(()=>setLoading(false));
  }, []);
  const login = async (password) => {
    const d = await api.post('/auth/login', { password });
    localStorage.setItem('los_token', d.token);
    setUser(d.user);
  };
  const logout = () => { localStorage.removeItem('los_token'); setUser(null); };
  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
};
export const useAuth = () => useContext(Ctx);
