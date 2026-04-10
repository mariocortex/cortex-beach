-- ============================================
-- CÓRTEX BEACH - Database Schema
-- ============================================
-- Execute these SQL commands in your Supabase project

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TOURNAMENTS TABLE
-- ============================================
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'draft',
  categories JSONB DEFAULT '[]'::jsonb,
  scoring_rules JSONB DEFAULT '{
    "victory": 6,
    "defeat": 2,
    "draw": 3
  }'::jsonb,
  player_count INT DEFAULT 0,
  pending_results INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tournaments_user_id ON tournaments(user_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);

-- ============================================
-- PLAYERS TABLE
-- ============================================
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  level VARCHAR(50), -- 'iniciante', 'intermediario', 'avancado'
  category VARCHAR(100),
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_players_tournament_id ON players(tournament_id);
CREATE INDEX idx_players_email ON players(email);

-- ============================================
-- MATCHES TABLE
-- ============================================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_a JSONB, -- {id, name, players: []}
  team_b JSONB, -- {id, name, players: []}
  sets JSONB DEFAULT '{}'::jsonb, -- {teamA: 0, teamB: 0}
  court VARCHAR(50),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  winner VARCHAR(50), -- 'team_a', 'team_b', null for draw
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_scheduled_at ON matches(scheduled_at);

-- ============================================
-- RANKINGS TABLE
-- ============================================
CREATE TABLE rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  player_name VARCHAR(255),
  category VARCHAR(100),
  points INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  draws INT DEFAULT 0,
  position INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rankings_tournament_id ON rankings(tournament_id);
CREATE INDEX idx_rankings_player_id ON rankings(player_id);
CREATE INDEX idx_rankings_points ON rankings(points DESC);

-- ============================================
-- COMMERCIALS TABLE
-- ============================================
CREATE TABLE commercials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  advertiser_name VARCHAR(255) NOT NULL,
  media_url TEXT,
  duration INT, -- em segundos
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  views_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_commercials_tournament_id ON commercials(tournament_id);
CREATE INDEX idx_commercials_is_active ON commercials(is_active);

-- ============================================
-- MATCH_HISTORY TABLE (Para auditoria)
-- ============================================
CREATE TABLE match_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  action VARCHAR(100), -- 'created', 'updated', 'completed'
  previous_state JSONB,
  new_state JSONB,
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_match_history_match_id ON match_history(match_id);
CREATE INDEX idx_match_history_tournament_id ON match_history(tournament_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rankings_updated_at BEFORE UPDATE ON rankings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commercials_updated_at BEFORE UPDATE ON commercials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INSERT SAMPLE DATA (Para teste)
-- ============================================

-- Criar usuário demo
INSERT INTO users (email, password_hash, name)
VALUES ('demo@cortexbeach.com', 'demo123', 'Demo User')
ON CONFLICT DO NOTHING;

-- Opcional: Criar torneio demo
-- INSERT INTO tournaments (user_id, name, description, date, status, categories)
-- SELECT id, 'Open de Verão 2024', 'Torneio de demonstração', NOW(), 'active', '["Intermediário", "Avançado"]'
-- FROM users WHERE email = 'demo@cortexbeach.com';

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Para implementar depois
-- ============================================

-- ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can only see their own tournaments"
-- ON tournaments FOR SELECT
-- USING (user_id = auth.uid());

-- ============================================
-- NOTAS
-- ============================================
-- 1. Execute este script no Supabase SQL Editor
-- 2. Os UUIDs são gerados automaticamente
-- 3. Os timestamps são gerenciados automaticamente
-- 4. As constraints garantem integridade referencial
-- 5. Os índices melhoram performance
-- 6. RLS pode ser ativado depois para segurança adicional
