-- ============================================
-- CORTEX BEACH - Slug amigavel para torneios
-- ============================================
-- Executar no Supabase SQL Editor.
-- Adiciona coluna slug em tournaments para URLs publicas
-- no formato /display/nome-do-torneio em vez de UUID.

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tournaments_slug
  ON tournaments(slug)
  WHERE slug IS NOT NULL;

-- Obs: o backfill dos torneios existentes e feito pelo script
-- server/scripts/backfill-slugs.js rodado uma unica vez.
