const API_AUTH_URL = '/api/auth';

export const login = async (email: string, pass: string) => {
  const res = await fetch(`${API_AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  if (!res.ok) throw new Error('Błędny email lub hasło');
  const data = await res.json();
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
};

export const register = async (name: string, email: string, pass: string) => {
  const res = await fetch(`${API_AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password: pass }),
  });
  if (!res.ok) throw new Error('Rejestracja nie powiodła się');
  return res.json();
};