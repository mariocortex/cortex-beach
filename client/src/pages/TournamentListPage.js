import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiSearch, FiFilter } from 'react-icons/fi';
import './TournamentListPage.css';
import { API_BASE } from '../config';

function TournamentListPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

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
        setTournaments(data);
      }
    } catch (error) {
      console.error('Failed to fetch tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTournaments = tournaments.filter((tournament) => {
    const matchesFilter = filter === 'all' || tournament.status === filter;
    const matchesSearch = tournament.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="tournament-list">
      <div className="list-header">
        <h1>Meus Torneios</h1>
        <Link to="/tournaments/new" className="btn btn-primary">
          <FiPlus size={20} />
          Criar Torneio
        </Link>
      </div>

      <div className="list-controls">
        <div className="search-box">
          <FiSearch size={20} />
          <input
            type="text"
            placeholder="Buscar torneios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <FiFilter size={16} />
            Todos
          </button>
          <button
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Ativos
          </button>
          <button
            className={`filter-btn ${filter === 'draft' ? 'active' : ''}`}
            onClick={() => setFilter('draft')}
          >
            Rascunhos
          </button>
          <button
            className={`filter-btn ${filter === 'finished' ? 'active' : ''}`}
            onClick={() => setFilter('finished')}
          >
            Finalizados
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Carregando torneios...</p>
        </div>
      ) : filteredTournaments.length > 0 ? (
        <div className="tournaments-table">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Data</th>
                <th>Categoria</th>
                <th>Status</th>
                <th>Jogadores</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTournaments.map((tournament) => (
                <tr key={tournament.id}>
                  <td className="name">{tournament.name}</td>
                  <td>{new Date(tournament.date).toLocaleDateString('pt-BR')}</td>
                  <td>{tournament.categories?.length || 0} categorias</td>
                  <td>
                    <span className={`badge badge-${tournament.status}`}>
                      {tournament.status === 'active' ? '🔴 Ativo' :
                       tournament.status === 'finished' ? '✅ Finalizado' :
                       '⏸️ Rascunho'}
                    </span>
                  </td>
                  <td>{tournament.player_count || 0}</td>
                  <td className="actions">
                    <Link
                      to={`/tournaments/${tournament.id}`}
                      className="action-link"
                    >
                      Ver
                    </Link>
                    {tournament.status === 'active' && (
                      <Link
                        to={`/tournaments/${tournament.id}/control`}
                        className="action-link primary"
                      >
                        Controle
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>Nenhum torneio encontrado</p>
          <Link to="/tournaments/new" className="btn btn-primary">
            Criar Torneio
          </Link>
        </div>
      )}
    </div>
  );
}

export default TournamentListPage;
