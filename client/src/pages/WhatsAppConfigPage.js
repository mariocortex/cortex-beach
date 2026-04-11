import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FiSave, FiSmartphone, FiZap, FiSend, FiList, FiRefreshCw,
  FiLogOut, FiCheckCircle, FiAlertCircle, FiClock, FiTrash2, FiPlus, FiSearch, FiX
} from 'react-icons/fi';
import './WhatsAppConfigPage.css';
import { API_BASE } from '../config';

const VARIABLE_HINTS = [
  { key: '{nome}', desc: 'Nome do jogador' },
  { key: '{torneio}', desc: 'Nome do torneio' },
  { key: '{categoria}', desc: 'Categoria' },
  { key: '{quadra}', desc: 'Número da quadra' },
  { key: '{rodada}', desc: 'Número da rodada' },
  { key: '{adversarios}', desc: 'Nomes dos adversários' },
  { key: '{placar}', desc: 'Placar final' }
];

function WhatsAppConfigPage() {
  const [tab, setTab] = useState('connection');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const [config, setConfig] = useState({
    api_url: '',
    api_key: '',
    instance_name: '',
    connection_status: 'disconnected',
    phone_number: null,
    last_qr_code: null,
    auto_next_match: false,
    auto_match_result: false,
    auto_tournament_start: false,
    template_next_match: '',
    template_match_result: '',
    template_tournament_start: ''
  });

  // --- Send form state ---
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [players, setPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [onlyWithPhone, setOnlyWithPhone] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // --- History state ---
  const [messages, setMessages] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('all');

  const statusPollRef = useRef(null);

  // --- helpers ---
  const token = () => localStorage.getItem('token');
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token()}`
  });

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  // --- fetch config on mount ---
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/whatsapp/config`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setConfig(prev => ({ ...prev, ...data, api_key: '' })); // não pré-preenche api_key
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchTournaments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tournaments`, { headers: authHeaders() });
      if (res.ok) setTournaments(await res.json());
    } catch (err) { console.error(err); }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/whatsapp/messages?limit=200`, { headers: authHeaders() });
      if (res.ok) setMessages(await res.json());
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchConfig(), fetchTournaments()]);
      setLoading(false);
    })();
  }, [fetchConfig, fetchTournaments]);

  // Polling de status quando está "connecting"
  useEffect(() => {
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current);
      statusPollRef.current = null;
    }
    if (config.connection_status === 'connecting') {
      statusPollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/whatsapp/instance/status`, { headers: authHeaders() });
          if (res.ok) {
            const data = await res.json();
            setConfig(prev => ({ ...prev, connection_status: data.connection_status, phone_number: data.phone_number }));
            if (data.connection_status === 'connected') {
              clearInterval(statusPollRef.current);
              showMsg('success', 'WhatsApp conectado com sucesso!');
            }
          }
        } catch (err) { /* silencioso */ }
      }, 3000);
    }
    return () => {
      if (statusPollRef.current) clearInterval(statusPollRef.current);
    };
  }, [config.connection_status]);

  // Fetch players quando seleciona torneio
  useEffect(() => {
    if (!selectedTournament) {
      setPlayers([]);
      setSelectedPlayers([]);
      setPlayerSearch('');
      setCategoryFilter('');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/tournaments/${selectedTournament}/players`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setPlayers(data);
          setSelectedPlayers([]);
          setPlayerSearch('');
          setCategoryFilter('');
        }
      } catch (err) { console.error(err); }
    })();
  }, [selectedTournament]);

  // Lista única de categorias do torneio atual
  const playerCategories = useMemo(() => {
    const set = new Set();
    players.forEach(p => { if (p.category) set.add(p.category); });
    return Array.from(set).sort();
  }, [players]);

  // Jogadores filtrados (busca + categoria + telefone)
  const filteredPlayers = useMemo(() => {
    const q = playerSearch.trim().toLowerCase();
    return players.filter(p => {
      if (onlyWithPhone && !p.phone) return false;
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (!q) return true;
      const name = (p.name || '').toLowerCase();
      const phone = (p.phone || '').toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [players, playerSearch, categoryFilter, onlyWithPhone]);

  // Fetch histórico ao trocar para aba
  useEffect(() => {
    if (tab === 'history') fetchMessages();
  }, [tab, fetchMessages]);

  // --- actions ---
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        api_url: config.api_url,
        instance_name: config.instance_name
      };
      if (config.api_key && config.api_key.trim()) body.api_key = config.api_key;

      const res = await fetch(`${API_BASE}/whatsapp/config`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showMsg('success', 'Configuração salva!');
        await fetchConfig();
      } else {
        const err = await res.json();
        showMsg('error', err.error || 'Erro ao salvar');
      }
    } catch (err) {
      showMsg('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInstance = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/whatsapp/instance/create`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        setConfig(prev => ({
          ...prev,
          last_qr_code: data.qrcode || prev.last_qr_code,
          connection_status: 'connecting'
        }));
        showMsg('success', 'Instância criada. Escaneie o QR Code no WhatsApp.');
      } else {
        showMsg('error', data.error || 'Erro ao criar instância');
      }
    } catch (err) {
      showMsg('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshQR = async () => {
    try {
      const res = await fetch(`${API_BASE}/whatsapp/instance/qrcode`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setConfig(prev => ({ ...prev, last_qr_code: data.qrcode }));
      }
    } catch (err) { showMsg('error', err.message); }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Desconectar WhatsApp e remover a instância?')) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/whatsapp/instance`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (res.ok) {
        setConfig(prev => ({ ...prev, connection_status: 'disconnected', phone_number: null, last_qr_code: null }));
        showMsg('success', 'Desconectado');
      }
    } catch (err) { showMsg('error', err.message); }
    finally { setSaving(false); }
  };

  const handleSaveAutomations = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/whatsapp/automations`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          auto_next_match: config.auto_next_match,
          auto_match_result: config.auto_match_result,
          auto_tournament_start: config.auto_tournament_start,
          template_next_match: config.template_next_match,
          template_match_result: config.template_match_result,
          template_tournament_start: config.template_tournament_start
        })
      });
      if (res.ok) showMsg('success', 'Automações salvas!');
      else {
        const err = await res.json();
        showMsg('error', err.error || 'Erro ao salvar');
      }
    } catch (err) { showMsg('error', err.message); }
    finally { setSaving(false); }
  };

  const togglePlayer = (player) => {
    setSelectedPlayers(prev => {
      const exists = prev.find(p => p.player_id === player.player_id);
      if (exists) return prev.filter(p => p.player_id !== player.player_id);
      return [...prev, player];
    });
  };

  const toggleAllFiltered = () => {
    const eligibles = filteredPlayers.filter(p => p.phone);
    const allSelected = eligibles.length > 0 && eligibles.every(
      p => selectedPlayers.find(sp => sp.player_id === p.player_id)
    );
    if (allSelected) {
      // remove só os filtrados
      setSelectedPlayers(prev =>
        prev.filter(sp => !eligibles.find(e => e.player_id === sp.player_id))
      );
    } else {
      // adiciona os filtrados que ainda não estão selecionados
      setSelectedPlayers(prev => {
        const next = [...prev];
        eligibles.forEach(e => {
          if (!next.find(sp => sp.player_id === e.player_id)) next.push(e);
        });
        return next;
      });
    }
  };

  const clearSelection = () => setSelectedPlayers([]);

  const handleSendMessage = async () => {
    if (selectedPlayers.length === 0) {
      showMsg('error', 'Selecione pelo menos um destinatário');
      return;
    }
    if (!messageText.trim()) {
      showMsg('error', 'Digite uma mensagem');
      return;
    }

    setSendingMsg(true);
    try {
      const recipients = selectedPlayers.map(p => ({
        player_id: p.player_id,
        phone: p.phone,
        name: p.name,
        category: p.category,
        tournament: tournaments.find(t => t.id === selectedTournament)?.name || ''
      }));

      const endpoint = scheduleDate ? 'schedule' : 'send';
      const body = {
        recipients,
        message: messageText,
        tournament_id: selectedTournament || null
      };
      if (scheduleDate) body.scheduled_for = new Date(scheduleDate).toISOString();

      const res = await fetch(`${API_BASE}/whatsapp/${endpoint}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        showMsg('success', scheduleDate
          ? `${data.scheduled} mensagem(ns) agendada(s)`
          : `${data.queued} mensagem(ns) enfileirada(s)`);
        setMessageText('');
        setScheduleDate('');
        setSelectedPlayers([]);
      } else {
        const err = await res.json();
        showMsg('error', err.error || 'Erro ao enviar');
      }
    } catch (err) { showMsg('error', err.message); }
    finally { setSendingMsg(false); }
  };

  const handleDeleteMessage = async (id) => {
    if (!window.confirm('Remover mensagem?')) return;
    try {
      const res = await fetch(`${API_BASE}/whatsapp/messages/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (res.ok) setMessages(prev => prev.filter(m => m.id !== id));
    } catch (err) { showMsg('error', err.message); }
  };

  const insertVariable = (varKey) => {
    setMessageText(prev => prev + varKey);
  };

  // --- render ---
  if (loading) {
    return <div className="whatsapp-page"><div className="wa-loading">Carregando...</div></div>;
  }

  const isConnected = config.connection_status === 'connected';
  const isConnecting = config.connection_status === 'connecting';
  const statusLabel = {
    connected: 'Conectado',
    connecting: 'Aguardando leitura do QR Code',
    disconnected: 'Desconectado',
    error: 'Erro'
  }[config.connection_status] || 'Desconhecido';

  const filteredMessages = historyFilter === 'all'
    ? messages
    : messages.filter(m => m.status === historyFilter);

  return (
    <div className="whatsapp-page">
      <div className="wa-header">
        <h1><FiSmartphone /> WhatsApp</h1>
        <p>Integração com Evolution API para envio de mensagens aos atletas.</p>
      </div>

      {msg && (
        <div className={`wa-msg wa-msg-${msg.type}`}>
          {msg.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          {msg.text}
        </div>
      )}

      <div className="wa-tabs">
        <button className={`wa-tab ${tab === 'connection' ? 'active' : ''}`} onClick={() => setTab('connection')}>
          <FiSmartphone /> Conexão
        </button>
        <button className={`wa-tab ${tab === 'automations' ? 'active' : ''}`} onClick={() => setTab('automations')}>
          <FiZap /> Automações
        </button>
        <button className={`wa-tab ${tab === 'send' ? 'active' : ''}`} onClick={() => setTab('send')}>
          <FiSend /> Enviar
        </button>
        <button className={`wa-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          <FiList /> Histórico
        </button>
      </div>

      {/* ============ TAB: CONNECTION ============ */}
      {tab === 'connection' && (
        <div className="wa-section">
          <div className={`wa-status-card wa-status-${config.connection_status}`}>
            <div className="wa-status-dot"></div>
            <div>
              <strong>{statusLabel}</strong>
              {config.phone_number && <p>{config.phone_number}</p>}
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="wa-form">
            <h2>Credenciais Evolution API</h2>

            <div className="wa-form-group">
              <label>URL da Evolution API *</label>
              <input
                type="url"
                placeholder="https://evolution.seudominio.com"
                value={config.api_url || ''}
                onChange={e => setConfig({ ...config, api_url: e.target.value })}
                required
              />
              <small>URL base da sua instalação Evolution API (sem barra no final)</small>
            </div>

            <div className="wa-form-group">
              <label>API Key Global</label>
              <input
                type="password"
                placeholder={config.api_key_masked || 'sua-api-key-global'}
                value={config.api_key || ''}
                onChange={e => setConfig({ ...config, api_key: e.target.value })}
              />
              <small>{config.api_key_masked ? `Atual: ${config.api_key_masked}` : 'Chave configurada no AUTHENTICATION_API_KEY do servidor Evolution'}</small>
            </div>

            <div className="wa-form-group">
              <label>Nome da Instância *</label>
              <input
                type="text"
                placeholder="cortex-beach-matriz"
                value={config.instance_name || ''}
                onChange={e => setConfig({ ...config, instance_name: e.target.value })}
                required
              />
              <small>Identificador único da instância no Evolution (ex: cortex-beach-filial-sp)</small>
            </div>

            <div className="wa-form-actions">
              <button type="submit" className="wa-btn wa-btn-primary" disabled={saving}>
                <FiSave /> {saving ? 'Salvando...' : 'Salvar Credenciais'}
              </button>
            </div>
          </form>

          {config.api_url && config.instance_name && (
            <div className="wa-qr-section">
              <h2>Conectar WhatsApp</h2>

              {!isConnected && (
                <>
                  <p>Clique no botão abaixo para criar a instância e gerar o QR Code.</p>
                  <div className="wa-form-actions">
                    <button
                      type="button"
                      className="wa-btn wa-btn-primary"
                      onClick={handleCreateInstance}
                      disabled={saving}
                    >
                      <FiSmartphone /> {saving ? 'Criando...' : 'Criar Instância e Gerar QR Code'}
                    </button>
                    {isConnecting && (
                      <button type="button" className="wa-btn" onClick={handleRefreshQR}>
                        <FiRefreshCw /> Atualizar QR Code
                      </button>
                    )}
                  </div>

                  {config.last_qr_code && (
                    <div className="wa-qr-box">
                      <img
                        src={config.last_qr_code.startsWith('data:') ? config.last_qr_code : `data:image/png;base64,${config.last_qr_code}`}
                        alt="QR Code"
                      />
                      <p>Abra o WhatsApp no celular → Configurações → Aparelhos conectados → Conectar um aparelho</p>
                    </div>
                  )}
                </>
              )}

              {isConnected && (
                <>
                  <p>WhatsApp conectado e pronto para enviar mensagens.</p>
                  <div className="wa-form-actions">
                    <button type="button" className="wa-btn wa-btn-danger" onClick={handleDisconnect}>
                      <FiLogOut /> Desconectar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============ TAB: AUTOMATIONS ============ */}
      {tab === 'automations' && (
        <div className="wa-section">
          <h2>Disparos Automáticos</h2>
          <p className="wa-help">Quando ativadas, as mensagens são enfileiradas automaticamente.</p>

          <div className="wa-toggle-list">
            <label className="wa-toggle">
              <input
                type="checkbox"
                checked={!!config.auto_next_match}
                onChange={e => setConfig({ ...config, auto_next_match: e.target.checked })}
              />
              <div>
                <strong>Próxima partida</strong>
                <small>Notifica jogadores quando for a vez deles jogar (rodada atual).</small>
              </div>
            </label>

            <label className="wa-toggle">
              <input
                type="checkbox"
                checked={!!config.auto_match_result}
                onChange={e => setConfig({ ...config, auto_match_result: e.target.checked })}
              />
              <div>
                <strong>Resultado de partida</strong>
                <small>Envia o placar para os 4 jogadores assim que o resultado é registrado.</small>
              </div>
            </label>

            <label className="wa-toggle">
              <input
                type="checkbox"
                checked={!!config.auto_tournament_start}
                onChange={e => setConfig({ ...config, auto_tournament_start: e.target.checked })}
              />
              <div>
                <strong>Início de torneio</strong>
                <small>Diariamente às 08:00, avisa os inscritos dos torneios que começam no dia.</small>
              </div>
            </label>
          </div>

          <h2>Templates</h2>
          <p className="wa-help">
            Variáveis disponíveis:{' '}
            {VARIABLE_HINTS.map(v => <code key={v.key} title={v.desc}>{v.key}</code>)}
          </p>

          <div className="wa-form-group">
            <label>Próxima partida</label>
            <textarea
              rows="5"
              value={config.template_next_match || ''}
              onChange={e => setConfig({ ...config, template_next_match: e.target.value })}
            />
          </div>

          <div className="wa-form-group">
            <label>Resultado de partida</label>
            <textarea
              rows="5"
              value={config.template_match_result || ''}
              onChange={e => setConfig({ ...config, template_match_result: e.target.value })}
            />
          </div>

          <div className="wa-form-group">
            <label>Início de torneio</label>
            <textarea
              rows="5"
              value={config.template_tournament_start || ''}
              onChange={e => setConfig({ ...config, template_tournament_start: e.target.value })}
            />
          </div>

          <div className="wa-form-actions">
            <button className="wa-btn wa-btn-primary" onClick={handleSaveAutomations} disabled={saving}>
              <FiSave /> {saving ? 'Salvando...' : 'Salvar Automações'}
            </button>
          </div>
        </div>
      )}

      {/* ============ TAB: SEND ============ */}
      {tab === 'send' && (
        <div className="wa-section">
          {!isConnected && (
            <div className="wa-warning">
              <FiAlertCircle /> WhatsApp não está conectado. Conecte primeiro na aba Conexão.
            </div>
          )}

          <h2>Enviar Mensagem</h2>

          <div className="wa-form-group">
            <label>Torneio</label>
            <select value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)}>
              <option value="">-- Escolha um torneio --</option>
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {selectedTournament && players.length > 0 && (
            <div className="wa-form-group">
              <label>
                Destinatários
                <span className="wa-recipients-count">
                  <strong>{selectedPlayers.length}</strong> selecionado(s)
                  {selectedPlayers.length > 0 && (
                    <button type="button" className="wa-btn-link" onClick={clearSelection}>
                      limpar
                    </button>
                  )}
                </span>
              </label>

              <div className="wa-recipients-toolbar">
                <div className="wa-search-box">
                  <FiSearch />
                  <input
                    type="text"
                    placeholder={`Buscar em ${players.length} jogadores...`}
                    value={playerSearch}
                    onChange={e => setPlayerSearch(e.target.value)}
                  />
                  {playerSearch && (
                    <button
                      type="button"
                      className="wa-search-clear"
                      onClick={() => setPlayerSearch('')}
                      title="Limpar busca"
                    >
                      <FiX />
                    </button>
                  )}
                </div>

                {playerCategories.length > 1 && (
                  <select
                    className="wa-filter-select"
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                  >
                    <option value="">Todas as categorias</option>
                    {playerCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}

                <label className="wa-filter-check" title="Ocultar jogadores sem telefone">
                  <input
                    type="checkbox"
                    checked={onlyWithPhone}
                    onChange={e => setOnlyWithPhone(e.target.checked)}
                  />
                  <span>só com WhatsApp</span>
                </label>
              </div>

              <div className="wa-recipients-meta">
                <span>
                  Mostrando <strong>{filteredPlayers.length}</strong> de {players.length}
                </span>
                <button
                  type="button"
                  className="wa-btn-link"
                  onClick={toggleAllFiltered}
                  disabled={filteredPlayers.filter(p => p.phone).length === 0}
                >
                  {(() => {
                    const eligibles = filteredPlayers.filter(p => p.phone);
                    const allSelected = eligibles.length > 0 && eligibles.every(
                      p => selectedPlayers.find(sp => sp.player_id === p.player_id)
                    );
                    return allSelected ? 'Desmarcar filtrados' : 'Selecionar filtrados';
                  })()}
                </button>
              </div>

              <div className="wa-players-list wa-players-list-lg">
                {filteredPlayers.length === 0 ? (
                  <div className="wa-players-empty">
                    Nenhum jogador encontrado com os filtros atuais.
                  </div>
                ) : (
                  filteredPlayers.map(p => {
                    const hasPhone = !!p.phone;
                    const isSelected = !!selectedPlayers.find(sp => sp.player_id === p.player_id);
                    return (
                      <label
                        key={p.player_id || p.id}
                        className={`wa-player ${!hasPhone ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePlayer(p)}
                          disabled={!hasPhone}
                        />
                        <div>
                          <strong>{p.name}</strong>
                          <small>{p.category} • {p.phone || 'sem telefone'}</small>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="wa-form-group">
            <label>Mensagem</label>
            <div className="wa-vars">
              {VARIABLE_HINTS.map(v => (
                <button
                  key={v.key}
                  type="button"
                  className="wa-var-btn"
                  onClick={() => insertVariable(v.key)}
                  title={v.desc}
                >
                  <FiPlus size={12} /> {v.key}
                </button>
              ))}
            </div>
            <textarea
              rows="6"
              placeholder="Olá {nome}! Sua próxima partida..."
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
            />
          </div>

          <div className="wa-form-group">
            <label>Agendar envio (opcional)</label>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)}
            />
            <small>Deixe em branco para enviar imediatamente.</small>
          </div>

          <div className="wa-form-actions">
            <button
              className="wa-btn wa-btn-primary"
              onClick={handleSendMessage}
              disabled={sendingMsg || !isConnected}
            >
              {scheduleDate ? <FiClock /> : <FiSend />}
              {sendingMsg
                ? 'Enviando...'
                : scheduleDate
                  ? 'Agendar envio'
                  : 'Enviar agora'}
            </button>
          </div>
        </div>
      )}

      {/* ============ TAB: HISTORY ============ */}
      {tab === 'history' && (
        <div className="wa-section">
          <div className="wa-history-header">
            <h2>Histórico</h2>
            <div className="wa-history-filters">
              {['all', 'pending', 'scheduled', 'sent', 'failed'].map(f => (
                <button
                  key={f}
                  className={`wa-filter ${historyFilter === f ? 'active' : ''}`}
                  onClick={() => setHistoryFilter(f)}
                >
                  {f === 'all' ? 'Todas' : f}
                </button>
              ))}
              <button className="wa-btn wa-btn-sm" onClick={fetchMessages}>
                <FiRefreshCw /> Atualizar
              </button>
            </div>
          </div>

          {filteredMessages.length === 0 ? (
            <p className="wa-empty">Nenhuma mensagem.</p>
          ) : (
            <table className="wa-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Destinatário</th>
                  <th>Mensagem</th>
                  <th>Tipo</th>
                  <th>Data</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredMessages.map(m => (
                  <tr key={m.id}>
                    <td>
                      <span className={`wa-badge wa-badge-${m.status}`}>{m.status}</span>
                    </td>
                    <td>
                      <strong>{m.recipient_name || '-'}</strong>
                      <br />
                      <small>{m.phone}</small>
                    </td>
                    <td className="wa-msg-cell" title={m.message}>
                      {m.message?.substring(0, 80)}{m.message?.length > 80 ? '...' : ''}
                    </td>
                    <td><small>{m.trigger_type}</small></td>
                    <td>
                      <small>{new Date(m.created_at).toLocaleString('pt-BR')}</small>
                      {m.status === 'scheduled' && m.scheduled_for && (
                        <><br /><small>→ {new Date(m.scheduled_for).toLocaleString('pt-BR')}</small></>
                      )}
                      {m.error_message && (
                        <><br /><small style={{ color: '#dc2626' }}>{m.error_message}</small></>
                      )}
                    </td>
                    <td>
                      {(m.status === 'pending' || m.status === 'scheduled') && (
                        <button className="wa-btn-icon" onClick={() => handleDeleteMessage(m.id)} title="Cancelar">
                          <FiTrash2 />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default WhatsAppConfigPage;
