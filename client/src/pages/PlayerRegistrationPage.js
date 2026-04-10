import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './PlayerRegistrationPage.css';
import { API_BASE } from '../config';

function PlayerRegistrationPage() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', level: 'intermediario', category: '', birth_date: ''
  });

  useEffect(() => {
    fetchTournament();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchTournament = async () => {
    try {
      const res = await fetch(`${API_BASE}/tournaments/${id}`);
      if (res.ok) {
        setTournament(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch tournament:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchPlayers = async (query) => {
    if (query.length < 2) { setSearchResults([]); return; }
    try {
      const res = await fetch(`${API_BASE}/players/search?q=${encodeURIComponent(query)}`);
      if (res.ok) setSearchResults(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleNameChange = (value) => {
    setForm({ ...form, name: value });
    setSelectedPlayer(null);
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(setTimeout(() => searchPlayers(value), 300));
  };

  const selectExistingPlayer = (player) => {
    setSelectedPlayer(player);
    setForm({
      ...form,
      name: player.name,
      email: player.email || '',
      phone: player.phone || '',
      birth_date: player.birth_date || ''
    });
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.category) {
      setError('Preencha nome e categoria.');
      return;
    }
    if (!form.email && !form.phone) {
      setError('Preencha email ou telefone para contato.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/tournaments/${id}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao fazer inscrição.');
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="registration-page">
        <div className="registration-container">
          <div className="reg-loading"><div className="spinner"></div>Carregando...</div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="registration-page">
        <div className="registration-container">
          <div className="reg-error">
            <h2>Torneio não encontrado</h2>
            <p>Este link de inscrição não é válido.</p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="registration-page">
        <div className="registration-container">
          <div className="reg-success">
            <div className="success-icon">&#10003;</div>
            <h2>Inscrição Confirmada!</h2>
            <p>Você foi inscrito no torneio <strong>{tournament.name}</strong>.</p>
            <p>Categoria: <strong>{form.category}</strong></p>
            {tournament.pricing?.first_registration > 0 && (
              <p>Valor: <strong>R$ {tournament.pricing.first_registration.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
            )}

            {tournament.company?.pix_key && (
              <div className="reg-pix-info">
                <h3>Dados para Pagamento via PIX</h3>
                <div className="pix-details">
                  <p><strong>Chave PIX ({tournament.company.pix_type || 'Chave'}):</strong></p>
                  <div className="pix-key-box">
                    <span>{tournament.company.pix_key}</span>
                    <button type="button" onClick={() => {
                      navigator.clipboard.writeText(tournament.company.pix_key);
                      alert('Chave PIX copiada!');
                    }}>Copiar</button>
                  </div>
                  {tournament.company.pix_name && (
                    <p className="pix-name">Titular: <strong>{tournament.company.pix_name}</strong></p>
                  )}
                </div>
              </div>
            )}

            <p className="reg-note">O organizador entrará em contato com mais detalhes sobre confirmação.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="registration-page">
      <div className="registration-container">
        <div className="reg-header">
          <h1>{tournament.name}</h1>
          <p className="reg-date">
            {tournament.start_date ? new Date(tournament.start_date).toLocaleDateString('pt-BR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            }) : ''}
          </p>
          {tournament.description && (
            <p className="reg-desc">{tournament.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="reg-form">
          <h2>Inscrição</h2>

          {error && <div className="reg-error-msg">{error}</div>}

          {selectedPlayer && (
            <div className="reg-selected-badge">
              Jogador encontrado: <strong>{selectedPlayer.name}</strong>
              <button type="button" onClick={() => {
                setSelectedPlayer(null);
                setForm({ name: '', email: '', phone: '', level: 'intermediario', category: '', birth_date: '' });
              }}>Limpar</button>
            </div>
          )}

          <div className="form-group" style={{ position: 'relative' }}>
            <label>Nome Completo *</label>
            <input
              type="text"
              placeholder="Digite seu nome..."
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              autoComplete="off"
            />
            {searchResults.length > 0 && (
              <div className="reg-search-dropdown">
                {searchResults.map(p => (
                  <div key={p.id} className="reg-search-item" onClick={() => selectExistingPlayer(p)}>
                    <strong>{p.name}</strong>
                    <span>{p.email || p.phone || ''}</span>
                  </div>
                ))}
                <div className="reg-search-item reg-search-new" onClick={() => setSearchResults([])}>
                  + Sou novo, quero me cadastrar
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Data de Nascimento *</label>
            <input
              type="date"
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Telefone</label>
              <input
                type="tel"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Nível *</label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
              >
                <option value="iniciante">Iniciante</option>
                <option value="intermediario">Intermediário</option>
                <option value="avancado">Avançado</option>
              </select>
            </div>
            <div className="form-group">
              <label>Categoria *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
              >
                <option value="">Selecione...</option>
                {tournament.categories?.map((cat, idx) => (
                  <option key={idx} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="btn-register">
            Confirmar Inscrição
          </button>
        </form>
      </div>
    </div>
  );
}

export default PlayerRegistrationPage;
