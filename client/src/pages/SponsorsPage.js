import React, { useState, useEffect } from 'react';
import { FiSearch, FiStar } from 'react-icons/fi';
import './SponsorsPage.css';

function SponsorsPage() {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSponsors();
  }, []);

  const fetchSponsors = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/sponsors', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setSponsors(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = sponsors.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="loading"><div className="spinner"></div><p>Carregando...</p></div>;
  }

  return (
    <div className="sponsors-page">
      <div className="page-header">
        <h1><FiStar size={24} /> Patrocinadores</h1>
      </div>

      <div className="search-bar">
        <FiSearch size={20} />
        <input
          type="text"
          placeholder="Buscar patrocinador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length > 0 ? (
        <div className="sponsors-grid">
          {filtered.map(s => (
            <div key={s.id} className="sponsor-list-card">
              {s.media_url && (
                <div className="sponsor-list-media">
                  {s.media_type === 'video' ? (
                    <video src={s.media_url} style={{ maxWidth: '100%', maxHeight: '100px' }} />
                  ) : (
                    <img src={s.media_url} alt={s.name} />
                  )}
                </div>
              )}
              <div className="sponsor-list-info">
                <h3>{s.name}</h3>
                <div className="sponsor-list-meta">
                  <span className={`sponsor-type-badge ${s.type}`}>
                    {s.type === 'money' ? 'Dinheiro' : s.type === 'barter' ? 'Permuta' : 'Misto'}
                  </span>
                  <span className="sponsor-list-count">
                    {s.tournaments_count} torneio{s.tournaments_count !== 1 ? 's' : ''}
                  </span>
                </div>
                {s.description && <p className="sponsor-list-desc">{s.description}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">
          {search ? 'Nenhum patrocinador encontrado.' : 'Nenhum patrocinador cadastrado. Adicione patrocinadores nos torneios.'}
        </p>
      )}
    </div>
  );
}

export default SponsorsPage;
