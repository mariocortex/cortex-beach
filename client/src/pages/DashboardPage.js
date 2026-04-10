import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiCalendar, FiUsers, FiTrendingUp } from 'react-icons/fi';
import './DashboardPage.css';
import { API_BASE } from '../config';

function DashboardPage({ user }) {
  const [tournaments, setTournaments] = useState([]);
  const [stats, setStats] = useState({
    activeTournaments: 0,
    totalPlayers: 0,
    pendingResults: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/tournaments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTournaments(data.slice(0, 5));

        setStats({
          activeTournaments: data.filter(t => t.status === 'active').length,
          totalPlayers: data.reduce((sum, t) => sum + (t.player_count || 0), 0),
          pendingResults: data.reduce((sum, t) => sum + (t.pending_results || 0), 0)
        });
      }
    } catch (error) {
      console.error('Failed to fetch tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Bem-vindo, {user?.email?.split('@')[0]}! 👋</p>
        </div>
        <Link to="/tournaments/new" className="btn btn-primary">
          <FiPlus size={20} />
          Novo Torneio
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FiCalendar size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Torneios Ativos</p>
            <p className="stat-value">{stats.activeTournaments}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FiUsers size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Jogadores Inscritos</p>
            <p className="stat-value">{stats.totalPlayers}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FiTrendingUp size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Resultados Pendentes</p>
            <p className="stat-value">{stats.pendingResults}</p>
          </div>
        </div>
      </div>

      <section className="tournaments-section">
        <div className="section-header">
          <h2>Torneios Recentes</h2>
          <Link to="/tournaments" className="view-all">
            Ver todos →
          </Link>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Carregando torneios...</p>
          </div>
        ) : tournaments.length > 0 ? (
          <div className="tournaments-grid">
            {tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                to={`/tournaments/${tournament.id}`}
                className="tournament-card card"
              >
                <div className="tournament-header">
                  <h3>{tournament.name}</h3>
                  <span className={`badge badge-${tournament.status}`}>
                    {tournament.status === 'active' ? '🔴 Ativo' : '⏸️ Rascunho'}
                  </span>
                </div>
                <p className="tournament-date">
                  📅 {new Date(tournament.date).toLocaleDateString('pt-BR')}
                </p>
                <div className="tournament-meta">
                  <span>{tournament.player_count || 0} jogadores</span>
                  <span>•</span>
                  <span>{tournament.categories?.length || 0} categorias</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>Nenhum torneio criado ainda</p>
            <Link to="/tournaments/new" className="btn btn-primary">
              Criar Primeiro Torneio
            </Link>
          </div>
        )}
      </section>

      <section className="quick-actions">
        <h2>Ações Rápidas</h2>
        <div className="actions-grid">
          <Link to="/tournaments/new" className="action-btn">
            <span className="action-icon">📝</span>
            <span>Criar Torneio</span>
          </Link>
          <Link to="/tournaments" className="action-btn">
            <span className="action-icon">👥</span>
            <span>Gerenciar Jogadores</span>
          </Link>
          <Link to="/tournaments" className="action-btn">
            <span className="action-icon">📊</span>
            <span>Ver Estatísticas</span>
          </Link>
          <Link to="/tournaments" className="action-btn">
            <span className="action-icon">⚙️</span>
            <span>Configurações</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
