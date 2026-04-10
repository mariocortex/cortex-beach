-- =========================================
-- EXTENSÕES
-- =========================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================
-- 🔐 FUNÇÕES DE SEGURANÇA
-- =========================================

-- Verifica se usuário pertence ao organizer
CREATE OR REPLACE FUNCTION is_organizer_member(p_organizer_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_organizers uo
    JOIN system_users su ON su.id = uo.user_id
    WHERE uo.organizer_id = p_organizer_id
      AND su.auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verifica se é admin/owner
CREATE OR REPLACE FUNCTION is_organizer_admin(p_organizer_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_organizers uo
    JOIN system_users su ON su.id = uo.user_id
    WHERE uo.organizer_id = p_organizer_id
      AND uo.role IN ('owner','admin')
      AND su.auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- 🏢 BASE (EMPRESAS E USUÁRIOS)
-- =========================================

CREATE TABLE organizers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),

    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE system_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,

    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_organizers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES system_users(id) ON DELETE CASCADE,
    organizer_id UUID REFERENCES organizers(id) ON DELETE CASCADE,

    role VARCHAR(50) DEFAULT 'staff',

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, organizer_id)
);

-- =========================================
-- 🎾 CORE
-- =========================================

CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID REFERENCES organizers(id) ON DELETE CASCADE,

    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID REFERENCES organizers(id) ON DELETE CASCADE NOT NULL,

    name VARCHAR(255) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tournament_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL
);

-- =========================================
-- 📊 DEPENDENTES
-- =========================================

CREATE TABLE tournament_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    category_id UUID REFERENCES tournament_categories(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,

    status VARCHAR(50) DEFAULT 'pending'
);

CREATE TABLE player_tournament_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    category_id UUID REFERENCES tournament_categories(id) ON DELETE CASCADE,

    final_position INTEGER
);

-- =========================================
-- ⚡ ÍNDICES
-- =========================================

CREATE INDEX idx_user_org ON user_organizers(user_id, organizer_id);
CREATE INDEX idx_players_org ON players(organizer_id);
CREATE INDEX idx_tournaments_org ON tournaments(organizer_id);

-- =========================================
-- 🔐 ATIVAR RLS
-- =========================================

ALTER TABLE organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_tournament_history ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 🔒 POLICIES
-- =========================================

-- ORGANIZERS
CREATE POLICY "org_select"
ON organizers
FOR SELECT
USING (auth_user_id = auth.uid());

-- SYSTEM USERS
CREATE POLICY "users_select"
ON system_users
FOR SELECT
USING (auth_user_id = auth.uid());

-- USER ORGANIZERS
CREATE POLICY "user_org_select"
ON user_organizers
FOR SELECT
USING (
  user_id IN (
    SELECT id FROM system_users WHERE auth_user_id = auth.uid()
  )
);

-- PLAYERS
CREATE POLICY "players_select"
ON players
FOR SELECT
USING (is_organizer_member(organizer_id));

CREATE POLICY "players_insert"
ON players
FOR INSERT
WITH CHECK (is_organizer_member(organizer_id));

CREATE POLICY "players_update"
ON players
FOR UPDATE
USING (is_organizer_member(organizer_id));

CREATE POLICY "players_delete"
ON players
FOR DELETE
USING (is_organizer_admin(organizer_id));

-- TOURNAMENTS
CREATE POLICY "tournaments_all"
ON tournaments
FOR ALL
USING (is_organizer_member(organizer_id));

-- CATEGORIES
CREATE POLICY "categories_all"
ON tournament_categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_id
      AND is_organizer_member(t.organizer_id)
  )
);

-- REGISTRATIONS
CREATE POLICY "registrations_all"
ON tournament_registrations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_id
      AND is_organizer_member(t.organizer_id)
  )
);

-- HISTORY
CREATE POLICY "history_all"
ON player_tournament_history
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_id
      AND is_organizer_member(t.organizer_id)
  )
);