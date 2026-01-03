const API_AUTH_URL = '/api/auth';

export const login = async (email: string, pass: string) => {
  const res = await fetch(`${API_AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  const data = await res.json();
  if (data.access_token) {
    localStorage.setItem('token', data.access_token);
  }
  return data;
};

export const logout = () => localStorage.removeItem('token');