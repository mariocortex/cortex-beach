import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiUser } from 'react-icons/fi';
import './PlayersPage.css';
import { API_BASE } from '../config';

function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const res = await fetch(`${API_BASE}/players`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setPlayers(await res.json());
    } catch (err) {
      console.error('Failed to fetch players:', err);
    } finally {
      setLoading(false);
    }
  };

  const calcAge = (birthDate) => {
    if (!birthDate) return '-';
    return Math.floor((new Date() - new Date(birthDate)) / (365.25 * 24 * 60 * 60 * 1000));
  };

  const filtered = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.email && p.email.toLowerCase().includes(search.toLowerCase())) ||
    (p.phone && p.phone.includes(search))
  );

  if (loading) {
    return <div className="loading"><div className="spinner"></div><p>Carregando...</p></div>;
  }

  return (
    <div className="players-page">
      <div className="players-page-header">
        <h1>Jogadores Cadastrados</h1>
        <span className="player-count">{players.length} jogadores</span>
      </div>

      <div className="players-search">
        <FiSearch size={18} />
        <input
          type="text"
          placeholder="Buscar por nome, email ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length > 0 ? (
        <div className="players-table-wrapper">
          <table className="players-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Idade</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Torneios</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(player => (
                <tr key={player.id}>
                  <td className="player-name-cell">
                    <div className="player-avatar">
                      <FiUser size={16} />
                    </div>
                    {player.name}
                  </td>
                  <td>{calcAge(player.birth_date) !== '-' ? `${calcAge(player.birth_date)} anos` : '-'}</td>
                  <td>{player.email || '-'}</td>
                  <td>{player.phone || '-'}</td>
                  <td>{player.tournaments_count || 0}</td>
                  <td>
                    <Link to={`/players/${player.id}`} className="btn btn-sm btn-outline">
                      Ver Perfil
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>{search ? 'Nenhum jogador encontrado.' : 'Nenhum jogador cadastrado.'}</p>
        </div>
      )}
    </div>
  );
}

export default PlayersPage;
