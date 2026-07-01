const BASE = import.meta.env.VITE_API_URL || '';
const req = async (method, path, body) => {
  const token = localStorage.getItem('los_token');
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) },
    ...(body?{body:JSON.stringify(body)}:{}),
  });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};
export const api = {
  get: (path) => req('GET', `/api${path}`),
  post: (path, body) => req('POST', `/api${path}`, body),
  put: (path, body) => req('PUT', `/api${path}`, body),
  delete: (path) => req('DELETE', `/api${path}`),
};
