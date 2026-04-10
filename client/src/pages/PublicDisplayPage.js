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

  const renderHeader = () => (
    <div className="pd-header">
      <div className="pd-header-left">
        <span className="pd-logo-sm">🏐</span>
        <span className="pd-tournament-name">{tournament.name}</span>
      </div>
      <div className="pd-header-center">
        {selectedCategory && <span className="pd-category-badge">{selectedCategory}</span>}
      </div>
      <div className="pd-header-right">
        <span className="pd-clock">{timeStr}</span>
        <span className="pd-live-dot"></span>
        <span className="pd-live-text">AO VIVO</span>
      </div>
    </div>
  );

  const renderRanking = () => (
    <div className="pd-screen pd-ranking">
      {renderHeader()}
      <div className="pd-screen-title">
        <span className="pd-title-icon">🏆</span>
        CLASSIFICAÇÃO
      </div>
      <div className="pd-ranking-table">
        <div className="pd-rank-header">
          <span className="pd-rank-pos">#</span>
          <span className="pd-rank-name">JOGADOR</span>
          <span className="pd-rank-stat">PTS</span>
          <span className="pd-rank-stat">J</span>
          <span className="pd-rank-stat">V</span>
          <span className="pd-rank-stat">D</span>
        </div>
        {rankings.slice(0, 10).map((r, idx) => (
          <div key={r.id} className={`pd-rank-row ${idx < 3 ? 'pd-top-' + (idx + 1) : ''}`}>
            <span className="pd-rank-pos">
              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
            </span>
            <span className="pd-rank-name">{r.name}</span>
            <span className="pd-rank-stat pd-rank-pts">{r.points}</span>
            <span className="pd-rank-stat">{r.matches}</span>
            <span className="pd-rank-stat pd-rank-wins">{r.wins}</span>
            <span className="pd-rank-stat pd-rank-losses">{r.losses}</span>
          </div>
        ))}
      </div>
      {renderFooter()}
    </div>
  );

  const renderNextMatches = () => (
    <div className="pd-screen pd-next">
      {renderHeader()}
      <div className="pd-screen-title">
        <span className="pd-title-icon">📋</span>
        {currentRound ? `RODADA ${currentRound} - PRÓXIMAS PARTIDAS` : 'PRÓXIMAS PARTIDAS'}
      </div>
      <div className="pd-matches-board">
        {currentRoundMatches.length > 0 ? (
          currentRoundMatches.map(match => {
            const tA = (match.team_a_players || []).map(p => p.name).join(' & ');
            const tB = (match.team_b_players || []).map(p => p.name).join(' & ');
            return (
              <div key={match.id} className="pd-board-row">
                <span className="pd-board-court">Q{match.court}</span>
                <span className="pd-board-team pd-board-team-a">{tA}</span>
                <span className="pd-board-vs">VS</span>
                <span className="pd-board-team pd-board-team-b">{tB}</span>
                <span className="pd-board-status">AGUARDANDO</span>
              </div>
            );
          })
        ) : (
          <div className="pd-no-data">
            <p>Nenhuma partida pendente</p>
          </div>
        )}
      </div>
      {renderFooter()}
    </div>
  );

  const renderResults = () => (
    <div className="pd-screen pd-results">
      {renderHeader()}
      <div className="pd-screen-title">
        <span className="pd-title-icon">⚡</span>
        ÚLTIMOS RESULTADOS
      </div>
      <div className="pd-results-board">
        {latestResults.length > 0 ? (
          latestResults.map(match => {
            const tA = (match.team_a_players || []).map(p => p.name).join(' & ');
            const tB = (match.team_b_players || []).map(p => p.name).join(' & ');
            const aWon = match.score_a > match.score_b;
            const bWon = match.score_b > match.score_a;
            return (
              <div key={match.id} className="pd-result-row">
                <span className="pd-result-round">R{match.round}</span>
                <span className={`pd-result-team ${aWon ? 'pd-winner' : ''}`}>{tA}</span>
                <span className="pd-result-score">
                  <strong>{match.score_a}</strong>
                  <span className="pd-result-x">x</span>
                  <strong>{match.score_b}</strong>
                </span>
                <span className={`pd-result-team ${bWon ? 'pd-winner' : ''}`}>{tB}</span>
                <span className="pd-result-court">Q{match.court}</span>
              </div>
            );
          })
        ) : (
          <div className="pd-no-data">
            <p>Nenhum resultado ainda</p>
          </div>
        )}
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
      <div className="pd-footer-left">CÓRTEX BEACH</div>
      <div className="pd-footer-sponsors">
        {sponsors.length > 0 && (
          <>
            <span>Patrocínio:</span>
            {sponsors.map((s, idx) => (
              <span
                key={s.id}
                className="pd-footer-sponsor pd-clickable"
                onClick={() => handleSponsorClick(idx)}
              >{s.name}</span>
            ))}
          </>
        )}
      </div>
      <div className="pd-footer-right">
        {tournament.categories?.map(c => (
          <span
            key={c.name}
            className={`pd-footer-cat pd-clickable ${c.name === selectedCategory ? 'active' : ''}`}
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
