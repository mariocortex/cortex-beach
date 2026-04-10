import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import './PublicDisplayPage.css';

function PublicDisplayPage() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [currentScreen, setCurrentScreen] = useState(0);
  const [currentSponsor, setCurrentSponsor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [categoryAutoRotate, setCategoryAutoRotate] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselTransition, setCarouselTransition] = useState('fade');
  const containerRef = useRef(null);
  const categoriesRef = useRef([]);
  const carouselTimerRef = useRef(null);
  const transitionEffects = ['fade', 'slide-left', 'slide-right', 'slide-top', 'slide-bottom'];

  // Screen rotation: info screens cycle, sponsors interleave between them
  // next_matches only when there are pending matches
  const hasPendingRef = useRef(false);
  hasPendingRef.current = matches.some(m => m.status === 'pending');
  const [activeInfoScreens, setActiveInfoScreens] = useState(['ranking', 'next_matches', 'results']);

  // Update info screens only when pending status actually changes
  useEffect(() => {
    const screens = ['ranking'];
    if (hasPendingRef.current) screens.push('next_matches');
    screens.push('results');
    setActiveInfoScreens(prev => {
      if (prev.length === screens.length && prev.every((s, i) => s === screens[i])) return prev;
      return screens;
    });
  }, [matches]);
  const infoScreens = activeInfoScreens;

  const fetchData = useCallback(async () => {
    try {
      const [tourRes, matchRes, sponsorRes] = await Promise.all([
        fetch(`http://localhost:5001/api/tournaments/${tournamentId}`),
        fetch(`http://localhost:5001/api/tournaments/${tournamentId}/matches`),
        fetch(`http://localhost:5001/api/tournaments/${tournamentId}/sponsors/active`)
      ]);

      if (tourRes.ok) {
        const t = await tourRes.json();
        setTournament(t);
        const cats = (t.categories || []).map(c => c.name);
        categoriesRef.current = cats;
        setSelectedCategory(prev => {
          if (!prev && cats.length > 0) return cats[0];
          return prev;
        });
      }
      if (matchRes.ok) setMatches(await matchRes.json());
      if (sponsorRes.ok) setSponsors(await sponsorRes.json());
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const [screenType, setScreenType] = useState('info');
  const [infoIndex, setInfoIndex] = useState(0);
  const infoScreensRef = useRef(infoScreens);
  infoScreensRef.current = infoScreens;

  // Keep infoIndex in bounds when screens change
  useEffect(() => {
    setInfoIndex(prev => prev >= infoScreens.length ? 0 : prev);
  }, [infoScreens.length]);

  // Auto-rotate categories on independent timer
  useEffect(() => {
    if (!categoryAutoRotate || categoriesRef.current.length <= 1) return;
    const catTime = (tournament?.category_display_time || 60) * 1000;
    const interval = setInterval(() => {
      setSelectedCategory(prev => {
        const cats = categoriesRef.current;
        if (cats.length === 0) return prev;
        const idx = cats.indexOf(prev);
        return cats[(idx + 1) % cats.length];
      });
    }, catTime);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryAutoRotate, tournament?.category_display_time]);

  // Screen rotation
  useEffect(() => {
    const screens = infoScreensRef.current;
    const getScreenTime = () => {
      if (screenType === 'sponsor' && sponsors.length > 0) {
        const sponsor = sponsors[currentSponsor % sponsors.length];
        return (sponsor?.display_time || 10) * 1000;
      }
      return 15000;
    };
    const timeout = setTimeout(() => {
      if (screenType === 'info') {
        if (sponsors.length > 0) {
          setScreenType('sponsor');
        } else {
          setInfoIndex(prev => (prev + 1) % screens.length);
        }
      } else {
        setInfoIndex(prev => (prev + 1) % screens.length);
        setCurrentSponsor(prev => (prev + 1) % sponsors.length);
        setScreenType('info');
      }
    }, getScreenTime());
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenType, infoIndex, currentSponsor, sponsors.length]);

  // Fullscreen handling
  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  }, []);

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);

    // Hide cursor after 3s of no movement
    let cursorTimeout;
    const handleMouseMove = () => {
      document.body.style.cursor = 'default';
      clearTimeout(cursorTimeout);
      cursorTimeout = setTimeout(() => {
        document.body.style.cursor = 'none';
      }, 3000);
    };
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('fullscreenchange', handleFSChange);
      document.removeEventListener('mousemove', handleMouseMove);
      document.body.style.cursor = 'default';
    };
  }, []);

  // Calculate rankings from match data
  const calculateRankings = () => {
    const stats = {};
    matches
      .filter(m => m.status === 'completed' && (!selectedCategory || m.category === selectedCategory))
      .forEach(match => {
        const sA = match.score_a || 0;
        const sB = match.score_b || 0;
        (match.team_a_players || []).forEach(p => {
          if (!stats[p.id]) stats[p.id] = { id: p.id, name: p.name, points: 0, wins: 0, losses: 0, draws: 0, matches: 0 };
          stats[p.id].points += sA;
          stats[p.id].matches += 1;
          if (sA > sB) stats[p.id].wins += 1;
          else if (sA < sB) stats[p.id].losses += 1;
          else stats[p.id].draws += 1;
        });
        (match.team_b_players || []).forEach(p => {
          if (!stats[p.id]) stats[p.id] = { id: p.id, name: p.name, points: 0, wins: 0, losses: 0, draws: 0, matches: 0 };
          stats[p.id].points += sB;
          stats[p.id].matches += 1;
          if (sB > sA) stats[p.id].wins += 1;
          else if (sB < sA) stats[p.id].losses += 1;
          else stats[p.id].draws += 1;
        });
      });
    return Object.values(stats).sort((a, b) => b.points - a.points);
  };

  // Get media items for a sponsor (backward compatible) - needed before hooks
  const getSponsorMedia = (sponsor) => {
    if (sponsor.media_urls && sponsor.media_urls.length > 0) return sponsor.media_urls;
    if (sponsor.media_url) return [{ url: sponsor.media_url, type: sponsor.media_type || 'image' }];
    return [];
  };

  // Reset carousel when sponsor changes
  useEffect(() => {
    setCarouselIndex(0);
    setCarouselTransition('fade');
  }, [currentSponsor]);

  // Auto-advance carousel
  useEffect(() => {
    if (screenType !== 'sponsor') return;
    const sponsor = sponsors[currentSponsor % sponsors.length];
    if (!sponsor) return;
    const media = getSponsorMedia(sponsor);
    if (media.length <= 1) return;
    const slideTime = (sponsor.slide_time || 5) * 1000;
    carouselTimerRef.current = setTimeout(() => {
      const nextEffect = transitionEffects[Math.floor(Math.random() * transitionEffects.length)];
      setCarouselTransition(nextEffect);
      setCarouselIndex(prev => (prev + 1) % media.length);
    }, slideTime);
    return () => clearTimeout(carouselTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenType, currentSponsor, carouselIndex, sponsors.length]);

  if (loading || !tournament) {
    return (
      <div className="pd">
        <div className="pd-loading" onClick={enterFullscreen}>
          <div className="pd-logo">🏐</div>
          <h1>CÓRTEX BEACH</h1>
          <p>Carregando torneio...</p>
          <div className="spinner" style={{ borderTopColor: 'white' }}></div>
          <p className="pd-loading-hint">Clique para tela cheia</p>
        </div>
      </div>
    );
  }

  const filteredMatches = matches.filter(m => !selectedCategory || m.category === selectedCategory);
  const pendingMatches = filteredMatches.filter(m => m.status === 'pending').sort((a, b) => (a.round || 0) - (b.round || 0));
  const completedMatches = filteredMatches
    .filter(m => m.status === 'completed')
    .sort((a, b) => (b.round || 0) - (a.round || 0));
  const rankings = calculateRankings();

  // Find current round (first round with pending matches)
  const currentRound = pendingMatches.length > 0 ? pendingMatches[0].round : null;
  const currentRoundMatches = currentRound ? pendingMatches.filter(m => m.round === currentRound) : [];
  const latestResults = completedMatches.slice(0, 6);

  const timeStr = clock.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const renderNavbar = () => (
    <div className="pd-navbar">
      <div className="pd-navbar-left">
        <span className="pd-navbar-brand">{tournament.name}</span>
      </div>
      <div className="pd-navbar-right">
        <span className="pd-navbar-clock">{timeStr}</span>
        <div className="pd-live-badge">
          <span className="pd-live-dot"></span>
          <span className="pd-live-text">AO VIVO</span>
        </div>
      </div>
    </div>
  );

  const renderHero = (icon, title) => (
    <div className="pd-hero">
      <div className="pd-hero-left">
        <div className="pd-hero-icon">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div>
          <h1 className="pd-hero-title">{title}</h1>
          <div className="pd-hero-subtitle">
            {selectedCategory && <span className="pd-hero-cat-badge">{selectedCategory}</span>}
            <span className="pd-hero-series">CÓRTEX BEACH • SÉRIE ELITE</span>
          </div>
        </div>
      </div>
      <div className="pd-quick-stats">
        <div className="pd-stat-card primary">
          <span className="pd-stat-label">Atletas</span>
          <span className="pd-stat-value">{rankings.length}</span>
        </div>
        <div className="pd-stat-card secondary">
          <span className="pd-stat-label">Partidas</span>
          <span className="pd-stat-value">{completedMatches.length}</span>
        </div>
      </div>
    </div>
  );

  const renderStatsGrid = () => {
    const totalPts = completedMatches.reduce((a, m) => a + (m.score_a || 0) + (m.score_b || 0), 0);
    const avgPoints = completedMatches.length > 0
      ? (totalPts / completedMatches.length).toFixed(1)
      : '0.0';
    const mvp = rankings[0];
    return (
      <div className="pd-stats-grid">
        <div className="pd-insight-card">
          <div className="pd-insight-label">Média Pts / Partida</div>
          <div>
            <span className="pd-insight-value">{avgPoints}</span>
            <span className="pd-insight-sub">PTS</span>
          </div>
        </div>
        <div className="pd-insight-card">
          <div className="pd-insight-label">MVP do Torneio</div>
          {mvp ? (
            <div className="pd-insight-player">
              <div className="pd-insight-player-avatar">{mvp.name.charAt(0).toUpperCase()}</div>
              <div>
                <div className="pd-insight-player-name">{mvp.name}</div>
                <div className="pd-insight-player-stat">{mvp.points} PTS • {mvp.wins}V</div>
              </div>
            </div>
          ) : <div className="pd-insight-value">-</div>}
        </div>
        <div className="pd-insight-card">
          <div className="pd-insight-label">Rodada Atual</div>
          <div className="pd-insight-value">{currentRound ? `R${currentRound}` : '-'}</div>
          <span className="material-symbols-outlined pd-insight-bg-icon">stadium</span>
        </div>
      </div>
    );
  };

  const renderRanking = () => (
    <div className="pd-screen pd-ranking">
      {renderNavbar()}
      <div className="pd-main">
        {renderHero('emoji_events', 'CLASSIFICAÇÃO')}
        <div className="pd-table-container">
          <table className="pd-table">
            <thead>
              <tr>
                <th>#</th>
                <th>JOGADOR</th>
                <th className="text-right">PTS</th>
                <th className="text-right">J</th>
                <th className="text-right">V</th>
                <th className="text-right">D</th>
                <th className="col-efic">EFIC.</th>
              </tr>
            </thead>
            <tbody>
              {rankings.slice(0, 10).map((r, idx) => {
                const rank = idx + 1;
                const rankClass = idx < 3 ? `rank-${rank}` : 'rank-default';
                const isTop = idx < 3;
                const eff = r.matches > 0 ? Math.round((r.wins / r.matches) * 100) : 0;
                return (
                  <tr key={r.id}>
                    <td className={`col-rank ${rankClass}`}>{String(rank).padStart(2, '0')}</td>
                    <td>
                      <div className="pd-player-cell">
                        <div className={`pd-player-avatar ${isTop ? 'top' : ''}`}>
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={`pd-player-name ${isTop ? 'top' : ''}`}>{r.name}</div>
                      </div>
                    </td>
                    <td className={`pd-col-pts ${isTop ? 'top' : ''}`}>{r.points}</td>
                    <td className="pd-col-stat">{r.matches}</td>
                    <td className="pd-col-stat pd-col-wins">{r.wins}</td>
                    <td className="pd-col-stat pd-col-losses">{r.losses}</td>
                    <td className="pd-col-efic">{eff}%</td>
                  </tr>
                );
              })}
              {rankings.length === 0 && (
                <tr>
                  <td colSpan="7">
                    <div className="pd-no-data"><p>Aguardando resultados...</p></div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {renderStatsGrid()}
      </div>
      {renderFooter()}
    </div>
  );

  const renderNextMatches = () => (
    <div className="pd-screen pd-next">
      {renderNavbar()}
      <div className="pd-main">
        {renderHero('schedule', currentRound ? `RODADA ${currentRound}` : 'PRÓXIMAS PARTIDAS')}
        <div>
          {currentRoundMatches.length > 0 ? (
            currentRoundMatches.map(match => {
              const tA = (match.team_a_players || []).map(p => p.name).join(' & ');
              const tB = (match.team_b_players || []).map(p => p.name).join(' & ');
              return (
                <div key={match.id} className="pd-match-card">
                  <div className="pd-match-court">Q{match.court}</div>
                  <div className="pd-match-teams">
                    <div className="pd-match-team pd-match-team-a">{tA}</div>
                    <div className="pd-match-vs">VS</div>
                    <div className="pd-match-team pd-match-team-b">{tB}</div>
                  </div>
                  <div className="pd-match-status">AGUARDANDO</div>
                </div>
              );
            })
          ) : (
            <div className="pd-no-data">
              <p>Nenhuma partida pendente</p>
            </div>
          )}
        </div>
      </div>
      {renderFooter()}
    </div>
  );

  const renderResults = () => (
    <div className="pd-screen pd-results">
      {renderNavbar()}
      <div className="pd-main">
        {renderHero('trending_up', 'ÚLTIMOS RESULTADOS')}
        <div>
          {latestResults.length > 0 ? (
            latestResults.map(match => {
              const tA = (match.team_a_players || []).map(p => p.name).join(' & ');
              const tB = (match.team_b_players || []).map(p => p.name).join(' & ');
              const aWon = match.score_a > match.score_b;
              const bWon = match.score_b > match.score_a;
              return (
                <div key={match.id} className="pd-result-card">
                  <div className="pd-result-round-badge">R{match.round}</div>
                  <div className="pd-result-teams">
                    <div className={`pd-result-team-name pd-result-team-a ${aWon ? 'winner' : ''}`}>{tA}</div>
                    <div className="pd-result-score-box">
                      <span className="pd-result-score-num">{match.score_a}</span>
                      <span className="pd-result-score-x">x</span>
                      <span className="pd-result-score-num">{match.score_b}</span>
                    </div>
                    <div className={`pd-result-team-name pd-result-team-b ${bWon ? 'winner' : ''}`}>{tB}</div>
                  </div>
                  <div className="pd-result-court-badge">Q{match.court}</div>
                </div>
              );
            })
          ) : (
            <div className="pd-no-data">
              <p>Nenhum resultado ainda</p>
            </div>
          )}
        </div>
      </div>
      {renderFooter()}
    </div>
  );

  const getMediaType = (url) => {
    if (!url) return 'none';
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return 'youtube';
    const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    const lower = url.toLowerCase().split('?')[0];
    if (videoExts.some(ext => lower.endsWith(ext))) return 'video';
    return 'image';
  };

  const getYoutubeId = (url) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const renderMediaItem = (item, sponsorName) => {
    const mType = getMediaType(item.url);
    if (mType === 'youtube') {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${getYoutubeId(item.url)}?autoplay=1&mute=0&loop=1&controls=0&showinfo=0&rel=0&playlist=${getYoutubeId(item.url)}`}
          title={sponsorName}
          allow="autoplay; encrypted-media"
          allowFullScreen
          frameBorder="0"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      );
    }
    if (mType === 'video') {
      return <video src={item.url} autoPlay loop playsInline />;
    }
    return (
      <img
        src={item.url}
        alt={sponsorName}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.parentElement.innerHTML = `<div class="pd-sponsor-name-only"><h2>${sponsorName}</h2><p style="color:#666;font-size:1rem;">Imagem não disponível</p></div>`;
        }}
      />
    );
  };

  const renderSponsor = () => {
    const sponsor = sponsors[currentSponsor % sponsors.length];
    if (!sponsor) return renderRanking();
    const media = getSponsorMedia(sponsor);

    return (
      <div className="pd-screen pd-sponsor">
        <div className="pd-sponsor-content">
          {media.length > 0 ? (
            <div className="pd-carousel">
              {media.map((item, idx) => (
                <div
                  key={idx}
                  className={`pd-carousel-slide pd-transition-${carouselTransition} ${idx === carouselIndex ? 'pd-slide-active' : 'pd-slide-hidden'}`}
                >
                  <div className="pd-sponsor-media">
                    {renderMediaItem(item, sponsor.name)}
                  </div>
                </div>
              ))}
              {media.length > 1 && (
                <div className="pd-carousel-dots">
                  {media.map((_, idx) => (
                    <span key={idx} className={`pd-carousel-dot ${idx === carouselIndex ? 'active' : ''}`} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="pd-sponsor-name-only">
              <h2>{sponsor.name}</h2>
              {sponsor.description && <p>{sponsor.description}</p>}
            </div>
          )}
          <div className="pd-sponsor-badge">
            PATROCINADOR • {sponsor.name}
          </div>
        </div>
      </div>
    );
  };

  const handleCategoryClick = (catName) => {
    setSelectedCategory(catName);
    setCategoryAutoRotate(false);
    // Resume auto-rotate after 2 minutes
    setTimeout(() => setCategoryAutoRotate(true), 120000);
  };

  const handleSponsorClick = (sponsorIdx) => {
    setCurrentSponsor(sponsorIdx);
    setScreenType('sponsor');
  };

  const renderFooter = () => (
    <div className="pd-footer">
      <div className="pd-footer-copy">© CÓRTEX BEACH • ELITE BEACH VOLLEYBALL</div>
      <div className="pd-footer-sponsors">
        {sponsors.length > 0 && (
          <>
            <span>Patrocínio:</span>
            {sponsors.map((s, idx) => (
              <span
                key={s.id}
                className="pd-footer-sponsor"
                onClick={() => handleSponsorClick(idx)}
              >{s.name}</span>
            ))}
          </>
        )}
      </div>
      <div className="pd-footer-sponsors">
        {tournament.categories?.map(c => (
          <span
            key={c.name}
            className="pd-footer-sponsor"
            style={c.name === selectedCategory ? { color: 'var(--pd-primary)' } : {}}
            onClick={() => handleCategoryClick(c.name)}
          >{c.name}</span>
        ))}
      </div>
    </div>
  );

  const renderScreen = () => {
    if (screenType === 'sponsor') return renderSponsor();
    switch (infoScreens[infoIndex]) {
      case 'ranking': return renderRanking();
      case 'next_matches': return renderNextMatches();
      case 'results': return renderResults();
      default: return renderRanking();
    }
  };

  return (
    <div className="pd" ref={containerRef}>
      <div className="pd-watermark">
        <span>🏐</span>
        <span>CÓRTEX BEACH</span>
      </div>
      {renderScreen()}
      <div className="pd-screen-dots">
        {infoScreens.map((s, i) => (
          <span key={s} className={`pd-dot ${screenType === 'info' && i === infoIndex ? 'active' : ''}`} />
        ))}
        {sponsors.length > 0 && (
          <span className={`pd-dot ${screenType === 'sponsor' ? 'active' : ''}`} />
        )}
      </div>
      {!isFullscreen && (
        <button className="pd-fullscreen-btn" onClick={enterFullscreen} title="Tela cheia (F11)">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
          </svg>
          TELA CHEIA
        </button>
      )}
    </div>
  );
}

export default PublicDisplayPage;
