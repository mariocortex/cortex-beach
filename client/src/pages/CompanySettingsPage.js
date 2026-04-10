import React, { useState, useEffect } from 'react';
import { FiSave, FiCreditCard, FiUsers, FiUserPlus, FiTrash2 } from 'react-icons/fi';
import './CompanySettingsPage.css';
import { API_BASE } from '../config';

function CompanySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });
  const [form, setForm] = useState({
    name: '', cnpj: '', phone: '', email: '',
    pix_key: '', pix_type: 'cpf', pix_name: ''
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [compRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/company`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`${API_BASE}/company/users`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (compRes.ok) {
        const data = await compRes.json();
        setForm({
          name: data.name || '',
          cnpj: data.cnpj || '',
          phone: data.phone || '',
          email: data.email || '',
          pix_key: data.pix_key || '',
          pix_type: data.pix_type || 'cpf',
          pix_name: data.pix_name || ''
        });
      }
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/company`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setMessage('Dados salvos com sucesso!');
      } else {
        setMessage('Erro ao salvar dados.');
      }
    } catch (err) {
      setMessage('Erro de conexão.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/company/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        const user = await res.json();
        setUsers([...users, user]);
        setNewUser({ name: '', email: '', password: '', role: 'user' });
        setShowAddUser(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao adicionar usuário');
      }
    } catch (err) {
      alert('Erro de conexão');
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!window.confirm('Remover este usuário?')) return;
    try {
      const res = await fetch(`${API_BASE}/company/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao remover usuário');
      }
    } catch (err) {
      alert('Erro de conexão');
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div><p>Carregando...</p></div>;
  }

  return (
    <div className="company-settings">
      <h1>Configurações da Empresa</h1>

      {message && (
        <div className={`settings-msg ${message.includes('sucesso') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="settings-section">
          <h2>Dados da Empresa</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Nome da Empresa *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome da empresa"
                required
              />
            </div>
            <div className="form-group">
              <label>CNPJ</label>
              <input
                type="text"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contato@empresa.com"
              />
            </div>
            <div className="form-group">
              <label>Telefone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2><FiCreditCard size={20} /> Dados PIX</h2>
          <p className="section-desc">Esses dados serão exibidos na tela de inscrição pública para pagamento.</p>

          <div className="form-row">
            <div className="form-group">
              <label>Tipo de Chave PIX</label>
              <select
                value={form.pix_type}
                onChange={(e) => setForm({ ...form, pix_type: e.target.value })}
              >
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">Email</option>
                <option value="phone">Telefone</option>
                <option value="random">Chave Aleatória</option>
              </select>
            </div>
            <div className="form-group">
              <label>Chave PIX</label>
              <input
                type="text"
                value={form.pix_key}
                onChange={(e) => setForm({ ...form, pix_key: e.target.value })}
                placeholder="Digite a chave PIX"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Nome do Titular</label>
            <input
              type="text"
              value={form.pix_name}
              onChange={(e) => setForm({ ...form, pix_name: e.target.value })}
              placeholder="Nome que aparece na transferência"
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-save" disabled={saving}>
          <FiSave size={18} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>

      <div className="settings-section" style={{ marginTop: '20px' }}>
        <div className="section-header-row">
          <h2><FiUsers size={20} /> Usuários da Empresa</h2>
          <button className="btn btn-outline btn-sm" onClick={() => setShowAddUser(!showAddUser)}>
            <FiUserPlus size={16} /> Adicionar Usuário
          </button>
        </div>

        {showAddUser && (
          <form onSubmit={handleAddUser} className="add-user-form">
            <div className="form-row">
              <div className="form-group">
                <label>Nome *</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Nome do usuário"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Senha *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Senha de acesso"
                  required
                />
              </div>
              <div className="form-group">
                <label>Papel</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="admin">Administrador</option>
                  <option value="user">Usuário</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary btn-sm">Adicionar</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAddUser(false)}>Cancelar</button>
            </div>
          </form>
        )}

        <div className="users-list">
          {users.map(u => (
            <div key={u.id} className="user-row">
              <div className="user-info">
                <div className="user-avatar-sm">{u.name?.[0]?.toUpperCase() || 'U'}</div>
                <div>
                  <strong>{u.name}</strong>
                  <span>{u.email}</span>
                </div>
              </div>
              <div className="user-actions">
                <span className={`role-badge ${u.role}`}>
                  {u.role === 'admin' ? 'Admin' : 'Usuário'}
                </span>
                <button
                  className="btn-icon-danger"
                  onClick={() => handleRemoveUser(u.id)}
                  title="Remover usuário"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CompanySettingsPage;
