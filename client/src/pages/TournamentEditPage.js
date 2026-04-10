import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiChevronRight, FiArrowLeft } from 'react-icons/fi';
import './TournamentEditPage.css';

function TournamentEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    type: 'super_oito',
    categories: [],
    scoring_rules: { total_points: 6 },
    num_courts: 2,
    category_display_time: 60,
    pricing: { first_registration: 0, additional_registration: 0 }
  });

  useEffect(() => {
    fetchTournament();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchTournament = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5001/api/tournaments/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const tournament = await response.json();
        console.log('Fetched tournament:', tournament);
        setFormData({
          name: tournament.name,
          description: tournament.description || '',
          start_date: tournament.start_date ? tournament.start_date.split('T')[0] + 'T' + tournament.start_date.split('T')[1]?.substring(0, 5) : '',
          type: tournament.type || 'super_oito',
          categories: Array.isArray(tournament.categories) ? tournament.categories : [],
          scoring_rules: tournament.scoring_rules || { total_points: 6 },
          num_courts: tournament.num_courts || 2,
          category_display_time: tournament.category_display_time || 60,
          pricing: tournament.pricing || { first_registration: 0, additional_registration: 0 }
        });
      }
    } catch (error) {
      console.error('Failed to fetch tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleAddCategory = () => {
    setFormData({
      ...formData,
      categories: [
        ...formData.categories,
        { name: '', limit: 16, format: 'super_oito' }
      ]
    });
  };

  const handleRemoveCategory = (index) => {
    setFormData({
      ...formData,
      categories: formData.categories.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/tournaments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        navigate(`/tournaments/${id}`);
      }
    } catch (error) {
      console.error('Failed to update tournament:', error);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div>Carregando...</div>;
  }

  return (
    <div className="tournament-edit">
      <div className="wizard-container">
        <div className="wizard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <a href={`/tournaments/${id}`} className="back-link">
              <FiArrowLeft size={24} />
            </a>
            <h1>Editar Torneio</h1>
          </div>
          <div className="progress-bar">
            <div className="progress" style={{ width: `${(step / 4) * 100}%` }}></div>
          </div>
          <p className="step-counter">Passo {step} de 4</p>
        </div>

        <div className="wizard-body">
          {step === 1 && (
            <div className="step-content">
              <h2>Informações Básicas</h2>
              <div className="form-group">
                <label>Nome do Torneio *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Data e Hora *</label>
                <input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Tipo de Torneio *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="super_oito">🏐 Super Oito (Duplas Rotativas)</option>
                  <option value="round_robin">🔄 Round Robin (Todos vs Todos)</option>
                  <option value="eliminatorio">🏆 Eliminatório (Mata-Mata)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Número de Quadras *</label>
                <input
                  type="number"
                  value={formData.num_courts}
                  onChange={(e) => setFormData({ ...formData, num_courts: parseInt(e.target.value) || 1 })}
                  min="1"
                  max="10"
                />
                <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                  Quantas quadras disponíveis para partidas simultâneas
                </small>
              </div>

              <div className="form-group">
                <label>Tempo de Exibição por Categoria (segundos)</label>
                <input
                  type="number"
                  value={formData.category_display_time}
                  onChange={(e) => setFormData({ ...formData, category_display_time: parseInt(e.target.value) || 60 })}
                  min="10"
                  max="600"
                />
                <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                  Tempo que cada categoria fica visível no painel público antes de trocar
                </small>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Valor 1a Inscrição (R$) *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666', fontWeight: 600 }}>R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      style={{ paddingLeft: '40px' }}
                      value={formData.pricing.first_registration ? formData.pricing.first_registration.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^\d,]/g, '').replace(',', '.');
                        setFormData({
                          ...formData,
                          pricing: { ...formData.pricing, first_registration: parseFloat(val) || 0 }
                        });
                      }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Valor Inscrição Adicional (R$)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666', fontWeight: 600 }}>R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      style={{ paddingLeft: '40px' }}
                      value={formData.pricing.additional_registration ? formData.pricing.additional_registration.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^\d,]/g, '').replace(',', '.');
                        setFormData({
                          ...formData,
                          pricing: { ...formData.pricing, additional_registration: parseFloat(val) || 0 }
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  placeholder="Descreva o torneio..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="4"
                ></textarea>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="step-content">
              <h2>Categorias</h2>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                Edite as categorias do seu torneio
              </p>
              <div className="categories-list">
                {formData.categories.map((cat, idx) => (
                  <div key={idx} className="category-section">
                    <div className="form-group">
                      <label>Nome da Categoria *</label>
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => {
                          const newCats = [...formData.categories];
                          newCats[idx].name = e.target.value;
                          setFormData({ ...formData, categories: newCats });
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Limite de Jogadores *</label>
                        <input
                          type="number"
                          value={cat.limit}
                          onChange={(e) => {
                            const newCats = [...formData.categories];
                            newCats[idx].limit = parseInt(e.target.value);
                            setFormData({ ...formData, categories: newCats });
                          }}
                          min="4"
                          max="32"
                        />
                      </div>
                      <button
                        className="btn-remove"
                        onClick={() => handleRemoveCategory(idx)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn btn-outline" onClick={handleAddCategory}>
                + Adicionar Categoria
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="step-content">
              <h2>Sistema de Pontuação</h2>

              <div style={{
                background: '#E3F2FD',
                border: '2px solid #0066CC',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '25px'
              }}>
                <p style={{ margin: '0 0 15px', color: '#0052A3', fontWeight: 600, fontSize: '1.1rem' }}>
                  🏐 Sistema de Games (Super Oito Raiz)
                </p>

                <p style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#0052A3' }}>
                  <strong>Cada jogo:</strong> 1 set curto (até 4 ou 6 games)
                </p>

                <p style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#0052A3' }}>
                  <strong>Pontuação:</strong> Cada game ganho = 1 ponto para o jogador
                </p>

                <div style={{
                  background: 'white',
                  border: '1px solid #0066CC',
                  borderRadius: '6px',
                  padding: '15px',
                  fontSize: '0.9rem',
                  lineHeight: '1.8'
                }}>
                  <p style={{ margin: '0 0 12px', fontWeight: 600, color: '#0052A3' }}>
                    📊 Exemplo Prático:
                  </p>
                  <p style={{ margin: '5px 0' }}>
                    <strong>Jogo 1:</strong> Ganhou 4x2 → jogador recebe <strong>4 pontos</strong>
                  </p>
                  <p style={{ margin: '5px 0' }}>
                    <strong>Jogo 2:</strong> Perdeu 4x3 → jogador recebe <strong>3 pontos</strong>
                  </p>
                </div>
              </div>

              <p style={{ color: '#666', textAlign: 'center', fontStyle: 'italic' }}>
                ℹ️ Os valores acima são fixos. Configure o resultado do jogo durante o torneio.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="step-content">
              <h2>Revisão e Confirmação</h2>
              <div className="summary">
                <div className="summary-section">
                  <h3>Informações Básicas</h3>
                  <p><strong>Nome:</strong> {formData.name}</p>
                  <p><strong>Data:</strong> {new Date(formData.start_date).toLocaleDateString('pt-BR')}</p>
                  <p><strong>Descrição:</strong> {formData.description || '(sem descrição)'}</p>
                </div>

                <div className="summary-section">
                  <h3>Categorias ({formData.categories.length})</h3>
                  {formData.categories.map((cat, idx) => (
                    <p key={idx}>{cat.name || `Categoria ${idx + 1}`} - {cat.limit} jogadores</p>
                  ))}
                </div>

                <div className="summary-section">
                  <h3>Sistema de Games</h3>
                  <p><strong>Total de pontos por jogo:</strong> {formData.scoring_rules?.total_points || 6}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="wizard-footer">
          <button
            className="btn btn-outline"
            onClick={handlePrev}
            disabled={step === 1}
          >
            Voltar
          </button>

          {step === 4 ? (
            <button className="btn btn-primary" onClick={handleSubmit}>
              Salvar Alterações
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleNext}>
              Próximo <FiChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TournamentEditPage;
