import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiUsers, FiPlay, FiUserPlus, FiCopy, FiX, FiTrash2, FiStar, FiPlus, FiEdit2 } from 'react-icons/fi';
import './TournamentDetailPage.css';

function TournamentDetailPage() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerForm, setPlayerForm] = useState({
    name: '', email: '', phone: '', level: 'intermediario', category: '', birth_date: ''
  });
  const [sponsors, setSponsors] = useState([]);
  const [showAddSponsor, setShowAddSponsor] = useState(false);
  const [editingSponsorId, setEditingSponsorId] = useState(null);
  const [sponsorSearchResults, setSponsorSearchResults] = useState([]);
  const [sponsorSearchTimeout, setSponsorSearchTimeout] = useState(null);
  const [sponsorForm, setSponsorForm] = useState({
    name: '', type: 'money', value: 0, description: '', media_url: '', media_type: 'image', display_time: 10, slide_time: 5, media_urls: []
  });

  useEffect(() => {
    fetchTournament();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchTournament = async () => {
    try {
      setLoading(true);
      const [tourRes, playersRes, sponsorsRes] = await Promise.all([
        fetch(`http://localhost:5001/api/tournaments/${id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`http://localhost:5001/api/tournaments/${id}/players`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`http://localhost:5001/api/tournaments/${id}/sponsors`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (tourRes.ok) {
        setTournament(await tourRes.json());
      }

      if (playersRes.ok) {
        setPlayers(await playersRes.json());
      }

      if (sponsorsRes.ok) {
        setSponsors(await sponsorsRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5001/api/tournaments/${id}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(playerForm)
      });

      if (response.ok) {
        const newPlayer = await response.json();
        setPlayers([...players, newPlayer]);
        setPlayerForm({ name: '', email: '', phone: '', level: 'intermediario', category: '', birth_date: '' });
        setSelectedPlayer(null);
        setShowAddPlayer(false);
      }
    } catch (error) {
      console.error('Failed to add player:', error);
    }
  };

  const handleRemovePlayer = async (playerId) => {
    if (!window.confirm('Remover este jogador?')) return;
    try {
      const response = await fetch(`http://localhost:5001/api/tournaments/${id}/players/${playerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        setPlayers(players.filter(p => p.id !== playerId));
      }
    } catch (error) {
      console.error('Failed to remove player:', error);
    }
  };

  const searchPlayers = async (query) => {
    if (query.length < 2) { setSearchResults([]); return; }
    try {
      const res = await fetch(`http://localhost:5001/api/players/search?q=${encodeURIComponent(query)}`);
      if (res.ok) setSearchResults(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleNameChange = (value) => {
    setPlayerForm({ ...playerForm, name: value });
    setSelectedPlayer(null);
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(setTimeout(() => searchPlayers(value), 300));
  };

  const selectExistingPlayer = (player) => {
    setSelectedPlayer(player);
    setPlayerForm({
      ...playerForm,
      name: player.name,
      email: player.email || '',
      phone: player.phone || '',
      birth_date: player.birth_date || ''
    });
    setSearchResults([]);
  };

  const copyRegistrationLink = () => {
    const link = `${window.location.origin}/register/${id}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="not-found">
        <p>Torneio não encontrado</p>
        <Link to="/tournaments" className="btn btn-primary">Voltar</Link>
      </div>
    );
  }

  return (
    <div className="tournament-detail">
      <div className="detail-header">
        <Link to="/tournaments" className="back-btn">
          <FiArrowLeft size={20} />
          Voltar
        </Link>
        <h1>{tournament.name}</h1>
        <span className={`badge badge-${tournament.status}`}>
          {tournament.status === 'active' ? '🔴 Ativo' : '⏸️ Rascunho'}
        </span>
      </div>

      <div className="detail-info">
        <div className="info-card">
          <span className="info-label">📅 Data</span>
          <span className="info-value">
            {tournament.start_date ? new Date(tournament.start_date).toLocaleDateString('pt-BR') : 'Data inválida'}
          </span>
        </div>
        <div className="info-card">
          <span className="info-label">👥 Jogadores</span>
          <span className="info-value">{players.length}</span>
        </div>
        <div className="info-card">
          <span className="info-label">📂 Categorias</span>
          <span className="info-value">{tournament.categories?.length || 0}</span>
        </div>
      </div>

      <div className="detail-tabs">
        <button
          className={`tab ${tab === 'overview' ? 'active' : ''}`}
          onClick={() => setTab('overview')}
        >
          Visão Geral
        </button>
        <button
          className={`tab ${tab === 'players' ? 'active' : ''}`}
          onClick={() => setTab('players')}
        >
          <FiUsers size={16} />
          Jogadores ({players.length})
        </button>
        <button
          className={`tab ${tab === 'financial' ? 'active' : ''}`}
          onClick={() => setTab('financial')}
        >
          Financeiro
        </button>
        <button
          className={`tab ${tab === 'sponsors' ? 'active' : ''}`}
          onClick={() => setTab('sponsors')}
        >
          <FiStar size={16} />
          Patrocinadores ({sponsors.length})
        </button>
        <button
          className={`tab ${tab === 'matches' ? 'active' : ''}`}
          onClick={() => setTab('matches')}
        >
          Partidas
        </button>
      </div>

      <div className="detail-content">
        {tab === 'overview' && (
          <div className="overview-section">
            <h2>Descrição</h2>
            <p>{tournament.description && tournament.description.trim() ? tournament.description : 'Sem descrição'}</p>

            <h2>Sistema de Pontuação</h2>
            <div className="scoring-info">
              <div>
                {tournament.type === 'super_oito' && (
                  <>
                    <p style={{ fontSize: '1rem', fontWeight: 600, color: '#0066CC' }}>
                      🏐 Super Oito - Sistema de Games
                    </p>
                    <p style={{ fontSize: '0.95rem', color: '#666', marginTop: '10px' }}>
                      <strong>Total de pontos por jogo:</strong> {tournament.scoring_rules?.total_points || 6}
                    </p>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>
                      Cada game ganho = 1 ponto
                    </p>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px', fontStyle: 'italic' }}>
                      Exemplo: Resultado 4x2 → 4 pontos para um lado, 2 para o outro
                    </p>
                  </>
                )}
                {tournament.type === 'round_robin' && (
                  <>
                    <p style={{ fontSize: '1rem', fontWeight: 600, color: '#0066CC' }}>
                      🔄 Round Robin - Todos vs Todos
                    </p>
                    <p style={{ fontSize: '0.95rem', color: '#666', marginTop: '10px' }}>
                      <strong>Sistema:</strong> Cada time enfrenta todos os outros uma vez
                    </p>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>
                      Vitória = 3 pontos | Empate = 1 ponto | Derrota = 0 pontos
                    </p>
                  </>
                )}
                {tournament.type === 'eliminatorio' && (
                  <>
                    <p style={{ fontSize: '1rem', fontWeight: 600, color: '#0066CC' }}>
                      🏆 Eliminatório - Mata-Mata
                    </p>
                    <p style={{ fontSize: '0.95rem', color: '#666', marginTop: '10px' }}>
                      <strong>Sistema:</strong> Eliminação direta por fase
                    </p>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>
                      Quem perde é eliminado | Quem vence avança para próxima fase
                    </p>
                  </>
                )}
              </div>
            </div>

            {tournament.status === 'draft' && (
              <div className="actions">
                <Link to={`/tournaments/${id}/edit`} className="btn btn-outline">
                  ✏️ Editar Torneio
                </Link>
                <Link to={`/tournaments/${id}/control`} className="btn btn-primary">
                  <FiPlay size={20} />
                  Iniciar Torneio
                </Link>
              </div>
            )}

            {tournament.status === 'active' && (
              <div className="actions">
                <Link to={`/tournaments/${id}/control`} className="btn btn-secondary">
                  <FiPlay size={20} />
                  Painel de Controle
                </Link>
                <a href={`/display/${id}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                  Ver Painel Público
                </a>
              </div>
            )}
          </div>
        )}

        {tab === 'players' && (
          <div className="players-section">
            <div className="players-actions">
              <button className="btn btn-primary" onClick={() => setShowAddPlayer(true)}>
                <FiUserPlus size={18} />
                Inscrever Jogador
              </button>
              <button className="btn btn-outline" onClick={copyRegistrationLink}>
                <FiCopy size={18} />
                {linkCopied ? 'Link Copiado!' : 'Copiar Link de Inscrição'}
              </button>
            </div>

            {showAddPlayer && (
              <div className="add-player-form">
                <div className="form-header">
                  <h3>Inscrever Jogador</h3>
                  <button className="btn-close" onClick={() => setShowAddPlayer(false)}>
                    <FiX size={20} />
                  </button>
                </div>
                <form onSubmit={handleAddPlayer}>
                  {selectedPlayer && (
                    <div className="selected-player-badge">
                      Jogador existente: <strong>{selectedPlayer.name}</strong>
                      <button type="button" onClick={() => {
                        setSelectedPlayer(null);
                        setPlayerForm({ name: '', email: '', phone: '', level: 'intermediario', category: '', birth_date: '' });
                      }}>Limpar</button>
                    </div>
                  )}
                  <div className="form-row">
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label>Nome *</label>
                      <input
                        type="text"
                        value={playerForm.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Digite o nome para buscar..."
                        required
                        autoComplete="off"
                      />
                      {searchResults.length > 0 && (
                        <div className="search-dropdown">
                          {searchResults.map(p => (
                            <div key={p.id} className="search-item" onClick={() => selectExistingPlayer(p)}>
                              <strong>{p.name}</strong>
                              <span>{p.email || p.phone || ''}</span>
                            </div>
                          ))}
                          <div className="search-item search-new" onClick={() => setSearchResults([])}>
                            + Cadastrar novo jogador
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Nível *</label>
                      <select
                        value={playerForm.level}
                        onChange={(e) => setPlayerForm({ ...playerForm, level: e.target.value })}
                      >
                        <option value="iniciante">Iniciante</option>
                        <option value="intermediario">Intermediário</option>
                        <option value="avancado">Avançado</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={playerForm.email}
                        onChange={(e) => setPlayerForm({ ...playerForm, email: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Telefone</label>
                      <input
                        type="tel"
                        value={playerForm.phone}
                        onChange={(e) => setPlayerForm({ ...playerForm, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Data de Nascimento *</label>
                      <input
                        type="date"
                        value={playerForm.birth_date}
                        onChange={(e) => setPlayerForm({ ...playerForm, birth_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Categoria *</label>
                      <select
                        value={playerForm.category}
                        onChange={(e) => setPlayerForm({ ...playerForm, category: e.target.value })}
                        required
                      >
                        <option value="">Selecione...</option>
                        {tournament.categories?.map((cat, idx) => (
                          <option key={idx} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-outline" onClick={() => setShowAddPlayer(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Inscrever
                    </button>
                  </div>
                </form>
              </div>
            )}

            {players.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Idade</th>
                    <th>Nível</th>
                    <th>Categoria</th>
                    <th>Contato</th>
                    <th>Pagamento</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {players.map(player => {
                    const age = player.birth_date
                      ? Math.floor((new Date() - new Date(player.birth_date)) / (365.25 * 24 * 60 * 60 * 1000))
                      : '-';
                    return (
                      <tr key={player.id}>
                        <td>{player.name}</td>
                        <td>{age !== '-' ? `${age} anos` : '-'}</td>
                        <td>{player.level}</td>
                        <td>{player.category}</td>
                        <td>{player.email || player.phone}</td>
                        <td>
                          <span className={`badge badge-${player.payment_status}`}>
                            {player.payment_status === 'paid' ? '✅ Pago' : '⏳ Pendente'}
                          </span>
                        </td>
                        <td>
                          <button className="btn-icon" onClick={() => handleRemovePlayer(player.id)} title="Remover">
                            <FiTrash2 size={16} color="#EF4444" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              !showAddPlayer && <p className="empty-state">Nenhum jogador inscrito. Clique em "Inscrever Jogador" ou compartilhe o link de inscrição.</p>
            )}
          </div>
        )}

        {tab === 'financial' && (() => {
          const pricing = tournament.pricing || { first_registration: 0, additional_registration: 0 };
          const playerCategories = {};
          players.forEach(p => {
            playerCategories[p.name] = (playerCategories[p.name] || 0) + 1;
          });
          let inscriptionExpected = 0;
          Object.values(playerCategories).forEach(count => {
            inscriptionExpected += pricing.first_registration;
            if (count > 1) inscriptionExpected += (count - 1) * pricing.additional_registration;
          });
          const inscriptionReceived = players.filter(p => p.payment_status === 'paid').reduce((sum) => sum + (pricing.first_registration || 0), 0);
          const inscriptionPending = inscriptionExpected - inscriptionReceived;

          const moneySponsors = sponsors.filter(s => s.type !== 'barter');
          const sponsorExpected = moneySponsors.reduce((sum, s) => sum + (s.value || 0), 0);
          const sponsorReceived = moneySponsors.filter(s => s.payment_status === 'paid').reduce((sum, s) => sum + (s.value || 0), 0);
          const sponsorPending = sponsorExpected - sponsorReceived;

          const totalExpected = inscriptionExpected + sponsorExpected;
          const totalReceived = inscriptionReceived + sponsorReceived;
          const totalPending = inscriptionPending + sponsorPending;

          return (
          <div className="financial-section">
            <div className="financial-summary">
              <div className="fin-card">
                <span className="fin-label">Receita Total Esperada</span>
                <span className="fin-value">R$ {totalExpected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="fin-card fin-card-green">
                <span className="fin-label">Total Recebido</span>
                <span className="fin-value">R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="fin-card fin-card-red">
                <span className="fin-label">Total Pendente</span>
                <span className="fin-value">R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="fin-breakdown">
              <div className="fin-breakdown-item">
                <span>Inscrições ({players.length})</span>
                <span>R$ {inscriptionReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {inscriptionExpected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="fin-breakdown-item">
                <span>Patrocínios ({moneySponsors.length})</span>
                <span>R$ {sponsorReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {sponsorExpected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <h3 style={{ marginTop: '25px', marginBottom: '15px' }}>Inscrições</h3>
            {players.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Jogador</th>
                    <th>Categoria</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map(player => (
                      <tr key={player.id}>
                        <td>{player.name}</td>
                        <td>{player.category}</td>
                        <td>R$ {(pricing.first_registration || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td>
                          <span className={`badge badge-${player.payment_status}`}>
                            {player.payment_status === 'paid' ? '✅ Pago' : '⏳ Pendente'}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`btn btn-sm ${player.payment_status === 'paid' ? 'btn-outline' : 'btn-primary'}`}
                            onClick={async () => {
                              const newStatus = player.payment_status === 'paid' ? 'pending' : 'paid';
                              try {
                                const res = await fetch(`http://localhost:5001/api/tournaments/${id}/players/${player.id}`, {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                  },
                                  body: JSON.stringify({ payment_status: newStatus })
                                });
                                if (res.ok) {
                                  setPlayers(players.map(p => p.id === player.id ? { ...p, payment_status: newStatus } : p));
                                }
                              } catch (err) {
                                console.error('Failed to update payment:', err);
                              }
                            }}
                          >
                            {player.payment_status === 'paid' ? 'Desfazer' : 'Marcar Pago'}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-state">Nenhum jogador inscrito.</p>
            )}

            {moneySponsors.length > 0 && (
              <>
                <h3 style={{ marginTop: '25px', marginBottom: '15px' }}>Patrocínios</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Patrocinador</th>
                      <th>Tipo</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moneySponsors.map(s => (
                      <tr key={s.id}>
                        <td>{s.name}</td>
                        <td>{s.type === 'money' ? 'Dinheiro' : 'Misto'}</td>
                        <td>R$ {(s.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td>
                          <span className={`badge badge-${s.payment_status || 'pending'}`}>
                            {s.payment_status === 'paid' ? '✅ Pago' : '⏳ Pendente'}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`btn btn-sm ${s.payment_status === 'paid' ? 'btn-outline' : 'btn-primary'}`}
                            onClick={async () => {
                              const newStatus = s.payment_status === 'paid' ? 'pending' : 'paid';
                              try {
                                const res = await fetch(`http://localhost:5001/api/tournaments/${id}/sponsors/${s.id}`, {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                  },
                                  body: JSON.stringify({ payment_status: newStatus })
                                });
                                if (res.ok) {
                                  setSponsors(sponsors.map(sp => sp.id === s.id ? { ...sp, payment_status: newStatus } : sp));
                                }
                              } catch (err) { console.error(err); }
                            }}
                          >
                            {s.payment_status === 'paid' ? 'Desfazer' : 'Marcar Pago'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
          );
        })()}

        {tab === 'sponsors' && (
          <div className="sponsors-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Patrocinadores</h2>
              <button className="btn btn-primary btn-sm" onClick={() => {
                setShowAddSponsor(!showAddSponsor);
                setEditingSponsorId(null);
                setSponsorForm({ name: '', type: 'money', value: 0, description: '', media_url: '', media_type: 'image', display_time: 10, slide_time: 5, media_urls: [] });
                setSponsorSearchResults([]);
              }}>
                <FiPlus size={16} /> Adicionar Patrocinador
              </button>
            </div>

            {(showAddSponsor || editingSponsorId) && (
              <form className="sponsor-form" onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (editingSponsorId) {
                    // Update existing
                    const res = await fetch(`http://localhost:5001/api/tournaments/${id}/sponsors/${editingSponsorId}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                      },
                      body: JSON.stringify(sponsorForm)
                    });
                    if (res.ok) {
                      const updated = await res.json();
                      setSponsors(sponsors.map(sp => sp.id === editingSponsorId ? updated : sp));
                      setEditingSponsorId(null);
                    }
                  } else {
                    // Create new
                    const res = await fetch(`http://localhost:5001/api/tournaments/${id}/sponsors`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                      },
                      body: JSON.stringify(sponsorForm)
                    });
                    if (res.ok) {
                      const s = await res.json();
                      setSponsors([...sponsors, s]);
                      setShowAddSponsor(false);
                    }
                  }
                  setSponsorForm({ name: '', type: 'money', value: 0, description: '', media_url: '', media_type: 'image', display_time: 10, slide_time: 5, media_urls: [] });
                  setSponsorSearchResults([]);
                } catch (err) { console.error(err); }
              }}>
                <h3 style={{ margin: '0 0 12px' }}>{editingSponsorId ? 'Editar Patrocinador' : 'Novo Patrocinador'}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label>Nome do Patrocinador *</label>
                    <input
                      type="text"
                      value={sponsorForm.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSponsorForm({ ...sponsorForm, name: val });
                        if (!editingSponsorId) {
                          if (sponsorSearchTimeout) clearTimeout(sponsorSearchTimeout);
                          setSponsorSearchTimeout(setTimeout(async () => {
                            if (val.length < 2) { setSponsorSearchResults([]); return; }
                            try {
                              const res = await fetch(`http://localhost:5001/api/sponsors/search?q=${encodeURIComponent(val)}`);
                              if (res.ok) setSponsorSearchResults(await res.json());
                            } catch (err) { console.error(err); }
                          }, 300));
                        }
                      }}
                      placeholder="Ex: Beach Store"
                      required
                      autoComplete="off"
                    />
                    {sponsorSearchResults.length > 0 && !editingSponsorId && (
                      <div className="reg-search-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10 }}>
                        {sponsorSearchResults.map(sr => (
                          <div key={sr.id} className="reg-search-item" onClick={() => {
                            setSponsorForm({
                              name: sr.name,
                              type: sr.type || 'money',
                              value: sr.value || 0,
                              description: sr.description || '',
                              media_url: sr.media_url || '',
                              media_type: sr.media_type || 'image',
                              display_time: sr.display_time || 10,
                              slide_time: sr.slide_time || 5,
                              media_urls: sr.media_urls || []
                            });
                            setSponsorSearchResults([]);
                          }}>
                            <strong>{sr.name}</strong>
                            <span>{sr.type === 'money' ? 'Dinheiro' : sr.type === 'barter' ? 'Permuta' : 'Misto'}</span>
                          </div>
                        ))}
                        <div className="reg-search-item reg-search-new" onClick={() => setSponsorSearchResults([])}>
                          + Novo patrocinador
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Tipo</label>
                    <select
                      value={sponsorForm.type}
                      onChange={(e) => setSponsorForm({ ...sponsorForm, type: e.target.value })}
                    >
                      <option value="money">Dinheiro</option>
                      <option value="barter">Permuta</option>
                      <option value="mixed">Misto</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Valor (R$)</label>
                    <input
                      type="number"
                      value={sponsorForm.value || ''}
                      onChange={(e) => setSponsorForm({ ...sponsorForm, value: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Mídias ({sponsorForm.media_urls.length} {sponsorForm.media_urls.length === 1 ? 'item' : 'itens'})</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                    <input
                      type="text"
                      id="sponsor-media-url-input"
                      placeholder="Cole URL de imagem, vídeo ou YouTube"
                      style={{ flex: 1 }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const url = e.target.value.trim();
                          if (!url) return;
                          const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
                          const isVideo = videoExts.some(ext => url.toLowerCase().split('?')[0].endsWith(ext));
                          const isYoutube = /youtube\.com|youtu\.be/.test(url);
                          const type = isVideo || isYoutube ? 'video' : 'image';
                          setSponsorForm(prev => ({ ...prev, media_urls: [...prev.media_urls, { url, type }] }));
                          e.target.value = '';
                        }
                      }}
                    />
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => {
                      const input = document.getElementById('sponsor-media-url-input');
                      const url = input.value.trim();
                      if (!url) return;
                      const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
                      const isVideo = videoExts.some(ext => url.toLowerCase().split('?')[0].endsWith(ext));
                      const isYoutube = /youtube\.com|youtu\.be/.test(url);
                      const type = isVideo || isYoutube ? 'video' : 'image';
                      setSponsorForm(prev => ({ ...prev, media_urls: [...prev.media_urls, { url, type }] }));
                      input.value = '';
                    }}>+ Adicionar</button>
                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, whiteSpace: 'nowrap' }}>
                      📁 Upload
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm,video/quicktime"
                        multiple
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const files = Array.from(e.target.files);
                          if (!files.length) return;
                          for (const file of files) {
                            const formData = new FormData();
                            formData.append('file', file);
                            try {
                              const res = await fetch('http://localhost:5001/api/upload', { method: 'POST', body: formData });
                              if (res.ok) {
                                const data = await res.json();
                                setSponsorForm(prev => ({ ...prev, media_urls: [...prev.media_urls, { url: data.media_url, type: data.media_type }] }));
                              }
                            } catch (err) { console.error(err); }
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                  {sponsorForm.media_urls.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {sponsorForm.media_urls.map((m, idx) => (
                        <div key={idx} style={{ position: 'relative', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '6px', width: '120px' }}>
                          {(() => {
                            const ytMatch = m.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
                            if (ytMatch) return <div style={{ width: '108px', height: '70px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', color: '#f00', fontSize: '2rem' }}>▶</div>;
                            if (m.type === 'video') return <video src={m.url} style={{ width: '108px', height: '70px', objectFit: 'cover', borderRadius: '4px' }} />;
                            return <img src={m.url} alt="" style={{ width: '108px', height: '70px', objectFit: 'cover', borderRadius: '4px' }} onError={(e) => { e.target.style.background = '#eee'; }} />;
                          })()}
                          <button
                            type="button"
                            onClick={() => setSponsorForm(prev => ({ ...prev, media_urls: prev.media_urls.filter((_, i) => i !== idx) }))}
                            style={{ position: 'absolute', top: '2px', right: '2px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', lineHeight: '20px', padding: 0 }}
                          >✕</button>
                          <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#999', marginTop: '2px' }}>{idx + 1}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Tempo Total (segundos)</label>
                    <input
                      type="number"
                      value={sponsorForm.display_time}
                      onChange={(e) => setSponsorForm({ ...sponsorForm, display_time: parseInt(e.target.value) || 10 })}
                      min="3"
                      max="300"
                    />
                  </div>
                  <div className="form-group">
                    <label>Tempo por Slide (segundos)</label>
                    <input
                      type="number"
                      value={sponsorForm.slide_time}
                      onChange={(e) => setSponsorForm({ ...sponsorForm, slide_time: parseInt(e.target.value) || 5 })}
                      min="2"
                      max="60"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Descrição / Observações</label>
                  <input
                    type="text"
                    value={sponsorForm.description}
                    onChange={(e) => setSponsorForm({ ...sponsorForm, description: e.target.value })}
                    placeholder="Detalhes sobre o patrocínio..."
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button type="submit" className="btn btn-primary btn-sm">
                    {editingSponsorId ? 'Salvar Alterações' : 'Adicionar'}
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => {
                    setShowAddSponsor(false);
                    setEditingSponsorId(null);
                    setSponsorForm({ name: '', type: 'money', value: 0, description: '', media_url: '', media_type: 'image', display_time: 10, slide_time: 5, media_urls: [] });
                    setSponsorSearchResults([]);
                  }}>Cancelar</button>
                </div>
              </form>
            )}

            {sponsors.length > 0 ? (
              <div className="sponsors-list">
                {sponsors.map(s => (
                  <div key={s.id} className={`sponsor-card ${!s.is_active ? 'sponsor-inactive' : ''}`}>
                    {((s.media_urls && s.media_urls.length > 0) || s.media_url) && (
                      <div className="sponsor-media-preview">
                        {(() => {
                          const items = (s.media_urls && s.media_urls.length > 0) ? s.media_urls : (s.media_url ? [{ url: s.media_url, type: s.media_type }] : []);
                          return (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              {items.slice(0, 3).map((m, i) => (
                                <img key={i} src={m.url} alt="" style={{ width: '35px', height: '35px', objectFit: 'cover', borderRadius: '4px' }} onError={(e) => { e.target.style.background = '#ddd'; }} />
                              ))}
                              {items.length > 3 && <span style={{ fontSize: '0.75rem', color: '#999' }}>+{items.length - 3}</span>}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    <div className="sponsor-info">
                      <div className="sponsor-name-row">
                        <strong>{s.name}</strong>
                        <span className={`sponsor-type-badge ${s.type}`}>
                          {s.type === 'money' ? 'Dinheiro' : s.type === 'barter' ? 'Permuta' : 'Misto'}
                        </span>
                        {s.type !== 'barter' && (
                          <span className={`badge badge-${s.payment_status || 'pending'}`}>
                            {s.payment_status === 'paid' ? '✅ Pago' : '⏳ Pendente'}
                          </span>
                        )}
                        {!s.is_active && <span className="badge" style={{ background: '#f3f4f6', color: '#666' }}>Inativo</span>}
                      </div>
                      {s.value > 0 && <p className="sponsor-value">R$ {s.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>}
                      <p className="sponsor-desc">{s.display_time || 10}s total • {s.slide_time || 5}s/slide • {(s.media_urls?.length || (s.media_url ? 1 : 0))} mídia(s){s.description ? ` • ${s.description}` : ''}</p>
                    </div>
                    <div className="sponsor-actions">
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                          setEditingSponsorId(s.id);
                          setShowAddSponsor(false);
                          setSponsorForm({
                            name: s.name,
                            type: s.type || 'money',
                            value: s.value || 0,
                            description: s.description || '',
                            media_url: s.media_url || '',
                            media_type: s.media_type || 'image',
                            display_time: s.display_time || 10,
                            slide_time: s.slide_time || 5,
                            media_urls: s.media_urls || []
                          });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <FiEdit2 size={14} /> Editar
                      </button>
                      {s.type !== 'barter' && (
                        <button
                          className={`btn btn-sm ${s.payment_status === 'paid' ? 'btn-outline' : 'btn-primary'}`}
                          onClick={async () => {
                            const newStatus = s.payment_status === 'paid' ? 'pending' : 'paid';
                            try {
                              const res = await fetch(`http://localhost:5001/api/tournaments/${id}/sponsors/${s.id}`, {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                                },
                                body: JSON.stringify({ payment_status: newStatus })
                              });
                              if (res.ok) {
                                setSponsors(sponsors.map(sp => sp.id === s.id ? { ...sp, payment_status: newStatus } : sp));
                              }
                            } catch (err) { console.error(err); }
                          }}
                        >
                          {s.payment_status === 'paid' ? 'Desfazer' : 'Pago'}
                        </button>
                      )}
                      <button
                        className={`btn btn-sm ${s.is_active ? 'btn-outline' : 'btn-primary'}`}
                        onClick={async () => {
                          try {
                            const res = await fetch(`http://localhost:5001/api/tournaments/${id}/sponsors/${s.id}`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                              },
                              body: JSON.stringify({ is_active: !s.is_active })
                            });
                            if (res.ok) {
                              setSponsors(sponsors.map(sp => sp.id === s.id ? { ...sp, is_active: !sp.is_active } : sp));
                            }
                          } catch (err) { console.error(err); }
                        }}
                      >
                        {s.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={async () => {
                          if (!window.confirm('Remover este patrocinador?')) return;
                          try {
                            const res = await fetch(`http://localhost:5001/api/tournaments/${id}/sponsors/${s.id}`, {
                              method: 'DELETE',
                              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                            });
                            if (res.ok) {
                              setSponsors(sponsors.filter(sp => sp.id !== s.id));
                            }
                          } catch (err) { console.error(err); }
                        }}
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="sponsors-summary">
                  <div className="fin-card">
                    <span className="fin-label">Total Patrocínios</span>
                    <span className="fin-value">{sponsors.length}</span>
                  </div>
                  <div className="fin-card fin-card-green">
                    <span className="fin-label">Valor Total</span>
                    <span className="fin-value">
                      R$ {sponsors.reduce((sum, s) => sum + (s.value || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              !showAddSponsor && <p className="empty-state">Nenhum patrocinador cadastrado.</p>
            )}
          </div>
        )}

        {tab === 'matches' && (
          <div className="matches-section">
            <p>Use o <Link to={`/tournaments/${id}/control`}>Painel de Controle</Link> para gerenciar partidas.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TournamentDetailPage;
