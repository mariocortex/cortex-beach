import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiBriefcase } from 'react-icons/fi';
import './LoginPage.css';
import { API_BASE } from '../config';

function SignupPage({ onLogin }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    company_name: '',
    name: '',
    email: '',
    password: '',
    password_confirm: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.password_confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: form.company_name,
          name: form.name,
          email: form.email,
          password: form.password
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar conta');
      }

      const data = await res.json();
      onLogin(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: '450px' }}>
        <div className="login-header">
          <div className="login-logo">🏐</div>
          <h1>Córtex Beach</h1>
          <p>Crie sua conta e comece a organizar torneios</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label>Nome da Empresa *</label>
            <div className="input-wrapper">
              <FiBriefcase size={20} />
              <input
                type="text"
                placeholder="Ex: Arena Beach Tennis"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Seu Nome *</label>
            <div className="input-wrapper">
              <FiUser size={20} />
              <input
                type="text"
                placeholder="Nome completo"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>E-mail *</label>
            <div className="input-wrapper">
              <FiMail size={20} />
              <input
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Senha *</label>
            <div className="input-wrapper">
              <FiLock size={20} />
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Confirmar Senha *</label>
            <div className="input-wrapper">
              <FiLock size={20} />
              <input
                type="password"
                placeholder="Repita a senha"
                value={form.password_confirm}
                onChange={(e) => setForm({ ...form, password_confirm: e.target.value })}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? 'Criando conta...' : 'Criar Conta'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#666' }}>
            Já tem conta? <Link to="/login" style={{ color: '#0066CC', fontWeight: 600 }}>Entrar</Link>
          </p>
        </form>
      </div>

      <div className="login-background">
        <div className="wave"></div>
        <div className="wave"></div>
      </div>
    </div>
  );
}

export default SignupPage;
