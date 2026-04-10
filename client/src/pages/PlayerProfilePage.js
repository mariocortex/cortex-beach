import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiSave, FiX } from 'react-icons/fi';
import './PlayerProfilePage.css';
import { API_BASE } from '../config';

function PlayerProfilePage() {
  const { playerId } = useParams();
  const [player, setPlayer] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchPlayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  const fetchPlayer = async () => {
    try {
      const res = await fetch(`${API_BASE}/players/${playerId}/stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlayer(data.player);
        setTournaments(data.tournaments || []);
        setStats(data.stats);
        setEditForm({
          full_name: data.player.full_name || data.player.name || '',
          email: data.player.email || '',
          phone: data.player.phone || '',
          birth_date: data.player.birth_date || ''
        });
      }
    } catch (err) {
      console.error('Failed to fetch player:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE}/players/${playerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        const updated = await res.json();
        setPlayer({ ...updated, name: updated.full_name });
        setEditing(false);
      }
    } catch (err) {
      console.error('Failed to update player:', err);
    }
  };

  const calcAge = (birthDate) => {
    if (!birthDate) return null;
    return Math.floor((new Date() - new Date(birthDate)) / (365.25 * 24 * 60 * 60 * 1000));
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div><p>Carregando...</p></div>;
  }

  if (!player) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <p>Jogador não encontrado.</p>
          <Link to="/players" className="btn btn-primary">Voltar</Link>
        </div>
      </div>
    );
  }

  const age = calcAge(player.birth_date);

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <Link to="/players" className="back-btn">
            <FiArrowLeft size={20} /> Voltar
          </Link>
          <div className="profile-title">
            <div className="profile-avatar">{(player.name || 'J')[0].toUpperCase()}</div>
            <div>
              <h1>{player.name}</h1>
              <p className="profile-meta">
                {age ? `${age} anos` : ''}
                {age && player.email ? ' | ' : ''}
                {player.email || ''}
              </p>
            </div>
          </div>
          <button className="btn btn-outline btn-edit" onClick={() => setEditing(!editing)}>
            {editing ? <><FiX size={16} /> Cancelar</> : <><FiEdit2 size={16} /> Editar</>}
          </button>
        </div>

        {editing && (
          <div className="edit-section">
            <h3>Editar Dados</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Nome Completo</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Data de Nascimento</label>
                <input
                  type="date"
                  value={editForm.birth_date}
                  onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleSave}>
                <FiSave size={16} /> Salvar
              </button>
            </div>
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{stats?.matches_played || 0}</span>
            <span className="stat-label">Jogos</span>
          </div>
          <div className="stat-card stat-green">
            <span className="stat-value">{stats?.wins || 0}</span>
            <span className="stat-label">Vitórias</span>
          </div>
          <div className="stat-card stat-yellow">
            <span className="stat-value">{stats?.draws || 0}</span>
            <span className="stat-label">Empates</span>
          </div>
          <div className="stat-card stat-red">
            <span className="stat-value">{stats?.losses || 0}</span>
            <span className="stat-label">Derrotas</span>
          </div>
          <div className="stat-card stat-blue">
            <span className="stat-value">{stats?.total_points || 0}</span>
            <span className="stat-label">Pontos</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{tournaments.length}</span>
            <span className="stat-label">Torneios</span>
          </div>
        </div>

        <div className="section">
          <h2>Histórico de Torneios</h2>
          {tournaments.length > 0 ? (
            <div className="tournaments-list">
              {tournaments.map(t => (
                <div key={t.id} className="tournament-item">
                  <div className="tournament-item-info">
                    <strong>{t.tournaments?.name || 'Torneio'}</strong>
                    <span className="tournament-item-meta">
                      {t.category} | {t.level}
                      {t.tournaments?.start_date && (
                        <> | {new Date(t.tournaments.start_date).toLocaleDateString('pt-BR')}</>
                      )}
                    </span>
                  </div>
                  <span className={`badge badge-${t.payment_status}`}>
                    {t.payment_status === 'paid' ? '✅ Pago' : '⏳ Pendente'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">Nenhum torneio registrado.</p>
          )}
        </div>

        <div className="section">
          <h2>Contato</h2>
          <div className="contact-info">
            <p><strong>Email:</strong> {player.email || '-'}</p>
            <p><strong>Telefone:</strong> {player.phone || '-'}</p>
            <p><strong>Nascimento:</strong> {player.birth_date ? new Date(player.birth_date).toLocaleDateString('pt-BR') : '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerProfilePage;
