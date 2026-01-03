import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../../services/authApi';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(formData.name, formData.email, formData.password);
      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '400px' }}>
      <div className="card p-4 shadow">
        <h2 className="text-center mb-4">Rejestracja</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Imię</label>
            <input type="text" className="form-control" onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Hasło</label>
            <input type="password" className="form-control" onChange={(e) => setFormData({...formData, password: e.target.value})} required />
          </div>
          <button type="submit" className="btn btn-success w-100">Stwórz konto</button>
        </form>
        <p className="mt-3 text-center">Masz konto? <Link to="/login">Zaloguj się</Link></p>
      </div>
    </div>
  );
};

export default RegisterPage;