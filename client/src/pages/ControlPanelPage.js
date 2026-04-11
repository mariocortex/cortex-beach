import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiPlay, FiRefreshCw, FiEdit2, FiX } from 'react-icons/fi';
import './ControlPanelPage.css';
import { API_BASE } from '../config';

function ControlPanelPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'ranking' ? 'ranking' : 'matches';
  const [tournament, setTournament] = useState(null);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchData = async () => {
    try {
      const [tourRes, playersRes, matchesRes] = await Promise.all([
        fetch(`${API_BASE}/tournaments/${id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`${API_BASE}/tournaments/${id}/players`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`${API_BASE}/tournaments/${id}/matches`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (tourRes.ok) {
        const t = await tourRes.json();
        setTournament(t);
        if (t.categories?.length > 0 && !selectedCategory) {
          setSelectedCategory(t.categories[0].name);
        }
      }
      if (playersRes.ok) setPlayers(await playersRes.json());
      if (matchesRes.ok) {
        const m = await matchesRes.json();
        setMatches(m);
        calculateRankings(m);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRankings = (matchList) => {
    const stats = {};
    matchList.filter(m => m.status === 'completed').forEach(match => {
      const scoreA = match.score_a || 0;
      const scoreB = match.score_b || 0;

      (match.team_a_players || []).forEach(p => {
        if (!stats[p.id]) stats[p.id] = { id: p.id, name: p.name, category: match.category, points: 0, wins: 0, losses: 0, draws: 0, matches: 0 };
        stats[p.id].points += scoreA;
        stats[p.id].matches += 1;
        if (scoreA > scoreB) stats[p.id].wins += 1;
        else if (scoreA < scoreB) stats[p.id].losses += 1;
        else stats[p.id].draws += 1;
      });

      (match.team_b_players || []).forEach(p => {
        if (!stats[p.id]) stats[p.id] = { id: p.id, name: p.name, category: match.category, points: 0, wins: 0, losses: 0, draws: 0, matches: 0 };
        stats[p.id].points += scoreB;
        stats[p.id].matches += 1;
        if (scoreB > scoreA) stats[p.id].wins += 1;
        else if (scoreB < scoreA) stats[p.id].losses += 1;
        else stats[p.id].draws += 1;
      });
    });

    const sorted = Object.values(stats).sort((a, b) => b.points - a.points);
    setRankings(sorted);
  };

  const handleStartTournament = async () => {
    setGenerating(true);
    try {
      // First set status to active
      await fetch(`${API_BASE}/tournaments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: 'active' })
      });

      // Then generate all matches
      const res = await fetch(`${API_BASE}/tournaments/${id}/generate-all-matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erro ao gerar partidas');
      }

      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const regenerateMatches = async () => {
    if (!window.confirm('Isso vai apagar todas as partidas existentes e gerar novamente. Continuar?')) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${id}/generate-all-matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erro ao regenerar partidas');
      }
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const submitScore = async (matchId, scoreA, scoreB) => {
    try {
      const res = await fetch(`${API_BASE}/tournaments/${id}/matches/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          score_a: parseInt(scoreA),
          score_b: parseInt(scoreB),
          status: 'completed'
        })
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateMatchPlayers = async (matchId, teamAPlayers, teamBPlayers) => {
    try {
      const res = await fetch(`${API_BASE}/tournaments/${id}/matches/${matchId}/players`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ team_a_players: teamAPlayers, team_b_players: teamBPlayers })
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMatches = matches.filter(m => !selectedCategory || m.category === selectedCategory);
  const filteredRankings = rankings.filter(r => !selectedCategory || r.category === selectedCategory);
  const pendingMatches = filteredMatches.filter(m => m.status === 'pending');
  const completedMatches = filteredMatches.filter(m => m.status === 'completed');

  // Group matches by round
  const matchesByRound = {};
  filteredMatches.forEach(m => {
    const r = m.round || 1;
    if (!matchesByRound[r]) matchesByRound[r] = [];
    matchesByRound[r].push(m);
  });
  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

  // Get category players for swap dropdown
  const categoryPlayers = players.filter(p => !selectedCategory || p.category === selectedCategory);

  if (loading) {
    return <div className="loading"><div className="spinner"></div><p>Carregando...</p></div>;
  }

  return (
    <div className="control-panel">
      <div className="panel-header">
        <Link to={`/tournaments/${id}`} className="back-btn">
          <FiArrowLeft size={20} /> Voltar
        </Link>
        <h1>{tournament?.name}</h1>
        <span className={`badge badge-${tournament?.status}`}>
          {tournament?.status === 'active' ? '🔴 Ativo' : '⏸️ Rascunho'}
        </span>
      </div>

      {tournament?.status === 'draft' && (
        <div className="start-banner">
          <div>
            <p>O torneio ainda não foi iniciado. Ao iniciar, todas as partidas serão geradas automaticamente.</p>
            <small style={{ color: '#856404' }}>Quadras: {tournament?.num_courts || 2} | Certifique-se que todos os jogadores estão inscritos.</small>
          </div>
          <button className="btn btn-primary" onClick={handleStartTournament} disabled={generating}>
            {generating ? <><FiRefreshCw size={18} className="spin" /> Gerando...</> : <><FiPlay size={18} /> Iniciar Torneio</>}
          </button>
        </div>
      )}

      <div className="panel-controls">
        <div className="category-filter">
          <label>Categoria:</label>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            {tournament?.categories?.map((cat, idx) => (
              <option key={idx} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>

        {tournament?.status === 'active' && (
          <button className="btn btn-outline" onClick={regenerateMatches} disabled={generating}>
            <FiRefreshCw size={16} className={generating ? 'spin' : ''} />
            {generating ? 'Gerando...' : 'Regenerar Partidas'}
          </button>
        )}
      </div>

      <div className="panel-tabs">
        <button className={`tab ${tab === 'matches' ? 'active' : ''}`} onClick={() => setTab('matches')}>
          Partidas ({filteredMatches.length})
        </button>
        <button className={`tab ${tab === 'ranking' ? 'active' : ''}`} onClick={() => setTab('ranking')}>
          Classificação
        </button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          Histórico ({completedMatches.length})
        </button>
      </div>

      <div className="panel-content">
        {tab === 'matches' && (
          <div className="matches-section">
            {rounds.length > 0 ? (
              rounds.map(round => (
                <div key={round} className="round-group">
                  <div className="round-header">
                    <h3>Rodada {round}</h3>
                    <span className="round-status">
                      {matchesByRound[round].filter(m => m.status === 'completed').length}/{matchesByRound[round].length} concluídas
                    </span>
                  </div>
                  <div className="matches-grid">
                    {matchesByRound[round].map(match => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        onSubmit={submitScore}
                        onUpdatePlayers={updateMatchPlayers}
                        categoryPlayers={categoryPlayers}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-matches">
                <p>Nenhuma partida gerada{selectedCategory ? ` para ${selectedCategory}` : ''}.</p>
                {tournament?.status === 'draft' && (
                  <p>Inicie o torneio para gerar todas as partidas.</p>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'ranking' && (
          <div className="ranking-section">
            {filteredRankings.length > 0 ? (
              <table className="ranking-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Jogador</th>
                    <th>Pts</th>
                    <th>J</th>
                    <th>V</th>
                    <th>E</th>
                    <th>D</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRankings.map((r, idx) => (
                    <tr key={r.id} className={idx < 3 ? `top-${idx + 1}` : ''}>
                      <td className="position">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </td>
                      <td className="player-name">{r.name}</td>
                      <td className="points"><strong>{r.points}</strong></td>
                      <td>{r.matches}</td>
                      <td className="wins">{r.wins}</td>
                      <td>{r.draws}</td>
                      <td className="losses">{r.losses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-state">Nenhum resultado registrado ainda.</p>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="history-section">
            {completedMatches.length > 0 ? (
              <div className="history-list">
                {completedMatches.map(match => (
                  <div key={match.id} className="history-item">
                    <div className="history-round">R{match.round || 1}</div>
                    <div className="history-teams">
                      <span className={match.score_a > match.score_b ? 'winner' : ''}>
                        {(match.team_a_players || []).map(p => p.name).join(' & ')}
                      </span>
                      <span className="history-score">
                        <strong>{match.score_a}</strong> x <strong>{match.score_b}</strong>
                      </span>
                      <span className={match.score_b > match.score_a ? 'winner' : ''}>
                        {(match.team_b_players || []).map(p => p.name).join(' & ')}
                      </span>
                    </div>
                    {match.court && <span className="court-tag">Q{match.court}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">Nenhuma partida finalizada.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard({ match, onSubmit, onUpdatePlayers, categoryPlayers }) {
  const [scoreA, setScoreA] = useState(match.status === 'completed' ? String(match.score_a) : '');
  const [scoreB, setScoreB] = useState(match.status === 'completed' ? String(match.score_b) : '');
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingScore, setEditingScore] = useState(false);
  const [editTeamA, setEditTeamA] = useState([]);
  const [editTeamB, setEditTeamB] = useState([]);

  const isCompleted = match.status === 'completed' && !editingScore;

  const handleSubmit = () => {
    if (scoreA === '' || scoreB === '') return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onSubmit(match.id, scoreA, scoreB);
    setConfirming(false);
    setEditingScore(false);
  };

  const startEditing = () => {
    setEditTeamA((match.team_a_players || []).map(p => p.id));
    setEditTeamB((match.team_b_players || []).map(p => p.id));
    setEditing(true);
  };

  const saveEdit = () => {
    const teamA = editTeamA.map(pid => {
      const p = categoryPlayers.find(cp => cp.player_id === pid || cp.id === pid);
      return p ? { id: p.player_id || p.id, name: p.name || p.full_name } : null;
    }).filter(Boolean);

    const teamB = editTeamB.map(pid => {
      const p = categoryPlayers.find(cp => cp.player_id === pid || cp.id === pid);
      return p ? { id: p.player_id || p.id, name: p.name || p.full_name } : null;
    }).filter(Boolean);

    onUpdatePlayers(match.id, teamA, teamB);
    setEditing(false);
  };

  const teamANames = (match.team_a_players || []).map(p => p.name).join(' & ');
  const teamBNames = (match.team_b_players || []).map(p => p.name).join(' & ');

  return (
    <div className={`match-card ${isCompleted ? 'match-completed' : ''}`}>
      <div className="match-card-header">
        <div className="match-round-tag">
          Rodada {match.round || 1}{match.court ? ` | Quadra ${match.court}` : ''}
        </div>
        {!isCompleted && !editing && (
          <button className="btn-edit-match" onClick={startEditing} title="Editar jogadores">
            <FiEdit2 size={14} />
          </button>
        )}
        {match.status === 'completed' && !editingScore && (
          <button className="match-done-badge" onClick={() => setEditingScore(true)} title="Clique para editar resultado">
            Finalizada
          </button>
        )}
        {editingScore && (
          <button className="btn-edit-match" onClick={() => { setEditingScore(false); setScoreA(String(match.score_a)); setScoreB(String(match.score_b)); setConfirming(false); }} title="Cancelar edição">
            <FiX size={14} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="match-edit-players">
          <div className="edit-team">
            <label>Dupla A:</label>
            {[0, 1].map(idx => (
              <select
                key={idx}
                value={editTeamA[idx] || ''}
                onChange={(e) => {
                  const newTeam = [...editTeamA];
                  newTeam[idx] = e.target.value;
                  setEditTeamA(newTeam);
                }}
              >
                <option value="">Selecione...</option>
                {categoryPlayers.map(p => (
                  <option key={p.player_id || p.id} value={p.player_id || p.id}>
                    {p.name || p.full_name}
                  </option>
                ))}
              </select>
            ))}
          </div>
          <div className="edit-team">
            <label>Dupla B:</label>
            {[0, 1].map(idx => (
              <select
                key={idx}
                value={editTeamB[idx] || ''}
                onChange={(e) => {
                  const newTeam = [...editTeamB];
                  newTeam[idx] = e.target.value;
                  setEditTeamB(newTeam);
                }}
              >
                <option value="">Selecione...</option>
                {categoryPlayers.map(p => (
                  <option key={p.player_id || p.id} value={p.player_id || p.id}>
                    {p.name || p.full_name}
                  </option>
                ))}
              </select>
            ))}
          </div>
          <div className="edit-actions">
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>
              <FiX size={14} /> Cancelar
            </button>
            <button className="btn btn-primary btn-sm" onClick={saveEdit}>
              <FiCheck size={14} /> Salvar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="match-versus">
            <div className="match-team">
              <span className="team-names">{teamANames || 'Dupla A'}</span>
              <input
                type="number"
                className="score-field"
                placeholder="0"
                value={scoreA}
                onChange={(e) => { setScoreA(e.target.value); setConfirming(false); }}
                min="0"
                max="99"
                disabled={isCompleted}
              />
            </div>

            <span className="match-x">X</span>

            <div className="match-team">
              <span className="team-names">{teamBNames || 'Dupla B'}</span>
              <input
                type="number"
                className="score-field"
                placeholder="0"
                value={scoreB}
                onChange={(e) => { setScoreB(e.target.value); setConfirming(false); }}
                min="0"
                max="99"
                disabled={isCompleted}
              />
            </div>
          </div>

          {!isCompleted && (
            confirming ? (
              <div className="match-confirm">
                <p>{teamANames} <strong>{scoreA} x {scoreB}</strong> {teamBNames}</p>
                <div className="confirm-btns">
                  <button className="btn btn-outline btn-sm" onClick={() => setConfirming(false)}>Cancelar</button>
                  <button className="btn btn-primary btn-sm" onClick={handleSubmit}>
                    <FiCheck size={14} /> Confirmar
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-primary btn-block"
                onClick={handleSubmit}
                disabled={scoreA === '' || scoreB === ''}
              >
                Registrar Resultado
              </button>
            )
          )}
        </>
      )}
    </div>
  );
}

export default ControlPanelPage;
