import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import './TournamentCreatePage.css';
import { API_BASE } from '../config';

function TournamentCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    type: 'super_oito',
    categories: [],
    num_courts: 2,
    scoring_rules: {
      total_points: 6
    },
    pricing: {
      first_registration: 0,
      additional_registration: 0
    }
  });

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch(`${API_BASE}/tournaments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const tournament = await response.json();
        navigate(`/tournaments/${tournament.id}`);
      }
    } catch (error) {
      console.error('Failed to create tournament:', error);
    }
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

  return (
    <div className="tournament-create">
      <div className="wizard-container">
        <div className="wizard-header">
          <h1>Criar Novo Torneio</h1>
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
                  placeholder="Ex: Open de Verão 2024"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Data e Hora *</label>
                <input
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
                  placeholder="2"
                  value={formData.num_courts}
                  onChange={(e) => setFormData({ ...formData, num_courts: parseInt(e.target.value) || 1 })}
                  min="1"
                  max="10"
                />
                <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                  Quantas quadras disponíveis para partidas simultâneas
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
                Crie as categorias do seu torneio. Exemplo: Iniciante, Intermediário, Avançado
              </p>
              <div className="categories-list">
                {formData.categories.map((cat, idx) => (
                  <div key={idx} className="category-section">
                    <div className="form-group">
                      <label>Nome da Categoria *</label>
                      <input
                        type="text"
                        placeholder="Ex: Intermediário"
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
                          placeholder="16"
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
                        title="Remover categoria"
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
                  marginTop: '10px',
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
                  <p style={{ margin: '5px 0' }}>
                    <strong>Jogo 3:</strong> Ganhou 4x1 → jogador recebe <strong>4 pontos</strong>
                  </p>
                  <p style={{ margin: '12px 0 0 0', color: '#0052A3' }}>
                    <strong>👉 Total: 11 pontos (soma de todos os games)</strong>
                  </p>

                  <div style={{
                    background: '#fff3cd',
                    borderLeft: '4px solid #ffc107',
                    padding: '10px',
                    marginTop: '12px',
                    borderRadius: '4px'
                  }}>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      <strong>⚡ Importante:</strong> Não é só ganhar! Quem faz mais games acumulados vence.
                    </p>
                  </div>
                </div>

                <div style={{
                  background: '#f0f8ff',
                  border: '1px solid #87CEEB',
                  borderRadius: '6px',
                  padding: '12px',
                  marginTop: '15px',
                  fontSize: '0.85rem'
                }}>
                  <p style={{ margin: 0, color: '#333' }}>
                    <strong>🔄 Duplas Rotativas:</strong> Cada rodada as duplas mudam. Todos jogam com parceiros diferentes!
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="step-content">
              <h2>Revisão e Confirmação</h2>
              <div className="summary">
                <div className="summary-section">
                  <h3>Informações Básicas</h3>
                  <p><strong>Nome:</strong> {formData.name}</p>
                  <p><strong>Tipo:</strong> {
                    formData.type === 'super_oito' ? '🏐 Super Oito' :
                    formData.type === 'round_robin' ? '🔄 Round Robin' :
                    '🏆 Eliminatório'
                  }</p>
                  <p><strong>Data:</strong> {new Date(formData.date).toLocaleDateString('pt-BR')}</p>
                  <p><strong>Descrição:</strong> {formData.description || '(sem descrição)'}</p>
                </div>

                <div className="summary-section">
                  <h3>Categorias ({formData.categories.length})</h3>
                  {formData.categories.map((cat, idx) => (
                    <p key={idx}>{cat.name || `Categoria ${idx + 1}`} - {cat.limit} jogadores</p>
                  ))}
                </div>

                <div className="summary-section">
                  <h3>Quadras</h3>
                  <p><strong>Número de quadras:</strong> {formData.num_courts}</p>
                </div>

                <div className="summary-section">
                  <h3>Valores</h3>
                  <p><strong>1a Inscrição:</strong> R$ {formData.pricing.first_registration.toFixed(2)}</p>
                  <p><strong>Inscrição Adicional:</strong> R$ {formData.pricing.additional_registration.toFixed(2)}</p>
                </div>

                <div className="summary-section">
                  <h3>Sistema de Pontuação</h3>
                  <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px' }}>
                    <strong>📊 Pontuação:</strong> Cada game ganho = 1 ponto
                  </p>
                  <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0' }}>
                    <strong>Exemplo:</strong> Resultado 4x2 → 4 pontos para um lado, 2 para o outro
                  </p>
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
              Criar Torneio
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

export default TournamentCreatePage;
